// services/queue.js
import { VerificationJob } from '../models/VerificationJob.js';

/**
 * Enqueue a job by saving/updating it in MongoDB.
 * @param {Object} jobData - { jobId, userId, idUrl, selfieUrl }
 */
export async function enqueueJob({ jobId, userId, idUrl, selfieUrl }) {
  await VerificationJob.updateOne(
    { jobId },
    {
      jobId,
      userId,
      idUrl,
      selfieUrl,
      status: 'pending',
      updatedAt: new Date(),
    },
    { upsert: true }
  );
}
