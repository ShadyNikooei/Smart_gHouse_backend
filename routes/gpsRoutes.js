// routes/gpsRoutes.js
const express = require('express');
const router = express.Router();
const { getLatestGPS } = require('../controllers/gpsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/gps-latest', authenticateToken, getLatestGPS);

module.exports = router;
