const AWS = require('aws-sdk');
const express = require('express');
const router = express.Router();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

router.post('/get-upload-url', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const userId = req.session.user._id;
    const { filename, filetype } = req.body;

    const key = `${userId}/${Date.now()}-${filename}`;

    const url = await s3.getSignedUrlPromise('putObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: filetype,
      Expires: 300, // 5 minutes
      ACL: 'private',
    });

    res.json({ uploadUrl: url, key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

module.exports = router;
