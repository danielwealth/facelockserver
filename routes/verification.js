const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const requireAuth = require('../middleware/requireAuth');
const { verifyLimiter } = require('../middleware/verifyLimiter');
const auditAction = require('../middleware/auditAction');
const validateJoi = require('../middleware/validateJoi');
const requireAdmin = require('../middleware/requireAdmin');

const VerificationJob = require('../models/VerificationJob');
const enqueueJob = require('../services/queue');

const router = express.Router();

// Joi schema for verification request
const verifySchema = Joi.object({
  idKey: Joi.string().required(),
  selfieKey: Joi.string(),
  secretKey: Joi.string()
}).or('selfieKey', 'secretKey'); // require at least one

/**
 * POST /verify/document
 * Start a new verification job
 */
router.post(
  '/document',
  requireAuth,
  verifyLimiter,
  auditAction('start-verification', { resourceType: 'verification' }),
  validateJoi(verifySchema, 'body'),
  async (req, res) => {
    try {
      const { idKey, selfieKey, secretKey } = req.body;
      const jobId = uuidv4();
      const userId = req.user.id;

      await VerificationJob.create({
        jobId,
        userId,
        idKey,
        selfieKey,
        secretKey,
        status: 'pending',
        createdAt: new Date(),
      });

      enqueueJob({ jobId, idKey, selfieKey, secretKey });

      await req.audit.ok({ jobId });
      res.json({ jobId, status: 'pending', message: 'Verification started' });
    } catch (err) {
      await req.audit.fail({ error: err.message });
      await req.rateLimiter?.recordFailure(err.message);
      res.status(500).json({ error: err.message || 'Failed to start verification' });
    }
  }
);

/**
 * GET /verify/document/status/:jobId
 * Check status of a verification job
 */
router.get(
  '/document/status/:jobId',
  requireAuth,
  verifyLimiter,
  auditAction('check-verification-status', { resourceType: 'verification' }),
  async (req, res) => {
    try {
      const job = await VerificationJob.findOne({ jobId: req.params.jobId, userId: req.user.id });
      if (!job) {
        await req.audit.fail({ error: 'Job not found' });
        return res.status(404).json({ error: 'Job not found' });
      }
      await req.audit.ok({ jobId: job.jobId, status: job.status });
      res.json({ jobId: job.jobId, status: job.status });
    } catch (err) {
      await req.audit.fail({ error: err.message });
      res.status(500).json({ error: 'Server error fetching job status' });
    }
  }
);

/**
 * GET /verify/history
 * Get verification history for the authenticated user
 */
router.get(
  '/history',
  requireAuth,
  verifyLimiter,
  auditAction('get-verification-history', { resourceType: 'verification' }),
  async (req, res) => {
    try {
      const jobs = await VerificationJob.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
      await req.audit.ok({ count: jobs.length });
      res.json({ jobs });
    } catch (err) {
      await req.audit.fail({ error: err.message });
      res.status(500).json({ error: 'Server error fetching history' });
    }
  }
);

/**
 * GET /verify/admin/jobs
 * Admin-only route to view all jobs
 */
router.get(
  '/admin/jobs',
  requireAuth,
  requireAdmin,
  auditAction('admin-view-jobs', { resourceType: 'verification' }),
  async (req, res) => {
    try {
      const jobs = await VerificationJob.find().sort({ createdAt: -1 }).lean();
      await req.audit.ok({ count: jobs.length });
      res.json({ jobs });
    } catch (err) {
      await req.audit.fail({ error: err.message });
      res.status(500).json({ error: 'Server error fetching jobs' });
    }
  }
);

module.exports = router;
