const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Key details
  key: {
    type: String,
    unique: true,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  
  // Permissions
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'admin'],
    default: ['read'],
  }],
  
  // Rate limiting
  rateLimit: {
    type: Number,
    default: 1000, // requests per day
  },
  requestsCount: {
    type: Number,
    default: 0,
  },
  lastResetAt: {
    type: Date,
    default: Date.now,
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  lastUsed: Date,
  expiresAt: Date,
  
  // IP whitelist
  allowedIps: [String],
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Indexes
apiKeySchema.index({ userId: 1 });
apiKeySchema.index({ key: 1 });
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Generate API key
apiKeySchema.statics.generateKey = function() {
  return `nxp_${crypto.randomBytes(32).toString('hex')}`;
};

// Method to increment request count
apiKeySchema.methods.incrementRequests = async function() {
  // Reset counter if new day
  const today = new Date().setHours(0, 0, 0, 0);
  if (this.lastResetAt.setHours(0, 0, 0, 0) !== today) {
    this.requestsCount = 0;
    this.lastResetAt = Date.now();
  }
  
  this.requestsCount++;
  this.lastUsed = Date.now();
  await this.save();
};

// Method to check if rate limit exceeded
apiKeySchema.methods.isRateLimitExceeded = function() {
  return this.requestsCount >= this.rateLimit;
};

// Method to check if expired
apiKeySchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt < Date.now();
};

const ApiKey = mongoose.model('ApiKey', apiKeySchema);
module.exports = ApiKey;