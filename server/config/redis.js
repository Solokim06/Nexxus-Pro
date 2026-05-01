const Redis = require('ioredis');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      return this.client;
    }

    const options = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    };

    this.client = new Redis(options);

    this.client.on('connect', () => {
      logger.info('Redis connecting...');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info('Redis connected successfully');
    });

    this.client.on('error', (error) => {
      logger.error('Redis error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.warn('Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    try {
      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (!this.client) return;
    
    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis:', error);
    }
  }

  getClient() {
    return this.client;
  }

  isConnectedToRedis() {
    return this.isConnected;
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', error: 'Not connected to Redis' };
      }
      
      await this.client.ping();
      return { status: 'connected', host: process.env.REDIS_HOST };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  // Cache operations
  async get(key) {
    if (!this.isConnected) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.isConnected) return false;
    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis del error:', error);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected) return false;
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  }

  async expire(key, ttl) {
    if (!this.isConnected) return false;
    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Redis expire error:', error);
      return false;
    }
  }

  async incr(key) {
    if (!this.isConnected) return null;
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Redis incr error:', error);
      return null;
    }
  }

  async hset(key, field, value) {
    if (!this.isConnected) return false;
    try {
      await this.client.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis hset error:', error);
      return false;
    }
  }

  async hget(key, field) {
    if (!this.isConnected) return null;
    try {
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis hget error:', error);
      return null;
    }
  }

  async hdel(key, field) {
    if (!this.isConnected) return false;
    try {
      await this.client.hdel(key, field);
      return true;
    } catch (error) {
      logger.error('Redis hdel error:', error);
      return false;
    }
  }

  async keys(pattern) {
    if (!this.isConnected) return [];
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis keys error:', error);
      return [];
    }
  }

  async flushAll() {
    if (!this.isConnected) return false;
    try {
      await this.client.flushall();
      return true;
    } catch (error) {
      logger.error('Redis flushall error:', error);
      return false;
    }
  }

  // Rate limiting
  async rateLimit(key, limit, windowSeconds) {
    const current = await this.incr(key);
    if (current === 1) {
      await this.expire(key, windowSeconds);
    }
    
    const remaining = Math.max(0, limit - current);
    const reset = await this.client.ttl(key);
    
    return {
      limit,
      remaining,
      reset,
      total: current,
    };
  }
}

module.exports = new RedisClient();