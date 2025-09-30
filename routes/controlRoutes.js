// routes/controlRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getControl, setControl } = require('../controllers/controlController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// --- UPDATED: Added validation for pump and valve ---
const controlValidation = [
  body('fan').optional().isNumeric().withMessage('fan must be numeric (0/1)'),
  body('lamp').optional().isNumeric().withMessage('lamp must be numeric (0/1)'),
  body('pump').optional().isNumeric().withMessage('pump must be numeric (0/1)'),
  body('valve').optional().isNumeric().withMessage('valve must be numeric (0/1)')
];

// Public: get current control (IoT device can poll)
router.get('/get-control', authenticateToken, getControl);

// Protected: set control (only authenticated users allowed; restrict to admin if needed)
router.post('/set-control', authenticateToken, /* authorizeRole('admin'), */ controlValidation, setControl);

module.exports = router;
