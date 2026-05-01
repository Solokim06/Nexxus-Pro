// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    ME: '/auth/me',
  },
  FILES: {
    BASE: '/files',
    UPLOAD: '/files/upload',
    UPLOAD_CHUNK: '/files/upload-chunk',
    COMPLETE_UPLOAD: '/files/complete-upload',
    DOWNLOAD: '/files/download',
    DELETE: '/files/delete',
    SHARE: '/files/share',
    SEARCH: '/files/search',
  },
  FOLDERS: {
    BASE: '/folders',
    TREE: '/folders/tree',
    CONTENTS: '/folders/contents',
  },
  MERGE: {
    BASE: '/merge',
    FILES: '/merge/files',
    FOLDERS: '/merge/folders',
    QUEUE: '/merge/queue',
    HISTORY: '/merge/history',
  },
  PAYMENTS: {
    BASE: '/payments',
    MPESA: '/payments/mpesa',
    PAYPAL: '/payments/paypal',
    BANK: '/payments/bank',
    VERIFY: '/payments/verify',
  },
  SUBSCRIPTIONS: {
    BASE: '/subscriptions',
    PLANS: '/subscriptions/plans',
    USAGE: '/subscriptions/usage',
    BILLING: '/subscriptions/billing',
  },
};

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  FREE: {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_TOTAL_STORAGE: 1 * 1024 * 1024 * 1024, // 1GB
    MAX_FILES: 100,
    MAX_MERGES_PER_MONTH: 5,
  },
  BASIC: {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_TOTAL_STORAGE: 10 * 1024 * 1024 * 1024, // 10GB
    MAX_FILES: 500,
    MAX_MERGES_PER_MONTH: 50,
  },
  PRO: {
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
    MAX_TOTAL_STORAGE: 100 * 1024 * 1024 * 1024, // 100GB
    MAX_FILES: 5000,
    MAX_MERGES_PER_MONTH: -1, // Unlimited
  },
  ENTERPRISE: {
    MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
    MAX_TOTAL_STORAGE: 1 * 1024 * 1024 * 1024 * 1024, // 1TB
    MAX_FILES: -1, // Unlimited
    MAX_MERGES_PER_MONTH: -1, // Unlimited
  },
};

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
};

// File types
export const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  VIDEO: ['video/mp4', 'video/webm', 'video/ogg'],
  AUDIO: ['audio/mpeg', 'audio/ogg', 'audio/wav'],
  DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  SPREADSHEET: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  PRESENTATION: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ARCHIVE: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
  TEXT: ['text/plain', 'text/html', 'text/css', 'text/javascript', 'application/json'],
};

// File extensions
export const FILE_EXTENSIONS = {
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  VIDEO: ['.mp4', '.webm', '.ogg', '.mov', '.avi'],
  AUDIO: ['.mp3', '.ogg', '.wav', '.flac'],
  DOCUMENT: ['.pdf', '.doc', '.docx'],
  SPREADSHEET: ['.xls', '.xlsx'],
  PRESENTATION: ['.ppt', '.pptx'],
  ARCHIVE: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  TEXT: ['.txt', '.html', '.css', '.js', '.json', '.xml'],
};

// M-Pesa constants
export const MPESA = {
  BUSINESS_SHORT_CODE: '174379',
  PASSKEY: process.env.REACT_APP_MPESA_PASSKEY,
  CALLBACK_URL: `${process.env.REACT_APP_API_URL}/api/mpesa/callback`,
  TRANSACTION_TYPE: 'CustomerPayBillOnline',
  ACCOUNT_REFERENCE: 'Nexxus-Pro',
};

// Payment methods
export const PAYMENT_METHODS = {
  MPESA: 'mpesa',
  PAYPAL: 'paypal',
  BANK_TRANSFER: 'bank_transfer',
  CARD: 'card',
};

// Local storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  THEME: 'theme',
  USER_PREFERENCES: 'userPreferences',
  RECENT_FILES: 'recentFiles',
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Please log in to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  FILE_TOO_LARGE: 'File size exceeds the limit.',
  INVALID_FILE_TYPE: 'File type is not supported.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',
  MERGE_FAILED: 'Failed to merge files. Please try again.',
  PAYMENT_FAILED: 'Payment processing failed. Please try again.',
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Date formats
export const DATE_FORMATS = {
  SHORT: 'MM/DD/YYYY',
  LONG: 'MMMM DD, YYYY',
  FULL: 'MMMM DD, YYYY HH:mm:ss',
  API: 'YYYY-MM-DDTHH:mm:ss.sssZ',
};

// Timeouts (in milliseconds)
export const TIMEOUTS = {
  API_REQUEST: 30000,
  UPLOAD_CHUNK: 60000,
  SESSION: 3600000, // 1 hour
};

// Regex patterns
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_KENYA: /^(254|\+254|0)?[7-9][0-9]{8}$/,
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};