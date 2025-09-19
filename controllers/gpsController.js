// controllers/gpsController.js
const GpsModel = require('../models/GpsData');

async function getLatestGPS(req, res) {
  try {
    const latest = await GpsModel.findOne().sort({ timestamp: -1 });
    if (!latest) return res.status(404).json({ message: 'No GPS data found' });

    res.status(200).json({
      latitude: latest.latitude,
      longitude: latest.longitude,
      altitude: latest.altitude,
      timestamp: latest.timestamp
    });
  } catch (err) {
    console.error('Error retrieving GPS data:', err);
    res.status(500).send({ message: 'Server error' });
  }
}

module.exports = { getLatestGPS };
