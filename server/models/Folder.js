const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Folder name cannot exceed 100 characters'],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true,
  },
  
  // Color and icon
  color: {
    type: String,
    default: '#3B82F6',
  },
  icon: {
    type: String,
    default: '📁',
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
    permission: { type: String, enum: ['view', 'edit', 'upload'], default: 'view' },
    sharedAt: { type: Date, default: Date.now },
  }],
  
  // Metadata
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  
  // Stats (denormalized for performance)
  fileCount: {
    type: Number,
    default: 0,
  },
  totalSize: {
    type: Number,
    default: 0,
  },
  
  // Path for quick lookups
  path: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Indexes
folderSchema.index({ userId: 1, parentId: 1 });
folderSchema.index({ userId: 1, name: 1 });
folderSchema.index({ shareToken: 1 });
folderSchema.index({ path: 1 });

// Pre-save middleware to update path
folderSchema.pre('save', async function(next) {
  if (this.isModified('parentId') || this.isNew) {
    if (this.parentId) {
      const parent = await this.constructor.findById(this.parentId);
      this.path = parent ? `${parent.path}/${this._id}` : `/${this._id}`;
    } else {
      this.path = `/${this._id}`;
    }
  }
  next();
});

// Virtual for children folders
folderSchema.virtual('children', {
  ref: 'Folder',
  localField: '_id',
  foreignField: 'parentId',
});

// Virtual for files in folder
folderSchema.virtual('files', {
  ref: 'File',
  localField: '_id',
  foreignField: 'folderId',
});

// Method to soft delete
folderSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = Date.now();
  await this.save();
  
  // Soft delete all subfolders and files
  await this.constructor.updateMany(
    { parentId: this._id },
    { isDeleted: true, deletedAt: Date.now() }
  );
  const File = mongoose.model('File');
  await File.updateMany(
    { folderId: this._id },
    { isDeleted: true, deletedAt: Date.now() }
  );
};

// Method to get full path
folderSchema.methods.getFullPath = async function() {
  if (!this.parentId) return this.name;
  const parent = await this.constructor.findById(this.parentId);
  const parentPath = await parent.getFullPath();
  return `${parentPath}/${this.name}`;
};

const Folder = mongoose.model('Folder', folderSchema);
module.exports = Folder;