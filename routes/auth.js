const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const path = require('path');
const upload = require('../middleware/upload');

// --- Upload Profile Image (locked with key + descriptor) ---
router.post('/upload-profile-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { key, descriptor } = req.body;
    if (!key || !descriptor) {
      return res.status(400).json({ error: 'Key and descriptor required' });
    }

    const keyHash = await bcryptjs.hash(key, 10);
    const imagePath = `/uploads/${req.file.filename}`;

    await User.findByIdAndUpdate(req.session.user.id, {
      profileImage: imagePath,
      keyHash,
      faceDescriptor: JSON.parse(descriptor),
    });

    res.json({ success: true, profileImage: imagePath });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// --- Verify Image Usage ---
router.post('/verify-image', async (req, res) => {
  try {
    const { key, descriptor } = req.body;
    if (!key || !descriptor) return res.status(400).json({ error: 'Key and descriptor required' });

    const newDescriptor = JSON.parse(descriptor);
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

    const validKey = await bcryptjs.compare(key, matchedUser.keyHash);
    if (!validKey) {
      return res.status(401).json({ status: 'unauthorized', reason: 'Invalid key' });
    }

    res.json({ status: 'authorized', userId: matchedUser._id });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Failed to verify image' });
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
