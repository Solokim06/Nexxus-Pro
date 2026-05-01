const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ==================== STRING HELPERS ====================

const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const truncate = (str, length, suffix = '...') => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
};

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

const generateNumericCode = (length = 6) => {
  return Math.random().toString().slice(2, 2 + length);
};

// ==================== NUMBER HELPERS ====================

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatNumber = (num, decimals = 0) => {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

const formatPercentage = (value, decimals = 1) => {
  return `${value.toFixed(decimals)}%`;
};

// ==================== DATE HELPERS ====================

const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

const getRelativeTime = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  return `${years} year${years !== 1 ? 's' : ''} ago`;
};

const isExpired = (date) => {
  return new Date(date) < new Date();
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addHours = (date, hours) => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

// ==================== OBJECT HELPERS ====================

const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

const deepMerge = (target, source) => {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
};

const omit = (obj, keys) => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

const pick = (obj, keys) => {
  const result = {};
  keys.forEach(key => {
    if (obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
  });
  return result;
};

const isEmpty = (obj) => {
  return !obj || Object.keys(obj).length === 0;
};

// ==================== ARRAY HELPERS ====================

const chunk = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

const unique = (array) => {
  return [...new Set(array)];
};

const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
};

// ==================== FILE HELPERS ====================

const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

const getFileNameWithoutExtension = (filename) => {
  return filename.substring(0, filename.lastIndexOf('.')) || filename;
};

const isImageFile = (filename) => {
  const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  return extensions.includes(getFileExtension(filename).toLowerCase());
};

const isVideoFile = (filename) => {
  const extensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
  return extensions.includes(getFileExtension(filename).toLowerCase());
};

const isAudioFile = (filename) => {
  const extensions = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
  return extensions.includes(getFileExtension(filename).toLowerCase());
};

const isPDFFile = (filename) => {
  return getFileExtension(filename).toLowerCase() === 'pdf';
};

const isDocumentFile = (filename) => {
  const extensions = ['doc', 'docx', 'txt', 'rtf', 'odt'];
  return extensions.includes(getFileExtension(filename).toLowerCase());
};

// ==================== NETWORK HELPERS ====================

const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip;
};

const getUserAgent = (req) => {
  return req.get('user-agent') || 'unknown';
};

const isBot = (userAgent) => {
  const bots = ['bot', 'crawler', 'spider', 'scraper'];
  return bots.some(bot => userAgent?.toLowerCase().includes(bot));
};

// ==================== ENVIRONMENT HELPERS ====================

const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

const isTest = () => {
  return process.env.NODE_ENV === 'test';
};

// ==================== PROMISE HELPERS ====================

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const retry = async (fn, retries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await sleep(delay * Math.pow(2, i));
    }
  }
  
  throw lastError;
};

const timeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    ),
  ]);
};

// ==================== VALIDATION HELPERS ====================

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone) => {
  const phoneRegex = /^(254|\+254|0)?[7-9][0-9]{8}$/;
  return phoneRegex.test(phone);
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

const isValidObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

module.exports = {
  // String helpers
  capitalize,
  truncate,
  slugify,
  generateRandomString,
  generateNumericCode,
  
  // Number helpers
  formatBytes,
  formatNumber,
  formatCurrency,
  formatPercentage,
  
  // Date helpers
  formatDate,
  getRelativeTime,
  isExpired,
  addDays,
  addHours,
  
  // Object helpers
  deepClone,
  deepMerge,
  omit,
  pick,
  isEmpty,
  
  // Array helpers
  chunk,
  unique,
  groupBy,
  sortBy,
  
  // File helpers
  getFileExtension,
  getFileNameWithoutExtension,
  isImageFile,
  isVideoFile,
  isAudioFile,
  isPDFFile,
  isDocumentFile,
  
  // Network helpers
  getClientIp,
  getUserAgent,
  isBot,
  
  // Environment helpers
  isProduction,
  isDevelopment,
  isTest,
  
  // Promise helpers
  sleep,
  retry,
  timeout,
  
  // Validation helpers
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isValidUUID,
  isValidObjectId,
};