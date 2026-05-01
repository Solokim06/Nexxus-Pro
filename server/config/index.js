const database = require('./database');
const redis = require('./redis');
const s3 = require('./s3');
const mailer = require('./mailer');
const passport = require('./passport');
const socket = require('./socket');
const multer = require('./multer');

class ConfigManager {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize database
      await database.connect();
      await database.ensureIndexes();
      console.log('✓ Database initialized');

      // Initialize Redis
      await redis.connect();
      console.log('✓ Redis initialized');

      // Configure S3
      s3.configure();
      console.log('✓ S3 configured');

      // Configure mailer
      mailer.configure();
      console.log('✓ Mailer configured');

      // Initialize passport
      passport.initialize();
      console.log('✓ Passport initialized');

      this.isInitialized = true;
      console.log('✓ All configurations initialized successfully');
    } catch (error) {
      console.error('Configuration initialization failed:', error);
      throw error;
    }
  }

  async shutdown() {
    try {
      await database.disconnect();
      await redis.disconnect();
      console.log('✓ All connections closed');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }

  getDatabase() {
    return database;
  }

  getRedis() {
    return redis;
  }

  getS3() {
    return s3;
  }

  getMailer() {
    return mailer;
  }

  getPassport() {
    return passport;
  }

  getSocket() {
    return socket;
  }

  getMulter() {
    return multer;
  }

  async healthCheck() {
    const dbHealth = await database.healthCheck();
    const redisHealth = await redis.healthCheck();
    const mailerHealth = await mailer.verifyConnection();

    const allHealthy = dbHealth.status === 'connected' && 
                       redisHealth.status === 'connected';

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      components: {
        database: dbHealth,
        redis: redisHealth,
        mailer: mailerHealth,
      },
    };
  }

  getEnvironment() {
    return {
      nodeEnv: process.env.NODE_ENV,
      apiUrl: process.env.API_URL,
      clientUrl: process.env.CLIENT_URL,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    };
  }
}

module.exports = new ConfigManager();