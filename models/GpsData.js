// models/GpsData.js
const mongoose = require('mongoose');

const gpsSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  altitude: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('GpsData', gpsSchema);
