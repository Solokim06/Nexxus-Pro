const mongoose = require('mongoose');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  async connect() {
    if (this.isConnected) {
      logger.info('Database already connected');
      return this.connection;
    }

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: process.env.NODE_ENV !== 'production',
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    };

    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, options);
      this.isConnected = true;
      this.connection = conn;
      
      logger.info(`MongoDB Connected: ${conn.connection.host}`);
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return conn;
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    if (!this.isConnected) {
      return;
    }
    
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB disconnected');
    } catch (error) {
      logger.error('Error disconnecting MongoDB:', error);
    }
  }

  getConnection() {
    return this.connection;
  }

  isConnectedToDB() {
    return this.isConnected;
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', error: 'Not connected to database' };
      }
      
      await mongoose.connection.db.admin().ping();
      return { status: 'connected', host: mongoose.connection.host };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  // Get database stats
  async getStats() {
    if (!this.isConnected) return null;
    
    try {
      const stats = await mongoose.connection.db.stats();
      return {
        collections: stats.collections,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
      };
    } catch (error) {
      logger.error('Error getting DB stats:', error);
      return null;
    }
  }

  // Create indexes for better performance
  async ensureIndexes() {
    const User = require('../models/User');
    const File = require('../models/File');
    const Folder = require('../models/Folder');
    const Payment = require('../models/Payment');
    const Subscription = require('../models/Subscription');

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ phone: 1 }, { unique: true, sparse: true });
    await User.collection.createIndex({ subscriptionPlan: 1 });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ createdAt: -1 });

    // File indexes
    await File.collection.createIndex({ userId: 1, folderId: 1 });
    await File.collection.createIndex({ name: 'text' });
    await File.collection.createIndex({ mimeType: 1 });
    await File.collection.createIndex({ createdAt: -1 });
    await File.collection.createIndex({ shareToken: 1 });

    // Folder indexes
    await Folder.collection.createIndex({ userId: 1, parentId: 1 });
    await Folder.collection.createIndex({ userId: 1, name: 1 });
    await Folder.collection.createIndex({ shareToken: 1 });

    // Payment indexes
    await Payment.collection.createIndex({ userId: 1, createdAt: -1 });
    await Payment.collection.createIndex({ transactionId: 1 });
    await Payment.collection.createIndex({ status: 1 });

    // Subscription indexes
    await Subscription.collection.createIndex({ userId: 1 });
    await Subscription.collection.createIndex({ status: 1, endDate: 1 });

    logger.info('Database indexes ensured');
  }
}

module.exports = new Database();