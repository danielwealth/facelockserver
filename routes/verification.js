const express = require('express');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const { enqueueJob } = require('../services/queue.js');
const { VerificationJob } = require('../models/VerificationJob.js');

const router = express.Router();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// POST /verify/document
router.post('/document', async (req, res) => {
  try {
    const { idKey, selfieKey, secretKey } = req.body;
    if (!idKey) return res.status(400).json({ error: 'Missing idKey' });
    if (!selfieKey && !secretKey) return res.status(400).json({ error: 'Missing selfieKey or secretKey' });

    const jobId = uuidv4();

    await VerificationJob.create({
      jobId,
      userId: req.user.id,
      idKey,
      selfieKey,
      secretKey,
      status: 'pending',
      createdAt: new Date(),
    });

    enqueueJob({ jobId, idKey, selfieKey, secretKey });

    res.json({ jobId, status: 'pending', message: 'Verification started' });
  } catch (err) {
    console.error('Document verification error:', err);
    res.status(500).json({ error: 'Failed to start verification' });
  }
});

// GET /verify/document/status/:jobId
router.get('/document/status/:jobId', async (req, res) => {
