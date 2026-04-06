// server/routes/saveProfileImage.js
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const router = express.Router();

/**
 * POST /save-profile-image
 * Save encrypted profile image data (no raw image path)
 */
router.post('/save-profile-image', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { key, descriptor, s3Key } = req.body || {};
    const userId = req.session.user.id;

    if (!key || !descriptor || !s3Key) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Hash the secret key
    const hashedKey = await bcrypt.hash(key, 12);

    // Encrypt descriptor for storage
    const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_SECRET);
    let encryptedDescriptor = cipher.update(JSON.stringify(descriptor), 'utf8', 'hex');
    encryptedDescriptor += cipher.final('hex');

    // Encrypt S3 key reference (optional)
    const cipher2 = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_SECRET);
    let encryptedS3Key = cipher2.update(s3Key, 'utf8', 'hex');
    encryptedS3Key += cipher2.final('hex');

    // Update user record
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.secretKey = hashedKey;               // hashed key
    user.faceDescriptor = encryptedDescriptor; // encrypted descriptor
    user.profileImage = encryptedS3Key;       // encrypted reference to S3 object

    await user.save();

    res.json({ success: true, message: 'Profile data saved securely' });
  } catch (err) {
    console.error('Error saving profile data:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
