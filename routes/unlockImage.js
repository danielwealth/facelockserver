// server/routes/imageRoutes.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

router.get('/unlocked-images', (req, res) => {
  // For demo: decrypt all locked images with a fixed key
  const key = 'biometric-unlock-key'; // Replace with secure key per user
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
