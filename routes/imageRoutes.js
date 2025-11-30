const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const algorithm = 'aes-256-cbc';

// --- POST /images/upload ---
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.session || !req.session.authenticated) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const keyHex = req.session.key;
    if (!keyHex) {
      return res.status(400).json({ error: 'Missing encryption key' });
    }

    const keyBuffer = Buffer.from(keyHex, 'hex'); // 32 bytes for AES-256
    const iv = crypto.randomBytes(16); // 16 bytes IV

    const lockedDir = path.join(__dirname, '../locked');
    if (!fs.existsSync(lockedDir)) {
      fs.mkdirSync(lockedDir);
    }

    const inputPath = req.file.path;
    const outputPath = path.join(lockedDir, req.file.filename + '.enc');

    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);

    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    // Prepend IV to the encrypted file so we can retrieve it later
    output.write(iv);

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

// --- GET /images/unlocked-images ---
router.get('/unlocked-images', (req, res) => {
  try {
    if (!req.session || !req.session.authenticated) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const keyHex = req.session.key;
    if (!keyHex) {
      return res.status(400).json({ error: 'Missing decryption key' });
    }

    const keyBuffer = Buffer.from(keyHex, 'hex');

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
        const inputPath = path.join(lockedDir, file);
        const outputPath = path.join(unlockedDir, file.replace('.enc', '.jpg'));

        const input = fs.createReadStream(inputPath);

        // Read IV from the first 16 bytes of the encrypted file
        const iv = Buffer.alloc(16);
        const fd = fs.openSync(inputPath, 'r');
        fs.readSync(fd, iv, 0, 16, 0);
        fs.closeSync(fd);

        const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);

        // Skip the IV when creating the read stream
        const inputWithoutIV = fs.createReadStream(inputPath, { start: 16 });
        const output = fs.createWriteStream(outputPath);

        inputWithoutIV.pipe(decipher).pipe(output);

        unlocked.push(`/unlocked/${path.basename(outputPath)}`);
      } catch (err) {
        console.error(`Failed to decrypt ${file}:`, err);
      }
    });

    res.json(unlocked);
  } catch (err) {
    console.error('Error in /unlocked-images route:', err);
    res.status(500).json({ error: 'Server error while unlocking images' });
  }
});

module.exports = router;
