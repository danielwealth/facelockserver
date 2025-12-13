const express = require('express');
const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Unlock route: validate secret key only
router.post('/unlocked-image', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { _id } = req.session.user;
    const { key } = req.body; // secret key entered by user

    const user = await User.findById(_id);
    if (!user || !user.profileImage) {
      return res.status(404).json({ success: false, error: 'No profile image found' });
    }

    // ✅ Compare entered key with hashed key in DB
    const match = await bcrypt.compare(key, user.secretKey);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid secret key' });
    }

    // Generate signed GET URL for the cover image
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: user.profileImage,
      Expires: 300, // 5 minutes
    });

    res.json({ success: true, image: signedUrl });
  } catch (err) {
    console.error('Error unlocking image:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
