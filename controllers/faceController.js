// server/controllers/faceController.js
const FaceDescriptor = require('../models/FaceDescriptor');

async function saveDescriptor(userId, name, descriptor) {
  const record = new FaceDescriptor({ userId, name, descriptor });
  await record.save();
}
