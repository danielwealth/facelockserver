// services/audit.js
const AuditLog = require('../models/AuditLog');

/**
 * Write an audit log entry
 * @param {Object} params - audit details
 */
async function logEvent({
  actorId,
  actorEmail,
  action,
  resourceType = null,
  resourceId = null,
  details = {},
  ip = null,
  userAgent = null,
  outcome = 'success'
}) {
  try {
    const entry = new AuditLog({
      actorId,
      actorEmail,
      action,
      resourceType,
      resourceId,
      details,
      ip,
      userAgent,
      outcome
    });
    await entry.save();
    return entry;
  } catch (err) {
    console.error('Audit log error:', err);
    return null;
  }
}

/**
 * Query audit logs with filters and options
 * @param {Object} filter - MongoDB filter
 * @param {Object} options - { limit, skip, sort }
 */
async function queryLogs(filter = {}, options = {}) {
  const { limit = 100, skip = 0, sort = { createdAt: -1 } } = options;
  return AuditLog.find(filter).sort(sort).skip(skip).limit(limit).lean();
}

module.exports = {
  logEvent,
  queryLogs,
};
