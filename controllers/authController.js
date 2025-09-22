// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');


// Define separate secrets and durations for access and refresh tokens
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'access-secret-key-!@#$';
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key-!@#$';
const accessTokenExpiresIn = '15m';
const refreshTokenExpiresIn = '4d';

// ====================== Register ======================
async function register(req, res) {
  try {
    const { username, password, role } = req.body;
    if (!username || !password)
      return res.status(400).send({ message: 'username and password required' });

    const existing = await User.findOne({ username });
    if (existing)
      return res.status(400).send({ message: 'username already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      passwordHash,
      role: role || 'user',
    });

    await user.save();
    res.status(201).send({ message: 'User created' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
}

// ====================== Login ======================
async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).send({ message: 'username and password required' });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).send({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).send({ message: 'Invalid credentials' });

    const payload = {
      id: user._id,
      username: user.username,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, accessTokenSecret, {
      expiresIn: accessTokenExpiresIn,
    });
    const refreshToken = jwt.sign(payload, refreshTokenSecret, {
      expiresIn: refreshTokenExpiresIn,
    });

    // Store refresh token in DB for future rotation
    user.refreshToken = refreshToken;
    await user.save();

    // Set refreshToken as cookie with only expiration (no httpOnly, secure, etc.)
    res.cookie('refreshToken', refreshToken, {
      maxAge: 4 * 24 * 60 * 60 * 1000, // 4 days
    });

    // Send accessToken only
    res.status(200).json({
      message: 'Login successful',
      accessToken,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
}

// ====================== Logout ======================
async function logout(req, res) {
  const token = req.cookies.refreshToken;
  if (token) {
    try {
      const decoded = jwt.verify(token, refreshTokenSecret);
      await User.updateOne(
        { _id: decoded.id },
        { $unset: { refreshToken: '' } }
      );
    } catch (err) {
      // ignore invalid token
    }
  }

  res.clearCookie('refreshToken');
  res.status(200).send({ message: 'Logged out successfully' });
}

module.exports = { register, login, logout };


