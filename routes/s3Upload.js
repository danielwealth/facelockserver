// server/routes/s3Upload.js
router.post('/get-upload-url', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { filename, filetype, category } = req.body || {};
    if (!filename || !filetype) {
      return res.status(400).json({ success: false, error: 'Filename and filetype are required' });
    }

    const userId = req.session.user.id || 'anonymous';
    const prefix = category === 'id' ? 'ids' : 'uploads'; // separate folder for IDs
    const key = `${prefix}/${userId}/${Date.now()}-${filename}`;

    const uploadUrl = await s3.getSignedUrlPromise('putObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: filetype,
      Expires: 300,
      ACL: 'private',
    });

    const viewUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Expires: 300,
    });

    res.json({ success: true, uploadUrl, key, viewUrl });
  } catch (err) {
    console.error('S3 upload URL error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate upload URL' });
  }
});
