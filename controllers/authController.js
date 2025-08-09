// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const jwtSecret = process.env.JWT_SECRET || ' myVery$tr0ngS3cretKey!2025';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

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

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).send({ message: 'username and password required' });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).send({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).send({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });
    res.status(200).send({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
}

module.exports = { register, login };
