const File = require('../models/File');
const Folder = require('../models/Folder');
const { uploadToStorage, deleteFromStorage } = require('../services/storageService');
const { createAuditLog } = require('../services/auditService');
const { validateFile } = require('../utils/fileValidator');
const path = require('path');
const fs = require('fs');

// @desc    Get all files
// @route   GET /api/files
// @access  Private
exports.getFiles = async (req, res) => {
  try {
    const { folderId, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    let query = { userId: req.user.id, isDeleted: false };
    
    if (folderId) {
      query.folderId = folderId;
    } else {
      query.folderId = null;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const files = await File.find(query)
      .sort(sort)
      .populate('folderId', 'name');
    
    res.json({
      success: true,
      data: files,
      count: files.length,
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get files',
    });
  }
};

// @desc    Get single file
// @route   GET /api/files/:id
// @access  Private
exports.getFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).populate('folderId', 'name');
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }
    
    res.json({
      success: true,
      data: file,
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file',
    });
  }
};

// @desc    Upload file
// @route   POST /api/files/upload
// @access  Private
exports.uploadFile = async (req, res) => {
  try {
    const { folderId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }
    
    // Check user storage limit
    const userFiles = await File.find({ userId: req.user.id });
    const totalSize = userFiles.reduce((sum, file) => sum + file.size, 0);
    const planLimits = req.user.subscription?.limits || { storage: 1073741824 }; // 1GB default
    
    if (totalSize + req.file.size > planLimits.storage) {
      return res.status(400).json({
        success: false,
        message: 'Storage limit exceeded. Please upgrade your plan.',
      });
    }
    
    // Upload to cloud storage
    const uploadResult = await uploadToStorage(req.file, `users/${req.user.id}/files`);
    
    const file = await File.create({
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      path: uploadResult.path,
      url: uploadResult.url,
      userId: req.user.id,
      folderId: folderId || null,
      metadata: {
        width: req.file.width || null,
        height: req.file.height || null,
        duration: req.file.duration || null,
      },
    });
    
    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'UPLOAD_FILE',
      details: { fileName: file.name, fileSize: file.size },
      ip: req.ip,
    });
    
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: file,
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
    });
  }
};

// @desc    Upload multiple files
// @route   POST /api/files/upload-multiple
// @access  Private
exports.uploadMultiple = async (req, res) => {
  try {
    const { folderId } = req.body;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }
    
    const uploadedFiles = [];
    
    for (const file of files) {
      const uploadResult = await uploadToStorage(file, `users/${req.user.id}/files`);
      
      const fileDoc = await File.create({
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        path: uploadResult.path,
        url: uploadResult.url,
        userId: req.user.id,
        folderId: folderId || null,
      });
      
      uploadedFiles.push(fileDoc);
    }
    
    await createAuditLog({
      userId: req.user.id,
      action: 'UPLOAD_MULTIPLE',
      details: { count: files.length },
      ip: req.ip,
    });
    
    res.status(201).json({
      success: true,
      message: `${files.length} files uploaded successfully`,
      data: uploadedFiles,
    });
  } catch (error) {
    console.error('Upload multiple error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload files',
    });
  }
};

// @desc    Download file
// @route   GET /api/files/download/:id
// @access  Private
exports.downloadFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isDeleted: false,
    });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }
    
    // Increment download count
    file.downloadCount += 1;
    await file.save();
    
    // Stream file from storage
    const fileStream = await getFileFromStorage(file.path);
    
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
    });
  }
};

// @desc    Update file (rename, move)
// @route   PUT /api/files/:id
// @access  Private
exports.updateFile = async (req, res) => {
  try {
    const { name, folderId } = req.body;
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }
    
    if (name) file.name = name;
    if (folderId !== undefined) file.folderId = folderId;
    
    await file.save();
    
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE_FILE',
      details: { fileId: file._id, updates: { name, folderId } },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: 'File updated successfully',
      data: file,
    });
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update file',
    });
  }
};

// @desc    Delete file (move to trash)
// @route   DELETE /api/files/:id
// @access  Private
exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }
    
    file.isDeleted = true;
    file.deletedAt = Date.now();
    await file.save();
    
    await createAuditLog({
      userId: req.user.id,
      action: 'DELETE_FILE',
      details: { fileName: file.name, fileId: file._id },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: 'File moved to trash',
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
    });
  }
};

// @desc    Permanently delete file
// @route   DELETE /api/files/:id/permanent
// @access  Private
exports.permanentDelete = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isDeleted: true,
    });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found in trash',
      });
    }
    
    // Delete from storage
    await deleteFromStorage(file.path);
    
    await file.remove();
    
    await createAuditLog({
      userId: req.user.id,
      action: 'PERMANENT_DELETE',
      details: { fileName: file.name, fileId: file._id },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: 'File permanently deleted',
    });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file permanently',
    });
  }
};

// @desc    Restore file from trash
// @route   POST /api/files/:id/restore
// @access  Private
exports.restoreFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isDeleted: true,
    });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found in trash',
      });
    }
    
    file.isDeleted = false;
    file.deletedAt = null;
    await file.save();
    
    res.json({
      success: true,
      message: 'File restored successfully',
    });
  } catch (error) {
    console.error('Restore file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore file',
    });
  }
};

// @desc    Search files
// @route   GET /api/files/search
// @access  Private
exports.searchFiles = async (req, res) => {
  try {
    const { q, type, minSize, maxSize, dateFrom, dateTo } = req.query;
    
    let query = {
      userId: req.user.id,
      isDeleted: false,
    };
    
    if (q) {
      query.name = { $regex: q, $options: 'i' };
    }
    
    if (type) {
      query.mimeType = { $regex: type, $options: 'i' };
    }
    
    if (minSize || maxSize) {
      query.size = {};
      if (minSize) query.size.$gte = parseInt(minSize);
      if (maxSize) query.size.$lte = parseInt(maxSize);
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    const files = await File.find(query).limit(50);
    
    res.json({
      success: true,
      data: files,
      count: files.length,
    });
  } catch (error) {
    console.error('Search files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search files',
    });
  }
};

// @desc    Get recent files
// @route   GET /api/files/recent
// @access  Private
exports.getRecentFiles = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const files = await File.find({
      userId: req.user.id,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error('Get recent files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent files',
    });
  }
};

// @desc    Get starred files
// @route   GET /api/files/starred
// @access  Private
exports.getStarredFiles = async (req, res) => {
  try {
    const files = await File.find({
      userId: req.user.id,
      isStarred: true,
      isDeleted: false,
    });
    
    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error('Get starred files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get starred files',
    });
  }
};

// @desc    Star/unstar file
// @route   PUT /api/files/:id/star
// @access  Private
exports.toggleStar = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }
    
    file.isStarred = !file.isStarred;
    await file.save();
    
    res.json({
      success: true,
      message: file.isStarred ? 'File starred' : 'File unstarred',
      data: { isStarred: file.isStarred },
    });
  } catch (error) {
    console.error('Toggle star error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update star status',
    });
  }
};

// @desc    Get file info (for download/resume)
// @route   GET /api/files/:id/info
// @access  Private
exports.getFileInfo = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }
    
    res.json({
      success: true,
      data: {
        id: file._id,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        path: file.path,
      },
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file info',
    });
  }
};