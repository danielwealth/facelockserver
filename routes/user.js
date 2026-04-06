// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MatchHistorySchema = new mongoose.Schema({
  result: { type: String, required: true },
  source: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },

  // Authentication & roles
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  secretKey: { type: String }, // bcrypt hash of user’s secret key

  // Encrypted biometric data
  faceDescriptor: { type: String }, // AES-encrypted descriptor
  profileImage: { type: String },   // AES-encrypted S3 key reference

  // History & metadata
  matchHistory: [MatchHistorySchema],
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },

  // Password reset
