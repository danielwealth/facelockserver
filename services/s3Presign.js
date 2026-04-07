// server/services/s3Presign.js
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

async function createPresignedPutKey({ key, contentType, expiresSeconds = 300 }) {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: 'private',
    Expires: expiresSeconds
  };
  const url = await s3.getSignedUrlPromise('putObject', params);
  return { url, key };
}

module.exports = { createPresignedPutKey };
