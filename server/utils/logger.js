const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format (more readable)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 10485760,
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Create specific loggers for different contexts
const createContextLogger = (context) => {
  return {
    info: (message, meta = {}) => logger.info(`[${context}] ${message}`, meta),
    error: (message, meta = {}) => logger.error(`[${context}] ${message}`, meta),
    warn: (message, meta = {}) => logger.warn(`[${context}] ${message}`, meta),
    debug: (message, meta = {}) => logger.debug(`[${context}] ${message}`, meta),
  };
};

// Request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    });
  });
  
  next();
};

// Audit logger
const auditLogger = {
  log: (action, userId, details, ip = null) => {
    logger.info(`AUDIT: ${action}`, {
      userId,
      action,
      details,
      ip,
      timestamp: new Date().toISOString(),
    });
  },
  
  login: (userId, ip, success) => {
    auditLogger.log('LOGIN_ATTEMPT', userId, { ip, success }, ip);
  },
  
  logout: (userId, ip) => {
    auditLogger.log('LOGOUT', userId, { ip }, ip);
  },
  
  fileUpload: (userId, fileName, fileSize) => {
    auditLogger.log('FILE_UPLOAD', userId, { fileName, fileSize });
  },
  
  fileDownload: (userId, fileId, fileName) => {
    auditLogger.log('FILE_DOWNLOAD', userId, { fileId, fileName });
  },
  
  fileDelete: (userId, fileId, fileName) => {
    auditLogger.log('FILE_DELETE', userId, { fileId, fileName });
  },
  
  mergeRequest: (userId, fileCount, outputFormat) => {
    auditLogger.log('MERGE_REQUEST', userId, { fileCount, outputFormat });
  },
  
  paymentInitiated: (userId, amount, method) => {
    auditLogger.log('PAYMENT_INITIATED', userId, { amount, method });
  },
  
  subscriptionChange: (userId, oldPlan, newPlan) => {
    auditLogger.log('SUBSCRIPTION_CHANGE', userId, { oldPlan, newPlan });
  },
  
  settingsChange: (userId, settings) => {
    auditLogger.log('SETTINGS_CHANGE', userId, { settings });
  },
};

// Performance logger
const performanceLogger = {
  startTimer: (name) => {
    return { name, start: Date.now() };
  },
  
  endTimer: (timer) => {
    const duration = Date.now() - timer.start;
    logger.debug(`PERFORMANCE: ${timer.name}`, { duration: `${duration}ms` });
    return duration;
  },
  
  logApiCall: (endpoint, duration, success = true) => {
    logger.info(`API_CALL: ${endpoint}`, { duration: `${duration}ms`, success });
  },
  
  logDatabaseQuery: (query, duration, collection) => {
    logger.debug(`DB_QUERY: ${collection}`, { query, duration: `${duration}ms` });
  },
};

// Error logger with stack trace
const errorLogger = {
  logError: (error, context = {}) => {
    logger.error(error.message, {
      stack: error.stack,
      context,
      name: error.name,
      code: error.code,
    });
  },
  
  logValidationError: (errors, context = {}) => {
    logger.warn('Validation Error', { errors, context });
  },
  
  logDatabaseError: (error, operation, collection) => {
    logger.error(`Database Error [${operation}] on ${collection}`, {
      error: error.message,
      code: error.code,
    });
  },
  
  logPaymentError: (error, paymentId, method) => {
    logger.error(`Payment Error [${method}]`, {
      error: error.message,
      paymentId,
      method,
    });
  },
};

module.exports = {
  logger,
  createContextLogger,
  requestLogger,
  auditLogger,
  performanceLogger,
  errorLogger,
};