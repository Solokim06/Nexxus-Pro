const cron = require('node-cron');
const File = require('../models/File');
const virusScanService = require('../services/virusScanService');
const { logger } = require('../utils/logger');

class VirusScanJob {
  constructor() {
    this.isScanning = false;
    this.batchSize = 50;
  }

  start() {
    // Scan new files every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.scanNewFiles();
    });
    
    // Scan all files weekly on Sunday at 1 AM
    cron.schedule('0 1 * * 0', async () => {
      await this.scanAllFiles();
    });
    
    // Update virus definitions daily at 3 AM
    cron.schedule('0 3 * * *', async () => {
      await this.updateVirusDefinitions();
    });
    
    logger.info('Virus scan jobs scheduled');
  }

  async scanNewFiles() {
    if (this.isScanning) {
      return;
    }

    this.isScanning = true;
    
    try {
      const files = await File.find({
        virusScanned: { $ne: true },
        isDeleted: false
      }).limit(this.batchSize);
      
      let clean = 0;
      let infected = 0;
      
      for (const file of files) {
        try {
          const result = await virusScanService.scanFile(file.path);
          
          if (result.isInfected) {
            // Mark file as infected and quarantine
            file.isInfected = true;
            file.virusName = result.virusName;
            file.isDeleted = true;
            file.deletedAt = Date.now();
            await file.save();
            infected++;
            logger.warn(`Infected file detected: ${file.name} (${result.virusName})`);
          } else {
            file.virusScanned = true;
            file.scannedAt = Date.now();
            await file.save();
            clean++;
          }
        } catch (error) {
          logger.error(`Scan failed for file ${file._id}:`, error);
        }
      }
      
      if (clean > 0 || infected > 0) {
        logger.info(`Virus scan completed: ${clean} clean, ${infected} infected`);
      }
    } catch (error) {
      logger.error('Virus scan error:', error);
    } finally {
      this.isScanning = false;
    }
  }

  async scanAllFiles() {
    if (this.isScanning) {
      return;
    }

    this.isScanning = true;
    logger.info('Starting full virus scan...');
    
    try {
      const files = await File.find({ isDeleted: false });
      let clean = 0;
      let infected = 0;
      
      for (const file of files) {
        try {
          const result = await virusScanService.scanFile(file.path);
          
          if (result.isInfected) {
            file.isInfected = true;
            file.virusName = result.virusName;
            file.isDeleted = true;
            await file.save();
            infected++;
          } else {
            file.virusScanned = true;
            file.scannedAt = Date.now();
            await file.save();
            clean++;
          }
        } catch (error) {
          logger.error(`Scan failed for file ${file._id}:`, error);
        }
      }
      
      logger.info(`Full virus scan completed: ${clean} clean, ${infected} infected`);
    } catch (error) {
      logger.error('Full virus scan error:', error);
    } finally {
      this.isScanning = false;
    }
  }

  async updateVirusDefinitions() {
    try {
      const result = await virusScanService.updateVirusDatabase();
      logger.info('Virus definitions updated:', result);
    } catch (error) {
      logger.error('Failed to update virus definitions:', error);
    }
  }
}

module.exports = new VirusScanJob();