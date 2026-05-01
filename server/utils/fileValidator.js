const path = require('path');
const fs = require('fs');

// ==================== ALLOWED FILE TYPES ====================

const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], maxSize: 10 * 1024 * 1024 },
  'image/png': { extensions: ['.png'], maxSize: 10 * 1024 * 1024 },
  'image/gif': { extensions: ['.gif'], maxSize: 10 * 1024 * 1024 },
  'image/webp': { extensions: ['.webp'], maxSize: 10 * 1024 * 1024 },
  'image/svg+xml': { extensions: ['.svg'], maxSize: 5 * 1024 * 1024 },
  
  // Videos
  'video/mp4': { extensions: ['.mp4'], maxSize: 500 * 1024 * 1024 },
  'video/webm': { extensions: ['.webm'], maxSize: 500 * 1024 * 1024 },
  'video/ogg': { extensions: ['.ogv'], maxSize: 500 * 1024 * 1024 },
  
  // Audio
  'audio/mpeg': { extensions: ['.mp3'], maxSize: 50 * 1024 * 1024 },
  'audio/ogg': { extensions: ['.ogg'], maxSize: 50 * 1024 * 1024 },
  'audio/wav': { extensions: ['.wav'], maxSize: 100 * 1024 * 1024 },
  
  // Documents
  'application/pdf': { extensions: ['.pdf'], maxSize: 50 * 1024 * 1024 },
  'application/msword': { extensions: ['.doc'], maxSize: 50 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extensions: ['.docx'], maxSize: 50 * 1024 * 1024 },
  'application/vnd.ms-excel': { extensions: ['.xls'], maxSize: 50 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { extensions: ['.xlsx'], maxSize: 50 * 1024 * 1024 },
  'application/vnd.ms-powerpoint': { extensions: ['.ppt'], maxSize: 50 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { extensions: ['.pptx'], maxSize: 50 * 1024 * 1024 },
  
  // Text
  'text/plain': { extensions: ['.txt'], maxSize: 10 * 1024 * 1024 },
  'text/html': { extensions: ['.html', '.htm'], maxSize: 10 * 1024 * 1024 },
  'text/css': { extensions: ['.css'], maxSize: 5 * 1024 * 1024 },
  'text/javascript': { extensions: ['.js'], maxSize: 5 * 1024 * 1024 },
  'application/json': { extensions: ['.json'], maxSize: 5 * 1024 * 1024 },
  'application/xml': { extensions: ['.xml'], maxSize: 5 * 1024 * 1024 },
  'text/csv': { extensions: ['.csv'], maxSize: 10 * 1024 * 1024 },
  
  // Archives
  'application/zip': { extensions: ['.zip'], maxSize: 500 * 1024 * 1024 },
  'application/x-rar-compressed': { extensions: ['.rar'], maxSize: 500 * 1024 * 1024 },
  'application/x-7z-compressed': { extensions: ['.7z'], maxSize: 500 * 1024 * 1024 },
  'application/x-tar': { extensions: ['.tar'], maxSize: 500 * 1024 * 1024 },
  'application/gzip': { extensions: ['.gz'], maxSize: 500 * 1024 * 1024 },
};

// ==================== VALIDATION FUNCTIONS ====================

const validateFileType = (mimeType) => {
  return !!ALLOWED_MIME_TYPES[mimeType];
};

const validateFileExtension = (filename, mimeType) => {
  const ext = path.extname(filename).toLowerCase();
  const allowedExtensions = ALLOWED_MIME_TYPES[mimeType]?.extensions || [];
  return allowedExtensions.includes(ext);
};

const validateFileSize = (size, mimeType) => {
  const maxSize = ALLOWED_MIME_TYPES[mimeType]?.maxSize || 10 * 1024 * 1024;
  return size <= maxSize;
};

const validateFileName = (filename) => {
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/g;
  if (invalidChars.test(filename)) {
    return { valid: false, error: 'Filename contains invalid characters' };
  }
  
  // Check length
  if (filename.length > 255) {
    return { valid: false, error: 'Filename too long (max 255 characters)' };
  }
  
  if (filename.length < 1) {
    return { valid: false, error: 'Filename cannot be empty' };
  }
  
  // Check for reserved names
  const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
  const nameWithoutExt = path.basename(filename, path.extname(filename)).toLowerCase();
  if (reservedNames.includes(nameWithoutExt)) {
    return { valid: false, error: 'Reserved filename not allowed' };
  }
  
  return { valid: true };
};

const validateFileContent = async (filePath, mimeType) => {
  // Check if file is empty
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    return { valid: false, error: 'File is empty' };
  }
  
  // Validate based on file type
  if (mimeType === 'application/pdf') {
    // Check PDF header
    const buffer = fs.readFileSync(filePath);
    const header = buffer.toString('hex', 0, 4);
    if (header !== '25504446') { // %PDF
      return { valid: false, error: 'Invalid PDF file' };
    }
  }
  
  if (mimeType.startsWith('image/')) {
    // Check image magic numbers
    const buffer = fs.readFileSync(filePath);
    const header = buffer.toString('hex', 0, 4);
    
    const validHeaders = {
      'ffd8ffe0': 'jpeg',
      'ffd8ffe1': 'jpeg',
      'ffd8ffe2': 'jpeg',
      '89504e47': 'png',
      '47494638': 'gif',
      '52494646': 'webp',
    };
    
    if (!validHeaders[header]) {
      return { valid: false, error: 'Invalid image file' };
    }
  }
  
  return { valid: true };
};

// ==================== COMPLETE FILE VALIDATION ====================

const validateFile = async (file, userPlan = 'free') => {
  const errors = [];
  
  // Check if file exists
  if (!file) {
    return { valid: false, errors: ['No file provided'] };
  }
  
  // Validate file name
  const nameValidation = validateFileName(file.originalname);
  if (!nameValidation.valid) {
    errors.push(nameValidation.error);
  }
  
  // Validate MIME type
  if (!validateFileType(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }
  
  // Validate extension
  if (!validateFileExtension(file.originalname, file.mimetype)) {
    errors.push(`File extension does not match MIME type`);
  }
  
  // Get plan-specific size limit
  const planLimits = {
    free: 50 * 1024 * 1024,
    basic: 100 * 1024 * 1024,
    pro: 500 * 1024 * 1024,
    enterprise: 2 * 1024 * 1024 * 1024,
  };
  const planMaxSize = planLimits[userPlan] || planLimits.free;
  const typeMaxSize = ALLOWED_MIME_TYPES[file.mimetype]?.maxSize || planMaxSize;
  const maxSize = Math.min(planMaxSize, typeMaxSize);
  
  // Validate size
  if (file.size > maxSize) {
    errors.push(`File size exceeds limit (max ${formatBytes(maxSize)})`);
  }
  
  // Validate content (if file exists on disk)
  if (file.path && fs.existsSync(file.path)) {
    const contentValidation = await validateFileContent(file.path, file.mimetype);
    if (!contentValidation.valid) {
      errors.push(contentValidation.error);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    metadata: {
      mimeType: file.mimetype,
      size: file.size,
      extension: path.extname(file.originalname),
      category: getFileCategory(file.mimetype),
    },
  };
};

// ==================== BULK VALIDATION ====================

const validateMultipleFiles = async (files, userPlan = 'free') => {
  const results = [];
  let totalSize = 0;
  
  for (const file of files) {
    const result = await validateFile(file, userPlan);
    results.push({
      fileName: file.originalname,
      ...result,
    });
    if (result.valid) {
      totalSize += file.size;
    }
  }
  
  const validFiles = results.filter(r => r.valid);
  const invalidFiles = results.filter(r => !r.valid);
  
  return {
    valid: invalidFiles.length === 0,
    totalFiles: files.length,
    validCount: validFiles.length,
    invalidCount: invalidFiles.length,
    totalSize,
    results,
    validFiles: validFiles.map(v => v.fileName),
    invalidFiles: invalidFiles.map(v => ({ name: v.fileName, errors: v.errors })),
  };
};

// ==================== HELPER FUNCTIONS ====================

const getFileCategory = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'archive';
  if (mimeType.startsWith('text/')) return 'text';
  return 'other';
};

const getFileIcon = (mimeType) => {
  const category = getFileCategory(mimeType);
  const icons = {
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    pdf: '📄',
    document: '📝',
    spreadsheet: '📊',
    presentation: '📽️',
    archive: '📦',
    text: '📃',
    other: '📁',
  };
  return icons[category] || icons.other;
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const sanitizeFileName = (filename) => {
  // Remove invalid characters
  let sanitized = filename.replace(/[<>:"/\\|?*]/g, '');
  // Replace spaces with underscores
  sanitized = sanitized.replace(/\s+/g, '_');
  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    const name = sanitized.substring(0, 255 - ext.length);
    sanitized = name + ext;
  }
  return sanitized;
};

const generateUniqueFileName = (originalName, existingNames = []) => {
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  let newName = originalName;
  let counter = 1;
  
  while (existingNames.includes(newName)) {
    newName = `${nameWithoutExt} (${counter})${ext}`;
    counter++;
  }
  
  return newName;
};

module.exports = {
  ALLOWED_MIME_TYPES,
  validateFileType,
  validateFileExtension,
  validateFileSize,
  validateFileName,
  validateFileContent,
  validateFile,
  validateMultipleFiles,
  getFileCategory,
  getFileIcon,
  formatBytes,
  sanitizeFileName,
  generateUniqueFileName,
};