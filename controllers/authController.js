// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Define separate secrets and durations for access and refresh tokens
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'access-secret-key-!@#$';
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key-!@#$';
const accessTokenExpiresIn = '15m';  // short-lived
const refreshTokenExpiresIn = '7d';  // long-lived

// ====================== Register ======================
async function register(req, res) {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).send({ message: 'username and password required' });

    const existing = await User.findOne({ username });
    if (existing) return res.status(400).send({ message: 'username already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ username, passwordHash, role: role || 'user' });
    await user.save();
    res.status(201).send({ message: 'User created' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
}

// ====================== Login ======================
// Updated: returns tokens in cookies AND response body (important for Postman/mobile clients).
async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).send({ message: 'username and password required' });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).send({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).send({ message: 'Invalid credentials' });

    // Create access and refresh tokens
    const userPayload = { id: user._id, username: user.username, role: user.role };
    const accessToken = jwt.sign(userPayload, accessTokenSecret, { expiresIn: accessTokenExpiresIn });
    const refreshToken = jwt.sign(userPayload, refreshTokenSecret, { expiresIn: refreshTokenExpiresIn });

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    // Store tokens in secure, httpOnly cookies
    //res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 15 * 60 * 1000 });
    //res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
    // Set access token cookie (short-lived)
    res.cookie('accessToken', accessToken, { 
      //httpOnly: true,              // Prevent client-side JS from reading the cookie
      //secure: false,               // Disable Secure for testing on plain HTTP (must be true in production with HTTPS)
      maxAge: 15 * 60 * 1000       // 15 minutes
    });
    
    // Set refresh token cookie (long-lived)
    res.cookie('refreshToken', refreshToken, { 
      //httpOnly: true,              // Prevent client-side JS from reading the cookie
      //secure: false,               // Disable Secure for testing on plain HTTP (must be true in production with HTTPS)
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Also return tokens in JSON response
    res.status(200).send({
      message: 'Login successful',
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
}

// ====================== Refresh Token ======================
async function refreshToken(req, res) {

  console.log("Cookies received in refresh:", req.cookies);

  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (!token) return res.status(401).send({ message: 'No refresh token provided' });

  try {
    const decoded = jwt.verify(token, refreshTokenSecret);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return res.status(403).send({ message: 'Invalid refresh token' });
    }

    const userPayload = { id: user._id, username: user.username, role: user.role };
    const newAccessToken = jwt.sign(userPayload, accessTokenSecret, { expiresIn: accessTokenExpiresIn });

    // res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 15 * 60 * 1000 });
    // Set cookies again with updated accessToken
    res.cookie('accessToken', newAccessToken, {
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.cookie('refreshToken', refreshToken, {
            //httpOnly: true,
            //secure: false,   // force disable Secure while testing with plain HTTP
            maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).send({
      message: 'Token refreshed',
      accessToken: newAccessToken
    });
  } catch (err) {
    return res.status(403).send({ message: 'Invalid refresh token' });
  }
}

// ====================== Logout ======================
async function logout(req, res) {
  const token = req.cookies.refreshToken;
  if (token) {
    try {
      const decoded = jwt.verify(token, refreshTokenSecret);
      await User.updateOne({ _id: decoded.id }, { $unset: { refreshToken: "" } });
    } catch (err) {
      // ignore error if token invalid
    }
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.status(200).send({ message: 'Logged out successfully' });
}

module.exports = { register, login, refreshToken, logout };
