const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  // Inviter
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Invitee
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  
  // Invitation type
  type: {
    type: String,
    enum: ['team_member', 'file_share', 'folder_share', 'organization'],
    required: true,
  },
  
  // Resource being shared
  resourceType: {
    type: String,
    enum: ['file', 'folder', 'team', 'organization'],
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  
  // Permissions for shared resource
  permissions: [{
    type: String,
    enum: ['view', 'edit', 'upload', 'delete', 'manage'],
  }],
  
  // Invitation token
  token: {
    type: String,
    required: true,
    unique: true,
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
    default: 'pending',
    index: true,
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    required: true,
  },
  
  // When accepted/declined
  respondedAt: Date,
  
  // Message
  message: {
    type: String,
    maxlength: 500,
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Indexes
invitationSchema.index({ token: 1 });
invitationSchema.index({ email: 1, status: 1 });
invitationSchema.index({ invitedBy: 1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for isExpired
invitationSchema.virtual('isExpired').get(function() {
  return this.expiresAt < Date.now();
});

// Method to accept invitation
invitationSchema.methods.accept = async function() {
  this.status = 'accepted';
  this.respondedAt = Date.now();
  await this.save();
};

// Method to decline invitation
invitationSchema.methods.decline = async function() {
  this.status = 'declined';
  this.respondedAt = Date.now();
  await this.save();
};

// Method to cancel invitation
invitationSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  await this.save();
};

// Static method to generate token
invitationSchema.statics.generateToken = function() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

const Invitation = mongoose.model('Invitation', invitationSchema);
module.exports = Invitation;