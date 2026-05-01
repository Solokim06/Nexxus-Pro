const cors = require('cors');

// Allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5000', 'https://nexxus-pro.com'];

// Dynamic origin validation
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'x-auth-token',
    'X-API-Key',
    'Range',
  ],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  maxAge: 86400, // 24 hours
};

// Pre-flight requests handling
const handlePreflight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', corsOptions.methods.join(','));
    res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  next();
};

// CORS middleware with custom options
const corsMiddleware = cors(corsOptions);

// Restricted CORS for admin routes (stricter)
const adminCors = cors({
  origin: (origin, callback) => {
    const adminOrigins = process.env.ADMIN_ALLOWED_ORIGINS?.split(',') || allowedOrigins;
    if (!origin || adminOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Admin access restricted'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

module.exports = {
  corsMiddleware,
  adminCors,
  handlePreflight,
};