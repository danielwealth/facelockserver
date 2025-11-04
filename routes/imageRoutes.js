// server/routes/imageRoutes.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

app.get('/unlocked-images', (req, res) => {
  if (!req.session.authenticated) {
    return res.status(403).send('Unauthorized');
  }

  // Proceed with decryption and return image paths
});


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
