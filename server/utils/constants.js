// ==================== HTTP STATUS CODES ====================
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

// ==================== USER ROLES ====================
const USER_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
};

// ==================== SUBSCRIPTION PLANS ====================
const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
};

// ==================== PAYMENT METHODS ====================
const PAYMENT_METHODS = {
  MPESA: 'mpesa',
  PAYPAL: 'paypal',
  BANK_TRANSFER: 'bank_transfer',
  CARD: 'card',
};

// ==================== PAYMENT STATUS ====================
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
};

// ==================== SUBSCRIPTION STATUS ====================
const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

// ==================== FILE STATUS ====================
const FILE_STATUS = {
  ACTIVE: 'active',
  DELETED: 'deleted',
  PROCESSING: 'processing',
  FAILED: 'failed',
};

// ==================== MERGE STATUS ====================
const MERGE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// ==================== NOTIFICATION TYPES ====================
const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  UPLOAD: 'upload',
  MERGE: 'merge',
  PAYMENT: 'payment',
  SUBSCRIPTION: 'subscription',
  SHARE: 'share',
};

// ==================== FILE MIME TYPES ====================
const MIME_TYPES = {
  // Images
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif',
  WEBP: 'image/webp',
  SVG: 'image/svg+xml',
  
  // Videos
  MP4: 'video/mp4',
  WEBM: 'video/webm',
  OGG: 'video/ogg',
  
  // Audio
  MP3: 'audio/mpeg',
  WAV: 'audio/wav',
  OGG_AUDIO: 'audio/ogg',
  
  // Documents
  PDF: 'application/pdf',
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLS: 'application/vnd.ms-excel',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PPT: 'application/vnd.ms-powerpoint',
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  
  // Text
  TXT: 'text/plain',
  HTML: 'text/html',
  CSS: 'text/css',
  JS: 'text/javascript',
  JSON: 'application/json',
  XML: 'application/xml',
  CSV: 'text/csv',
  
  // Archives
  ZIP: 'application/zip',
  RAR: 'application/x-rar-compressed',
  SEVEN_Z: 'application/x-7z-compressed',
  TAR: 'application/x-tar',
  GZIP: 'application/gzip',
};

// ==================== FILE CATEGORIES ====================
const FILE_CATEGORIES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  SPREADSHEET: 'spreadsheet',
  PRESENTATION: 'presentation',
  ARCHIVE: 'archive',
  TEXT: 'text',
  OTHER: 'other',
};

// ==================== STORAGE LIMITS (bytes) ====================
const STORAGE_LIMITS = {
  FREE: 1 * 1024 * 1024 * 1024,      // 1 GB
  BASIC: 10 * 1024 * 1024 * 1024,    // 10 GB
  PRO: 100 * 1024 * 1024 * 1024,     // 100 GB
  ENTERPRISE: 1024 * 1024 * 1024 * 1024, // 1 TB
};

// ==================== FILE SIZE LIMITS (bytes) ====================
const FILE_SIZE_LIMITS = {
  FREE: 50 * 1024 * 1024,        // 50 MB
  BASIC: 100 * 1024 * 1024,      // 100 MB
  PRO: 500 * 1024 * 1024,        // 500 MB
  ENTERPRISE: 2 * 1024 * 1024 * 1024, // 2 GB
};

// ==================== MERGE LIMITS ====================
const MERGE_LIMITS = {
  FREE: 5,
  BASIC: 50,
  PRO: -1,      // Unlimited
  ENTERPRISE: -1,
};

// ==================== API RATE LIMITS ====================
const RATE_LIMITS = {
  GENERAL: { windowMs: 15 * 60 * 1000, max: 100 },
  AUTH: { windowMs: 15 * 60 * 1000, max: 5 },
  UPLOAD: { windowMs: 60 * 60 * 1000, max: 50 },
  DOWNLOAD: { windowMs: 60 * 60 * 1000, max: 200 },
  MERGE: { windowMs: 60 * 60 * 1000, max: 20 },
  API_KEY: { windowMs: 24 * 60 * 60 * 1000, max: 1000 },
};

// ==================== CACHE TTL (seconds) ====================
const CACHE_TTL = {
  USER: 3600,           // 1 hour
  FILE: 300,            // 5 minutes
  SUBSCRIPTION: 3600,   // 1 hour
  PLAN: 86400,          // 24 hours
  STATS: 300,           // 5 minutes
};

// ==================== TOKEN EXPIRY (seconds) ====================
const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 86400,      // 24 hours
  REFRESH_TOKEN: 604800,    // 7 days
  EMAIL_VERIFICATION: 86400, // 24 hours
  PASSWORD_RESET: 3600,      // 1 hour
  SHARE_LINK: 604800,        // 7 days
};

// ==================== REGEX PATTERNS ====================
const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_KENYA: /^(254|\+254|0)?[7-9][0-9]{8}$/,
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  OBJECT_ID: /^[0-9a-fA-F]{24}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
};

// ==================== ERROR MESSAGES ====================
const ERROR_MESSAGES = {
  // General
  INTERNAL_SERVER_ERROR: 'Internal server error',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  BAD_REQUEST: 'Invalid request',
  
  // Auth
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_EXISTS: 'Email already registered',
  USER_NOT_FOUND: 'User not found',
  INVALID_TOKEN: 'Invalid or expired token',
  ACCOUNT_LOCKED: 'Account is locked',
  EMAIL_NOT_VERIFIED: 'Email not verified',
  
  // File
  FILE_NOT_FOUND: 'File not found',
  FILE_TOO_LARGE: 'File size exceeds limit',
  INVALID_FILE_TYPE: 'File type not allowed',
  UPLOAD_FAILED: 'File upload failed',
  STORAGE_LIMIT_EXCEEDED: 'Storage limit exceeded',
  
  // Payment
  PAYMENT_FAILED: 'Payment processing failed',
  INVALID_PAYMENT_METHOD: 'Invalid payment method',
  PAYMENT_NOT_FOUND: 'Payment not found',
  
  // Subscription
  SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
  PLAN_NOT_FOUND: 'Plan not found',
  SUBSCRIPTION_EXPIRED: 'Subscription expired',
  
  // Merge
  MERGE_FAILED: 'Merge operation failed',
  INVALID_MERGE_FILES: 'Invalid files for merge',
  MERGE_LIMIT_REACHED: 'Merge limit reached',
};

// ==================== SUCCESS MESSAGES ====================
const SUCCESS_MESSAGES = {
  // Auth
  LOGIN_SUCCESS: 'Login successful',
  REGISTER_SUCCESS: 'Registration successful',
  LOGOUT_SUCCESS: 'Logout successful',
  PASSWORD_CHANGED: 'Password changed successfully',
  EMAIL_VERIFIED: 'Email verified successfully',
  
  // File
  UPLOAD_SUCCESS: 'File uploaded successfully',
  FILE_DELETED: 'File deleted successfully',
  FILE_RENAMED: 'File renamed successfully',
  FILE_MOVED: 'File moved successfully',
  
  // Payment
  PAYMENT_SUCCESS: 'Payment successful',
  REFUND_SUCCESS: 'Refund processed successfully',
  
  // Subscription
  SUBSCRIPTION_ACTIVATED: 'Subscription activated',
  SUBSCRIPTION_CANCELLED: 'Subscription cancelled',
  PLAN_CHANGED: 'Plan changed successfully',
  
  // Merge
  MERGE_SUCCESS: 'Merge completed successfully',
  MERGE_CANCELLED: 'Merge cancelled',
};

// ==================== ENVIRONMENT ====================
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
};

// ==================== SORT ORDERS ====================
const SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc',
};

// ==================== DEFAULT PAGINATION ====================
const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
};

// ==================== DATE FORMATS ====================
const DATE_FORMATS = {
  SHORT: 'YYYY-MM-DD',
  LONG: 'YYYY-MM-DD HH:mm:ss',
  HUMAN: 'MMM DD, YYYY',
  HUMAN_WITH_TIME: 'MMM DD, YYYY HH:mm',
  API: 'YYYY-MM-DDTHH:mm:ss.sssZ',
};

module.exports = {
  HTTP_STATUS,
  USER_ROLES,
  SUBSCRIPTION_PLANS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  SUBSCRIPTION_STATUS,
  FILE_STATUS,
  MERGE_STATUS,
  NOTIFICATION_TYPES,
  MIME_TYPES,
  FILE_CATEGORIES,
  STORAGE_LIMITS,
  FILE_SIZE_LIMITS,
  MERGE_LIMITS,
  RATE_LIMITS,
  CACHE_TTL,
  TOKEN_EXPIRY,
  REGEX,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ENVIRONMENTS,
  SORT_ORDERS,
  DEFAULT_PAGINATION,
  DATE_FORMATS,
};