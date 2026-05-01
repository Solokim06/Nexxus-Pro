const Bull = require('bull');
const redisClient = require('../config/redis');

class QueueService {
  constructor() {
    this.queues = new Map();
    this.initQueues();
  }
  
  initQueues() {
    // Email queue
    this.queues.set('email', new Bull('email-queue', { redis: redisClient }));
    this.setupEmailQueue();
    
    // Merge queue
    this.queues.set('merge', new Bull('merge-queue', { redis: redisClient }));
    this.setupMergeQueue();
    
    // Thumbnail generation queue
    this.queues.set('thumbnail', new Bull('thumbnail-queue', { redis: redisClient }));
    this.setupThumbnailQueue();
    
    // Virus scan queue
    this.queues.set('virus-scan', new Bull('virus-scan-queue', { redis: redisClient }));
    this.setupVirusScanQueue();
    
    // Backup queue
    this.queues.set('backup', new Bull('backup-queue', { redis: redisClient }));
    this.setupBackupQueue();
    
    // Analytics queue
    this.queues.set('analytics', new Bull('analytics-queue', { redis: redisClient }));
    this.setupAnalyticsQueue();
    
    // Cleanup queue
    this.queues.set('cleanup', new Bull('cleanup-queue', { redis: redisClient }));
    this.setupCleanupQueue();
  }
  
  setupEmailQueue() {
    const emailQueue = this.queues.get('email');
    
    emailQueue.process(async (job) => {
      const { to, subject, template, data } = job.data;
      const emailService = require('./emailService');
      await emailService.sendEmail({ to, subject, template, data });
      return { success: true };
    });
    
    emailQueue.on('completed', (job) => {
      console.log(`Email job ${job.id} completed`);
    });
    
    emailQueue.on('failed', (job, err) => {
      console.error(`Email job ${job.id} failed:`, err);
    });
  }
  
  setupMergeQueue() {
    const mergeQueue = this.queues.get('merge');
    
    mergeQueue.process(async (job) => {
      const { jobId, files, outputFormat, options } = job.data;
      const mergeService = require('./mergeService');
      
      const result = await mergeService.mergeFiles(files, outputFormat, options);
      
      // Update job status in database
      const MergeJob = require('../models/MergeJob');
      await MergeJob.findByIdAndUpdate(jobId, {
        status: 'completed',
        outputUrl: result.url,
        outputPath: result.path,
        outputSize: result.size,
        completedAt: Date.now(),
      });
      
      return result;
    });
    
    mergeQueue.on('progress', (job, progress) => {
      console.log(`Merge job ${job.id} is ${progress}% complete`);
    });
  }
  
  setupThumbnailQueue() {
    const thumbnailQueue = this.queues.get('thumbnail');
    
    thumbnailQueue.process(async (job) => {
      const { fileId, filePath, size } = job.data;
      const thumbnailService = require('./thumbnailService');
      
      const thumbnail = await thumbnailService.createThumbnail(filePath, size);
      
      // Update file with thumbnail URL
      const File = require('../models/File');
      await File.findByIdAndUpdate(fileId, { thumbnail: thumbnail.url });
      
      return thumbnail;
    });
  }
  
  setupVirusScanQueue() {
    const virusScanQueue = this.queues.get('virus-scan');
    
    virusScanQueue.process(async (job) => {
      const { fileId, filePath } = job.data;
      const virusScanService = require('./virusScanService');
      
      const result = await virusScanService.scanFile(filePath);
      
      if (result.isInfected) {
        const File = require('../models/File');
        await File.findByIdAndDelete(fileId);
        throw new Error(`Virus detected: ${result.virusName}`);
      }
      
      return result;
    });
  }
  
  setupBackupQueue() {
    const backupQueue = this.queues.get('backup');
    
    backupQueue.process(async (job) => {
      const { type } = job.data;
      const backupService = require('./backupService');
      
      if (type === 'database') {
        return await backupService.backupDatabase();
      } else if (type === 'files') {
        return await backupService.backupFiles();
      } else {
        return await backupService.backupAll();
      }
    });
  }
  
  setupAnalyticsQueue() {
    const analyticsQueue = this.queues.get('analytics');
    
    analyticsQueue.process(async (job) => {
      const { eventName, eventData, userId } = job.data;
      const analyticsService = require('./analyticsService');
      
      await analyticsService.trackEvent(eventName, eventData, userId);
      
      return { success: true };
    });
  }
  
  setupCleanupQueue() {
    const cleanupQueue = this.queues.get('cleanup');
    
    cleanupQueue.process(async (job) => {
      const { type } = job.data;
      
      if (type === 'temp-files') {
        const mergeService = require('./mergeService');
        await mergeService.cleanupTempFiles();
      } else if (type === 'expired-shares') {
        const fileService = require('./fileService');
        await fileService.cleanupExpiredShares();
      } else if (type === 'expired-sessions') {
        const Session = require('../models/Session');
        await Session.cleanExpired();
      } else if (type === 'audit-logs') {
        const AuditLog = require('../models/AuditLog');
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await AuditLog.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
      }
      
      return { success: true };
    });
  }
  
  async addToQueue(queueName, data, options = {}) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    return await queue.add(data, {
      attempts: options.attempts || 3,
      backoff: options.backoff || { type: 'exponential', delay: 5000 },
      delay: options.delay || 0,
      removeOnComplete: options.removeOnComplete || true,
      ...options,
    });
  }
  
  async getQueueStats(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    
    return { waiting, active, completed, failed, delayed };
  }
  
  async pauseQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    await queue.pause();
    return { success: true };
  }
  
  async resumeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    await queue.resume();
    return { success: true };
  }
  
  async cleanQueue(queueName, gracePeriod = 3600000) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    await queue.clean(gracePeriod, 'completed');
    await queue.clean(gracePeriod, 'failed');
    return { success: true };
  }
  
  async scheduleRecurringJob(queueName, jobData, cronPattern) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    // Add job with repeat option
    return await queue.add(jobData, {
      repeat: { cron: cronPattern },
      removeOnComplete: true,
    });
  }
}

module.exports = new QueueService();