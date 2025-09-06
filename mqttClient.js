// mqttClient.js
const mqtt = require('mqtt');
const { TemperatureModel, HumidityModel, SoilModel } = require('./models/SensorMetrics');

// Define topics
const MQTT_SENSOR_TEMPERATURE_TOPIC = 'greenhouse/temperature';
const MQTT_SENSOR_HUMIDITY_TOPIC = 'greenhouse/humidity';
const MQTT_SENSOR_SOIL_TOPIC = 'greenhouse/soil';
const MQTT_CONTROL_TOPIC = 'greenhouse/control/command'; // Topic to send commands to hardware

function initializeMqttClient(io) {
    // Replace with your MQTT broker URL and credentials if needed
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const mqttClient = mqtt.connect(brokerUrl);

    mqttClient.on('connect', () => {
        console.log('MQTT client connected successfully.');
        // Subscribe to sensor data topics
        mqttClient.subscribe(MQTT_SENSOR_TEMPERATURE_TOPIC, (err) => {
            if (err) console.error(`Failed to subscribe to topic ${MQTT_SENSOR_TEMPERATURE_TOPIC}`);
        });
        mqttClient.subscribe(MQTT_SENSOR_HUMIDITY_TOPIC, (err) => {
            if (err) console.error(`Failed to subscribe to topic ${MQTT_SENSOR_HUMIDITY_TOPIC}`);
        });
         mqttClient.subscribe(MQTT_SENSOR_SOIL_TOPIC, (err) => {
            if (err) console.error(`Failed to subscribe to topic ${MQTT_SENSOR_SOIL_TOPIC}`);
        });
    });

    /**
     * Handles incoming MQTT messages from sensors.
     * Parses the message and saves data to the appropriate collection based on the topic.
     */
    mqttClient.on('message', async (topic, message) => {
        try {
            const payload = message.toString();
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
                    return; // Ignore messages from topics we don't handle here
            }

            // Save data point to the database
            const savedDataPoint = await modelToUpdate.create({ value: value });

            // Emit data to frontend via Socket.io for real-time updates
            if (io) {
                io.emit('sensor_update', { 
                    sensorType: sensorType, 
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
    MQTT_CONTROL_TOPIC // Export control topic for use in controlController
};