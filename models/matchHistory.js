// server/models/MatchHistory.js
const mongoose = require('mongoose');

const MatchHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true }, // e.g. "Daniel"
  result: { type: String, enum: ['success', 'failure'], default: 'success' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MatchHistory', MatchHistorySchema);
