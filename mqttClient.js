// mqttClient.js
const mqtt = require('mqtt');
const { TemperatureModel, HumidityModel, SoilModel } = require('./models/SensorData.js');
const GpsModel = require('./models/GpsData');

// --- Topics ---
const MQTT_SENSOR_TEMPERATURE_TOPIC = 'greenhouse/temperature';
const MQTT_SENSOR_HUMIDITY_TOPIC = 'greenhouse/humidity';
const MQTT_SENSOR_SOIL_TOPIC = 'greenhouse/soil';
const MQTT_CONTROL_TOPIC = 'greenhouse/control/command';
const MQTT_RELAY_STATE_TOPIC = 'greenhouse/state/relay';
const MQTT_GPS_TOPIC = 'greenhouse/gps'; // NEW

function initializeMqttClient(io) {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const mqttClient = mqtt.connect(brokerUrl);

  mqttClient.on('connect', () => {
    console.log('MQTT client connected successfully.');

    mqttClient.subscribe(MQTT_SENSOR_TEMPERATURE_TOPIC);
    mqttClient.subscribe(MQTT_SENSOR_HUMIDITY_TOPIC);
    mqttClient.subscribe(MQTT_SENSOR_SOIL_TOPIC);
    mqttClient.subscribe(MQTT_RELAY_STATE_TOPIC);
    mqttClient.subscribe(MQTT_GPS_TOPIC); // NEW
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const payload = message.toString();

      // --- GPS topic ---
      if (topic === MQTT_GPS_TOPIC) {
        const gps = JSON.parse(payload);
        const { latitude, longitude, altitude } = gps;

        if (
          typeof latitude === 'number' &&
          typeof longitude === 'number' &&
          typeof altitude === 'number'
        ) {
          const savedGps = await GpsModel.create({ latitude, longitude, altitude });

          if (io) {
            io.emit('gps_update', {
              latitude,
              longitude,
              altitude,
              timestamp: savedGps.timestamp
            });
          }
        } else {
          console.warn('Invalid GPS payload:', payload);
        }

        return;
      }

      // --- Relay state (ack from hardware) ---
      if (topic === MQTT_RELAY_STATE_TOPIC) {
        const relayState = JSON.parse(payload);
        console.log('Received relay state from hardware:', relayState);

        if (io) {
          io.emit('relay_state_update', relayState);
        }

        return;
      }

      // --- Sensor data ---
      const value = parseFloat(payload);
      if (isNaN(value)) {
        console.warn(`Invalid non-numeric payload received on topic ${topic}: ${payload}`);
        return;
      }

      let sensorType = '';
      let modelToUpdate;

      switch (topic) {
        case MQTT_SENSOR_TEMPERATURE_TOPIC:
          modelToUpdate = TemperatureModel;
          sensorType = 'temperature';
          break;
        case MQTT_SENSOR_HUMIDITY_TOPIC:
          modelToUpdate = HumidityModel;
          sensorType = 'humidity';
          break;
        case MQTT_SENSOR_SOIL_TOPIC:
          modelToUpdate = SoilModel;
          sensorType = 'soil';
          break;
        default:
          return;
      }

      const savedDataPoint = await modelToUpdate.create({ value });

      if (io) {
        io.emit('sensor_update', {
          sensorType,
          value: savedDataPoint.value,
          timestamp: savedDataPoint.timestamp
        });
      }

    } catch (err) {
      console.error(`Failed to process MQTT message from topic ${topic}:`, err);
    }
  });

  mqttClient.on('error', (err) => {
    console.error('MQTT connection error:', err);
  });

  return mqttClient;
}

module.exports = {
  initializeMqttClient,
  MQTT_CONTROL_TOPIC
};
