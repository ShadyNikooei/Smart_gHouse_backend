// middleware/auth.js
const jwt = require('jsonwebtoken');

// Use the new secret for the access token.
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'access-secret-key-!@#$';

/**
 * Middleware to verify JWT token from an httpOnly cookie.
 */
function authenticateToken(req, res, next) {
    // Read the token from the cookie instead of the Authorization header.
    const token = req.cookies.accessToken;

    if (!token) return res.status(401).send({ message: 'No token provided, access denied' });

    jwt.verify(token, accessTokenSecret, (err, user) => {
        if (err) {
            // If the token is expired, the client should use its refresh token to get a new one.
            if (err.name === 'TokenExpiredError') {
                return res.status(401).send({ message: 'Token expired' });
            }
            return res.status(403).send({ message: 'Invalid token' });
        }
        req.user = user; // Attach user payload ({ id, username, role }) to the request object.
        next();
    });
}

/**
 * Middleware to authorize a user based on their role.
 * @param {string} role - The required role (e.g., 'admin').
 */
function authorizeRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).send({ message: 'Not authenticated' });
    if (req.user.role !== role) return res.status(403).send({ message: 'Forbidden: Insufficient permissions' });
    next();
  };
}

module.exports = { authenticateToken, authorizeRole };
