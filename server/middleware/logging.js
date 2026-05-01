
const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom token for user ID
morgan.token('userId', (req) => req.user?.id || 'anonymous');
morgan.token('body', (req) => JSON.stringify(req.body));
morgan.token('query', (req) => JSON.stringify(req.query));

// Morgan format strings
const formats = {
  combined: ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
  detailed: ':method :url :status :response-time ms - :userId - :res[content-length] - :referrer - :user-agent',
  body: ':method :url :status - Request Body: :body',
};

// Development logging (colored, concise)
const devLogger = morgan('dev', {
  stream: { write: (message) => logger.info(message.trim()) },
  skip: (req) => req.url === '/health',
});

// Production logging (detailed, to file)
const prodLogger = morgan(formats.detailed, {
  stream: { write: (message) => logger.info(message.trim()) },
  skip: (req) => req.url === '/health' || req.url === '/metrics',
});

// API request logger with timing
const apiLogger = morgan(formats.detailed, {
  stream: { write: (message) => logger.info(message) },
});

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    body: req.body,
    query: req.query,
    params: req.params,
  });
  next(err);
};

// Request logger for debugging
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
    });
  });
  
  next();
};

// Slow request warning
const slowRequestWarning = (threshold = 1000) => {
  return (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > threshold) {
        logger.warn({
          message: 'Slow request detected',
          method: req.method,
          url: req.url,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
          userId: req.user?.id,
        });
      }
    });
    
    next();
  };
};

module.exports = {
  devLogger,
  prodLogger,
  apiLogger,
  errorLogger,
  requestLogger,
  slowRequestWarning,
};