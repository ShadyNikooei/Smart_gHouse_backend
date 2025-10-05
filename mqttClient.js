// mqttClient.js
const mqtt = require('mqtt');
const { TemperatureModel, HumidityModel, SoilModel } = require('./models/SensorData.js');
const GpsModel = require('./models/GpsData');
const ControlState = require('./models/ControlState');

// --- Server canonical topics ---
const MQTT_SENSOR_TEMPERATURE_TOPIC = 'greenhouse/temperature';
const MQTT_SENSOR_HUMIDITY_TOPIC    = 'greenhouse/humidity';
const MQTT_SENSOR_SOIL_TOPIC        = 'greenhouse/soil';
const MQTT_CONTROL_TOPIC            = 'greenhouse/control/command';
const MQTT_RELAY_STATE_TOPIC        = 'greenhouse/state/relay';
const MQTT_GPS_TOPIC                = 'greenhouse/gps';

// --- Colleague firmware topics (compatibility) ---
const MQTT_COLLEAGUE_ACTUATORS_TOPIC = 'greenhouse/actuators'; // device → server: relay state
const MQTT_COLLEAGUE_CMD_SET_TOPIC   = 'greenhouse/cmd/set';   // server → device: command
const MQTT_COLLEAGUE_CMD_ACK_TOPIC   = 'greenhouse/cmd/ack';   // device → server: ACK (relay state only)
const MQTT_COLLEAGUE_STATUS_TOPIC    = 'greenhouse/status';    // device → server: status/LWT (optional)

// Normalize topic to avoid accidental double slashes, e.g., greenhouse//temperature
const normalizeTopic = (t) => t.replace(/\/+/g, '/');

function statesEqual(a, b) {
  return a.fan === b.fan && a.lamp === b.lamp && a.pump === b.pump && a.valve === b.valve;
}

async function upsertControlDoc() {
  let doc = await ControlState.findOne();
  if (!doc) doc = await ControlState.create({});
  return doc;
}

// Helper: extract numeric sensor value from either plain text ("29.1")
// or JSON payloads like {"temperature":29.1}, {"humidity":33}, {"soil":41}, {"value":..}
function extractSensorValue(topic, payloadStr) {
  // Try direct numeric (plain text)
  const direct = Number(payloadStr);
  if (!Number.isNaN(direct)) return direct;

  // Try JSON with known keys
  try {
    const obj = JSON.parse(payloadStr);
    if (obj && typeof obj === 'object') {
      if (topic === MQTT_SENSOR_TEMPERATURE_TOPIC) {
        const v = obj.temperature ?? obj.temp ?? obj.value;
        if (v !== undefined) return Number(v);
      }
      if (topic === MQTT_SENSOR_HUMIDITY_TOPIC) {
        const v = obj.humidity ?? obj.hum ?? obj.value;
        if (v !== undefined) return Number(v);
      }
      if (topic === MQTT_SENSOR_SOIL_TOPIC) {
        const v = obj.soil ?? obj.soilMoisture ?? obj.value;
        if (v !== undefined) return Number(v);
      }
    }
  } catch (_) { /* not JSON */ }

  return NaN;
}

function initializeMqttClient(io) {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const mqttClient = mqtt.connect(brokerUrl);

  mqttClient.on('connect', () => {
    console.log('MQTT client connected successfully.');
    [
      // sensors & gps
      MQTT_SENSOR_TEMPERATURE_TOPIC,
      MQTT_SENSOR_HUMIDITY_TOPIC,
      MQTT_SENSOR_SOIL_TOPIC,
      MQTT_GPS_TOPIC,

      // relay state (both canonical and colleague)
      MQTT_RELAY_STATE_TOPIC,
      MQTT_COLLEAGUE_ACTUATORS_TOPIC,

      // ACK treated as relay-state payload (no commandId/applied semantics)
      MQTT_COLLEAGUE_CMD_ACK_TOPIC,

      // optional status/LWT
      MQTT_COLLEAGUE_STATUS_TOPIC,

      // catch-all while aligning devices
      'greenhouse/#',
    ].forEach(t => mqttClient.subscribe(t));
  });

  mqttClient.on('message', async (topicBuf, messageBuf) => {
    const topic = normalizeTopic(topicBuf.toString());
    const payloadStr = messageBuf.toString();

    try {
      // --- GPS (expects JSON: {latitude, longitude, altitude}) ---
      if (topic === MQTT_GPS_TOPIC) {
        const gps = JSON.parse(payloadStr);
        const { latitude, longitude, altitude } = gps || {};
        if ([latitude, longitude, altitude].every(v => typeof v === 'number')) {
          const savedGps = await GpsModel.create({ latitude, longitude, altitude });
          io?.emit('gps_update', { latitude, longitude, altitude, timestamp: savedGps.timestamp });
        } else {
          console.warn('Invalid GPS payload:', payloadStr);
        }
        return;
      }

      // --- Relay state from device (JSON): update "reported", then reconcile ---
      // Accept state from: canonical, colleague's actuators, and colleague's cmd/ack.
      if (
        topic === MQTT_RELAY_STATE_TOPIC ||
        topic === MQTT_COLLEAGUE_ACTUATORS_TOPIC ||
        topic === MQTT_COLLEAGUE_CMD_ACK_TOPIC
      ) {
        let state;
        try { state = JSON.parse(payloadStr); } catch { state = null; }
        if (!state || typeof state !== 'object') {
          console.warn('Invalid relay-state JSON on', topic, ':', payloadStr);
          return;
        }

        const doc = await upsertControlDoc();
        // Only update provided keys; keep others as-is
        doc.reported = {
          fan:   Number(state.fan   ?? doc.reported.fan),
          lamp:  Number(state.lamp  ?? doc.reported.lamp),
          pump:  Number(state.pump  ?? doc.reported.pump),
          valve: Number(state.valve ?? doc.reported.valve),
          ts:    new Date(),
        };

        // If reported now equals desired, clear pending/attempts
        if (statesEqual(doc.desired, doc.reported)) {
          doc.pendingCommand = false;
          doc.attempts = 0;
        }

        await doc.save();
        io?.emit('relay_state_update', doc.reported);
        return;
      }

      // --- Device status/LWT (optional passthrough) ---
      if (topic === MQTT_COLLEAGUE_STATUS_TOPIC) {
        let data = payloadStr;
        try { data = JSON.parse(payloadStr); } catch {}
        io?.emit('device_status', { topic, data, ts: Date.now() });
        return;
      }

      // --- Sensor numeric streams ---
      let model = null, sensorType = null;
      switch (topic) {
        case MQTT_SENSOR_TEMPERATURE_TOPIC: model = TemperatureModel; sensorType = 'temperature'; break;
        case MQTT_SENSOR_HUMIDITY_TOPIC:    model = HumidityModel;    sensorType = 'humidity';    break;
        case MQTT_SENSOR_SOIL_TOPIC:        model = SoilModel;        sensorType = 'soil';        break;
        default:
          // Unhandled topics are ignored
          return;
      }

      // Accept both plain numeric and JSON payloads for sensors
      const value = extractSensorValue(topic, payloadStr);
      if (Number.isNaN(value)) {
        console.warn(`Invalid sensor payload on ${topic}: ${payloadStr}`);
        return;
      }

      const saved = await model.create({ value });
      io?.emit('sensor_update', { sensorType, value: saved.value, timestamp: saved.timestamp });

    } catch (err) {
      console.error(`Failed to process MQTT message on ${topic}:`, err);
    }
  });

  mqttClient.on('error', (err) => console.error('MQTT connection error:', err));
  return mqttClient;
}

module.exports = {
  initializeMqttClient,
  MQTT_CONTROL_TOPIC,
  MQTT_COLLEAGUE_CMD_SET_TOPIC, // exported for dual-topic command publish
};
