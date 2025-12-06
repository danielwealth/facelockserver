// server/seedAdmin.js
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI);

async function createAdmin() {
  const adminExists = await User.findOne({ role: 'admin' });
  if (adminExists) {
    console.log('Admin already exists');
    return;
  }

  const admin = new User({
    email: 'danwealth80@gmail.com',
    password: 'sunnydan3924', // will be hashed automatically
    role: 'admin'
  });

  await admin.save();
  console.log('✅ Admin created successfully');
}

createAdmin().then(() => mongoose.disconnect());
