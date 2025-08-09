// middleware/auth.js
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'secret-change-me';

// Middleware to verify JWT token and attach user payload to req.user
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).send({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).send({ message: 'Malformed token' });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).send({ message: 'Invalid token' });
    req.user = user; // { id, username, role }
    next();
  });
}

// Authorization middleware for roles
function authorizeRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).send({ message: 'Not authenticated' });
    if (req.user.role !== role) return res.status(403).send({ message: 'Forbidden' });
    next();
  };
}

module.exports = { authenticateToken, authorizeRole };
