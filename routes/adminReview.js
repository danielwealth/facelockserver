// server/routes/adminReview.js
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const requireAdmin = require('../middleware/requireAdmin');
const { logEvent, queryLogs } = require('../services/audit');
const router = express.Router();

/**
 * Helper: parse and clamp integer query params
 */
function parseIntParam(value, fallback, min = -Infinity, max = Infinity) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/**
 * GET /admin/pending-verifications
 * Paginated list of users with verificationStatus = 'pending'
 * Query params: page (1-based), limit
 */
router.get('/pending-verifications', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(parseIntParam(req.query.page, 1, 1), 1);
    const limit = Math.min(parseIntParam(req.query.limit, 25, 1), 200);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({ verificationStatus: 'pending' })
        .select('email name verificationStatus createdAt') // minimal fields
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ verificationStatus: 'pending' })
    ]);

    return res.json({ success: true, page, limit, total, users });
  } catch (err) {
    console.error('Error fetching pending verifications:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /admin/user/:id
 * Fetch a single user's details for review (includes matchHistory)
 */
router.get('/user/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid user id' });
    }

    const user = await User.findById(id)
      .select('-password -secretKey -faceDescriptor') // hide sensitive fields
      .lean();

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.json({ success: true, user });
  } catch (err) {
    console.error('Error fetching user for admin review:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /admin/verify-user/:id
 * Approve or reject a user manually
 * Body: { status: 'verified' | 'rejected', note?: string }
 */
router.post('/verify-user/:id', requireAdmin, async (req, res) => {
  const admin = req.session?.user || req.user || null;
  const { id } = req.params;
  const { status, note } = req.body || {};

  try {
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid user id' });
    }

    const user = await User.findById(id);
    if (!user) {
      await logEvent({
        actorId: admin?._id,
        actorEmail: admin?.email,
        action: 'admin_verify_user_failed',
        resourceType: 'User',
        resourceId: id,
        details: { reason: 'user_not_found' },
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'failure'
      }).catch(() => null);

      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.verificationStatus = status;
    user.matchHistory = user.matchHistory || [];
    user.matchHistory.push({
      result: `admin ${status}`,
      source: 'admin-review',
      note: note || null,
      adminId: admin?._id || null,
      createdAt: new Date()
    });

    await user.save();

    // Best-effort audit log
    await logEvent({
      actorId: admin?._id,
      actorEmail: admin?.email,
      action: 'admin_verify_user',
      resourceType: 'User',
      resourceId: user._id,
      details: { status, note },
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }).catch(() => null);

    return res.json({ success: true, message: `User ${status} successfully` });
  } catch (err) {
    console.error('Admin verification error:', err);

    await logEvent({
      actorId: admin?._id,
      actorEmail: admin?.email,
      action: 'admin_verify_user_error',
      resourceType: 'User',
      resourceId: mongoose.Types.ObjectId.isValid(id) ? id : null,
      details: { error: err.message },
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'failure'
    }).catch(() => null);

    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /admin/audit-logs
 * Fetch audit logs (admins only)
 * Query params: limit, actorId, action, outcome
 */
router.get('/audit-logs', requireAdmin, async (req, res) => {
  try {
    const { actorId, action, outcome } = req.query;
    const limit = Math.min(Math.max(parseIntParam(req.query.limit, 100, 1), 1), 1000);
    const filter = {};
    if (actorId) filter.actorId = actorId;
    if (action) filter.action = action;
    if (outcome) filter.outcome = outcome;

    const logs = await queryLogs(filter, { limit });
    return res.json({ success: true, logs });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
