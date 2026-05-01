const cron = require('node-cron');
const { logger } = require('../utils/logger');
const { sendEmail } = require('../services/emailService');

class EmailQueueJob {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.maxRetries = 3;
    this.retryDelay = 5000;
  }

  start() {
    // Process queue every 5 seconds
    cron.schedule('*/5 * * * * *', async () => {
      await this.processQueue();
    });
    
    // Retry failed emails every minute
    cron.schedule('* * * * *', async () => {
      await this.retryFailed();
    });
    
    logger.info('Email queue jobs scheduled');
  }

  addToQueue(emailData) {
    this.queue.push({
      ...emailData,
      retries: 0,
      status: 'pending',
      createdAt: new Date()
    });
    
    logger.info(`Email added to queue: ${emailData.to}`);
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    const email = this.queue.shift();
    
    try {
      await sendEmail({
        to: email.to,
        subject: email.subject,
        template: email.template,
        data: email.data
      });
      
      email.status = 'sent';
      email.sentAt = new Date();
      logger.info(`Email sent to ${email.to}`);
    } catch (error) {
      logger.error(`Failed to send email to ${email.to}:`, error);
      
      if (email.retries < this.maxRetries) {
        email.retries++;
        email.nextRetryAt = new Date(Date.now() + this.retryDelay * Math.pow(2, email.retries));
        this.queue.push(email);
      } else {
        email.status = 'failed';
        email.error = error.message;
        logger.error(`Email permanently failed for ${email.to} after ${this.maxRetries} retries`);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async retryFailed() {
    const now = new Date();
    const failedEmails = this.queue.filter(e => 
      e.status === 'pending' && e.nextRetryAt && e.nextRetryAt <= now
    );
    
    for (const email of failedEmails) {
      const index = this.queue.indexOf(email);
      if (index !== -1) {
        this.queue.splice(index, 1);
        this.queue.unshift(email);
      }
    }
  }

  getQueueStats() {
    return {
      pending: this.queue.filter(e => e.status === 'pending').length,
      sent: this.queue.filter(e => e.status === 'sent').length,
      failed: this.queue.filter(e => e.status === 'failed').length,
      totalProcessed: this.queue.length
    };
  }
}

module.exports = new EmailQueueJob();