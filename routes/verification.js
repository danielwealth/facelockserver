// routes/verification.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { VerificationJob } from '../models/VerificationJob.js';
import { uploadToS3 } from '../services/s3.js'; // or local storage if avoiding AWS

const router = express.Router();

// Submit verification request
router.post('/verify', async (req, res) => {
  try {
    const jobId = uuidv4();

    // Upload files (replace with local storage if not using S3)
    const idUrl = await uploadToS3(req.files.document, `id-${jobId}.png`);
    const selfieUrl = await uploadToS3(req.files.selfie, `selfie-${jobId}.png`);

    // Create MongoDB job record
    const job = new VerificationJob({
      jobId,
      userId: req.user._id,
      idUrl,
      selfieUrl,
      status: 'pending',
    });

    await job.save();

    // Respond immediately — no queue.js needed
    res.json({ jobId, status: 'pending', message: 'Verification started' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start verification' });
  }
});

// Check job status
router.get('/verify/status/:jobId', async (req, res) => {
  const job = await VerificationJob.findOne({ jobId: req.params.jobId });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

export default router;
