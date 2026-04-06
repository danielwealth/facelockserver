// server/middleware/auditAction.js
const { logEvent } = require('../services/audit');

function auditAction(actionName, opts = {}) {
  return async function (req, res, next) {
    // Capture request metadata
    const actor = req.session?.user || req.user || null;
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.get('User-Agent') || null;

    // Attach a helper to req so route handlers can add details and outcome
    req.audit = {
      async ok(details = {}) {
        await logEvent({
          actorId: actor?._id,
          actorEmail: actor?.email,
          action: actionName,
          resourceType: opts.resourceType || null,
          resourceId: opts.resourceId || null,
          details,
          ip,
          userAgent,
          outcome: 'success'
        });
      },
      async fail(details = {}) {
        await logEvent({
          actorId: actor?._id,
          actorEmail: actor?.email,
          action: actionName,
          resourceType: opts.resourceType || null,
          resourceId: opts.resourceId || null,
          details,
          ip,
          userAgent,
          outcome: 'failure'
        });
      }
    };

    next();
  };
}

module.exports = auditAction;
