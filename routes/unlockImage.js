// server/routes/unlockedImage.js
const express = require('express');
const bcrypt = require('bcryptjs');
const AWS = require('aws-sdk');
const User = require('../models/User');
const { decryptData } = require('../services/encryption'); // ✅ helper for decryption
const router = express.Router();

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

/**
 * POST /unlocked-image
 * Validate secret key and return presigned GET URL
 */
router.post('/unlocked-image', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const userId = req.session.user.id;
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ success: false, error: 'Secret key required' });

    const user = await User.findById(userId);
    if (!user?.profileImage) {
      return res.status(404).json({ success: false, error: 'No profile image found' });
    }

    // Compare provided key with stored bcrypt hash
    const match = await bcrypt.compare(key, user.secretKey);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid secret key' });
    }

    // Decrypt stored S3 key reference
    const decryptedS3Key = decryptData(user.profileImage);

    // Generate presigned GET URL
    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: decryptedS3Key,
      Expires: 300, // 5 minutes
    });

    return res.json({ success: true, imageUrl: signedUrl });
  } catch (err) {
    console.error('Error unlocking image:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
