// routes/verification.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { uploadToS3 } from '../services/s3.js';
import { enqueueJob } from '../services/queue.js';
import { VerificationJob } from '../models/VerificationJob.js';

const router = express.Router();

// Step 1: Submit verification request
router.post('/verify', async (req, res) => {
  try {
    const { files } = req; // assuming multer or similar middleware
    const jobId = uuidv4();

    // Upload ID + selfie to S3
    const idUrl = await uploadToS3(files.document, `id-${jobId}.png`);
    const selfieUrl = await uploadToS3(files.selfie, `selfie-${jobId}.png`);

    // Create DB record
    await VerificationJob.create({
      jobId,
      userId: req.user.id,
      idUrl,
      selfieUrl,
      status: 'pending',
      createdAt: new Date(),
    });

    // Enqueue background job
    enqueueJob({ jobId, idUrl, selfieUrl });

    // Respond immediately
    res.json({ jobId, status: 'pending', message: 'Verification started' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start verification' });
  }
});

// Step 2: Check job status
router.get('/verify/status/:jobId', async (req, res) => {
  const job = await VerificationJob.findOne({ jobId: req.params.jobId });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ jobId: job.jobId, status: job.status, result: job.result });
});

export default router;
