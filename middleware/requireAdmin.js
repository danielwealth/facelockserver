// server/middleware/requireAdmin.js
module.exports = function requireAdmin(req, res, next) {
  try {
    // Assuming req.session.user or req.user is set by your auth middleware
    const user = req.session?.user || req.user;
    if (!user) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    next(); // user is admin, proceed
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ success: false, error: 'Server error checking admin role' });
  }
};
