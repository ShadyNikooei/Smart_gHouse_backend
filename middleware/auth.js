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
  const headerAccessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  // Also allow reading the access token from cookie (fallback for silent flows)
  const cookieAccessToken = req.cookies?.accessToken || null;
  const accessToken = headerAccessToken || cookieAccessToken;

  // Case 1: No access token provided → try silent refresh
  if (!accessToken) {
    return trySilentRefresh(req, res, next);
  }

  // Attempt to verify the access token
  jwt.verify(accessToken, accessTokenSecret, async (err, user) => {
    if (!err) {
      // Token is valid → attach decoded payload to request and continue
      req.user = user;
      return next();
    }

    // Case 2: Access token is invalid (not just expired) → still try silent refresh
    if (err.name !== 'TokenExpiredError') {
      return trySilentRefresh(req, res, next);
    }

    // Case 3: Access token is expired → try silent refresh with refresh token
    return trySilentRefresh(req, res, next);
  });
}

/**
 * Tries to silently refresh tokens using the refresh token stored in DB.
 * - Rotates refresh token in DB.
 * - Sets new access/refresh cookies with ONLY maxAge (no other flags).
 * - For page refresh flow (/auth/refresh or x-refresh: true), responds 200.
 * - Otherwise, attaches req.user and calls next() so the original request proceeds.
 */
async function trySilentRefresh(req, res, next) {
  try {
    // Read refresh token from cookie
    const refreshFromCookie = req.cookies?.refreshToken;
    if (!refreshFromCookie) {
      return res.status(401).json({
        code: 'NO_REFRESH_TOKEN',
        message: 'No refresh token found. Please login again.',
      });
    }

    // Verify refresh token signature
    let refreshPayload;
    try {
      refreshPayload = jwt.verify(refreshFromCookie, refreshTokenSecret);
    } catch {
      return res.status(401).json({
        code: 'REFRESH_FAILED',
        message: 'Refresh token expired or invalid. Please login again.',
      });
    }

    // Retrieve user from database using payload id and ensure stored token matches
    const dbUser = await User.findById(refreshPayload.id);
    if (!dbUser || !dbUser.refreshToken || dbUser.refreshToken !== refreshFromCookie) {
      return res.status(401).json({
        code: 'RELOGIN_REQUIRED',
        message: 'Refresh token invalid or not found. Please login again.',
      });
    }

    // Build new JWT payload
    const newPayload = {
      id: dbUser._id,
      username: dbUser.username,
      role: dbUser.role,
    };

    // Issue new tokens
    const newAccessToken = jwt.sign(newPayload, accessTokenSecret, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign(newPayload, refreshTokenSecret, { expiresIn: '4d' });

    // Rotate refresh token in DB
    dbUser.refreshToken = newRefreshToken;
    await dbUser.save();

    // Set cookies with ONLY time-based maxAge (no httpOnly/secure/sameSite/path)
    res.cookie('accessToken', newAccessToken, { maxAge: 15 * 60 * 1000 });            // 15 minutes
    res.cookie('refreshToken', newRefreshToken, { maxAge: 4 * 24 * 60 * 60 * 1000 }); // 4 days

    // IMPORTANT: For page refresh and sending the access token cookie, respond 200.
    const isPageRefreshFlow = req.path === '/auth/refresh' || req.headers['x-refresh'] === 'true';
    if (isPageRefreshFlow) {
      return res.status(200).json({
        code: 'TOKENS_ROTATED',
        message: 'New access token issued via cookie.',
        accessToken: newAccessToken, // optional: included for compatibility
      });
    }

    // Otherwise, continue the original request after silent refresh
    req.user = newPayload;
    return next();
  } catch {
    // Any failure during refresh should result in 401
    return res.status(401).json({
      code: 'REFRESH_FAILED',
      message: 'Refresh token invalid or expired. Please login again.',
    });
  }
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

/**
 * Global Auth Guard
 * -----------------
 * Mount this once in server.js.
 * - Every request passes here before hitting any route.
 * - OPTIONS (CORS preflight) is allowed through.
 * - Requests to PUBLIC_REGEX paths (e.g., /auth/*) bypass auth.
 * - All other requests must pass authenticateToken.
 */
/*function globalAuthGuard(req, res, next) {
  if (req.method === 'OPTIONS') return next();                // allow preflight
  const isPublic = PUBLIC_REGEX.some((re) => re.test(req.path));
  if (isPublic) return next();                                // skip auth for public paths
  return authenticateToken(req, res, next);                   // enforce auth otherwise
}

module.exports = { authenticateToken, authorizeRole, globalAuthGuard };
*/

module.exports = { authenticateToken, authorizeRole };
