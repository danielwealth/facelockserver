const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// --- Unlock Image ---
router.post('/unlock-image', async (req, res) => {
  try {
    const { key, descriptor } = req.body;
    if (!key || !descriptor) {
      return res.status(400).json({ error: 'Key and descriptor required' });
    }

    if (!req.session || !req.session.user) {
      return res.status(403).json({ error: 'Unauthorized: no active session' });
    }

    const { role, id } = req.session.user;

    // Parse descriptor from JSON string
    const newDescriptor = JSON.parse(descriptor);

    // Admins can search all users, normal users only themselves
    let users;
    if (role === 'admin') {
      users = await User.find({ faceDescriptor: { $exists: true } });
    } else {
      users = await User.find({ _id: id, faceDescriptor: { $exists: true } });
    }

    let matchedUser = null;
    for (const u of users) {
      const distance = euclideanDistance(newDescriptor, u.faceDescriptor);
      if (distance < 0.6) { // threshold for match
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ status: 'unauthorized', reason: 'Face not recognized' });
    }

    // Verify the secret key
    const validKey = await bcrypt.compare(key, matchedUser.keyHash);
    if (!validKey) {
      return res.status(401).json({ status: 'unauthorized', reason: 'Invalid key' });
    }

    // Authorized: return unlocked image path
    res.json({
      status: 'authorized',
      role,
      imagePath: matchedUser.profileImage,
      userId: matchedUser._id,
    });
  } catch (err) {
    console.error('Unlock error:', err);
    res.status(500).json({ error: 'Failed to unlock image' });
  }
});

// Helper function for descriptor comparison
function euclideanDistance(d1, d2) {
  let sum = 0;
  for (let i = 0; i < d1.length; i++) {
    sum += Math.pow(d1[i] - d2[i], 2);
  }
  return Math.sqrt(sum);
}

module.exports = router;
