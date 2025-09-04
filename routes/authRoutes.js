// routes/authRoutes.js
const express = require('express');
const router = express.Router();
// Import new controller functions for refresh and logout.
const { register, login, refreshToken, logout } = require('../controllers/authController');

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);

// New endpoints for session management
router.post('/refresh', refreshToken); // To get a new access token
router.post('/logout', logout);       // To end the user session

module.exports = router;
