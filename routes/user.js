// server/routes/user.js
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin'); // optional admin guard
const { decryptData, encryptData } = require('../services/encryption'); // optional helpers
const { logEvent } = require('../services/audit'); // optional audit hook

const router = express.Router();

/**
 * Simple disk multer for optional profile image uploads (10MB)
 * Swap to multer-s3 if you prefer direct S3 uploads.
 */
const UPLOAD_DIR = require('path').join(__dirname, '..', 'uploads', 'profiles');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    require('fs').mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/* ---------- Helpers ---------- */
function safeJson(res, status, payload) {
  return res.status(status).json(payload);
}
async function safeUnlink(p) {
  if (!p) return;
  try { await require('fs').promises.unlink(p); } catch (e) { /* ignore */ }
}

/* ---------- Routes ---------- */

/**
 * GET /users/me
 * Return current user's public profile (sanitized)
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const sessionUser = req.session?.user || req.user;
    if (!sessionUser) return safeJson(res, 403, { success: false, error: 'Unauthorized' });

    const user = await User.findById(sessionUser.id).lean();
    if (!user) return safeJson(res, 404, { success: false, error: 'User not found' });

    return safeJson(res, 200, { success: true, user });
  } catch (err) {
    console.error('GET /users/me error', err);
    return safeJson(res, 500, { success: false, error: 'Server error' });
  }
});

/**
 * PUT /users/me
 * Update editable profile fields: name, dob, idNumber
 */
router.put('/me', requireAuth, async (req, res) => {
  try {
    const sessionUser = req.session?.user || req.user;
    if (!sessionUser) return safeJson(res, 403, { success: false, error: 'Unauthorized' });

    const { name, dob, idNumber } = req.body || {};
    const updates = {};
    if (typeof name === 'string') updates.name = name.trim();
    if (typeof dob === 'string') updates.dob = dob.trim();
    if (typeof idNumber === 'string') updates.idNumber = idNumber.trim();

    if (Object.keys(updates).length === 0) return safeJson(res, 400, { success: false, error: 'No valid fields to update' });

    const user = await User.findByIdAndUpdate(sessionUser.id, { $set: updates }, { new: true }).lean();
    if (!user) return safeJson(res, 404, { success: false, error: 'User not found' });

    try { await logEvent({ action: 'user_update', actorId: sessionUser.id, resourceId: user._id, details: updates }); } catch (e) { /* swallow */ }

    return safeJson(res, 200, { success: true, user });
  } catch (err) {
    console.error('PUT /users/me error', err);
    return safeJson(res, 500, { success: false, error: 'Server error' });
  }
});

/**
 * POST /users/me/profile-image
 * Upload a profile image (disk fallback). Returns stored path or S3 key depending on your storage.
 */
router.post('/me/profile-image', requireAuth, upload.single('image'), async (req, res) => {
  const file = req.file;
  const sessionUser = req.session?.user || req.user;
  if (!sessionUser) {
    if (file?.path) await safeUnlink(file.path);
    return safeJson(res, 403, { success: false, error: 'Unauthorized' });
  }
  if (!file) return safeJson(res, 400, { success: false, error: 'Image file required' });

  try {
    // In this simple implementation we store the disk path in profileImage.
    // In production you likely upload to S3 and store the S3 key instead.
    const profileImageRef = file.path;
    const user = await User.findByIdAndUpdate(sessionUser.id, { profileImage: profileImageRef }, { new: true }).lean();

    try { await logEvent({ action: 'upload_profile_image', actorId: sessionUser.id, resourceId: user._id, details: { profileImageRef } }); } catch (e) { /* swallow */ }

    return safeJson(res, 200, { success: true, profileImage: profileImageRef });
  } catch (err) {
    console.error('POST /users/me/profile-image error', err);
    if (file?.path) await safeUnlink(file.path);
    return safeJson(res, 500, { success: false, error: 'Server error' });
  }
});

/**
 * POST /users/me/set-secret
 * Set or update the user's secret key (plain text in body). This will be hashed by the model pre-save.
 */
router.post('/me/set-secret', requireAuth, async (req, res) => {
  try {
    const sessionUser = req.session?.user || req.user;
    if (!sessionUser) return safeJson(res, 403, { success: false, error: 'Unauthorized' });

    const { secretKey } = req.body || {};
    if (!secretKey || typeof secretKey !== 'string' || secretKey.trim().length < 4) {
      return safeJson(res, 400, { success: false, error: 'Secret key required (min length 4)' });
    }

    const user = await User.findById(sessionUser.id);
    if (!user) return safeJson(res, 404, { success: false, error: 'User not found' });

    await user.setSecretKey(secretKey, true); // uses model helper to hash and save

    try { await logEvent({ action: 'set_secret_key', actorId: sessionUser.id, resourceId: user._id }); } catch (e) { /* swallow */ }

    return safeJson(res, 200, { success: true, message: 'Secret key updated' });
  } catch (err) {
    console.error('POST /users/me/set-secret error', err);
    return safeJson(res, 500, { success: false, error: 'Server error' });
  }
});

/**
 * POST /users/me/set-face-descriptor
 * Accepts an encrypted descriptor (string) and stores it. The route expects the descriptor to already be encrypted
 * by your client or service. If you prefer server-side encryption, call encryptData() here.
 */
router.post('/me/set-face-descriptor', requireAuth, async (req, res) => {
  try {
    const sessionUser = req.session?.user || req.user;
    if (!sessionUser) return safeJson(res, 403, { success: false, error: 'Unauthorized' });

    const { descriptor } = req.body || {};
    if (!descriptor || typeof descriptor !== 'string') return safeJson(res, 400, { success: false, error: 'Descriptor required' });

    // Optionally encrypt server-side:
    // const stored = encryptData ? encryptData(descriptor) : descriptor;
    const stored = descriptor;

    const user = await User.findByIdAndUpdate(sessionUser.id, { faceDescriptor: stored, verificationStatus: 'pending' }, { new: true }).lean();
    if (!user) return safeJson(res, 404, { success: false, error: 'User not found' });

    try { await logEvent({ action: 'set_face_descriptor', actorId: sessionUser.id, resourceId: user._id }); } catch (e) { /* swallow */ }

    return safeJson(res, 200, { success: true, message: 'Face descriptor saved' });
  } catch (err) {
    console.error('POST /users/me/set-face-descriptor error', err);
    return safeJson(res, 500, { success: false, error: 'Server error' });
  }
});

/* ---------- Admin endpoints (optional) ---------- */

/**
 * GET /users
 * List users (admin only). Simple pagination via ?limit=&skip=
 */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const skip = Math.max(parseInt(req.query.skip || '0', 10), 0);

    const users = await User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    return safeJson(res, 200, { success: true, users });
  } catch (err) {
    console.error('GET /users error', err);
    return safeJson(res, 500, { success: false, error: 'Server error' });
  }
});

/**
 * GET /users/:id
 * Admin fetch single user
 */
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return safeJson(res, 400, { success: false, error: 'Invalid user id' });

    const user = await User.findById(id).lean();
    if (!user) return safeJson(res, 404, { success: false, error: 'User not found' });

    return safeJson(res, 200, { success: true, user });
  } catch (err) {
    console.error('GET /users/:id error', err);
    return safeJson(res, 500, { success: false, error: 'Server error' });
  }
});

/**
 * DELETE /users/:id
 * Admin delete user (soft delete could be implemented instead)
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return safeJson(res, 400, { success: false, error: 'Invalid user id' });

    const user = await User.findByIdAndDelete(id).lean();
    if (!user) return safeJson(res, 404, { success: false, error: 'User not found' });

    try { await logEvent({ action: 'admin_delete_user', actorId: req.session?.user?.id || req.user?.id, resourceId: id }); } catch (e) { /* swallow */ }

    return safeJson(res, 200, { success: true, message: 'User deleted' });
  } catch (err) {
    console.error('DELETE /users/:id error', err);
    return safeJson(res, 500, { success: false, error: 'Server error' });
  }
});

/* ---------- Export ---------- */
module.exports = router;
