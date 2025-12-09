const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existing = await User.findOne({ email: 'ohimaidaniel@yahoo.com' });
    if (existing) {
      console.log('Admin already exists');
      return mongoose.disconnect();
    }

    const admin = new User({
      email: 'ohimaidaniel@yahoo.com',
      password: 'english3924', // will be hashed if your User model has a pre-save hook
      role: 'admin'
    });

    await admin.save();
    console.log('✅ Admin created successfully');
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
