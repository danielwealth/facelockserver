// server/middleware/rateLimiter.js
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

/**
 * Config defaults
 */
const DEFAULTS = {
  ipWindowSec: 60,
  ipLimit: 120,        // allow 120 requests/min per IP
  userWindowSec: 60,
  userLimit: 60,       // allow 60 requests/min per user
  failureWindowSec: 900,
  failureThreshold: 5,
  lockoutSec: 900,
  lockoutBackoffMultiplier: 2
};


/**
 * Helper: build keys
 */
function ipKey(ip) { return `rl:ip:${ip}`; }
function userKey(userId) { return `rl:user:${userId}`; }
function failureKey(userId) { return `rl:fail:${userId}`; }
function lockoutKey(userId) { return `rl:lock:${userId}`; }

/**
 * Create middleware with options
 */
function createRateLimiter(opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };

  return async function rateLimiter(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
      const user = (req.session && req.session.user) || req.user || null;
      const userId = user?.id || user?._id || null;

      // 0) Check user lockout first
      if (userId) {
        const lockInfo = await redis.hgetall(lockoutKey(userId));
        if (lockInfo && lockInfo.expiresAt) {
          const expiresAt = parseInt(lockInfo.expiresAt, 10);
          const now = Math.floor(Date.now() / 1000);
          if (now < expiresAt) {
            const remaining = expiresAt - now;
            res.set('Retry-After', String(remaining));
            return res.status(429).json({ success: false, error: 'Account temporarily locked', retryAfter: remaining });
          } else {
            // expired lockout cleanup
            await redis.del(lockoutKey(userId));
          }
        }
      }

      // 1) IP rate limiting (simple fixed window)
      const ipK = ipKey(ip);
      const ipCount = await redis.incr(ipK);
      if (ipCount === 1) {
        await redis.expire(ipK, cfg.ipWindowSec);
      }
      if (ipCount > cfg.ipLimit) {
        res.set('Retry-After', String(cfg.ipWindowSec));
        return res.status(429).json({ success: false, error: 'Too many requests from this IP' });
      }

      // 2) Per-user rate limiting (if authenticated)
      if (userId) {
        const uK = userKey(userId);
        const userCount = await redis.incr(uK);
        if (userCount === 1) {
          await redis.expire(uK, cfg.userWindowSec);
        }
        if (userCount > cfg.userLimit) {
          res.set('Retry-After', String(cfg.userWindowSec));
          return res.status(429).json({ success: false, error: 'Too many requests' });
        }
      }

      // 3) Attach helpers to req for recording failures or manual lockouts
      req.rateLimiter = {
        recordFailure: async (reason = 'unknown') => {
          if (!userId) return;
          const fK = failureKey(userId);
          const failures = await redis.incr(fK);
          if (failures === 1) await redis.expire(fK, cfg.failureWindowSec);

          if (failures >= cfg.failureThreshold) {
            // escalate lockout: compute backoff multiplier based on previous lockouts
            const prevLock = await redis.hgetall(lockoutKey(userId));
            const prevCount = parseInt(prevLock.count || '0', 10);
            const multiplier = Math.pow(cfg.lockoutBackoffMultiplier, prevCount);
            const lockSec = Math.floor(cfg.lockoutSec * multiplier);
            const expiresAt = Math.floor(Date.now() / 1000) + lockSec;

            await redis.hmset(lockoutKey(userId), {
              expiresAt: String(expiresAt),
              count: String(prevCount + 1),
              reason
            });
            await redis.expire(lockoutKey(userId), lockSec);

            // reset failure counter
            await redis.del(fK);

            // optional audit hook
            if (typeof req.logEvent === 'function') {
              try { await req.logEvent({ action: 'lockout', userId, reason, lockSec }); } catch (e) { /* swallow */ }
            }
          }
        },
        clearFailures: async () => {
          if (!userId) return;
          await redis.del(failureKey(userId));
        },
        forceLockout: async (seconds = cfg.lockoutSec, reason = 'manual') => {
          if (!userId) return;
          const expiresAt = Math.floor(Date.now() / 1000) + seconds;
          const prevLock = await redis.hgetall(lockoutKey(userId));
          const prevCount = parseInt(prevLock.count || '0', 10);
          await redis.hmset(lockoutKey(userId), { expiresAt: String(expiresAt), count: String(prevCount + 1), reason });
          await redis.expire(lockoutKey(userId), seconds);
          if (typeof req.logEvent === 'function') {
            try { await req.logEvent({ action: 'force_lockout', userId, reason, seconds }); } catch (e) { /* swallow */ }
          }
        }
      };

      // 4) proceed
      return next();
    } catch (err) {
      // On Redis error, fail open but log
      console.error('Rate limiter error:', err);
      return next();
    }
  };
}

module.exports = { createRateLimiter, redis };
