// server/routes/saveProfileImage.js
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { encryptData } = require('../services/encryption');
const router = express.Router();

router.post('/save-profile-image', async (req, res) => {
  try {
    if (!req.session?.user) return res.status(403).json({ error: 'Unauthorized' });

    const { key, descriptor, s3Key } = req.body || {};
    if (!key || !descriptor || !s3Key) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedKey = await bcrypt.hash(key, 12);
    const encryptedDescriptor = encryptData(descriptor);
    const encryptedS3Key = encryptData(s3Key);

    const user = await User.findById(req.session.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.secretKey = hashedKey;
    user.faceDescriptor = encryptedDescriptor;
    user.profileImage = encryptedS3Key;

    await user.save();

    res.json({ success: true, message: 'Profile data saved securely' });
  } catch (err) {
    console.error('Error saving profile data:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
