// controllers/sensorController.js
const getSensorModel = require('../models/SensorData'); // Import the model factory

/**
 * Gets a summary of sensor data (avg, count) for a specific device.
 */
async function getSensorSummary(req, res) {
  try {
    // Get deviceId from the route parameters.
    const { deviceId } = req.params;
    if (!deviceId) return res.status(400).send({ message: 'Device ID is required' });

    // Get the correct model for the device.
    const SensorModel = getSensorModel(deviceId);

    const summary = await SensorModel.aggregate([
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
    if (summary.length === 0) return res.status(404).send({ message: 'No sensor data found for this device' });
    res.status(200).json(summary[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
}

/**
 * Gets the last 10 sensor data entries for a specific device.
 */
async function getLast10(req, res) {
  try {
    // Get deviceId from the route parameters.
    const { deviceId } = req.params;
    if (!deviceId) return res.status(400).send({ message: 'Device ID is required' });

    // Get the correct model for the device.
    const SensorModel = getSensorModel(deviceId);
    
    const last10 = await SensorModel.find().sort({ timestamp: -1 }).limit(10).exec();
    res.status(200).json(last10);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
}

// Note: The HTTP endpoint for posting sensor data is removed, as this is now handled by MQTT.
module.exports = { getSensorSummary, getLast10 };
