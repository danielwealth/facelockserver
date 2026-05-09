//workers/verificationWorker.js
const AWS = require('aws-sdk');
const VerificationJob = require('../models/VerificationJob');

// Configure AWS SDK
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// OCR service (Textract example)
async function runOCR(buffer) {
  const textract = new AWS.Textract({ region: process.env.AWS_REGION });
  const params = {
    Document: { Bytes: buffer },
    FeatureTypes: ['FORMS']
  };
  const result = await textract.analyzeDocument(params).promise();
  return result; // structured OCR output
}

// Face matching service (Rekognition example)
async function runFaceMatch(selfieBuffer, idBuffer) {
  const rekognition = new AWS.Rekognition({ region: process.env.AWS_REGION });
  const params = {
    SourceImage: { Bytes: selfieBuffer },
    TargetImage: { Bytes: idBuffer },
    SimilarityThreshold: 80
  };
  const result = await rekognition.compareFaces(params).promise();
  return result.FaceMatches; // array with similarity scores
}

// Worker job processor
async function processJob(job) {
  try {
    console.log(`Processing job ${job.jobId}...`);

    // 1. Fetch files from S3
    const idFile = await s3.getObject({ Bucket: process.env.AWS_S3_BUCKET, Key: job.idKey }).promise();
    const selfieFile = job.selfieKey
      ? await s3.getObject({ Bucket: process.env.AWS_S3_BUCKET, Key: job.selfieKey }).promise()
      : null;
    const secretFile = job.secretKey
      ? await s3.getObject({ Bucket: process.env.AWS_S3_BUCKET, Key: job.secretKey }).promise()
      : null;

    // 2. Run OCR on ID
    const ocrResult = await runOCR(idFile.Body);

    // 3. Run face match if selfie provided
    let faceMatchResult = null;
    if (selfieFile) {
      faceMatchResult = await runFaceMatch(selfieFile.Body, idFile.Body);
    }

    // 4. Update job status
    await VerificationJob.updateOne(
      { jobId: job.jobId },
      {
        status: 'completed',
        ocrResult,
        faceMatchResult,
        completedAt: new Date()
      }
    );

    console.log(`Job ${job.jobId} completed successfully`);
  } catch (err) {
    console.error(`Job ${job.jobId} failed:`, err);
    await VerificationJob.updateOne(
      { jobId: job.jobId },
      { status: 'failed', error: err.message, completedAt: new Date() }
    );
  }
}

module.exports = { processJob };
