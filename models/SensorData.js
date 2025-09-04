// models/SensorData.js 
const mongoose = require('mongoose');

// Define the schema once. This structure will be used for all device collections.
const sensorDataSchema = new mongoose.Schema({
  temperature: { type: Number, required: true },
  humidity: { type: Number, required: true },
  soil: { type: Number, required: true },
  relay1: { type: Number, required: true },
  relay2: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

// A cache to store created models to avoid recompiling them on every request.
const models = {};

/**
 * Factory function to get or create a Mongoose model for a specific device.
 * This allows storing data for each device in a separate collection.
 * @param {string} deviceId - The unique identifier for the device.
 * @returns {mongoose.Model} - The Mongoose model for the device's collection.
 */
function getSensorModel(deviceId) {
  if (!deviceId) {
    throw new Error('Device ID is required to get the sensor model.');
  }

  // Create a dynamic collection name based on the device ID.
  const collectionName = `device_${deviceId}_data`;

  // If the model is already in our cache, return it immediately.
  if (models[collectionName]) {
    return models[collectionName];
  }

  // Otherwise, create a new model, add it to the cache, and return it.
  const SensorModel = mongoose.model(collectionName, sensorDataSchema);
  models[collectionName] = SensorModel;
  
  return SensorModel;
}

module.exports = getSensorModel;