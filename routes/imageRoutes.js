// server/routes/imageRoutes.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

// GET unlocked images
router.get('/unlocked-images', (req, res) => {
  if (!req.session || !req.session.authenticated) {
    return res.status(403).send('Unauthorized');
  }

  const key = req.session.key; // or however you store the passcode/key
  const files = fs.readdirSync('locked/');
  const unlocked = [];

  files.forEach(file => {
    const input = fs.createReadStream(`locked/${file}`);
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    const outputPath = `unlocked/${file.replace('.enc', '.jpg')}`;
    const output = fs.createWriteStream(outputPath);

    input.pipe(decipher).pipe(output);
    unlocked.push(outputPath);
  });

  res.json(unlocked);
});

module.exports = router;
