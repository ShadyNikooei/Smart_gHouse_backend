// models/SensorData.js 
const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  temperature: { type: Number, required: true },
  humidity: { type: Number, required: true },
  soil: { type: Number, required: true },         
  relay1: { type: Number, required: true },       
  relay2: { type: Number, required: true },        
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SensorData', sensorDataSchema);