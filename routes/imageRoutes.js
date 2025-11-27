
// server/routes/imageRoutes.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const multer = require('multer');

// configure multer to save uploaded files temporarily
const upload = multer({ dest: 'temp/' });

// POST /images/upload
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.session || !req.session.authenticated) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const key = req.session.key;
    if (!key) {
      return res.status(400).json({ success: false, error: 'Missing encryption key' });
    }

    const lockedDir = path.join(__dirname, '../locked');
    if (!fs.existsSync(lockedDir)) {
      fs.mkdirSync(lockedDir);
    }

    const inputPath = req.file.path;
    const outputPath = path.join(lockedDir, req.file.filename + '.enc');

    const cipher = crypto.createCipher('aes-256-cbc', key);
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    input.pipe(cipher).pipe(output);

    output.on('finish', () => {
      // cleanup temp file
      fs.unlinkSync(inputPath);
      res.json({ success: true, path: outputPath });
    });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ success: false, error: 'Server error during upload' });
  }
});


// GET unlocked images
router.get('/unlocked-images', (req, res) => {
  try {
    // Check authentication
    if (!req.session || !req.session.authenticated) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Retrieve per-user key from session or DB
    const key = req.session.key;
    if (!key) {
      return res.status(400).json({ success: false, error: 'Missing decryption key' });
    }

    const lockedDir = path.join(__dirname, '../locked');
    const unlockedDir = path.join(__dirname, '../unlocked');

    if (!fs.existsSync(lockedDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(lockedDir);
    const unlocked = [];

    files.forEach(file => {
      try {
        const input = fs.createReadStream(path.join(lockedDir, file));
        const decipher = crypto.createDecipher('aes-256-cbc', key);
        const outputPath = path.join(unlockedDir, file.replace('.enc', '.jpg'));
        const output = fs.createWriteStream(outputPath);

        input.pipe(decipher).pipe(output);
        unlocked.push(`/unlocked/${path.basename(outputPath)}`);
      } catch (err) {
        console.error(`Failed to decrypt ${file}:`, err);
      }
    });

    res.json(unlocked);
  } catch (err) {
    console.error('Error in /unlocked-images route:', err);
    res.status(500).json({ success: false, error: 'Server error while unlocking images' });
  }
});

module.exports = router;

