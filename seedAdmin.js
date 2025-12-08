// server/seedAdmin.js
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('process.env.MONGO_URI');

async function createAdmin() {
  const existing = await User.findOne({ email: 'danwealth80@gmail.com' });
  if (existing) {
    console.log('Admin already exists');
    return mongoose.disconnect();
  }

  const admin = new User({
    email: 'danwealth80@gmail.com',
    password: 'english3924', // plain text here, will be hashed automatically
    role: 'admin'
  });

  await admin.save();
  console.log('✅ Admin created successfully');
  mongoose.disconnect();
}

createAdmin();
