// routes/sensorRoutes.js
const express = require('express');
const router = express.Router();
const { getSensorSummary, getLast10 } = require('../controllers/sensorController');
const { authenticateToken } = require('../middleware/auth'); // Secure the endpoints

// The HTTP POST endpoint for sensor data is removed because data is now received via MQTT.

// Routes now include a :deviceId parameter to specify which device's data to fetch.
router.get('/sensor-summary/:deviceId', authenticateToken, getSensorSummary);
router.get('/sensor-last10/:deviceId', authenticateToken, getLast10);

/*
 * Summary of why the code was shortened:
 * 1. The 'POST /sensor-data' route was removed. Data is no longer received directly via HTTP.
 * 2. The responsibility for receiving sensor data has been moved to the MQTT client (in mqttClient.js), which is a more efficient method for IoT.
 * 3. The remaining GET routes have been made more specific and now require a `deviceId` to return data for a particular device.
*/

module.exports = router;

