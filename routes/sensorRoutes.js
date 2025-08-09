// routes/sensorRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { postSensorData, getSensorSummary, getLast10 } = require('../controllers/sensorController');

// Validation for sensor data POST
const sensorValidation = [
  body('temperature').isNumeric().withMessage('temperature must be a number'),
  body('humidity').isNumeric().withMessage('humidity must be a number'),
  body('soilMoisture').isNumeric().withMessage('soilMoisture must be a number')
];

// POST /sensor-data
router.post('/sensor-data', sensorValidation, postSensorData);

// GET /sensor-summary
router.get('/sensor-summary', getSensorSummary);

// GET /sensor-last10
router.get('/sensor-last10', getLast10);

module.exports = router;
