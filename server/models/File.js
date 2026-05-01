const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  thumbnail: {
    type: String,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true,
  },
  
  // File metadata
  metadata: {
    width: Number,
    height: Number,
    duration: Number,
    pages: Number,
    author: String,
    title: String,
    description: String,
    tags: [String],
  },
  
  // Status
  isStarred: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: Date,
  
  // Sharing
  isPublic: {
    type: Boolean,
    default: false,
  },
  shareToken: String,
  shareExpires: Date,
  sharedWith: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['view', 'edit', 'download'], default: 'view' },
    sharedAt: { type: Date, default: Date.now },
  }],
  
  // Versioning
  version: {
    type: Number,
    default: 1,
  },
  previousVersions: [{
    version: Number,
    path: String,
    size: Number,
    createdAt: { type: Date, default: Date.now },
  }],
  
  // Activity
  downloadCount: {
    type: Number,
    default: 0,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  lastAccessed: Date,
  
  // Encryption
  isEncrypted: {
    type: Boolean,
    default: false,
  },
  encryptionKey: String,
  
  // Expiration
  expiresAt: Date,
  
  // Checksum for integrity
  checksum: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes
fileSchema.index({ userId: 1, folderId: 1 });
fileSchema.index({ name: 'text' });
fileSchema.index({ mimeType: 1 });
fileSchema.index({ createdAt: -1 });
fileSchema.index({ shareToken: 1 });
fileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for file extension
fileSchema.virtual('extension').get(function() {
  return this.name.split('.').pop();
});

// Virtual for file type category
fileSchema.virtual('category').get(function() {
  if (this.mimeType.startsWith('image/')) return 'image';
  if (this.mimeType.startsWith('video/')) return 'video';
  if (this.mimeType.startsWith('audio/')) return 'audio';
  if (this.mimeType === 'application/pdf') return 'pdf';
  if (this.mimeType.includes('document')) return 'document';
  if (this.mimeType.includes('sheet')) return 'spreadsheet';
  if (this.mimeType.includes('presentation')) return 'presentation';
  return 'other';
});

// Method to soft delete
fileSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = Date.now();
  await this.save();
};

// Method to restore
fileSchema.methods.restore = async function() {
  this.isDeleted = false;
  this.deletedAt = null;
  await this.save();
};

const File = mongoose.model('File', fileSchema);
module.exports = File;