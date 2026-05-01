const sanitizeHtml = require('sanitize-html');
const xss = require('xss');

// HTML sanitization options
const htmlOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  allowedAttributes: {
    'a': ['href', 'target'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

// Sanitize request body
const sanitizeBody = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

// Sanitize request query
const sanitizeQuery = (req, res, next) => {
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  next();
};

// Sanitize request params
const sanitizeParams = (req, res, next) => {
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

// Recursive object sanitization
const sanitizeObject = (obj) => {
  if (!obj) return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Remove any non-printable characters
      sanitized[key] = value
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .trim();
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// HTML sanitization for rich text
const sanitizeHtmlContent = (content) => {
  return sanitizeHtml(content, htmlOptions);
};

// XSS prevention
const preventXSS = (str) => {
  if (typeof str !== 'string') return str;
  return xss(str);
};

// Sanitize email (remove potential injection)
const sanitizeEmail = (email) => {
  if (!email) return email;
  return email.toLowerCase().trim().replace(/[<>]/g, '');
};

// Sanitize filename
const sanitizeFilename = (filename) => {
  if (!filename) return filename;
  return filename
    .replace(/[^a-zA-Z0-9.\-\_]/g, '')
    .replace(/\.{2,}/g, '.')
    .trim();
};

// Sanitize phone number
const sanitizePhone = (phone) => {
  if (!phone) return phone;
  return phone.replace(/\D/g, '');
};

// URL sanitization
const sanitizeUrl = (url) => {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

// Apply all sanitization
const sanitizeAll = [sanitizeBody, sanitizeQuery, sanitizeParams];

// Deep sanitization for nested objects
const deepSanitize = (obj, maxDepth = 5, currentDepth = 0) => {
  if (currentDepth > maxDepth) return obj;
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = preventXSS(sanitizeHtml(value));
    } else if (typeof value === 'object' && value !== null) {
      result[key] = deepSanitize(value, maxDepth, currentDepth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
};

module.exports = {
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeAll,
  deepSanitize,
  sanitizeHtmlContent,
  preventXSS,
  sanitizeEmail,
  sanitizeFilename,
  sanitizePhone,
  sanitizeUrl,
};