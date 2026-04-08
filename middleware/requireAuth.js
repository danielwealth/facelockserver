// src/middleware/requireAuth.js
const jwt = require('jsonwebtoken');

async function requireAuth(req, res, next) {
  try {
    const sessionUser = req.session?.user;
    if (sessionUser) { req.user = sessionUser; return next(); }

    if (req.user) return next();

    const authHeader = req.get('Authorization') || '';
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    if (m && process.env.JWT_SECRET) {
      try {
        const payload = jwt.verify(m[1], process.env.JWT_SECRET);
        req.user = { id: payload.sub || payload.id, email: payload.email, role: payload.role };
        return next();
      } catch (err) {
        // invalid token -> fall through
      }
    }

    return res.status(401).json({ success: false, error: 'Unauthorized' });
  } catch (err) {
    console.error('requireAuth error', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

module.exports = requireAuth;
