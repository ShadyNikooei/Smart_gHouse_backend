// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const { generateReport } = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth'); // Secure the endpoint

// Defines the GET endpoint for generating reports.
// Example usage: GET /reports/mydevice123?startDate=2025-09-01&endDate=2025-09-30
router.get('/reports/:deviceId', authenticateToken, generateReport);

module.exports = router;
