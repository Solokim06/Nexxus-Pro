const helmet = require('helmet');
const hpp = require('hpp');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');

// Helmet configuration for security headers
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", 'https://api.nexxus-pro.com', 'wss://api.nexxus-pro.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Prevent HTTP Parameter Pollution
const hppMiddleware = hpp();

// Sanitize user input against XSS
const xssMiddleware = xss();

// Sanitize against NoSQL injection
const mongoSanitizeMiddleware = mongoSanitize();

// Rate limiting for sensitive operations
const sensitiveRateLimit = require('./rateLimit').authLimiter;

// Add security headers manually
const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// Check for suspicious patterns in requests
const suspiciousRequestCheck = (req, res, next) => {
  const suspiciousPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL injection
    /<script|<iframe|<img|<body|<div/i, // XSS
    /\$ne|\$gt|\$lt|\$regex|\$where/i, // NoSQL injection
  ];
  
  const checkString = (str) => {
    if (!str) return false;
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };
  
  const checkObject = (obj) => {
    for (const key in obj) {
      if (checkString(key)) return true;
      if (typeof obj[key] === 'string' && checkString(obj[key])) return true;
      if (typeof obj[key] === 'object' && obj[key] !== null && checkObject(obj[key])) return true;
    }
    return false;
  };
  
  if (checkObject(req.query) || checkObject(req.body) || checkObject(req.params)) {
    return res.status(400).json({
      success: false,
      message: 'Suspicious request detected',
    });
  }
  
  next();
};

module.exports = {
  helmetMiddleware,
  hppMiddleware,
  xssMiddleware,
  mongoSanitizeMiddleware,
  securityHeaders,
  suspiciousRequestCheck,
  sensitiveRateLimit,
};