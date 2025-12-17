const express = require('express');
const bcrypt = require('bcryptjs');
const AWS = require('aws-sdk');
const User = require('../models/User');
const router = express.Router();

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// --- Unlock route: validate secret key and return presigned GET URL ---
router.post('/unlocked-image', async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.session || !req.session.user) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const userId = req.session.user.id;
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, error: 'Secret key required' });
    }

    const user = await User.findById(userId);
    if (!user || !user.profileImage) {
      return res.status(404).json({ success: false, error: 'No profile image found' });
    }

    // Compare provided key with stored bcrypt hash
    const match = await bcrypt.compare(key, user.secretKey);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid secret key' });
    }

    // ✅ Generate presigned GET URL using stored S3 key
    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: user.profileImage, // stored as S3 object key
      Expires: 300, // 5 minutes
    });

    console.log("Unlock success, returning URL:", signedUrl);
    return res.json({ success: true, imageUrl: signedUrl });
  } catch (err) {
    console.error('Error unlocking image:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
