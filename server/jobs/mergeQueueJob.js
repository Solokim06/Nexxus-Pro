const cron = require('node-cron');
const MergeJob = require('../models/MergeJob');
const mergeService = require('../services/mergeService');
const { logger } = require('../utils/logger');

class MergeQueueJob {
  constructor() {
    this.isProcessing = false;
    this.maxConcurrent = 3;
    this.currentJobs = 0;
  }

  start() {
    // Process queue every minute
    cron.schedule('* * * * *', async () => {
      await this.processQueue();
    });
    
    // Clean up old jobs every hour
    cron.schedule('0 * * * *', async () => {
      await this.cleanupOldJobs();
    });
    
    logger.info('Merge queue jobs scheduled');
  }

  async processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    
    try {
      const pendingJobs = await MergeJob.find({
        status: 'pending',
        priority: { $gte: 0 }
      }).sort({ priority: -1, createdAt: 1 });
      
      for (const job of pendingJobs) {
        if (this.currentJobs >= this.maxConcurrent) {
          break;
        }
        
        this.currentJobs++;
        this.processJob(job).finally(() => {
          this.currentJobs--;
        });
      }
    } catch (error) {
      logger.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processJob(job) {
    try {
      job.status = 'processing';
      job.startedAt = Date.now();
      await job.save();
      
      logger.info(`Processing merge job ${job._id}`);
      
      let result;
      if (job.type === 'files') {
        result = await mergeService.mergeFiles(
          job.inputFiles.map(f => f.path),
          job.outputFormat,
          job.options
        );
      } else if (job.type === 'folders') {
        result = await mergeService.mergeFolders(
          job.inputFolders,
          job.options
        );
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }
      
      job.status = 'completed';
      job.completedAt = Date.now();
      job.outputUrl = result.url;
      job.outputPath = result.path;
      job.outputSize = result.size;
      job.progress = 100;
      await job.save();
      
      logger.info(`Merge job ${job._id} completed successfully`);
    } catch (error) {
      logger.error(`Merge job ${job._id} failed:`, error);
      
      job.status = 'failed';
      job.completedAt = Date.now();
      job.error = error.message;
      await job.save();
    }
  }

  async cleanupOldJobs() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const result = await MergeJob.deleteMany({
      status: { $in: ['completed', 'failed', 'cancelled'] },
      completedAt: { $lt: sevenDaysAgo }
    });
    
    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} old merge jobs`);
    }
  }

  async addToQueue(jobData) {
    const job = await MergeJob.create(jobData);
    logger.info(`Added merge job ${job._id} to queue`);
    return job;
  }

  async cancelJob(jobId) {
    const job = await MergeJob.findById(jobId);
    if (job && job.status === 'pending') {
      job.status = 'cancelled';
      await job.save();
      logger.info(`Cancelled merge job ${jobId}`);
      return true;
    }
    return false;
  }

  async getQueueStatus() {
    const counts = await MergeJob.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const stats = {};
    counts.forEach(c => { stats[c._id] = c.count; });
    
    return {
      pending: stats.pending || 0,
      processing: stats.processing || 0,
      completed: stats.completed || 0,
      failed: stats.failed || 0,
      currentActive: this.currentJobs,
      maxConcurrent: this.maxConcurrent
    };
  }
}

module.exports = new MergeQueueJob();