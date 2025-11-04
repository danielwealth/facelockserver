// server/models/FaceDescriptor.js
const mongoose = require('../db');

const FaceDescriptorSchema = new mongoose.Schema({
  userId: String,
  name: String,
  descriptor: [Number],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FaceDescriptor', FaceDescriptorSchema);
