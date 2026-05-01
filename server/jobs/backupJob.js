const cron = require('node-cron');
const { logger } = require('../utils/logger');
const backupService = require('../services/backupService');

class BackupJob {
  constructor() {
    this.isRunning = false;
  }

  start() {
    // Daily backup at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.runDailyBackup();
    });
    
    // Weekly full backup on Sunday at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      await this.runWeeklyBackup();
    });
    
    // Monthly archive on 1st at 4 AM
    cron.schedule('0 4 1 * *', async () => {
      await this.runMonthlyBackup();
    });
    
    logger.info('Backup jobs scheduled');
  }

  async runDailyBackup() {
    if (this.isRunning) {
      logger.warn('Backup already running, skipping...');
      return;
    }

    this.isRunning = true;
    logger.info('Starting daily backup...');

    try {
      const backup = await backupService.backupDatabase();
      logger.info(`Daily backup completed: ${backup.name} (${this.formatBytes(backup.size)})`);
      
      await this.cleanupOldBackups();
    } catch (error) {
      logger.error('Daily backup failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async runWeeklyBackup() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info('Starting weekly full backup...');

    try {
      const backup = await backupService.backupAll();
      logger.info(`Weekly backup completed: ${backup.id} (${this.formatBytes(backup.totalSize)})`);
    } catch (error) {
      logger.error('Weekly backup failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async runMonthlyBackup() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info('Starting monthly archive backup...');

    try {
      const backup = await backupService.backupAll();
      logger.info(`Monthly archive completed: ${backup.id}`);
      
      // Archive to long-term storage
      await this.archiveBackup(backup);
    } catch (error) {
      logger.error('Monthly backup failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async cleanupOldBackups() {
    const backups = await backupService.getBackups();
    const maxBackups = parseInt(process.env.MAX_BACKUPS) || 30;
    
    if (backups.length > maxBackups) {
      const toDelete = backups.slice(maxBackups);
      for (const backup of toDelete) {
        await backupService.deleteBackup(backup.id);
        logger.info(`Deleted old backup: ${backup.id}`);
      }
    }
  }

  async archiveBackup(backup) {
    // Archive to S3 or other long-term storage
    const s3Service = require('../config/s3');
    
    for (const component of backup.components) {
      const key = `archives/${component.name}`;
      const buffer = require('fs').readFileSync(component.path);
      await s3Service.uploadBuffer(buffer, key, 'application/gzip');
      logger.info(`Archived backup component: ${key}`);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = new BackupJob();