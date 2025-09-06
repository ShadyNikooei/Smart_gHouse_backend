// models/SensorData.js
const mongoose = require('mongoose');

/**
 * Base schema structure for a single sensor reading.
 * Since we assume a single device, deviceId is not required.
 */
const metricSchemaDefinition = {
    value: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true // Index for fast time-series queries
    }
};

// --- Create individual models for each sensor type ---

const TemperatureDataSchema = new mongoose.Schema(metricSchemaDefinition);
const TemperatureModel = mongoose.model('TemperatureData', TemperatureDataSchema);

const HumidityDataSchema = new mongoose.Schema(metricSchemaDefinition);
const HumidityModel = mongoose.model('HumidityData', HumidityDataSchema);

const SoilMoistureDataSchema = new mongoose.Schema(metricSchemaDefinition);
const SoilModel = mongoose.model('SoilMoistureData', SoilMoistureDataSchema);

module.exports = {
    TemperatureModel,
    HumidityModel,
    SoilModel
};