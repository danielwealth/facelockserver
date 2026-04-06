// server/services/encryption.js
const crypto = require('crypto');

function encryptData(data) {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_SECRET);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptData(encrypted) {
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_SECRET);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

module.exports = { encryptData, decryptData };
