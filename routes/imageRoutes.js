const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const router = express.Router();

// configure multer to save uploaded files temporarily
const upload = multer({ dest: 'temp/' });

// POST /images/upload
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.session || !req.session.authenticated) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const key = req.session.key;
    if (!key) {
      return res.status(400).json({ error: 'Missing encryption key' });
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
      fs.unlinkSync(inputPath); // cleanup temp file
      res.json({ success: true, message: 'Image uploaded and locked successfully' });
    });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// GET /images/unlocked-images
router.get('/unlocked-images', (req, res) => {
  try {
    if (!req.session || !req.session.authenticated) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const key = req.session.key;
    if (!key) {
      return res.status(400).json({ error: 'Missing decryption key' });
    }

    const lockedDir = path.join(__dirname, '../locked');
    const unlockedDir = path.join(__dirname, '../unlocked');

    if (!fs.existsSync(unlockedDir)) {
      fs.mkdirSync(unlockedDir);
    }

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

    res.json(unlocked); // ✅ plain array for frontend
  } catch (err) {
    console.error('Error in /unlocked-images route:', err);
    res.status(500).json({ error: 'Server error while unlocking images' });
  }
});

module.exports = router;
