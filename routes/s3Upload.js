const AWS = require('aws-sdk');
const express = require('express');
const router = express.Router();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Generate pre-signed PUT URL for upload
router.post('/get-upload-url', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const userId = req.session?.user?._id || 'anonymous';
    const { filename, filetype } = req.body;

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

    res.json({ uploadUrl, key, viewUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

module.exports = router;
