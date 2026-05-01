const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    
    // Organize by file type
    if (file.mimetype.startsWith('image/')) {
      uploadPath += 'images/';
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath += 'videos/';
    } else if (file.mimetype.startsWith('audio/')) {
      uploadPath += 'audio/';
    } else if (file.mimetype === 'application/pdf') {
      uploadPath += 'pdfs/';
    } else {
      uploadPath += 'documents/';
    }
    
    // Add user-specific folder
    if (req.user && req.user.id) {
      uploadPath += `user_${req.user.id}/`;
    } else {
      uploadPath += 'temp/';
    }
    
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
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
    'text/plain', 'text/html', 'text/css', 'text/javascript',
    'application/json', 'application/xml',
    // Archives
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Single file upload
const uploadSingle = (fieldName = 'file') => {
  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB default
      files: 1,
    },
  }).single(fieldName);
  
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
          return res.status(400).json({
            success: false,
            message: 'File too large',
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

// Multiple files upload
const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024,
      files: maxCount,
    },
  }).array(fieldName, maxCount);
  
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
          return res.status(400).json({
            success: false,
            message: 'One or more files are too large',
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

// Chunked upload (for large files)
const uploadChunk = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const chunkDir = `uploads/chunks/${req.body.fileId || 'temp'}/`;
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

// Avatar upload (with image optimization)
const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const avatarPath = `uploads/avatars/user_${req.user.id}/`;
      ensureDir(avatarPath);
      cb(null, avatarPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `avatar_${Date.now()}${ext}`);
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

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadChunk,
  uploadAvatar,
};