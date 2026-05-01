const compression = require('compression');

// Configure compression middleware
const compressionMiddleware = compression({
  // Compress only for certain content types
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  // Compression level (0-9)
  level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
  // Only compress responses above this size (bytes)
  threshold: 1024, // 1KB
});

// Dynamic compression based on content type
const smartCompression = (req, res, next) => {
  // Skip compression for small files or images
  const skipCompression = [
    'image/',
    'video/',
    'audio/',
    'application/zip',
    'application/pdf',
  ];
  
  const shouldCompress = !skipCompression.some(type => 
    res.getHeader('Content-Type')?.startsWith(type)
  );
  
  if (shouldCompress) {
    compressionMiddleware(req, res, next);
  } else {
    next();
  }
};

module.exports = { compressionMiddleware, smartCompression };