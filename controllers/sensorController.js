// controllers/sensorController.js
const { validationResult } = require('express-validator');
const SensorData = require('../models/SensorData');

// Function to extract number from string
function extractNumber(value) {
  if (typeof value === 'number') return value; // if already a number, return it
  if (typeof value === 'string') {
    const match = value.match(/-?\d+(\.\d+)?/); // find integer or decimal number
    if (match) return Number(match[0]);
  }
  return null; // return null if no number is found
}

async function postSensorData(req, res) {
  try {
    // Extract numbers from strings or use actual numbers
    req.body.temperature = extractNumber(req.body.temperature);
    req.body.humidity    = extractNumber(req.body.humidity);
    req.body.soil        = extractNumber(req.body.soil);
    req.body.relay1      = extractNumber(req.body.relay1);
    req.body.relay2      = extractNumber(req.body.relay2);

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const newData = new SensorData({
      temperature: req.body.temperature,
      humidity: req.body.humidity,
      soil: req.body.soil,
      relay1: req.body.relay1,
      relay2: req.body.relay2
    });

    await newData.save();

    // Emit realtime event via socket.io
    const io = req.app.locals.io;
    if (io) io.emit('sensor_update', newData);

    res.status(201).send({ message: 'Data saved successfully', data: newData });
  } catch (err) {
    console.error('Error saving sensor data:', err);
    res.status(500).send({ message: 'Server error' });
  }
}

async function getSensorSummary(req, res) {
  try {
    const summary = await SensorData.aggregate([
      {
        $group: {
          _id: null,
          avgTemperature: { $avg: "$temperature" },
          avgHumidity: { $avg: "$humidity" },
          avgSoilMoisture: { $avg: "$soil" },
          count: { $sum: 1 }
        }
      }
    ]);
    if (summary.length === 0) return res.status(404).send({ message: 'No sensor data found' });
    res.status(200).json(summary[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
}

async function getLast10(req, res) {
  try {
    const last10 = await SensorData.find().sort({ timestamp: -1 }).limit(10).exec();
    res.status(200).json(last10);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
}

module.exports = { postSensorData, getSensorSummary, getLast10 };
