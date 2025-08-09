// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);

module.exports = router;
