const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Ensure upload directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    // Determine subdirectory based on file type
    if (file.mimetype.startsWith('image/')) {
      uploadPath += 'images/';
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath += 'videos/';
    } else if (file.mimetype.startsWith('audio/')) {
      uploadPath += 'audio/';
    } else if (file.mimetype === 'application/pdf') {
      uploadPath += 'pdfs/';
    } else if (file.mimetype.includes('document') || file.mimetype.includes('word') || file.mimetype.includes('text')) {
      uploadPath += 'documents/';
    } else {
      uploadPath += 'others/';
    }
    
    // Add user-specific folder if authenticated
    if (req.user && req.user.id) {
      uploadPath += `user_${req.user.id}/`;
    } else {
      uploadPath += 'temp/';
    }
    
    const fullPath = path.join(__dirname, '../../', uploadPath);
    ensureDir(fullPath);
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Videos
    'video/mp4', 'video/webm', 'video/ogg',
    // Audio
    'audio/mpeg', 'audio/ogg', 'audio/wav',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'text/plain', 'text/html', 'text/css', 'text/javascript',
    'application/json', 'application/xml', 'text/csv',
    // Archives
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB default
    files: 10,
  },
});

// Single file upload middleware
const uploadSingle = (fieldName = 'file') => {
  return (req, res, next) => {
    const singleUpload = upload.single(fieldName);
    
    singleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
          return res.status(413).json({
            success: false,
            message: `File too large. Max size: ${formatBytes(parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024)}`,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  };
};

// Multiple files upload middleware
const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  return (req, res, next) => {
    const multipleUpload = upload.array(fieldName, maxCount);
    
    multipleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
          return res.status(413).json({
            success: false,
            message: `One or more files are too large. Max size: ${formatBytes(parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024)}`,
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: `Too many files. Max ${maxCount} files allowed`,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  };
};

// Chunk upload middleware (for large files)
const uploadChunk = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const chunkDir = path.join(__dirname, '../../uploads/chunks', req.body.fileId || 'temp');
      ensureDir(chunkDir);
      cb(null, chunkDir);
    },
    filename: (req, file, cb) => {
      const chunkIndex = req.body.chunkIndex || 0;
      cb(null, `chunk_${chunkIndex}`);
    },
  }),
  limits: {
    fileSize: parseInt(process.env.MAX_CHUNK_SIZE) || 10 * 1024 * 1024, // 10MB chunks
  },
}).single('chunk');

// Avatar upload middleware (with image optimization)
const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const avatarPath = path.join(__dirname, '../../uploads/avatars');
      ensureDir(avatarPath);
      cb(null, avatarPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('avatar');

// Receipt upload middleware
const uploadReceipt = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const receiptPath = path.join(__dirname, '../../uploads/receipts');
      ensureDir(receiptPath);
      cb(null, receiptPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `receipt_${req.body.reference || Date.now()}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Receipt must be PDF, JPEG, or PNG'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('receipt');

// Clean up old temp files
const cleanupTempFiles = () => {
  const tempDir = path.join(__dirname, '../../uploads/temp');
  if (!fs.existsSync(tempDir)) return;
  
  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  
  files.forEach(file => {
    const filePath = path.join(tempDir, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtimeMs;
    
    // Delete files older than 24 hours
    if (age > 24 * 60 * 60 * 1000) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted old temp file: ${file}`);
    }
  });
};

// Run cleanup every hour
setInterval(cleanupTempFiles, 60 * 60 * 1000);

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadChunk,
  uploadAvatar,
  uploadReceipt,
  cleanupTempFiles,
};