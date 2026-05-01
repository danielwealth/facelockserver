import { VerificationJob } from '../models/VerificationJob.js';
import { runFaceMatch } from '../services/faceMatch.js';

async function processJob(job) {
  try {
    const result = await runFaceMatch(job.idUrl, job.selfieUrl);

    job.status = result.success ? 'approved' : 'rejected';
    job.result = result;
    job.updatedAt = new Date();

    await job.save();
    console.log(`Job ${job.jobId} processed: ${job.status}`);
  } catch (err) {
    job.status = 'error';
    job.result = { message: err.message };
    job.updatedAt = new Date();

    await job.save();
    console.error(`Job ${job.jobId} failed: ${err.message}`);
  }
}

export async function runWorker() {
  console.log('Verification worker started...');
  setInterval(async () => {
    try {
      const pendingJobs = await VerificationJob.find({ status: 'pending' }).limit(5);
      for (const job of pendingJobs) {
        await processJob(job);
      }
    } catch (err) {
      console.error('Worker error:', err);
    }
  }, 5000); // poll every 5 seconds
}
