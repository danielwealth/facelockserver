const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AWS = require('aws-sdk');

// Configure S3 client
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// --- Signup (user only) ---
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const newUser = new User({
  email,
  password,
  role: 'user',
  secretKey: crypto.randomBytes(32).toString('hex'),
  profileImage: '' // or a default image path
});

    await newUser.save();

    req.session.authenticated = true;
    req.session.user = { id: newUser._id, email: newUser.email, role: newUser.role };
    req.session.key = crypto.randomBytes(32).toString('hex');

    res.json({ success: true, message: 'Signed up successfully', user: newUser.email });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to sign up' });
  }
});

// --- User Login ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.role !== 'user') {
      return res.status(403).json({ error: 'Not authorized as user' });
    }

    req.session.authenticated = true;
    req.session.user = { id: user._id, email: user.email, role: user.role };
    req.session.key = crypto.randomBytes(32).toString('hex');

    res.json({ success: true, message: 'User logged in successfully', user: user.email });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// --- Admin Login ---
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await admin.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized as admin' });
    }

    req.session.authenticated = true;
    req.session.user = { id: admin._id, email: admin.email, role: admin.role };
    req.session.key = crypto.randomBytes(32).toString('hex');

    res.json({ success: true, message: 'Admin logged in successfully', user: admin.email });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Failed to log in as admin' });
  }
});

// --- Generate Pre-Signed URL for Upload ---
router.post('/get-upload-url', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { filename, filetype } = req.body;
    const userId = req.session.user.id;
    const key = `${userId}/${Date.now()}-${filename}`;

    const uploadUrl = await s3.getSignedUrlPromise('putObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: filetype,
      Expires: 300,
      ACL: 'private',
    });

    res.json({ uploadUrl, key });
  } catch (err) {
    console.error('Presigned URL error:', err);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

router.post('/save-profile-image', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { s3Key, descriptor, key } = req.body; // key = passkey
    const userId = req.session.user.id;

    if (!s3Key || !descriptor || !key) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Hash the passkey
    const hashedKey = await bcrypt.hash(key, 12);

    // Construct full S3 URL
    const fullUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.secretKey = hashedKey;       // hashed passkey
    user.faceDescriptor = descriptor; // biometric descriptor
    user.profileImage = fullUrl;      // ✅ store S3 URL

    await user.save();

    res.json({ success: true, message: 'Profile image saved successfully', user });
  } catch (err) {
    console.error('Save image error:', err);
    res.status(500).json({ error: 'Failed to save profile image' });
  }
});


// --- Serve Images Securely (via pre-signed GET URL) ---
// --- Serve Profile Image Securely ---
router.get('/profile-image/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user || !user.profileImage) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Only allow admins or the user themselves
    if (
      req.session.user.role !== 'admin' &&
      req.session.user.id.toString() !== user._id.toString()
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Generate presigned GET URL
    const viewUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: user.profileImage, // stored S3 key
      Expires: 300, // 5 minutes
    });

    res.json({ url: viewUrl });
  } catch (err) {
    console.error('Image serve error:', err);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});


    res.json({ url: viewUrl });
  } catch (err) {
    console.error('Image serve error:', err);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

module.exports = router;
