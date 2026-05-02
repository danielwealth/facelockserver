// server/routes/verifyDocument.js
const express = require('express');
const AWS = require('aws-sdk');
const { detectDeepfake } = require('../services/deepfake');
const User = require('../models/User');
const { decryptData } = require('../services/encryption');
const { getFaceDescriptor } = require('../services/face');
const { runOCR } = require('../services/ocr');

const router = express.Router();

// Configure S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

router.post('/verify-document', async (req, res) => {
  try {
    if (!req.session?.user) return res.status(403).json({ error: 'Unauthorized' });

    const { idKey } = req.body || {};
    if (!idKey) return res.status(400).json({ error: 'idKey is required' });

    const user = await User.findById(req.session.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch file from S3
    const fileObj = await s3.getObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: idKey,
    }).promise();

    const buffer = fileObj.Body;

    // Run OCR on buffer
    const ocrResult = await runOCR(buffer);
    const { parsed } = ocrResult; // { name, dob, idNumber }

    // Compare parsed fields against user record
    let fieldMismatch = [];
    if (parsed.name && user.name && parsed.name.toLowerCase() !== user.name.toLowerCase()) {
      fieldMismatch.push('name');
    }
    if (parsed.dob && user.dob && parsed.dob !== user.dob) {
      fieldMismatch.push('dob');
    }
    if (parsed.idNumber && user.idNumber && parsed.idNumber !== user.idNumber) {
      fieldMismatch.push('idNumber');
    }

    // Extract face descriptor from document
    const docDescriptor = await getFaceDescriptor(buffer);
    if (!docDescriptor) {
      user.verificationStatus = 'rejected';
      await user.save();
      return res.status(400).json({ success: false, error: 'No face detected in document' });
    }

    // Deepfake detection
    const deepfakeResult = await detectDeepfake(buffer);
    if (deepfakeResult.verdict === 'fake' || (deepfakeResult.score && deepfakeResult.score > 0.7)) {
      user.verificationStatus = 'rejected';
      user.matchHistory.push({ result: 'deepfake detected', source: 'deepfake', createdAt: new Date() });
      await user.save();
      return res.status(401).json({ success: false, status: 'rejected', reason: 'Deepfake suspected' });
    }

    // Compare descriptors
    const storedDescriptor = decryptData(user.faceDescriptor);
    const distance = euclideanDistance(docDescriptor, storedDescriptor);
    const threshold = parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.6;

    if (distance < threshold && fieldMismatch.length === 0) {
      user.verificationStatus = 'verified';
      user.matchHistory.push({ result: 'document verified', source: 'verify-document', createdAt: new Date() });
      await user.save();
      return res.json({ success: true, status: 'verified', ocrData: parsed });
    } else {
      user.verificationStatus = 'rejected';
      await user.save();
      return res.status(401).json({
        success: false,
        status: 'rejected',
        reason: fieldMismatch.length ? `Field mismatch: ${fieldMismatch.join(', ')}` : 'Face mismatch',
      });
    }
  } catch (err) {
    console.error('Document verification error:', err);
    res.status(500).json({ error: 'Server error verifying document' });
  }
});

function euclideanDistance(d1, d2) {
  if (!Array.isArray(d1) || !Array.isArray(d2) || d1.length !== d2.length) return Infinity;
  return Math.sqrt(d1.reduce((sum, val, i) => sum + Math.pow(val - d2[i], 2), 0));
}

module.exports = router;
