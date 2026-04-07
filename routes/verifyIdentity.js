// server/routes/verifyIdentity.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const { verifyLimiter } = require('../middleware/verifyLimiter');
const requireAuth = require('../middleware/requireAuth');

const User = require('../models/User');
const { decryptData } = require('../services/encryption');
const { getFaceDescriptor } = require('../services/face');
const { runOCR } = require('../services/ocr');
const { detectDeepfake } = require('../services/deepfake');
const { logEvent } = require('../services/audit');

const router = express.Router();

/* ---------- Config ---------- */
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'identity');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------- Multer (disk fallback) ---------- */
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, '');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({ storage: diskStorage, limits: { fileSize: MAX_FILE_SIZE } });

/* ---------- Helpers ---------- */
function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return Infinity;
  return Math.sqrt(a.reduce((sum, v, i) => sum + Math.pow(v - b[i], 2), 0));
}

async function safeUnlink(filePath) {
  if (!filePath) return;
  try { await fs.promises.unlink(filePath); } catch (e) { /* ignore */ }
}

function jsonError(res, status, message, extra = {}) {
  return res.status(status).json({ success: false, error: message, ...extra });
}

/* ---------- Route: POST /verify-identity ---------- */
/**
 * Authenticated endpoint.
 * Body: { key: string }
 * File: multipart form field "document"
 *
 * Notes:
 * - Supports disk uploads and S3-backed multer (check req.file.path vs req.file.location/key).
 * - Use verifyLimiter per-route to protect against abuse.
 */
router.post(
  '/verify-identity',
  requireAuth,
  verifyLimiter,
  upload.single('document'),
  async (req, res) => {
    const sessionUser = req.session?.user || req.user || null;
    const file = req.file;

    if (!sessionUser) return jsonError(res, 403, 'Unauthorized');
    if (!file) return jsonError(res, 400, 'Document file required');

    const { key } = req.body || {};
    if (!key || typeof key !== 'string' || key.trim().length < 4) {
      if (file.path) await safeUnlink(file.path);
      return jsonError(res, 400, 'Secret key required');
    }

    // Resolve file reference (disk path or S3 key/location)
    const filePath = file.path || file.location || null;
    const s3Key = file.key || null;

    try {
      const user = await User.findById(sessionUser.id);
      if (!user) {
        await logEvent({
          actorId: sessionUser._id,
          actorEmail: sessionUser.email,
          action: 'verify_identity_failed',
          resourceType: 'User',
          resourceId: sessionUser.id,
          details: { reason: 'user_not_found' },
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          outcome: 'failure'
        }).catch(() => null);

        if (file.path) await safeUnlink(file.path);
        return jsonError(res, 404, 'User not found');
      }

      // 1) Secret key validation
      const keyMatches = await bcrypt.compare(key, user.secretKey || '');
      if (!keyMatches) {
        user.verificationStatus = 'rejected';
        user.matchHistory = user.matchHistory || [];
        user.matchHistory.push({ result: 'invalid secret key', source: 'verify-identity', createdAt: new Date() });
        await user.save().catch(() => null);

        if (req.rateLimiter?.recordFailure) await req.rateLimiter.recordFailure('invalid_secret_key');

        await logEvent({
          actorId: sessionUser._id,
          actorEmail: sessionUser.email,
          action: 'verify_identity_invalid_key',
          resourceType: 'User',
          resourceId: user._id,
          details: { ip: req.ip },
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          outcome: 'failure'
        }).catch(() => null);

        if (file.path) await safeUnlink(file.path);
        return jsonError(res, 401, 'Invalid secret key');
      }

      // 2) Deepfake detection (best-effort)
      let deepfakeResult = null;
      try {
        deepfakeResult = await detectDeepfake(filePath || s3Key);
        const suspect = deepfakeResult && (deepfakeResult.verdict === 'fake' || (typeof deepfakeResult.score === 'number' && deepfakeResult.score > 0.7));
        if (suspect) {
          user.verificationStatus = 'rejected';
          user.matchHistory = user.matchHistory || [];
          user.matchHistory.push({ result: 'deepfake detected', source: 'verify-identity', createdAt: new Date(), meta: deepfakeResult });
          await user.save().catch(() => null);

          if (req.rateLimiter?.recordFailure) await req.rateLimiter.recordFailure('deepfake_detected');

          await logEvent({
            actorId: sessionUser._id,
            actorEmail: sessionUser.email,
            action: 'verify_identity_deepfake',
            resourceType: 'User',
            resourceId: user._id,
            details: { deepfakeResult },
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            outcome: 'failure'
          }).catch(() => null);

          if (file.path) await safeUnlink(file.path);
          return res.status(401).json({ success: false, error: 'Deepfake suspected', deepfake: deepfakeResult });
        }
      } catch (err) {
        await logEvent({
          actorId: sessionUser._id,
          actorEmail: sessionUser.email,
          action: 'verify_identity_deepfake_error',
          resourceType: 'User',
          resourceId: user._id,
          details: { error: err.message },
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          outcome: 'warning'
        }).catch(() => null);
        deepfakeResult = { warning: 'deepfake check failed' };
      }

      // 3) OCR parsing (best-effort)
      let ocrParsed = {};
      try {
        const ocrResult = await runOCR(filePath || s3Key);
        ocrParsed = ocrResult?.parsed || {};
      } catch (err) {
        await logEvent({
          actorId: sessionUser._id,
          actorEmail: sessionUser.email,
          action: 'verify_identity_ocr_error',
          resourceType: 'User',
          resourceId: user._id,
          details: { error: err.message },
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          outcome: 'warning'
        }).catch(() => null);
      }

      // Compare OCR fields
      const fieldMismatch = [];
      if (ocrParsed.name && user.name && ocrParsed.name.trim().toLowerCase() !== user.name.trim().toLowerCase()) fieldMismatch.push('name');
      if (ocrParsed.dob && user.dob && ocrParsed.dob !== user.dob) fieldMismatch.push('dob');
      if (ocrParsed.idNumber && user.idNumber && ocrParsed.idNumber !== user.idNumber) fieldMismatch.push('idNumber');

      // 4) Face descriptor extraction and comparison
      const docDescriptor = await getFaceDescriptor(filePath || s3Key);
      if (!docDescriptor) {
        user.verificationStatus = 'rejected';
        user.matchHistory = user.matchHistory || [];
        user.matchHistory.push({ result: 'no face in document', source: 'verify-identity', createdAt: new Date() });
        await user.save().catch(() => null);

        if (req.rateLimiter?.recordFailure) await req.rateLimiter.recordFailure('no_face_in_document');

        await logEvent({
          actorId: sessionUser._id,
          actorEmail: sessionUser.email,
          action: 'verify_identity_no_face',
          resourceType: 'User',
          resourceId: user._id,
          details: {},
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          outcome: 'failure'
        }).catch(() => null);

        if (file.path) await safeUnlink(file.path);
        return jsonError(res, 400, 'No face detected in document');
      }

      // Decrypt stored descriptor
      let storedDescriptor = null;
      try { storedDescriptor = decryptData(user.faceDescriptor); } catch (e) { storedDescriptor = null; }

      if (!storedDescriptor) {
        user.verificationStatus = 'pending';
        user.matchHistory = user.matchHistory || [];
        user.matchHistory.push({ result: 'missing stored descriptor', source: 'verify-identity', createdAt: new Date() });
        await user.save().catch(() => null);

        await logEvent({
          actorId: sessionUser._id,
          actorEmail: sessionUser.email,
          action: 'verify_identity_missing_descriptor',
          resourceType: 'User',
          resourceId: user._id,
          details: {},
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          outcome: 'warning'
        }).catch(() => null);

        if (file.path) await safeUnlink(file.path);
        return res.status(202).json({ success: false, status: 'pending', reason: 'Stored face descriptor unavailable; manual review required' });
      }

      const distance = euclideanDistance(docDescriptor, storedDescriptor);
      const threshold = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.6');

      // Final decision
      if (distance < threshold && fieldMismatch.length === 0) {
        user.verificationStatus = 'verified';
        user.matchHistory = user.matchHistory || [];
        user.matchHistory.push({ result: 'identity verified', source: 'verify-identity', createdAt: new Date(), meta: { distance, ocr: ocrParsed } });
        await user.save();

        await logEvent({
          actorId: sessionUser._id,
          actorEmail: sessionUser.email,
          action: 'verify_identity_success',
          resourceType: 'User',
          resourceId: user._id,
          details: { distance, ocr: ocrParsed },
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          outcome: 'success'
        }).catch(() => null);

        if (req.rateLimiter?.clearFailures) await req.rateLimiter.clearFailures();
        if (file.path) await safeUnlink(file.path);
        return res.json({ success: true, status: 'verified', distance, ocr: ocrParsed, deepfake: deepfakeResult });
      }

      // Reject path
      user.verificationStatus = 'rejected';
      user.matchHistory = user.matchHistory || [];
      user.matchHistory.push({
        result: 'identity rejected',
        source: 'verify-identity',
        createdAt: new Date(),
        meta: { distance, fieldMismatch, ocr: ocrParsed }
      });
      await user.save().catch(() => null);

      if (req.rateLimiter?.recordFailure) await req.rateLimiter.recordFailure('identity_rejected');

      await logEvent({
        actorId: sessionUser._id,
        actorEmail: sessionUser.email,
        action: 'verify_identity_rejected',
        resourceType: 'User',
        resourceId: user._id,
        details: { distance, fieldMismatch },
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'failure'
      }).catch(() => null);

      if (file.path) await safeUnlink(file.path);
      return res.status(401).json({
        success: false,
        status: 'rejected',
        reason: fieldMismatch.length ? `Field mismatch: ${fieldMismatch.join(', ')}` : 'Face mismatch',
        distance,
        ocr: ocrParsed,
        deepfake: deepfakeResult
      });
    } catch (err) {
      console.error('Identity verification error:', err);

      await logEvent({
        actorId: sessionUser._id,
        actorEmail: sessionUser.email,
        action: 'verify_identity_error',
        resourceType: 'User',
        resourceId: mongoose.Types.ObjectId.isValid(sessionUser.id) ? sessionUser.id : null,
        details: { error: err.message },
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'failure'
      }).catch(() => null);

      if (file?.path) await safeUnlink(file.path);
      return jsonError(res, 500, 'Server error verifying identity');
    }
  }
);

module.exports = router;
