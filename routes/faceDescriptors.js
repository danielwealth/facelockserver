// server/routes/faceDescriptors.js
const express = require('express');
const router = express.Router();
const { saveDescriptor, findByUser } = require('../services/face');
const requireAuth = (() => {
  try { return require('../middleware/requireAuth'); } catch (e) { return (req, res, next) => next(); }
})();

router.post('/upload-descriptor', requireAuth, async (req, res) => {
  try {
    const { userId, descriptor, name } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
    if (!descriptor) return res.status(400).json({ success: false, error: 'descriptor required' });

    const saved = await saveDescriptor({ userId, name, descriptor });
    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error('upload-descriptor error', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const list = await findByUser(req.params.userId);
    return res.json({ success: true, data: list });
  } catch (err) {
    console.error('findByUser error', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
