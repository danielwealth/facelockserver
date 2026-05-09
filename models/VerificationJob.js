const mongoose = require('mongoose');

const VerificationJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ✅ Store S3 object keys instead of URLs
  idKey: { type: String, required: true },        // S3 key for ID document
  selfieKey: { type: String },                    // optional S3 key for selfie
  secretKey: { type: String },                    // optional S3 key for secret doc

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'error'],
    default: 'pending',
  },

  // ✅ Results from worker processing
  ocrResult: { type: mongoose.Schema.Types.Mixed },    // OCR output
  faceMatchResult: { type: mongoose.Schema.Types.Mixed }, // face match details
  error: { type: String },                             // error message if failed

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

// Auto-update `updatedAt` on save
VerificationJobSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const VerificationJob = mongoose.model('VerificationJob', VerificationJobSchema);

module.exports = VerificationJob;
