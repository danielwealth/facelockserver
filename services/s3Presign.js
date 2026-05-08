// services/s3Presign.js
const AWS = require('aws-sdk');

// Configure S3 client
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

/**
 * Create a presigned URL for uploading a file to S3
 * @param {Object} params - { key, contentType, expiresSeconds }
 * @returns {Promise<Object>} { url, key }
 */
async function createPresignedPutKey({ key, contentType, expiresSeconds = 300 }) {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: 'private',
    Expires: expiresSeconds,
  };

  const url = await s3.getSignedUrlPromise('putObject', params);
  return { url, key };
}

module.exports = {
  createPresignedPutKey,
};
