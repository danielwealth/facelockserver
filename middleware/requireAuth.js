// src/middleware/requireAuth.js
const jwt = require('jsonwebtoken'); // optional, only if you use JWTs

/**
 * requireAuth middleware
 * - Accepts session-based auth (req.session.user or req.user)
 * - Optionally accepts Bearer JWT in Authorization header (if JWT_SECRET is set)
 * - On success attaches req.user (normalized) and calls next()
 * - On failure returns 401 JSON
 */
module.exports = async function requireAuth(req, res, next) {
  try {
    // 1) Session-based auth (express-session)
    const sessionUser = req.session?.user;
    if (sessionUser) {
      req.user = sessionUser;
      return next();
    }

    // 2) If you use Passport, it may set req.user already
    if (req.user) return next();

    // 3) Bearer token (JWT) fallback — optional
    const authHeader = req.get('Authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && process.env.JWT_SECRET) {
      const token = match[1];
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        // normalize user object shape used across the app
        req.user = { id: payload.sub || payload.id, email: payload.email, role: payload.role };
        return next();
      } catch (err) {
        // invalid token — fall through to unauthorized response
      }
    }

    // Not authenticated
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  } catch (err) {
    console.error('requireAuth error', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = requireAuth;
