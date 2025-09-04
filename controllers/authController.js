// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Define separate secrets and durations for access and refresh tokens for better security.
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'access-secret-key-!@#$';
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key-!@#$';
const accessTokenExpiresIn = '15m';  // Short-lived for security
const refreshTokenExpiresIn = '7d'; // Long-lived for better UX

// User registration logic (remains the same).
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

// User login logic, updated to use httpOnly cookies.
async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).send({ message: 'username and password required' });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).send({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).send({ message: 'Invalid credentials' });

    // Create both access and refresh tokens.
    const userPayload = { id: user._id, username: user.username, role: user.role };
    const accessToken = jwt.sign(userPayload, accessTokenSecret, { expiresIn: accessTokenExpiresIn });
    const refreshToken = jwt.sign(userPayload, refreshTokenSecret, { expiresIn: refreshTokenExpiresIn });

    // Save the refresh token to the database to manage sessions.
    user.refreshToken = refreshToken;
    await user.save();

    // Set tokens in secure, httpOnly cookies.
    res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 15 * 60 * 1000 }); // 15 minutes
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

    res.status(200).send({ message: 'Login successful' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
}

// New function to refresh the access token using the refresh token.
async function refreshToken(req, res) {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).send({ message: 'No refresh token provided' });

    try {
        const decoded = jwt.verify(token, refreshTokenSecret);
        const user = await User.findById(decoded.id);

        // Verify that the refresh token from the cookie matches the one in the DB.
        if (!user || user.refreshToken !== token) {
            return res.status(403).send({ message: 'Invalid refresh token' });
        }

        // Issue a new access token.
        const userPayload = { id: user._id, username: user.username, role: user.role };
        const newAccessToken = jwt.sign(userPayload, accessTokenSecret, { expiresIn: accessTokenExpiresIn });

        res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 15 * 60 * 1000 });
        res.status(200).send({ message: 'Token refreshed' });
    } catch (err) {
        return res.status(403).send({ message: 'Invalid refresh token' });
    }
}

// New function for user logout.
async function logout(req, res) {
    const token = req.cookies.refreshToken;
    if (token) {
        try {
            const decoded = jwt.verify(token, refreshTokenSecret);
            // Clear the refresh token from the database to invalidate the session.
            await User.updateOne({ _id: decoded.id }, { $unset: { refreshToken: "" } });
        } catch (err) {
            // Ignore error if token is invalid, just clear cookies.
        }
    }

    // Clear the cookies on the client side.
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(200).send({ message: 'Logged out successfully' });
}


module.exports = { register, login, refreshToken, logout };

