const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisClient = require('../config/redis');

// General API rate limiter
const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});

// Upload limiter
const uploadLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    message: 'Upload limit reached. Please try again later.',
  },
});

// API key rate limiter (per key)
const apiKeyLimiter = (maxRequests = 1000, windowMs = 24 * 60 * 60 * 1000) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: 'rl:apikey:',
    }),
    windowMs,
    max: maxRequests,
    keyGenerator: (req) => {
      return req.apiKeyId || req.ip;
    },
    message: {
      success: false,
      message: 'API rate limit exceeded. Please upgrade your plan.',
    },
  });
};

// Download limiter
const downloadLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 60 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Download limit reached. Please try again later.',
  },
});

// Merge operation limiter
const mergeLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Merge limit reached. Please try again later.',
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  apiKeyLimiter,
  downloadLimiter,
  mergeLimiter,
};