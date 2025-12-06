// server/seedAdmin.js
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/yourdb');

async function createAdmin() {
  const existing = await User.findOne({ email: 'admin@example.com' });
  if (existing) {
    console.log('Admin already exists');
    return mongoose.disconnect();
  }

  const admin = new User({
    email: 'admin@example.com',
    password: 'securepassword123', // plain text here, will be hashed automatically
    role: 'admin'
  });

  await admin.save();
  console.log('✅ Admin created successfully');
  mongoose.disconnect();
}

createAdmin();
