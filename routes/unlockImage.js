const express = require('express');
const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// Configure S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// --- Unlock route: validate secret key and return presigned GET URL ---
router.post('/unlocked-image', async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.session || !req.session.user) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const userId = req.session.user.id || req.session.user._id; // handle both id/_id
    const { key } = req.body; // secret key entered by user

    // Find user and check profile image
    const user = await User.findById(userId);
    if (!user || !user.profileImage) {
      return res.status(404).json({ success: false, error: 'No profile image found' });
    }

    // ✅ Compare entered key with hashed key in DB
    const match = await bcrypt.compare(key, user.secretKey);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid secret key' });
    }

    // ✅ Generate presigned GET URL for the profile image
    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: user.profileImage, // stored S3 key
      Expires: 300, // 5 minutes
    });

    res.json({ success: true, imageUrl: signedUrl });
  } catch (err) {
    console.error('Error unlocking image:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
