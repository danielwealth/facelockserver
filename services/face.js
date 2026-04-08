// server/services/face.js
const mongoose = require('mongoose');
const FaceDescriptor = require('../models/FaceDescriptor');

async function saveDescriptor({ userId, name = null, descriptor }) {
  if (!userId) throw new Error('userId required');
  if (!Array.isArray(descriptor) || descriptor.length === 0) throw new Error('descriptor array required');

  const doc = new FaceDescriptor({
    userId: mongoose.Types.ObjectId(String(userId)),
    name,
    descriptor
  });
  await doc.save();
  return doc;
}

async function findByUser(userId, options = {}) {
  const { limit = 50, skip = 0 } = options;
  return FaceDescriptor.find({ userId: mongoose.Types.ObjectId(String(userId)) })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

module.exports = { saveDescriptor, findByUser };
