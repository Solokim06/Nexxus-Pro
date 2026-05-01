const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configure AWS (if using S3)
let s3 = null;
if (process.env.STORAGE_TYPE === 's3') {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  s3 = new AWS.S3();
}

class StorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local';
    this.basePath = process.env.STORAGE_PATH || path.join(__dirname, '../../storage');
  }
  
  async uploadToStorage(localPath, remotePath, mimeType) {
    if (this.storageType === 's3') {
      return await this.uploadToS3(localPath, remotePath, mimeType);
    } else {
      return await this.uploadToLocal(localPath, remotePath);
    }
  }
  
  async uploadToLocal(localPath, remotePath) {
    const fullPath = path.join(this.basePath, remotePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.copyFileSync(localPath, fullPath);
    
    return {
      path: remotePath,
      url: `${process.env.STORAGE_URL || 'http://localhost:5000'}/storage/${remotePath}`,
    };
  }
  
  async uploadToS3(localPath, remotePath, mimeType) {
    const fileContent = fs.readFileSync(localPath);
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: remotePath,
      Body: fileContent,
      ContentType: mimeType,
    };
    
    const result = await s3.upload(params).promise();
    
    return {
      path: remotePath,
      url: result.Location,
    };
  }
  
  async getFromStorage(remotePath) {
    if (this.storageType === 's3') {
      return await this.getFromS3(remotePath);
    } else {
      return await this.getFromLocal(remotePath);
    }
  }
  
  async getFromLocal(remotePath) {
    const fullPath = path.join(this.basePath, remotePath);
    return fs.createReadStream(fullPath);
  }
  
  async getFromS3(remotePath) {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: remotePath,
    };
    
    return s3.getObject(params).createReadStream();
  }
  
  async deleteFromStorage(remotePath) {
    if (this.storageType === 's3') {
      return await this.deleteFromS3(remotePath);
    } else {
      return await this.deleteFromLocal(remotePath);
    }
  }
  
  async deleteFromLocal(remotePath) {
    const fullPath = path.join(this.basePath, remotePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return { success: true };
  }
  
  async deleteFromS3(remotePath) {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: remotePath,
    };
    await s3.deleteObject(params).promise();
    return { success: true };
  }
  
  async getSignedUrl(remotePath, expiresIn = 3600) {
    if (this.storageType === 's3') {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: remotePath,
        Expires: expiresIn,
      };
      return await s3.getSignedUrlPromise('getObject', params);
    } else {
      return `${process.env.STORAGE_URL || 'http://localhost:5000'}/storage/${remotePath}`;
    }
  }
  
  async copyFile(sourcePath, destPath) {
    if (this.storageType === 's3') {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        CopySource: `${process.env.S3_BUCKET_NAME}/${sourcePath}`,
        Key: destPath,
      };
      await s3.copyObject(params).promise();
    } else {
      const sourceFull = path.join(this.basePath, sourcePath);
      const destFull = path.join(this.basePath, destPath);
      const dir = path.dirname(destFull);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.copyFileSync(sourceFull, destFull);
    }
    return { success: true };
  }
  
  async moveFile(sourcePath, destPath) {
    await this.copyFile(sourcePath, destPath);
    await this.deleteFromStorage(sourcePath);
    return { success: true };
  }
  
  async fileExists(remotePath) {
    if (this.storageType === 's3') {
      try {
        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: remotePath,
        };
        await s3.headObject(params).promise();
        return true;
      } catch {
        return false;
      }
    } else {
      const fullPath = path.join(this.basePath, remotePath);
      return fs.existsSync(fullPath);
    }
  }
  
  async getFileSize(remotePath) {
    if (this.storageType === 's3') {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: remotePath,
      };
      const result = await s3.headObject(params).promise();
      return result.ContentLength;
    } else {
      const fullPath = path.join(this.basePath, remotePath);
      const stats = fs.statSync(fullPath);
      return stats.size;
    }
  }
}

module.exports = new StorageService();