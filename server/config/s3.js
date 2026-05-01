const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class S3Storage {
  constructor() {
    this.s3 = null;
    this.bucket = process.env.S3_BUCKET_NAME;
    this.isConfigured = false;
  }

  configure() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      logger.warn('AWS credentials not configured, using local storage');
      return false;
    }

    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });

    this.s3 = new AWS.S3({
      params: { Bucket: this.bucket },
      signatureVersion: 'v4',
    });

    this.isConfigured = true;
    logger.info('S3 storage configured');
    return true;
  }

  async uploadFile(filePath, key, contentType) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    const fileContent = fs.readFileSync(filePath);
    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
      ACL: 'private',
    };

    try {
      const result = await this.s3.upload(params).promise();
      return {
        url: result.Location,
        key: result.Key,
        etag: result.ETag,
      };
    } catch (error) {
      logger.error('S3 upload error:', error);
      throw error;
    }
  }

  async uploadBuffer(buffer, key, contentType) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'private',
    };

    try {
      const result = await this.s3.upload(params).promise();
      return {
        url: result.Location,
        key: result.Key,
        etag: result.ETag,
      };
    } catch (error) {
      logger.error('S3 upload buffer error:', error);
      throw error;
    }
  }

  async downloadFile(key, downloadPath) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    const params = {
      Bucket: this.bucket,
      Key: key,
    };

    try {
      const data = await this.s3.getObject(params).promise();
      fs.writeFileSync(downloadPath, data.Body);
      return downloadPath;
    } catch (error) {
      logger.error('S3 download error:', error);
      throw error;
    }
  }

  async getFileStream(key) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    const params = {
      Bucket: this.bucket,
      Key: key,
    };

    return this.s3.getObject(params).createReadStream();
  }

  async deleteFile(key) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    const params = {
      Bucket: this.bucket,
      Key: key,
    };

    try {
      await this.s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      logger.error('S3 delete error:', error);
      throw error;
    }
  }

  async deleteMultipleFiles(keys) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    const Objects = keys.map(key => ({ Key: key }));
    const params = {
      Bucket: this.bucket,
      Delete: { Objects, Quiet: false },
    };

    try {
      const result = await this.s3.deleteObjects(params).promise();
      return result.Deleted;
    } catch (error) {
      logger.error('S3 delete multiple error:', error);
      throw error;
    }
  }

  async fileExists(key) {
    if (!this.isConfigured) {
      return false;
    }

    const params = {
      Bucket: this.bucket,
      Key: key,
    };

    try {
      await this.s3.headObject(params).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') return false;
      throw error;
    }
  }

  async getFileMetadata(key) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    const params = {
      Bucket: this.bucket,
      Key: key,
    };

    try {
      const metadata = await this.s3.headObject(params).promise();
      return {
        size: metadata.ContentLength,
        contentType: metadata.ContentType,
        lastModified: metadata.LastModified,
        etag: metadata.ETag,
      };
    } catch (error) {
      logger.error('S3 get metadata error:', error);
      throw error;
    }
  }

  async copyFile(sourceKey, destinationKey) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    const params = {
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${sourceKey}`,
      Key: destinationKey,
    };

    try {
      const result = await this.s3.copyObject(params).promise();
      return {
        key: destinationKey,
        etag: result.CopyObjectResult.ETag,
      };
    } catch (error) {
      logger.error('S3 copy error:', error);
      throw error;
    }
  }

  async moveFile(sourceKey, destinationKey) {
    await this.copyFile(sourceKey, destinationKey);
    await this.deleteFile(sourceKey);
    return { key: destinationKey };
  }

  async getSignedUrl(key, expiresIn = 3600) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    const params = {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresIn,
    };

    try {
      const url = await this.s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      logger.error('S3 get signed URL error:', error);
      throw error;
    }
  }

  async getUploadSignedUrl(key, contentType, expiresIn = 3600) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    const params = {
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      Expires: expiresIn,
    };

    try {
      const url = await this.s3.getSignedUrlPromise('putObject', params);
      return url;
    } catch (error) {
      logger.error('S3 get upload signed URL error:', error);
      throw error;
    }
  }

  async listFiles(prefix = '', maxKeys = 1000) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    const params = {
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    };

    try {
      const result = await this.s3.listObjectsV2(params).promise();
      return result.Contents.map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag,
      }));
    } catch (error) {
      logger.error('S3 list files error:', error);
      throw error;
    }
  }

  async getBucketStats() {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    try {
      const result = await this.s3.listObjectsV2({ Bucket: this.bucket }).promise();
      const totalSize = result.Contents.reduce((sum, obj) => sum + obj.Size, 0);
      return {
        totalFiles: result.KeyCount,
        totalSize: totalSize,
        lastModified: result.Contents[0]?.LastModified,
      };
    } catch (error) {
      logger.error('S3 get stats error:', error);
      throw error;
    }
  }
}

module.exports = new S3Storage();