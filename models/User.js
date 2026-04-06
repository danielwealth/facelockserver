// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MatchHistorySchema = new mongoose.Schema({
  result: { type: String, required: true },   // e.g. "locked", "verified"
  source: { type: String, required: true },   // e.g. "upload", "verify-image"
  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },

  // Role & authentication
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  secretKey: { type: String }, // bcrypt hash of user’s secret key

  // Encrypted biometric data
  faceDescriptor: { type: String }, // AES-encrypted descriptor
  profileImage: { type: String },   // AES-encrypted S3 key reference

  // Verification & history
  matchHistory: [MatchHistorySchema],
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },

  // Password reset
  resetCode: { type: String },
  resetCodeExpires: { type: Date },

  // WebAuthn support
  webauthnCredential: { type: Object },
  webauthnChallenge: { type: String }
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Compare password method
UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', UserSchema);
