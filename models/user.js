// server/models/User.js
const mongoose = require('../db');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Compare candidate password with stored hash
UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', UserSchema);
