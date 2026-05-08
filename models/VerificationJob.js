// models/VerificationJob.js
const mongoose = require('mongoose');

const VerificationJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  idUrl: { type: String, required: true },       // S3 link to ID document
  selfieUrl: { type: String, required: true },   // S3 link to selfie
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'error'],
    default: 'pending',
  },
  result: { type: mongoose.Schema.Types.Mixed }, // JSON details (match score, reason, etc.)
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-update `updatedAt` on save
VerificationJobSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const VerificationJob = mongoose.model('VerificationJob', VerificationJobSchema);

module.exports = VerificationJob;
