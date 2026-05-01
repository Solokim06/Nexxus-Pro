const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const File = require('../models/File');
const { uploadToStorage, deleteFromStorage, getFromStorage } = require('./storageService');
const { createThumbnail } = require('./thumbnailService');
const { scanForVirus } = require('./virusScanService');

class FileService {
  constructor() {
    this.allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'video/mp4', 'video/webm',
      'audio/mpeg', 'audio/ogg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024;
  }

  async uploadFile(file, userId, folderId = null, options = {}) {
    try {
      // Validate file
      this.validateFile(file);
      
      // Virus scan
      const scanResult = await scanForVirus(file.path);
      if (scanResult.isInfected) {
        throw new Error(`Virus detected: ${scanResult.virusName}`);
      }
      
      // Generate unique filename
      const fileExt = path.extname(file.originalname);
      const fileName = `${crypto.randomBytes(16).toString('hex')}${fileExt}`;
      const filePath = `users/${userId}/files/${folderId || 'root'}/${fileName}`;
      
      // Upload to storage
      const uploadResult = await uploadToStorage(file.path, filePath, file.mimetype);
      
      // Generate thumbnail for images
      let thumbnailUrl = null;
      if (file.mimetype.startsWith('image/')) {
        thumbnailUrl = await createThumbnail(file.path, `thumbnails/${filePath}`);
      }
      
      // Create file record
      const fileRecord = await File.create({
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        path: uploadResult.path,
        url: uploadResult.url,
        thumbnail: thumbnailUrl,
        userId,
        folderId,
        checksum: await this.calculateChecksum(file.path),
        metadata: options.metadata || {},
      });
      
      // Clean up temp file
      fs.unlinkSync(file.path);
      
      return fileRecord;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }
  
  async uploadChunk(chunk, fileId, chunkIndex, totalChunks, userId) {
    const chunkDir = path.join(__dirname, '../../uploads/chunks', fileId);
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }
    
    const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`);
    fs.renameSync(chunk.path, chunkPath);
    
    // Check if all chunks received
    const chunks = fs.readdirSync(chunkDir);
    if (chunks.length === parseInt(totalChunks)) {
      return await this.assembleChunks(fileId, userId);
    }
    
    return { received: chunks.length, total: totalChunks, complete: false };
  }
  
  async assembleChunks(fileId, userId) {
    const chunkDir = path.join(__dirname, '../../uploads/chunks', fileId);
    const chunks = fs.readdirSync(chunkDir).sort((a, b) => {
      const indexA = parseInt(a.split('_')[1]);
      const indexB = parseInt(b.split('_')[1]);
      return indexA - indexB;
    });
    
    const tempFilePath = path.join(__dirname, '../../uploads/temp', `${fileId}_merged`);
    const writeStream = fs.createWriteStream(tempFilePath);
    
    for (const chunk of chunks) {
      const chunkPath = path.join(chunkDir, chunk);
      const chunkData = fs.readFileSync(chunkPath);
      writeStream.write(chunkData);
      fs.unlinkSync(chunkPath);
    }
    
    await new Promise((resolve, reject) => {
      writeStream.end();
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    fs.rmdirSync(chunkDir);
    
    // Process as regular file
    const file = {
      path: tempFilePath,
      originalname: fileId,
      size: fs.statSync(tempFilePath).size,
      mimetype: 'application/octet-stream',
    };
    
    const result = await this.uploadFile(file, userId);
    fs.unlinkSync(tempFilePath);
    
    return result;
  }
  
  async downloadFile(fileId, userId) {
    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      throw new Error('File not found');
    }
    
    file.downloadCount += 1;
    await file.save();
    
    return await getFromStorage(file.path);
  }
  
  async deleteFile(fileId, userId, permanent = false) {
    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      throw new Error('File not found');
    }
    
    if (permanent) {
      await deleteFromStorage(file.path);
      if (file.thumbnail) {
        await deleteFromStorage(file.thumbnail);
      }
      await file.remove();
    } else {
      file.isDeleted = true;
      file.deletedAt = Date.now();
      await file.save();
    }
    
    return { success: true };
  }
  
  async restoreFile(fileId, userId) {
    const file = await File.findOne({ _id: fileId, userId, isDeleted: true });
    if (!file) {
      throw new Error('File not found in trash');
    }
    
    file.isDeleted = false;
    file.deletedAt = null;
    await file.save();
    
    return file;
  }
  
  async moveFile(fileId, newFolderId, userId) {
    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      throw new Error('File not found');
    }
    
    file.folderId = newFolderId;
    await file.save();
    
    return file;
  }
  
  async renameFile(fileId, newName, userId) {
    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      throw new Error('File not found');
    }
    
    file.name = newName;
    await file.save();
    
    return file;
  }
  
  async shareFile(fileId, shareData, userId) {
    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      throw new Error('File not found');
    }
    
    const shareToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = shareData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    file.shareToken = shareToken;
    file.shareExpires = expiresAt;
    file.isPublic = true;
    
    if (shareData.sharedWith) {
      file.sharedWith.push(...shareData.sharedWith);
    }
    
    await file.save();
    
    return {
      shareToken,
      shareUrl: `${process.env.CLIENT_URL}/shared/${shareToken}`,
      expiresAt,
    };
  }
  
  async getFileInfo(fileId, userId) {
    const file = await File.findOne({ _id: fileId, userId })
      .populate('folderId', 'name');
    
    if (!file) {
      throw new Error('File not found');
    }
    
    return file;
  }
  
  async searchFiles(userId, query, filters = {}) {
    const searchQuery = { userId, isDeleted: false };
    
    if (query) {
      searchQuery.name = { $regex: query, $options: 'i' };
    }
    
    if (filters.type) {
      searchQuery.mimeType = { $regex: filters.type, $options: 'i' };
    }
    
    if (filters.minSize) {
      searchQuery.size = { $gte: parseInt(filters.minSize) };
    }
    
    if (filters.maxSize) {
      searchQuery.size = { ...searchQuery.size, $lte: parseInt(filters.maxSize) };
    }
    
    if (filters.dateFrom) {
      searchQuery.createdAt = { $gte: new Date(filters.dateFrom) };
    }
    
    if (filters.dateTo) {
      searchQuery.createdAt = { ...searchQuery.createdAt, $lte: new Date(filters.dateTo) };
    }
    
    return await File.find(searchQuery).sort({ createdAt: -1 }).limit(100);
  }
  
  async getRecentFiles(userId, limit = 10) {
    return await File.find({ userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
  
  async getStarredFiles(userId) {
    return await File.find({ userId, isStarred: true, isDeleted: false });
  }
  
  async toggleStar(fileId, userId) {
    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      throw new Error('File not found');
    }
    
    file.isStarred = !file.isStarred;
    await file.save();
    
    return { isStarred: file.isStarred };
  }
  
  validateFile(file) {
    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }
    
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds ${this.maxFileSize} bytes`);
    }
  }
  
  async calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
  
  async getStorageUsage(userId) {
    const result = await File.aggregate([
      { $match: { userId, isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$size' }, count: { $sum: 1 } } },
    ]);
    
    return {
      totalSize: result[0]?.total || 0,
      fileCount: result[0]?.count || 0,
    };
  }
  
  async cleanupExpiredShares() {
    return await File.updateMany(
      { shareExpires: { $lt: Date.now() }, isPublic: true },
      { isPublic: false, $unset: { shareToken: 1, shareExpires: 1 } }
    );
  }
}

module.exports = new FileService();