// tests/verifyLimiter.test.js
const request = require('supertest');
const express = require('express');
const { verifyLimiter, redis } = require('../server/middleware/verifyLimiter');

describe('verify-identity limiter', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    // fake auth and attach a fake rate log
    app.post('/verify-identity', (req, res, next) => {
      req.session = { user: { id: 'test-user' } };
      req.logEvent = async () => {};
      next();
    }, verifyLimiter, (req, res) => {
      // simulate a failed verification attempt
      req.rateLimiter.recordFailure('simulated_fail').then(() => {
        res.status(401).json({ ok: false });
      });
    });
  });

  afterAll(async () => {
    await redis.flushall();
    await redis.quit();
  });

  test('triggers lockout after repeated failures', async () => {
    await request(app).post('/verify-identity');
    await request(app).post('/verify-identity');
    const r = await request(app).post('/verify-identity'); // should trigger lockout
    expect(r.statusCode).toBe(429);
    expect(r.body.error).toMatch(/locked|Too many/);
    expect(r.headers['retry-after']).toBeDefined();
  });
});
