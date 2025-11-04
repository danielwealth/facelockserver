// server/controllers/imageController.js
const bucket = require('../utils/firebase');

async function uploadEncryptedImage(localPath, filename) {
  await bucket.upload(localPath, {
    destination: `locked/${filename}`,
    metadata: {
      contentType: 'application/octet-stream',
    },
  });
}
