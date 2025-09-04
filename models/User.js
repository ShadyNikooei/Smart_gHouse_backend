// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'user' }, // Can be 'user' or 'admin'
  refreshToken: { type: String } // Added to store the refresh token for persistent sessions
});

module.exports = mongoose.model('User', userSchema);
