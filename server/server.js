const http = require('http');
const app = require('./app');
const config = require('./config');
const socketManager = require('./socket');
const { logger } = require('./utils/logger');

// Load jobs
const cleanupJob = require('./jobs/cleanupJob');
const analyticsJob = require('./jobs/analyticsJob');
const backupJob = require('./jobs/backupJob');
const subscriptionRenewalJob = require('./jobs/subscriptionRenewal');
const mergeQueueJob = require('./jobs/mergeQueueJob');
const emailQueueJob = require('./jobs/emailQueueJob');
const thumbnailGenerationJob = require('./jobs/thumbnailGenerationJob');
const virusScanJob = require('./jobs/virusScanJob');
const expirationJob = require('./jobs/expirationJob');

class Server {
  constructor() {
    this.port = process.env.PORT || 5000;
    this.server = null;
  }

  async initialize() {
    try {
      // Initialize configurations
      await config.initialize();
      logger.info('✓ Configurations initialized');

      // Create HTTP server
      this.server = http.createServer(app);
      
      // Initialize Socket.IO
      socketManager.initialize(this.server);
      logger.info('✓ Socket.IO initialized');

      // Start jobs
      this.initializeJobs();
      logger.info('✓ Background jobs initialized');

      return this;
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      process.exit(1);
    }
  }

  initializeJobs() {
    // Cleanup job - runs every hour
    cleanupJob.start();
    
    // Analytics job - runs daily and hourly
    analyticsJob.start();
    
    // Backup job - runs daily, weekly, monthly
    backupJob.start();
    
    // Subscription renewal job - runs daily
    subscriptionRenewalJob.start();
    
    // Merge queue job - processes pending merges
    mergeQueueJob.start();
    
    // Email queue job - processes emails
    emailQueueJob.start();
    
    // Thumbnail generation job
    thumbnailGenerationJob.start();
    
    // Virus scan job
    virusScanJob.start();
    
    // Expiration job
    expirationJob.start();
    
    logger.info('All background jobs started');
  }

  start() {
    this.server.listen(this.port, () => {
      logger.info(`🚀 Server running on port ${this.port}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API URL: ${process.env.API_URL || `http://localhost:${this.port}`}`);
      logger.info(`💾 Database: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
      logger.info(`📦 Redis: ${process.env.REDIS_HOST ? 'Configured' : 'Not configured'}`);
      logger.info(`🔐 JWT: ${process.env.JWT_SECRET ? 'Configured' : 'Missing!'}`);
    });

    // Graceful shutdown
    this.setupGracefulShutdown();
  }

  setupGracefulShutdown() {
    const shutdown = async () => {
      logger.info('Received shutdown signal, closing gracefully...');
      
      // Close server
      this.server.close(async () => {
        logger.info('HTTP server closed');
        
        // Close database connections
        await config.shutdown();
        
        logger.info('All connections closed, exiting...');
        process.exit(0);
      });
      
      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcing shutdown');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      shutdown();
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown();
    });
  }

  async stop() {
    logger.info('Stopping server...');
    
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
    
    await config.shutdown();
    logger.info('Server stopped');
  }
}

// Create and start server
const server = new Server();

if (require.main === module) {
  server.initialize()
    .then(() => server.start())
    .catch((error) => {
      logger.error('Failed to start server:', error);
      process.exit(1);
    });
}

module.exports = server;