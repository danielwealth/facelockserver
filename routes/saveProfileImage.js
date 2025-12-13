const express = require('express');
const User = require('../models/User'); // adjust path to your User model
const router = express.Router();

// Save S3 key + descriptor + secret key in MongoDB
router.post('/save-profile-image', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { key, descriptor, s3Key } = req.body;
    const userId = req.session.user._id;

    if (!key || !descriptor || !s3Key) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Find user and update profile image + descriptor
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.secretKey = key;                // store the user’s unlock key
    user.faceDescriptor = descriptor;    // store biometric descriptor
    user.profileImage = s3Key;           // store S3 object key

    await user.save();

    res.json({ success: true, message: 'Profile image saved successfully' });
  } catch (err) {
    console.error('Error saving profile image:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
