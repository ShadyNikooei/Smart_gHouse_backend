// mqttClient.js
const mqtt = require('mqtt');
const { TemperatureModel, HumidityModel, SoilModel } = require('./models/SensorData.js');
const GpsModel = require('./models/GpsData');
const ControlState = require('./models/ControlState');

// --- Topics (ONLY the ones you asked for) ---
const MQTT_SENSOR_TEMPERATURE_TOPIC = 'greenhouse/temperature';
const MQTT_SENSOR_HUMIDITY_TOPIC    = 'greenhouse/humidity';
const MQTT_SENSOR_SOIL_TOPIC        = 'greenhouse/soil';
const MQTT_GPS_TOPIC                = 'greenhouse/gps';

const MQTT_COLLEAGUE_ACTUATORS_TOPIC = 'greenhouse/actuators'; // device → server
const MQTT_COLLEAGUE_CMD_SET_TOPIC   = 'greenhouse/cmd/set';   // server → device
const MQTT_COLLEAGUE_CMD_ACK_TOPIC   = 'greenhouse/cmd/ack';   // device → server

const DEBUG_MQTT = process.env.DEBUG_MQTT === '1';

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


// --- helpers ---
const normalizeSlashes = (t) => t.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');

// Parse topic into {base, deviceId|null, leaf}
// Accepts: greenhouse/<leaf>, greenhouse/<deviceId>/<leaf>
function parseTopic(raw) {
  const t = normalizeSlashes(raw);
  const parts = t.split('/');
  const base = parts[0]; // 'greenhouse' expected
  if (base !== 'greenhouse') return { base, deviceId: null, leaf: parts.slice(1).join('/') };

  const knownLeaves = new Set(['temperature', 'humidity', 'soil', 'gps', 'actuators', 'cmd', 'status']);
  let deviceId = null;
  let leafStart = 1;

  if (parts.length >= 3 && !knownLeaves.has(parts[1])) {
    deviceId = parts[1];
    leafStart = 2;
  }
  const leaf = parts.slice(leafStart).join('/'); // e.g. 'temperature', 'actuators', 'cmd/ack'
  return { base, deviceId, leaf };
}

function statesEqual(a, b) {
  return a.fan === b.fan && a.lamp === b.lamp && a.pump === b.pump && a.valve === b.valve;
}

async function upsertControlDoc() {
  let doc = await ControlState.findOne();
  if (!doc) doc = await ControlState.create({});
  return doc;
}

// Extract numeric from plain "29.1" or JSON {"temperature":29.1} / {"humidity":33} / {"soil":41} / {"value":..}
function extractSensorValue(leaf, payloadStr) {
  const direct = Number(payloadStr);
  if (!Number.isNaN(direct)) return direct;

  try {
    const obj = JSON.parse(payloadStr);
    if (obj && typeof obj === 'object') {
      const head = leaf.split('/')[0]; // temperature | humidity | soil
      if (head === 'temperature') {
        const v = obj.temperature ?? obj.temp ?? obj.value;
        if (v !== undefined) return Number(v);
      }
      if (head === 'humidity') {
        const v = obj.humidity ?? obj.hum ?? obj.value;
        if (v !== undefined) return Number(v);
      }
      if (head === 'soil') {
        const v = obj.soil ?? obj.soilMoisture ?? obj.value;
        if (v !== undefined) return Number(v);
      }
    }
  } catch (_) {}
  return NaN;
}

function initializeMqttClient(io) {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  if (DEBUG_MQTT) console.log('[MQTT] Connecting to:', brokerUrl);

  const mqttClient = mqtt.connect(brokerUrl);

  mqttClient.on('connect', () => {
    console.log('MQTT client connected successfully.');
    // Subscribe to everything under greenhouse; we route by parsed leaf
    mqttClient.subscribe('greenhouse/#');
    if (DEBUG_MQTT) console.log('[MQTT] Subscribed to greenhouse/#');
  });

  mqttClient.on('message', async (topicBuf, messageBuf) => {
    const rawTopic = topicBuf.toString();
    const payloadStr = messageBuf.toString();
    const { deviceId, leaf } = parseTopic(rawTopic);

    if (DEBUG_MQTT) console.log('[MQTT] IN:', rawTopic, 'leaf=', leaf, deviceId ? `deviceId=${deviceId}` : '');

    try {
      // --- GPS ---
      if (leaf === 'gps') {
        let gps;
        try { gps = JSON.parse(payloadStr); } catch { gps = null; }
        const { latitude, longitude, altitude } = gps || {};
        if ([latitude, longitude, altitude].every(v => typeof v === 'number')) {
          const savedGps = await GpsModel.create({ latitude, longitude, altitude });
          io?.emit('gps_update', { latitude, longitude, altitude, timestamp: savedGps.timestamp, deviceId });
        } else {
          if (DEBUG_MQTT) console.warn('Invalid GPS payload:', payloadStr);
        }
        return;
      }

      // --- Relay state from device ---
      // Accept: 'actuators' and 'cmd/ack' (both with/without deviceId)
      if (leaf === 'actuators' || leaf === 'cmd/ack') {
        let state;
        try { state = JSON.parse(payloadStr); } catch { state = null; }
        if (!state || typeof state !== 'object') {
          if (DEBUG_MQTT) console.warn('Invalid relay-state JSON on', rawTopic, ':', payloadStr);
          return;
        }

        const doc = await upsertControlDoc();
        doc.reported = {
          fan:   Number(state.fan   ?? doc.reported.fan),
          lamp:  Number(state.lamp  ?? doc.reported.lamp),
          pump:  Number(state.pump  ?? doc.reported.pump),
          valve: Number(state.valve ?? doc.reported.valve),
          ts:    new Date(),
        };

        if (statesEqual(doc.desired, doc.reported)) {
          doc.pendingCommand = false;
          doc.attempts = 0;
        }

        await doc.save();
        io?.emit('relay_state_update', { ...doc.reported, deviceId });
        return;
      }

      // --- Sensors: temperature / humidity / soil ---
      const head = leaf.split('/')[0];
      let model = null, sensorType = null;
      if (head === 'temperature') { model = TemperatureModel; sensorType = 'temperature'; }
      else if (head === 'humidity') { model = HumidityModel; sensorType = 'humidity'; }
      else if (head === 'soil') { model = SoilModel; sensorType = 'soil'; }

      if (model) {
        const value = extractSensorValue(leaf, payloadStr);
        if (Number.isNaN(value)) {
          // e.g., 'offline' or malformed JSON → ignore
          if (DEBUG_MQTT) console.warn(`Invalid sensor payload on ${rawTopic}: ${payloadStr}`);
          return;
        }
        const saved = await model.create({ value });
        io?.emit('sensor_update', { sensorType, value: saved.value, timestamp: saved.timestamp, deviceId });
        return;
      }

      // Ignore other leaves (e.g., status) silently
      if (DEBUG_MQTT) console.log('[MQTT] Ignored leaf:', leaf);

    } catch (err) {
      console.error(`Failed to process MQTT message on ${rawTopic}:`, err);
    }
  });

  mqttClient.on('error', (err) => console.error('MQTT connection error:', err));

  return mqttClient;
}

module.exports = {
  initializeMqttClient,
  // export colleague command topic for the controller to publish to
  MQTT_COLLEAGUE_CMD_SET_TOPIC,
};
