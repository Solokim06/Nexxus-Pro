const cron = require('node-cron');
const File = require('../models/File');
const thumbnailService = require('../services/thumbnailService');
const { logger } = require('../utils/logger');

class ThumbnailGenerationJob {
  constructor() {
    this.isProcessing = false;
    this.batchSize = 10;
  }

  start() {
    // Process every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      await this.processPendingThumbnails();
    });
    
    // Clean up old thumbnails daily
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldThumbnails();
    });
    
    logger.info('Thumbnail generation jobs scheduled');
  }

  async processPendingThumbnails() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    
    try {
      const files = await File.find({
        thumbnail: { $exists: false },
        mimeType: { $in: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] }
      }).limit(this.batchSize);
      
      let generated = 0;
      let failed = 0;
      
      for (const file of files) {
        try {
          const thumbnail = await thumbnailService.createImageThumbnail(file.path);
          file.thumbnail = thumbnail.url;
          await file.save();
          generated++;
        } catch (error) {
          logger.error(`Failed to generate thumbnail for file ${file._id}:`, error);
          failed++;
        }
      }
      
      if (generated > 0 || failed > 0) {
        logger.info(`Thumbnails generated: ${generated} success, ${failed} failed`);
      }
    } catch (error) {
      logger.error('Thumbnail generation error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async cleanupOldThumbnails() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const files = await File.find({
      thumbnail: { $exists: true },
      updatedAt: { $lt: thirtyDaysAgo }
    });
    
    let deleted = 0;
    for (const file of files) {
      if (file.thumbnail) {
        await thumbnailService.deleteThumbnail(file.thumbnail);
        file.thumbnail = null;
        await file.save();
        deleted++;
      }
    }
    
    if (deleted > 0) {
      logger.info(`Cleaned up ${deleted} old thumbnails`);
    }
  }
}

module.exports = new ThumbnailGenerationJob();