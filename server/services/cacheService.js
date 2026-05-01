const redisClient = require('../config/redis');

class CacheService {
  constructor() {
    this.defaultTTL = 300; // 5 minutes
  }
  
  async get(key) {
    try {
      const data = await redisClient.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serialized = JSON.stringify(value);
      await redisClient.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }
  
  async delete(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }
  
  async exists(key) {
    try {
      return await redisClient.exists(key);
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }
  
  async increment(key, incrementBy = 1) {
    try {
      return await redisClient.incrBy(key, incrementBy);
    } catch (error) {
      console.error('Cache increment error:', error);
      return null;
    }
  }
  
  async expire(key, ttl) {
    try {
      await redisClient.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }
  
  async getOrSet(key, fetcher, ttl = this.defaultTTL) {
    let value = await this.get(key);
    if (value !== null) {
      return value;
    }
    
    value = await fetcher();
    if (value !== null) {
      await this.set(key, value, ttl);
    }
    return value;
  }
  
  async invalidatePattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
      return 0;
    }
  }
  
  async invalidateUserCache(userId) {
    return this.invalidatePattern(`*:${userId}:*`);
  }
  
  async invalidateFileCache(fileId) {
    return this.invalidatePattern(`*:file:${fileId}:*`);
  }
  
  async getStats() {
    try {
      const info = await redisClient.info('stats');
      const keyspace = await redisClient.info('keyspace');
      
      return {
        info,
        keyspace,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }
  
  async flushAll() {
    try {
      await redisClient.flushAll();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }
  
  // Rate limiting methods
  async rateLimit(key, limit, windowSeconds) {
    const current = await this.increment(key);
    if (current === 1) {
      await this.expire(key, windowSeconds);
    }
    
    const remaining = Math.max(0, limit - current);
    const reset = await redisClient.ttl(key);
    
    return {
      limit,
      remaining,
      reset,
      total: current,
    };
  }
  
  // Session caching
  async cacheSession(sessionId, sessionData, ttl = 86400) {
    return this.set(`session:${sessionId}`, sessionData, ttl);
  }
  
  async getSession(sessionId) {
    return this.get(`session:${sessionId}`);
  }
  
  async deleteSession(sessionId) {
    return this.delete(`session:${sessionId}`);
  }
  
  // User caching
  async cacheUser(userId, userData, ttl = 3600) {
    return this.set(`user:${userId}`, userData, ttl);
  }
  
  async getUser(userId) {
    return this.get(`user:${userId}`);
  }
  
  async invalidateUser(userId) {
    return this.delete(`user:${userId}`);
  }
  
  // File caching
  async cacheFile(fileId, fileData, ttl = 300) {
    return this.set(`file:${fileId}`, fileData, ttl);
  }
  
  async getFile(fileId) {
    return this.get(`file:${fileId}`);
  }
  
  async invalidateFile(fileId) {
    return this.delete(`file:${fileId}`);
  }
  
  // API response caching
  async cacheApiResponse(endpoint, userId, data, ttl = 60) {
    const key = `api:${userId}:${endpoint}`;
    return this.set(key, data, ttl);
  }
  
  async getApiResponse(endpoint, userId) {
    const key = `api:${userId}:${endpoint}`;
    return this.get(key);
  }
  
  async invalidateApiResponse(endpoint, userId) {
    const key = `api:${userId}:${endpoint}`;
    return this.delete(key);
  }
}

module.exports = new CacheService();