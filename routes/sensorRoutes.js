// routes/sensorRoutes.js

const express = require('express');
const router = express.Router();
const { getSensorSummary, getLast10 } = require('../controllers/sensorController');
const { authenticateToken } = require('../middleware/auth');

// Routes updated for single-device setup (no :deviceId parameter needed).
router.get('/sensor-summary', authenticateToken, getSensorSummary);
router.get('/sensor-last10', authenticateToken, getLast10);

module.exports = router;

/*
 * Summary of changes:
 * 1. The 'POST /sensor-data' route was removed, as data is no longer received directly via HTTP.
 * 2. The responsibility for receiving sensor data has been moved to the MQTT client (in mqttClient.js), which is a more efficient method for IoT.
 * 3. These GET routes have been simplified for a single-device setup, removing the need for a `:deviceId` parameter.
*/


