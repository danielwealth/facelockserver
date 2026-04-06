// server/models/AuditLog.js
const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who performed the action
  actorEmail: { type: String }, // denormalized for quick display
  action: { type: String, required: true }, // e.g., "approve_verification", "login_failed"
  resourceType: { type: String }, // e.g., "User", "Document"
  resourceId: { type: mongoose.Schema.Types.ObjectId }, // optional reference to resource
  details: { type: Object }, // structured metadata about the event
  ip: { type: String },
  userAgent: { type: String },
  outcome: { type: String, enum: ['success', 'failure', 'warning'], default: 'success' },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
