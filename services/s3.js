// services/s3.js
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

/**
 * Upload a file buffer to S3
 * @param {Object} file - Multer file object (req.files.document, etc.)
 * @param {String} key - Desired S3 key (filename)
 * @returns {String} public URL
 */
export async function uploadToS3(file, key) {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key || uuidv4(),
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  await s3.putObject(params).promise();

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
}
