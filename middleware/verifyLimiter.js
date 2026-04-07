// server/middleware/verifyLimiter.js
const { createRateLimiter, redis } = require('./rateLimiter'); // reuse existing implementation

// stricter options for verification endpoint
const verifyLimiter = createRateLimiter({
  ipWindowSec: 60,
  ipLimit: 10,
  userWindowSec: 60,
  userLimit: 5,
  failureWindowSec: 15 * 60, // 15 minutes
  failureThreshold: 3,
  lockoutSec: 15 * 60, // 15 minutes
  lockoutBackoffMultiplier: 2
});

module.exports = { verifyLimiter, redis };
