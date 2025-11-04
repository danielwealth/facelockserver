// server.js
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('image'), (req, res) => {
  const passcode = req.body.passcode;
  const imagePath = req.file.path;

  // Encrypt image with passcode
  const cipher = crypto.createCipher('aes-256-cbc', passcode);
  const input = fs.createReadStream(imagePath);
  const output = fs.createWriteStream(`locked/${req.file.filename}.enc`);

  input.pipe(cipher).pipe(output);

  output.on('finish', () => {
    fs.unlinkSync(imagePath); // delete original
    res.send('Image locked successfully');
  });
});
// Save descriptor to JSON or database
const descriptor = req.body.descriptor; // from frontend
fs.writeFileSync(`faces/${req.file.filename}.json`, JSON.stringify(descriptor));

function euclideanDistance(a, b) {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

function isMatch(newDescriptor, storedDescriptor, threshold = 0.6) {
  const distance = euclideanDistance(newDescriptor, storedDescriptor);
  return distance < threshold;
}

if (isMatch(newDescriptor, storedDescriptor)) {
  if (req.body.passcode === correctPasscode) {
    // decrypt and allow access
  } else {
    res.status(403).send('Access denied: incorrect passcode');
  }
}
const session = require('express-session');

const jwt = require('jsonwebtoken');
const SECRET = 'your_jwt_secret';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).send('Invalid credentials');
  }

  const token = jwt.sign({ userId: user._id }, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send('Missing token');

  const token = authHeader.split(' ')[1];
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).send('Invalid token');
    req.user = user;
    next();
  });
}
app.get('/unlocked-images', authenticateJWT, (req, res) => {
  // Access req.user.userId
});


function euclideanDistance(a, b) {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

function findMatchingUser(newDescriptor, threshold = 0.6) {
  const files = fs.readdirSync('faces/');
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join('faces', file)));
    const distance = euclideanDistance(newDescriptor, data.descriptor);
    if (distance < threshold) {
      return data.userId;
    }
  }
  return null;
}
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() },
  });

  if (!user) return res.status(400).send('Invalid or expired token');

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  res.send('Password updated');
});
router.post('/verify-otp', async (req, res) => {
  const { phone, otp, newPassword } = req.body;
  const user = await User.findOne({ phone });

  if (!user || user.otp !== otp || Date.now() > user.otpExpiry) {
    return res.status(400).send('Invalid or expired OTP');
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  res.send('Password reset successful');
});



app.listen(5000, () => console.log('Server running on port 5000'));
