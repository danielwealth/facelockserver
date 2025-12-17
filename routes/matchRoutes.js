// server/routes/matchRoutes.js
const express = require('express');
const router = express.Router();
const MatchHistory = require('../models/MatchHistory');

// GET match history for authenticated user
router.get('/match/history', async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.session || !req.session.authenticated || !req.session.user) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const userId = req.session.user.id;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing user ID in session' });
    }

    // Query DB for this user's match history
    const history = await MatchHistory.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    // Format response for client
    const formatted = history.map(h => ({
      name: h.name || 'Unknown',
      timestamp: h.createdAt,
    }));

    res.json({ success: true, history: formatted });
  } catch (err) {
    console.error('Error fetching match history:', err);
    res.status(500).json({ success: false, error: 'Server error while fetching match history' });
  }
});

module.exports = router;
