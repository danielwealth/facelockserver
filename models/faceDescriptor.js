// server/models/FaceDescriptor.js
const mongoose = require('mongoose');

const FaceDescriptorSchema = new mongoose.Schema({
  // Reference to the User model (better than plain string)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Optional name/label for the face descriptor
  name: { type: String, trim: true },

  // Array of numbers representing the face embedding/descriptor
  descriptor: {
    type: [Number],
    required: true,
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FaceDescriptor', FaceDescriptorSchema);
