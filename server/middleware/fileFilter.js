const path = require('path');

// Allowed file types by category
const ALLOWED_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  videos: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/flac'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  text: ['text/plain', 'text/html', 'text/css', 'text/javascript', 'text/markdown'],
  data: ['application/json', 'application/xml', 'text/csv'],
  archives: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar'],
  code: [
    'text/javascript',
    'text/typescript',
    'text/jsx',
    'text/tsx',
    'text/x-python',
    'text/x-java',
    'text/x-c',
    'text/x-cpp',
  ],
};

// File extension to MIME type mapping
const EXTENSION_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.csv': 'text/csv',
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed',
  '.7z': 'application/x-7z-compressed',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
};

// Filter by category
const filterByCategory = (category) => {
  return (req, file, cb) => {
    const allowedTypes = ALLOWED_TYPES[category];
    if (!allowedTypes) {
      cb(new Error(`Unknown category: ${category}`), false);
      return;
    }
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only ${category} files are allowed`), false);
    }
  };
};

// Filter by specific extensions
const filterByExtensions = (extensions) => {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (extensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} is not allowed. Allowed: ${extensions.join(', ')}`), false);
    }
  };
};

// Custom filter with custom validation
const customFilter = (validateFn) => {
  return (req, file, cb) => {
    const result = validateFn(file, req);
    if (result === true) {
      cb(null, true);
    } else {
      cb(new Error(result || 'File type not allowed'), false);
    }
  };
};

// Virus scan simulation (would integrate with ClamAV or similar)
const virusScan = async (file) => {
  // In production, integrate with antivirus API
  return { isInfected: false, message: 'Clean' };
};

// Scan uploaded file for viruses
const scanForViruses = async (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }
  
  const files = req.files || [req.file];
  const filesToScan = Array.isArray(files) ? files : [files];
  
  for (const file of filesToScan) {
    const result = await virusScan(file);
    if (result.isInfected) {
      // Delete infected file
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        message: `Virus detected in ${file.originalname}. File rejected.`,
      });
    }
  }
  
  next();
};

module.exports = {
  ALLOWED_TYPES,
  filterByCategory,
  filterByExtensions,
  customFilter,
  scanForViruses,
};