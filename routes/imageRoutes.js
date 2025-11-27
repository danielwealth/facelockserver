const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

// GET /images/unlocked-images
router.get('/unlocked-images', (req, res) => {
  try {
    // Check authentication
    if (!req.session || !req.session.authenticated) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Retrieve per-user key from session
    const key = req.session.key;
    if (!key) {
      return res.status(400).json({ error: 'Missing decryption key' });
    }

    const lockedDir = path.join(__dirname, '../locked');
    const unlockedDir = path.join(__dirname, '../unlocked');

    // Ensure unlocked directory exists
    if (!fs.existsSync(unlockedDir)) {
      fs.mkdirSync(unlockedDir);
    }

    // If no locked files, return empty array
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

        // Push relative path for frontend
        unlocked.push(`/unlocked/${path.basename(outputPath)}`);
      } catch (err) {
        console.error(`Failed to decrypt ${file}:`, err);
      }
    });

    // ✅ Return plain array (frontend expects this)
    res.json(unlocked);
  } catch (err) {
    console.error('Error in /unlocked-images route:', err);
    res.status(500).json({ error: 'Server error while unlocking images' });
  }
});

module.exports = router;
