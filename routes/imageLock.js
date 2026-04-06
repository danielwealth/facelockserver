// server/routes/imageLock.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const upload = require('../middleware/upload');

/**
 * POST /image-lock/upload-profile-image
 * Upload a profile image, lock it with a key + face descriptor
 */
router.post('/upload-profile-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { key, descriptor } = req.body || {};
    if (!key || !descriptor || !req.file) {
      return res.status(400).json({ error: 'Key, descriptor, and image are required' });
    }

    const keyHash = await bcrypt.hash(key, 12);
    const imagePath = `/uploads/${req.file.filename}`;

    await User.findByIdAndUpdate(req.session.user.id, {
      profileImage: imagePath,
      keyHash,
      faceDescriptor: JSON.parse(descriptor),
    });

    res.json({ success: true, message: 'Profile image uploaded successfully', profileImage: imagePath });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

/**
 * POST /image-lock/verify-image
 * Verify if an uploaded image matches a stored descriptor and key
 */
router.post('/verify-image', async (req, res) => {
  try {
    const { key, descriptor } = req.body || {};
    if (!key || !descriptor) {
      return res.status(400).json({ error: 'Key and descriptor required' });
    }

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

    const validKey = await bcrypt.compare(key, matchedUser.keyHash);
    if (!validKey) {
      return res.status(401).json({ status: 'unauthorized', reason: 'Invalid key' });
    }

    res.json({ status: 'authorized', userId: matchedUser._id });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Failed to verify image' });
  }
});

/**
 * Helper: Euclidean distance between two descriptors
 */
function euclideanDistance(d1, d2) {
  if (!Array.isArray(d1) || !Array.isArray(d2) || d1.length !== d2.length) return Infinity;
  return Math.sqrt(d1.reduce((sum, val, i) => sum + Math.pow(val - d2[i], 2), 0));
}

module.exports = router;
