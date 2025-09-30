// routes/authRoutes.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login',    authController.login);
router.post('/logout',   authController.logout);

// Page refresh helper: hits middleware which silently refreshes tokens.
// If tokens were refreshed here, middleware returns 200 with code TOKENS_ROTATED.
// If access is still valid, this handler replies 200 as well.
router.get('/refresh', authenticateToken, (req, res) => {
  return res.status(200).json({
    code: 'ACCESS_STILL_VALID',
    message: 'Access token still valid via cookie.',
  });
});

module.exports = router;
