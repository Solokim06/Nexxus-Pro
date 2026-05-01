const { body, param, query, validationResult } = require('express-validator');

// ==================== VALIDATION RULES ====================

// User validation
const validateUser = {
  register: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    body('phone')
      .optional()
      .matches(/^(254|\+254|0)?[7-9][0-9]{8}$/)
      .withMessage('Valid Kenyan phone number required'),
  ],
  
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  
  updateProfile: [
    body('name').optional().trim().isLength({ min: 2, max: 50 }),
    body('phone').optional().matches(/^(254|\+254|0)?[7-9][0-9]{8}$/),
    body('company').optional().trim().isLength({ max: 100 }),
    body('website').optional().isURL(),
    body('bio').optional().isLength({ max: 500 }),
  ],
  
  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('Passwords do not match'),
  ],
};

// File validation
const validateFile = {
  upload: [
    body('folderId').optional().isMongoId().withMessage('Invalid folder ID'),
  ],
  
  update: [
    param('id').isMongoId().withMessage('Invalid file ID'),
    body('name').optional().trim().isLength({ min: 1, max: 255 }),
    body('folderId').optional().isMongoId(),
  ],
  
  share: [
    param('id').isMongoId(),
    body('email').isEmail().normalizeEmail(),
    body('permission').optional().isIn(['view', 'edit', 'download']),
    body('expiresAt').optional().isISO8601(),
  ],
  
  move: [
    param('id').isMongoId(),
    body('destinationFolderId').optional().isMongoId(),
  ],
};

// Folder validation
const validateFolder = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Folder name must be between 1 and 100 characters'),
    body('parentId').optional().isMongoId(),
  ],
  
  update: [
    param('id').isMongoId(),
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
  ],
  
  move: [
    param('id').isMongoId(),
    body('destinationFolderId').optional().isMongoId(),
  ],
};

// Payment validation
const validatePayment = {
  process: [
    body('method').isIn(['mpesa', 'paypal', 'bank_transfer']),
    body('amount').isFloat({ min: 0.01 }),
    body('planId').isIn(['basic', 'pro', 'enterprise']),
    body('paymentDetails').optional().isObject(),
  ],
  
  mpesa: [
    body('phoneNumber')
      .matches(/^(254|\+254|0)?[7-9][0-9]{8}$/)
      .withMessage('Valid M-Pesa phone number required'),
    body('amount').isFloat({ min: 1 }),
  ],
  
  bankTransfer: [
    body('reference').notEmpty(),
  ],
  
  refund: [
    param('paymentId').isMongoId(),
    body('reason').optional().isString(),
  ],
};

// Subscription validation
const validateSubscription = {
  create: [
    body('planId').isIn(['basic', 'pro', 'enterprise']),
    body('paymentMethod').isIn(['mpesa', 'paypal', 'bank_transfer']),
    body('billingCycle').optional().isIn(['month', 'year']),
  ],
  
  changePlan: [
    body('newPlanId').isIn(['basic', 'pro', 'enterprise']),
  ],
  
  cancel: [
    body('reason').optional().isString(),
  ],
};

// Merge validation
const validateMerge = {
  files: [
    body('outputFormat').isIn(['pdf', 'zip', 'image', 'txt']),
    body('options').optional().isObject(),
  ],
  
  folders: [
    body('folderIds').isArray().withMessage('Folder IDs must be an array'),
    body('options').optional().isObject(),
  ],
};

// ID validation
const validateId = (idName = 'id') => [
  param(idName).isMongoId().withMessage(`Invalid ${idName} format`),
];

// Pagination validation
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isString(),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

// Search validation
const validateSearch = [
  query('q').optional().trim().isLength({ min: 2 }),
  query('type').optional().isString(),
  query('minSize').optional().isInt({ min: 0 }),
  query('maxSize').optional().isInt({ min: 0 }),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
];

// ==================== CUSTOM VALIDATORS ====================

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

const isValidPassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

const isValidObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

const isValidDate = (date) => {
  return !isNaN(new Date(date).getTime());
};

const isFutureDate = (date) => {
  return isValidDate(date) && new Date(date) > new Date();
};

const isPastDate = (date) => {
  return isValidDate(date) && new Date(date) < new Date();
};

// ==================== VALIDATION RESULT HANDLER ====================

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// ==================== SANITIZATION ====================

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  return input;
};

const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeInput(value);
  }
  return sanitized;
};

// ==================== EXPORTS ====================
module.exports = {
  // Validation rule sets
  validateUser,
  validateFile,
  validateFolder,
  validatePayment,
  validateSubscription,
  validateMerge,
  validateId,
  validatePagination,
  validateSearch,
  
  // Custom validators
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isValidPassword,
  isValidObjectId,
  isValidUUID,
  isValidDate,
  isFutureDate,
  isPastDate,
  
  // Helpers
  handleValidationErrors,
  sanitizeInput,
  sanitizeObject,
};