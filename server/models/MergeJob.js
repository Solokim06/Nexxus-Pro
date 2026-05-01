const mongoose = require('mongoose');

const mergeJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Job status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  
  // Type of merge
  type: {
    type: String,
    enum: ['files', 'folders'],
    default: 'files',
  },
  
  // Input files/folders
  inputFiles: [{
    name: String,
    size: Number,
    mimeType: String,
    path: String,
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
  }],
  inputFolders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
  }],
  
  // Output
  outputFormat: {
    type: String,
    enum: ['pdf', 'zip', 'image', 'txt'],
    required: true,
  },
  outputUrl: String,
  outputPath: String,
  outputSize: Number,
  outputName: String,
  
  // Merge options
  options: {
    pageSize: { type: String, default: 'A4' },
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    margin: { type: String, default: 'normal' },
    compression: { type: String, default: 'medium' },
    preserveStructure: { type: Boolean, default: true },
    includeMetadata: { type: Boolean, default: true },
    pageNumbers: { type: Boolean, default: false },
    quality: { type: Number, default: 90 },
    encryption: { type: Boolean, default: false },
    password: String,
  },
  
  // Progress tracking
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  currentOperation: String,
  
  // Timing
  startedAt: Date,
  completedAt: Date,
  
  // Error handling
  error: String,
  errorDetails: mongoose.Schema.Types.Mixed,
  
  // Priority
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10,
  },
  
  // Queue position
  queuePosition: Number,
}, {
  timestamps: true,
});

// Indexes
mergeJobSchema.index({ userId: 1, status: 1 });
mergeJobSchema.index({ status: 1, priority: -1, createdAt: 1 });
mergeJobSchema.index({ createdAt: -1 });

// Virtual for job duration
mergeJobSchema.virtual('duration').get(function() {
  if (!this.startedAt) return null;
  const end = this.completedAt || Date.now();
  return end - this.startedAt;
});

// Method to start job
mergeJobSchema.methods.start = async function() {
  this.status = 'processing';
  this.startedAt = Date.now();
  await this.save();
};

// Method to complete job
mergeJobSchema.methods.complete = async function(outputUrl, outputPath, outputSize) {
  this.status = 'completed';
  this.completedAt = Date.now();
  this.progress = 100;
  this.outputUrl = outputUrl;
  this.outputPath = outputPath;
  this.outputSize = outputSize;
  this.outputName = `merged_${this._id}.${this.outputFormat}`;
  await this.save();
};

// Method to fail job
mergeJobSchema.methods.fail = async function(error) {
  this.status = 'failed';
  this.completedAt = Date.now();
  this.error = error.message || error;
  this.errorDetails = error;
  await this.save();
};

// Method to update progress
mergeJobSchema.methods.updateProgress = async function(progress, operation) {
  this.progress = progress;
  if (operation) this.currentOperation = operation;
  await this.save();
};

const MergeJob = mongoose.model('MergeJob', mergeJobSchema);
module.exports = MergeJob;