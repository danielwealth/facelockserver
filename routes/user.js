// server/routes/user.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const requireUser = require('../middleware/requireUser'); // ✅ middleware to protect user routes

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
router.post('/user/lock-image', requireUser, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }

    // Extract descriptor (assumes you have a helper function getFaceDescriptor)
    const descriptor = await getFaceDescriptor(req.file.path);
    if (!descriptor) {
      return res.status(400).json({ success: false, error: 'No face detected in image' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Save descriptor + image path + history
    user.faceDescriptors.push(descriptor);
    user.images.push(`/uploads/${req.file.filename}`);
    user.matchHistory.push({
      result: 'locked',
      source: 'upload',
      createdAt: new Date(),
    });
    await user.save();

    res.json({
      success: true,
      message: 'Image locked successfully',
      imagePath: `/uploads/${req.file.filename}`,
    });
  } catch (err) {
    console.error('Lock image error:', err);
    res.status(500).json({ success: false, error: 'Server error while locking image' });
  }
});

/**
 * GET /user/match-history
 * Return user’s match history
 */
router.get('/user/match-history', requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, history: user.matchHistory || [] });
  } catch (err) {
    console.error('Fetch match history error:', err);
    res.status(500).json({ success: false, error: 'Server error fetching history' });
  }
});

/**
 * GET /user/dashboard
 * Simple protected route for user dashboard
 */
router.get('/user/dashboard', requireUser, (req, res) => {
  res.json({ success: true, message: 'Welcome to the User Dashboard' });
});

module.exports = router;
