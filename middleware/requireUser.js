// server/middleware/requireUser.js
module.exports = function requireUser(req, res, next) {
  if (!req.session || !req.session.authenticated || !req.session.user) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }

  if (req.session.user.role !== 'user') {
    return res.status(403).json({ success: false, error: 'Forbidden: Users only' });
  }

  next(); // ✅ user is authenticated and has role "user"
};
