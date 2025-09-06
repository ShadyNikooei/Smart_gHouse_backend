// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const { generateReport } = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

// Route updated for single-device setup. Date range passed as query parameters.
// Example usage: GET /reports?startDate=2025-09-01&endDate=2025-09-30
router.get('/reports', authenticateToken, generateReport);

module.exports = router;