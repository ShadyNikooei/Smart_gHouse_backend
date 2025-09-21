// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'access-secret-key-!@#$';
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key-!@#$';

/**
 * Middleware to authenticate a user using the Access Token.
 * If the access token is expired, attempts to refresh it using the refresh token stored in DB.
 */
async function authenticateToken(req, res, next) {
  // Get access token from the Authorization header (format: Bearer <token>)
  const authHeader = req.headers['authorization'];
  const accessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  // Case 1: No access token provided
  if (!accessToken) {
    return res.status(401).json({
      code: 'NO_ACCESS_TOKEN',
      message: 'Access token is required. Please login.',
    });
  }

  // Attempt to verify the access token
  jwt.verify(accessToken, accessTokenSecret, async (err, user) => {
    if (!err) {
      // Token is valid → attach decoded payload to request and continue
      req.user = user;
      return next();
    }

    // Case 2: Access token is invalid (not just expired)
    if (err.name !== 'TokenExpiredError') {
      return res.status(401).json({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Access token is invalid or malformed',
      });
    }

    // Case 3: Token is expired → attempt token rotation using stored refresh token
    try {
      // Decode expired token to get user ID
      const decoded = jwt.decode(accessToken);
      if (!decoded?.id) {
        return res.status(401).json({
          code: 'INVALID_PAYLOAD',
          message: 'Access token payload is invalid',
        });
      }

      // Retrieve user from database using decoded ID
      const dbUser = await User.findById(decoded.id);
      if (!dbUser || !dbUser.refreshToken) {
        return res.status(401).json({
          code: 'RELOGIN_REQUIRED',
          message: 'No refresh token stored. Please login again.',
        });
      }

      // Verify the refresh token stored in the DB
      jwt.verify(dbUser.refreshToken, refreshTokenSecret);

      // Generate new access and refresh tokens
      const newPayload = {
        id: dbUser._id,
        username: dbUser.username,
        role: dbUser.role,
      };

      const newAccessToken = jwt.sign(newPayload, accessTokenSecret, {
        expiresIn: '15m',
      });

      const newRefreshToken = jwt.sign(newPayload, refreshTokenSecret, {
        expiresIn: '4d',
      });

      // Update user's refresh token in the database (rotation)
      dbUser.refreshToken = newRefreshToken;
      await dbUser.save();

      // Return only the new access token (DO NOT return refresh token to client)
      return res.status(202).json({
        code: 'TOKENS_ROTATED',
        message: 'New access token issued. Retry your request with it.',
        accessToken: newAccessToken,
      });
    } catch (error) {
      // Refresh token is expired or invalid
      return res.status(401).json({
        code: 'REFRESH_FAILED',
        message: 'Refresh token expired or invalid. Please login again.',
      });
    }
  });
}

/**
 * Middleware to restrict access to users with a specific role.
 * Example usage: authorizeRole('admin')
 */
function authorizeRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'NOT_AUTHENTICATED',
        message: 'User is not authenticated',
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'User does not have permission for this action',
      });
    }

    next();
  };
}

module.exports = { authenticateToken, authorizeRole };


/*

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'access-secret-key-!@#$';
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key-!@#$';


// * Middleware to authenticate a user using the Access Token.
 // If the access token is expired, attempts to refresh it using the refresh token stored in DB.
 
async function authenticateToken(req, res, next) {
  // Get access token from the Authorization header (format: Bearer <token>)
  const authHeader = req.headers['authorization'];
  const accessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  // Case 1: No access token provided
  if (!accessToken) {
    return res.status(401).json({
      code: 'NO_ACCESS_TOKEN',
      message: 'Access token is required. Please login.',
    });
  }

  // Try verifying access token
  jwt.verify(accessToken, accessTokenSecret, async (err, user) => {
    if (!err) {
      // Token is valid → allow request
      req.user = user;
      return next();
    }

    // If token is invalid (not just expired)
    if (err.name !== 'TokenExpiredError') {
      return res.status(401).json({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Access token is invalid or malformed.',
      });
    }

    // Token is expired → try refresh logic
    try {
      // Decode to extract user ID from expired token
      const decoded = jwt.decode(accessToken);
      if (!decoded?.id) {
        return res.status(401).json({
          code: 'INVALID_PAYLOAD',
          message: 'Access token payload is invalid.',
        });
      }

      // Get refresh token from cookie
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({
          code: 'NO_REFRESH_TOKEN',
          message: 'No refresh token found. Please login again.',
        });
      }

      // Find user in DB
      const dbUser = await User.findById(decoded.id);
      if (!dbUser || dbUser.refreshToken !== refreshToken) {
        return res.status(401).json({
          code: 'REFRESH_INVALID',
          message: 'Refresh token invalid or not found.',
        });
      }

      // Verify refresh token
      jwt.verify(refreshToken, refreshTokenSecret);

      // Create new tokens
      const newPayload = {
        id: dbUser._id,
        username: dbUser.username,
        role: dbUser.role,
      };

      const newAccessToken = jwt.sign(newPayload, accessTokenSecret, {
        expiresIn: '15m',
      });

      const newRefreshToken = jwt.sign(newPayload, refreshTokenSecret, {
        expiresIn: '4d',
      });

      // Update stored refresh token
      dbUser.refreshToken = newRefreshToken;
      await dbUser.save();

      // Set new access token in cookie (so frontend can use it again)
      res.cookie('accessToken', newAccessToken, {
        maxAge: 15 * 60 * 1000,
        httpOnly: false, // frontend JS should be able to read it
      });

      // Also rotate refresh token in cookie
      res.cookie('refreshToken', newRefreshToken, {
        maxAge: 4 * 24 * 60 * 60 * 1000,
      });

      return res.status(202).json({
        code: 'TOKENS_ROTATED',
        message: 'New access token issued. Please retry your request.',
      });

    } catch (error) {
      return res.status(401).json({
        code: 'REFRESH_FAILED',
        message: 'Refresh token invalid or expired. Please login again.',
      });
    }
  });
}


// * Middleware to restrict access to users with a specific role.
// * Example: authorizeRole('admin')
 
function authorizeRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'NOT_AUTHENTICATED',
        message: 'User is not authenticated',
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'User does not have permission for this action',
      });
    }

    next();
  };
}

module.exports = { authenticateToken, authorizeRole };
*/