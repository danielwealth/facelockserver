// tests/rateLimiter.test.js
const request = require('supertest');
const express = require('express');
const { createRateLimiter, redis } = require('../server/middleware/rateLimiter');

describe('rate limiter', () => {
  let app;
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const limiter = createRateLimiter({ ipLimit: 5, ipWindowSec: 2, userLimit: 3, userWindowSec: 2, failureThreshold: 2, lockoutSec: 3 });
    app.use((req, res, next) => {
      // fake auth
      req.session = { user: { id: 'user1' } };
      req.logEvent = async () => {};
      next();
    });
    app.use(limiter);
    app.post('/test', (req, res) => res.json({ ok: true }));
  });

  afterAll(async () => {
    await redis.flushall();
    await redis.quit();
  });

  test('ip limit triggers 429', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await request(app).post('/test');
      expect(r.statusCode).toBe(200);
    }
    const r = await request(app).post('/test');
    expect(r.statusCode).toBe(429);
  });

  test('user lockout after failures', async () => {
    // simulate route that records failures
    const limiter = createRateLimiter({ failureThreshold: 2, lockoutSec: 3 });
    const app2 = express();
    app2.use((req, res, next) => { req.session = { user: { id: 'u2' } }; req.logEvent = async () => {}; next(); });
    app2.use(limiter);
    app2.post('/fail', async (req, res) => {
      await req.rateLimiter.recordFailure('bad');
      res.json({ ok: true });
    });

    await request(app2).post('/fail');
    await request(app2).post('/fail'); // should trigger lockout
    const r = await request(app2).post('/fail');
    expect(r.statusCode).toBe(429);
  });
});
