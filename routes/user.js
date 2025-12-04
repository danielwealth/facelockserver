// server/routes/user.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

/**
 * POST /user/lock-image
 * Upload an image, extract face descriptor, and save to user record
 */
router.post('/lock-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Extract descriptor
    const descriptor = await getFaceDescriptor(req.file.path);
    if (!descriptor) {
      return res.status(400).json({ error: 'No face detected in image' });
    }

    // Find authenticated user (req.user set by auth middleware)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Save descriptor + image path + history
    user.faceDescriptors.push(descriptor);
    user.images.push(`/uploads/${req.file.filename}`);
    user.matchHistory.push({
      result: 'locked',
      source: 'upload',
    });
    await user.save();

    res.json({
      success: true,
      message: 'Image locked successfully',
      imagePath: `/uploads/${req.file.filename}`,
    });
  } catch (err) {
    console.error('Lock image error:', err);
    res.status(500).json({ error: 'Server error while locking image' });
  }
});

/**
 * GET /match/history
 * Return user’s match history
 */
router.get('/match/history', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.matchHistory || []);
  } catch (err) {
    console.error('Fetch match history error:', err);
    res.status(500).json({ error: 'Server error fetching history' });
  }
});

module.exports = router;
