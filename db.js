// server/db.js
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/facelock', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

module.exports = mongoose;
