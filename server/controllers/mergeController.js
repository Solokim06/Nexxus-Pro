const MergeJob = require('../models/MergeJob');
const File = require('../models/File');
const { createAuditLog } = require('../services/auditService');
const { mergePDFs, mergeImages, createZip } = require('../services/mergeService');
const { uploadToStorage } = require('../services/storageService');
const path = require('path');
const fs = require('fs');

// @desc    Merge files
// @route   POST /api/merge/files
// @access  Private
exports.mergeFiles = async (req, res) => {
  try {
    const { outputFormat, options } = req.body;
    const files = req.files;
    
    if (!files || files.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 files are required for merging',
      });
    }
    
    // Check user's merge limit
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const mergeCount = await MergeJob.countDocuments({
      userId: req.user.id,
      createdAt: { $gte: currentMonth },
    });
    
    const planLimits = req.user.subscription?.limits || { mergesPerMonth: 5 };
    if (planLimits.mergesPerMonth !== -1 && mergeCount >= planLimits.mergesPerMonth) {
      return res.status(400).json({
        success: false,
        message: 'Monthly merge limit reached. Please upgrade your plan.',
      });
    }
    
    // Create merge job
    const mergeJob = await MergeJob.create({
      userId: req.user.id,
      status: 'processing',
      inputFiles: files.map(f => ({
        name: f.originalname,
        size: f.size,
        mimeType: f.mimetype,
        path: f.path,
      })),
      outputFormat,
      options: JSON.parse(options || '{}'),
    });
    
    // Process merge asynchronously
    processMerge(mergeJob._id, files, outputFormat, JSON.parse(options || '{}'));
    
    res.status(202).json({
      success: true,
      message: 'Merge started',
      data: {
        jobId: mergeJob._id,
        status: 'processing',
      },
    });
  } catch (error) {
    console.error('Merge files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start merge',
    });
  }
};

// Process merge asynchronously
async function processMerge(jobId, files, outputFormat, options) {
  try {
    let outputBuffer;
    let outputMimeType;
    let outputExtension;
    
    // Merge based on output format
    switch (outputFormat) {
      case 'pdf':
        outputBuffer = await mergePDFs(files, options);
        outputMimeType = 'application/pdf';
        outputExtension = '.pdf';
        break;
      case 'zip':
        outputBuffer = await createZip(files, options);
        outputMimeType = 'application/zip';
        outputExtension = '.zip';
        break;
      case 'image':
        outputBuffer = await mergeImages(files, options);
        outputMimeType = 'image/png';
        outputExtension = '.png';
        break;
      default:
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }
    
    // Save to storage
    const outputFileName = `merged_${Date.now()}${outputExtension}`;
    const outputPath = `users/${files[0].userId}/merged/${outputFileName}`;
    
    // Create temp file and upload
    const tempPath = path.join('/tmp', outputFileName);
    fs.writeFileSync(tempPath, outputBuffer);
    
    const uploadResult = await uploadToStorage(
      { path: tempPath, originalname: outputFileName, mimetype: outputMimeType },
      `users/${files[0].userId}/merged`
    );
    
    fs.unlinkSync(tempPath);
    
    // Update merge job
    await MergeJob.findByIdAndUpdate(jobId, {
      status: 'completed',
      outputUrl: uploadResult.url,
      outputPath: uploadResult.path,
      outputSize: outputBuffer.length,
      completedAt: Date.now(),
    });
    
    // Create audit log
    await createAuditLog({
      userId: files[0].userId,
      action: 'MERGE_FILES',
      details: {
        fileCount: files.length,
        outputFormat,
        outputSize: outputBuffer.length,
      },
    });
  } catch (error) {
    console.error('Process merge error:', error);
    await MergeJob.findByIdAndUpdate(jobId, {
      status: 'failed',
      error: error.message,
      completedAt: Date.now(),
    });
  }
}

// @desc    Get merge status
// @route   GET /api/merge/status/:jobId
// @access  Private
exports.getMergeStatus = async (req, res) => {
  try {
    const mergeJob = await MergeJob.findOne({
      _id: req.params.jobId,
      userId: req.user.id,
    });
    
    if (!mergeJob) {
      return res.status(404).json({
        success: false,
        message: 'Merge job not found',
      });
    }
    
    res.json({
      success: true,
      data: {
        status: mergeJob.status,
        progress: mergeJob.progress || 0,
        error: mergeJob.error,
        outputUrl: mergeJob.outputUrl,
        outputSize: mergeJob.outputSize,
      },
    });
  } catch (error) {
    console.error('Get merge status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get merge status',
    });
  }
};

// @desc    Download merged file
// @route   GET /api/merge/download/:jobId
// @access  Private
exports.downloadMerge = async (req, res) => {
  try {
    const mergeJob = await MergeJob.findOne({
      _id: req.params.jobId,
      userId: req.user.id,
      status: 'completed',
    });
    
    if (!mergeJob || !mergeJob.outputUrl) {
      return res.status(404).json({
        success: false,
        message: 'Merged file not found',
      });
    }
    
    res.json({
      success: true,
      data: {
        url: mergeJob.outputUrl,
        size: mergeJob.outputSize,
      },
    });
  } catch (error) {
    console.error('Download merge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download merged file',
    });
  }
};

// @desc    Get merge history
// @route   GET /api/merge/history
// @access  Private
exports.getMergeHistory = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    
    const merges = await MergeJob.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await MergeJob.countDocuments({ userId: req.user.id });
    
    res.json({
      success: true,
      data: merges,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get merge history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get merge history',
    });
  }
};

// @desc    Cancel merge
// @route   POST /api/merge/cancel/:jobId
// @access  Private
exports.cancelMerge = async (req, res) => {
  try {
    const mergeJob = await MergeJob.findOne({
      _id: req.params.jobId,
      userId: req.user.id,
      status: 'processing',
    });
    
    if (!mergeJob) {
      return res.status(404).json({
        success: false,
        message: 'Merge job not found or already completed',
      });
    }
    
    mergeJob.status = 'cancelled';
    await mergeJob.save();
    
    res.json({
      success: true,
      message: 'Merge cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel merge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel merge',
    });
  }
};

// @desc    Merge folders
// @route   POST /api/merge/folders
// @access  Private
exports.mergeFolders = async (req, res) => {
  try {
    const { folderIds, options } = req.body;
    
    if (!folderIds || folderIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 folders are required for merging',
      });
    }
    
    // Get all files from folders
    let allFiles = [];
    for (const folderId of folderIds) {
      const files = await File.find({
        folderId,
        userId: req.user.id,
        isDeleted: false,
      });
      allFiles.push(...files);
    }
    
    if (allFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files found in selected folders',
      });
    }
    
    // Create merge job
    const mergeJob = await MergeJob.create({
      userId: req.user.id,
      status: 'processing',
      type: 'folder',
      inputFolders: folderIds,
      inputFiles: allFiles.map(f => ({
        name: f.name,
        size: f.size,
        mimeType: f.mimeType,
        path: f.path,
      })),
      outputFormat: 'zip',
      options: JSON.parse(options || '{}'),
    });
    
    // Process asynchronously
    processFolderMerge(mergeJob._id, allFiles, JSON.parse(options || '{}'));
    
    res.status(202).json({
      success: true,
      message: 'Folder merge started',
      data: { jobId: mergeJob._id },
    });
  } catch (error) {
    console.error('Merge folders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start folder merge',
    });
  }
};

async function processFolderMerge(jobId, files, options) {
  try {
    const zipBuffer = await createZip(files, options);
    
    const outputFileName = `merged_folders_${Date.now()}.zip`;
    const tempPath = path.join('/tmp', outputFileName);
    fs.writeFileSync(tempPath, zipBuffer);
    
    const uploadResult = await uploadToStorage(
      { path: tempPath, originalname: outputFileName, mimetype: 'application/zip' },
      `users/${files[0].userId}/merged`
    );
    
    fs.unlinkSync(tempPath);
    
    await MergeJob.findByIdAndUpdate(jobId, {
      status: 'completed',
      outputUrl: uploadResult.url,
      outputPath: uploadResult.path,
      outputSize: zipBuffer.length,
      completedAt: Date.now(),
    });
  } catch (error) {
    console.error('Process folder merge error:', error);
    await MergeJob.findByIdAndUpdate(jobId, {
      status: 'failed',
      error: error.message,
      completedAt: Date.now(),
    });
  }
}