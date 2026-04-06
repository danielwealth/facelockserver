// server/routes/adminReview.js
const express = require('express');
const User = require('../models/User');
const requireAdmin = require('../middleware/requireAdmin'); // middleware to check admin role
const router = express.Router();

/**
 * GET /admin/pending-verifications
 * List all users with pending verification
 */
router.get('/pending-verifications', requireAdmin, async (req, res) => {
  try {
    const pendingUsers = await User.find({ verificationStatus: 'pending' });
    res.json({ success: true, users: pendingUsers });
  } catch (err) {
    console.error('Error fetching pending verifications:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /admin/verify-user/:id
 * Approve or reject a user manually
 */
router.post('/verify-user/:id', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body; // 'verified' or 'rejected'
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.verificationStatus = status;
    user.matchHistory.push({ result: `admin ${status}`, source: 'admin-review', createdAt: new Date() });
    await user.save();

    res.json({ success: true, message: `User ${status} successfully` });
  } catch (err) {
    console.error('Admin verification error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
