// server/routes/verifyDocument.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { decryptData } = require('../services/encryption');
const { getFaceDescriptor } = require('../services/face');
const { runOCR } = require('../services/ocr');
const router = express.Router();

// Multer setup for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/docs');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

router.post('/verify-document', upload.single('document'), async (req, res) => {
  try {
    if (!req.session?.user) return res.status(403).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'No document uploaded' });

    const user = await User.findById(req.session.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Run OCR
    const ocrResult = await runOCR(req.file.path);
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
    const docDescriptor = await getFaceDescriptor(req.file.path);
    if (!docDescriptor) {
      user.verificationStatus = 'rejected';
      await user.save();
      return res.status(400).json({ success: false, error: 'No face detected in document' });
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
