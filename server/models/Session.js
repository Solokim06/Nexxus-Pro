const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Session token
  token: {
    type: String,
    required: true,
    unique: true,
  },
  
  // Device info
  deviceInfo: {
    userAgent: String,
    platform: String,
    browser: String,
    device: String,
    os: String,
  },
  
  // Location info
  ip: String,
  location: {
    country: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  
  // Session status
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Timestamps
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  
  // Refresh token
  refreshToken: String,
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Indexes
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ token: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to update last activity
sessionSchema.methods.updateActivity = async function() {
  this.lastActivity = Date.now();
  await this.save();
};

// Method to invalidate session
sessionSchema.methods.invalidate = async function() {
  this.isActive = false;
  await this.save();
};

// Static method to clean expired sessions
sessionSchema.statics.cleanExpired = async function() {
  return await this.deleteMany({ expiresAt: { $lt: Date.now() } });
};

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;