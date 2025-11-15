// server/db.js
// server/db.js
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI); // no extra options needed
module.exports = mongoose;

