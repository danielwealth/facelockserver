// server/routes/s3Upload.js
const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');

// Configure S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

/**
 * POST /s3/get-upload-url
 * Generate pre-signed PUT and GET URLs for file upload & preview
 */
router.post('/get-upload-url', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { filename, filetype } = req.body || {};
    if (!filename || !filetype) {
      return res.status(400).json({ success: false, error: 'Filename and filetype are required' });
    }

    const userId = req.session.user.id || 'anonymous';
    const key = `${userId}/${Date.now()}-${filename}`;

    // Pre-signed PUT URL for uploading
    const uploadUrl = await s3.getSignedUrlPromise('putObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: filetype,
      Expires: 300, // 5 minutes
      ACL: 'private',
    });

    // Pre-signed GET URL for immediate preview
    const viewUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Expires: 300, // 5 minutes
    });

    res.json({ success: true, uploadUrl, key, viewUrl });
  } catch (err) {
    console.error('S3 upload URL error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate upload URL' });
  }
});

module.exports = router;
