// routes/verification.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const AWS = require('aws-sdk');
const { uploadToS3 } = require('../services/s3.js');
const { enqueueJob } = require('../services/queue.js');
const { VerificationJob } = require('../models/VerificationJob.js');
const User = require('../models/User.js');
const { decryptData } = require('../services/encryption.js');
const { getFaceDescriptor } = require('../services/face.js');
const { runOCR } = require('../services/ocr.js');
const { detectDeepfake } = require('../services/deepfake.js');

const router = express.Router();

// Configure S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

/**
 * POST /verify/document
 * Submit verification request with ID + selfie
 */
router.post('/document', async (req, res) => {
  try {
    const { files } = req; // assuming multer middleware
    const jobId = uuidv4();

    const idUrl = await uploadToS3(files.document, `id-${jobId}.png`);
    const selfieUrl = await uploadToS3(files.selfie, `selfie-${jobId}.png`);

    await VerificationJob.create({
      jobId,
      userId: req.user.id,
      idUrl,
      selfieUrl,
      status: 'pending',
      createdAt: new Date(),
    });

    enqueueJob({ jobId, idUrl, selfieUrl });

    res.json({ jobId, status: 'pending', message: 'Verification started' });
  } catch (err) {
    console.error('Document verification error:', err);
    res.status(500).json({ error: 'Failed to start verification' });
  }
});

/**
 * GET /verify/document/status/:jobId
 * Check job status
 */
router.get('/document/status/:jobId', async (req, res) => {
  const job = await VerificationJob.findOne({ jobId: req.params.jobId });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ jobId: job.jobId, status: job.status, result: job.result });
});

/**
 * GET /verify/history
 * Fetch verification history for current user
 */
router.get('/history', async (req, res) => {
  try {
    const jobs = await VerificationJob.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ jobs });
  } catch (err) {
    console.error('Error fetching verification history:', err);
    res.status(500).json({ error: 'Server error while fetching history' });
  }
});

/**
 * POST /verify/image
 * Verify a face descriptor against stored users
 */
router.post('/image', async (req, res) => {
  try {
    const { key, descriptor } = req.body || {};
    if (!key || !descriptor) {
      return res.status(400).json({ error: 'Key and descriptor required' });
    }

    const newDescriptor = Array.isArray(descriptor) ? descriptor : JSON.parse(descriptor);
    const users = await User.find({ faceDescriptor: { $exists: true } });

    for (const u of users) {
      let storedDescriptor;
      try {
        storedDescriptor = decryptData(u.faceDescriptor);
      } catch (err) {
        console.warn(`Failed to decrypt descriptor for user ${u._id}:`, err);
        continue;
      }

      const distance = euclideanDistance(newDescriptor, storedDescriptor);
      const threshold = parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.6;

      if (distance < threshold) {
        const validKey = await bcrypt.compare(key, u.secretKey);
        if (validKey) {
          u.matchHistory.push({ result: 'verified', source: 'verify-image', createdAt: new Date() });
          await u.save();
          return res.json({ status: 'authorized', userId: u._id });
        }
      }
    }

    res.status(401).json({ status: 'unauthorized', reason: 'No match found' });
  } catch (err) {
    console.error('Verify image error:', err);
    res.status(500).json({ error: 'Failed to verify image' });
  }
});

function euclideanDistance(d1, d2) {
  if (!Array.isArray(d1) || !Array.isArray(d2) || d1.length !== d2.length) return Infinity;
  return Math.sqrt(d1.reduce((sum, val, i) => sum + Math.pow(val - d2[i], 2), 0));
}

module.exports = router;
