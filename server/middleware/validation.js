const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const validate = (req, res, next) => {
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

// User validation rules
const userValidation = {
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
    body('email').isEmail().normalizeEmail(),
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

// File validation rules
const fileValidation = {
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
};

// Folder validation rules
const folderValidation = {
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
};

// Payment validation rules
const paymentValidation = {
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
    body('receipt').optional(),
  ],
};

// Merge validation rules
const mergeValidation = {
  mergeFiles: [
    body('outputFormat').isIn(['pdf', 'zip', 'image', 'txt']),
    body('options').optional().isObject(),
  ],
};

// Pagination validation
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isString(),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

// ID param validation
const idParamValidation = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];

module.exports = {
  validate,
  userValidation,
  fileValidation,
  folderValidation,
  paymentValidation,
  mergeValidation,
  paginationValidation,
  idParamValidation,
};