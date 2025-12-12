const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const path = require('path');

// --- Unlock Image ---
router.post('/unlock-image', async (req, res) => {
  try {
    const { key, descriptor } = req.body;
    if (!key || !descriptor) {
      return res.status(400).json({ error: 'Key and descriptor required' });
    }

    // Parse descriptor from JSON string
    const newDescriptor = JSON.parse(descriptor);

    // Find all users with stored descriptors
    const users = await User.find({ faceDescriptor: { $exists: true } });

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
