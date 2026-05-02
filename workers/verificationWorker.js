// workers/verificationWorker.js
import { VerificationJob } from '../models/VerificationJob.js';
import { runFaceMatch } from '../services/faceMatch.js';

export async function processJob(job) {
  try {
    const result = await runFaceMatch(job.idUrl, job.selfieUrl);

    await VerificationJob.updateOne(
      { jobId: job.jobId },
      { status: result.success ? 'approved' : 'rejected', result }
    );
  } catch (err) {
    await VerificationJob.updateOne(
      { jobId: job.jobId },
      { status: 'error', result: { message: err.message } }
    );
  }
}
