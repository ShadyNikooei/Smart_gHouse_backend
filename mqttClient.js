// mqttClient.js
const mqtt = require('mqtt');
const { TemperatureModel, HumidityModel, SoilModel } = require('./models/SensorData.js');
const GpsModel = require('./models/GpsData');
const ControlState = require('./models/ControlState');

// --- Canonical topics you asked to keep ---
const MQTT_SENSOR_TEMPERATURE_TOPIC = 'greenhouse/temperature';
const MQTT_SENSOR_HUMIDITY_TOPIC    = 'greenhouse/humidity';
const MQTT_SENSOR_SOIL_TOPIC        = 'greenhouse/soil';
const MQTT_GPS_TOPIC                = 'greenhouse/gps';

// --- Colleague firmware topics ---
const MQTT_COLLEAGUE_ACTUATORS_TOPIC = 'greenhouse/actuators'; // device → server: relay state (authoritative reported)
const MQTT_COLLEAGUE_CMD_SET_TOPIC   = 'greenhouse/cmd/set';   // server → device: command (desired)
const MQTT_COLLEAGUE_CMD_ACK_TOPIC   = 'greenhouse/cmd/ack';   // device → server: ACK (e.g. {"ok":1})

/*const MQTT_SENSOR_TEMPERATURE_TOPIC = 'greenhouse/temperature';
const MQTT_SENSOR_HUMIDITY_TOPIC    = 'greenhouse/humidity';
const MQTT_SENSOR_SOIL_TOPIC        = 'greenhouse/soil';
const MQTT_CONTROL_TOPIC            = 'greenhouse/control/command';
const MQTT_RELAY_STATE_TOPIC        = 'greenhouse/state/relay';
const MQTT_GPS_TOPIC                = 'greenhouse/gps';

// --- Colleague firmware topics (compatibility) ---
const MQTT_COLLEAGUE_ACTUATORS_TOPIC = 'greenhouse/actuators'; // device → server: relay state
const MQTT_COLLEAGUE_CMD_SET_TOPIC   = 'greenhouse/cmd/set';   // server → device: command
const MQTT_COLLEAGUE_CMD_ACK_TOPIC   = 'greenhouse/cmd/ack';   // device → server: ACK (relay state only)
const MQTT_COLLEAGUE_STATUS_TOPIC    = 'greenhouse/status'; */


// Ensure we don't accidentally handle topics with duplicate slashes
const normalizeTopic = (t) => t.replace(/\/+/g, '/');

function statesEqual(a, b) {
  return a.fan === b.fan && a.lamp === b.lamp && a.pump === b.pump && a.valve === b.valve;
}

async function upsertControlDoc() {
  let doc = await ControlState.findOne();
  if (!doc) doc = await ControlState.create({});
  return doc;
}

function initializeMqttClient(io) {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const mqttClient = mqtt.connect(brokerUrl);

  mqttClient.on('connect', () => {
    console.log(`[MQTT] Connected: ${brokerUrl}`);
    [
      MQTT_SENSOR_TEMPERATURE_TOPIC,
      MQTT_SENSOR_HUMIDITY_TOPIC,
      MQTT_SENSOR_SOIL_TOPIC,
      MQTT_GPS_TOPIC,
      MQTT_COLLEAGUE_ACTUATORS_TOPIC,
      MQTT_COLLEAGUE_CMD_ACK_TOPIC,
      'greenhouse/status', // optional LWT/status
      'greenhouse/#',      // temporary compatibility/wildcard
    ].forEach(t => mqttClient.subscribe(t));
  });

  mqttClient.on('message', async (topicBuf, messageBuf) => {
    const topic = normalizeTopic(topicBuf.toString());
    const payloadStr = messageBuf.toString();

    try {
      // --- GPS: expects JSON {latitude, longitude, altitude} ---
      if (topic === MQTT_GPS_TOPIC) {
        let gps;
        try { gps = JSON.parse(payloadStr); } catch { gps = {}; }
        const { latitude, longitude, altitude } = gps || {};
        if ([latitude, longitude, altitude].every(v => typeof v === 'number')) {
          const savedGps = await GpsModel.create({ latitude, longitude, altitude });
          io?.emit('gps_update', { latitude, longitude, altitude, timestamp: savedGps.timestamp });
        } else {
          console.warn('[MQTT] Invalid GPS payload:', payloadStr);
        }
        return;
      }

      // --- Relay state from device (authoritative "reported") ---
      if (topic === MQTT_COLLEAGUE_ACTUATORS_TOPIC) {
        let state;
        try { state = JSON.parse(payloadStr); } catch { state = null; }
        if (!state || typeof state !== 'object') {
          console.warn('[MQTT] Invalid actuators JSON:', payloadStr);
          return;
        }

        const doc = await upsertControlDoc();
        // Only update provided keys; keep others unchanged
        doc.reported = {
          fan:   Number(state.fan   ?? doc.reported.fan),
          lamp:  Number(state.lamp  ?? doc.reported.lamp),
          pump:  Number(state.pump  ?? doc.reported.pump),
          valve: Number(state.valve ?? doc.reported.valve),
          ts:    new Date(),
        };

        // If reported matches desired, clear pending
        if (statesEqual(doc.desired, doc.reported)) {
          doc.pendingCommand = false;
          doc.attempts = 0;
        }
        await doc.save();
        io?.emit('relay_state_update', doc.reported);
        return;
      }

      // --- ACK from device: {"ok":1} ---
      if (topic === MQTT_COLLEAGUE_CMD_ACK_TOPIC) {
        // Stop retries; do not touch reported here
        const doc = await upsertControlDoc();
        doc.pendingCommand = false;
        doc.attempts = 0;
        await doc.save();
        io?.emit('control_ack', { ok: true, ts: Date.now() });
        return;
      }

      // --- Device status/LWT passthrough (optional) ---
      if (topic === 'greenhouse/status') {
        let data = payloadStr;
        try { data = JSON.parse(payloadStr); } catch {}
        io?.emit('device_status', { topic, data, ts: Date.now() });
        return;
      }

      // --- Sensors: accept raw numeric or JSON with conventional keys ---
      if (topic === MQTT_SENSOR_TEMPERATURE_TOPIC ||
          topic === MQTT_SENSOR_HUMIDITY_TOPIC ||
          topic === MQTT_SENSOR_SOIL_TOPIC) {

        let value = Number.NaN;
        try {
          // Plain number?
          const rawNum = parseFloat(payloadStr);
          if (!Number.isNaN(rawNum)) value = rawNum;
          else {
            // JSON with known keys
            const js = JSON.parse(payloadStr);
            const map = {
              [MQTT_SENSOR_TEMPERATURE_TOPIC]: js.temperature,
              [MQTT_SENSOR_HUMIDITY_TOPIC]: js.humidity,
              [MQTT_SENSOR_SOIL_TOPIC]: js.soil ?? js.moisture ?? js.soilMoisture,
            };
            value = parseFloat(map[topic]);
          }
        } catch { /* ignore parse errors */ }

        if (Number.isNaN(value)) {
          console.warn(`[MQTT] Invalid sensor payload on ${topic}:`, payloadStr);
          return;
        }

        const sensorType =
          topic === MQTT_SENSOR_TEMPERATURE_TOPIC ? 'temperature' :
          topic === MQTT_SENSOR_HUMIDITY_TOPIC    ? 'humidity'    : 'soil';
        const Model =
          sensorType === 'temperature' ? TemperatureModel :
          sensorType === 'humidity'    ? HumidityModel    : SoilModel;

        const saved = await Model.create({ value });
        io?.emit('sensor_update', { sensorType, value: saved.value, timestamp: saved.timestamp });
        return;
      }

      // Ignore other topics for now
    } catch (err) {
      console.error(`[MQTT] Failed to process message on ${topic}:`, err);
    }
  });

  mqttClient.on('error', (err) => console.error('[MQTT] connection error:', err));
  return mqttClient;
}

module.exports = {
  initializeMqttClient,
  MQTT_COLLEAGUE_CMD_SET_TOPIC,
};
