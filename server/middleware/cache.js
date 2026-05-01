const redisClient = require('../config/redis');

// Cache middleware
const cache = (duration = 300) => { // duration in seconds, default 5 minutes
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }
    
    const key = `cache:${req.user?.id || 'anon'}:${req.originalUrl || req.url}`;
    
    try {
      const cachedData = await redisClient.get(key);
      
      if (cachedData) {
        const data = JSON.parse(cachedData);
        res.setHeader('X-Cache', 'HIT');
        return res.json(data);
      }
      
      // Store original send function
      const originalSend = res.json;
      res.json = function(data) {
        // Cache the response
        redisClient.setEx(key, duration, JSON.stringify(data));
        res.setHeader('X-Cache', 'MISS');
        originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
};

// Clear cache for specific patterns
const clearCache = async (pattern) => {
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};

// User-specific cache invalidation
const invalidateUserCache = async (userId) => {
  await clearCache(`cache:${userId}:*`);
};

// Route-specific cache invalidation
const invalidateRouteCache = async (route) => {
  await clearCache(`cache:*:${route}*`);
};

// Cache with conditional checking (ETag)
const conditionalCache = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.user?.id || 'anon'}:${req.originalUrl || req.url}`;
    const etag = req.headers['if-none-match'];
    
    try {
      const cached = await redisClient.get(key);
      
      if (cached) {
        const { data, hash } = JSON.parse(cached);
        
        if (etag === hash) {
          return res.status(304).end();
        }
        
        res.setHeader('ETag', hash);
        res.setHeader('X-Cache', 'HIT');
        return res.json(data);
      }
      
      const originalSend = res.json;
      res.json = function(data) {
        const hash = require('crypto').createHash('md5').update(JSON.stringify(data)).digest('hex');
        redisClient.setEx(key, duration, JSON.stringify({ data, hash }));
        res.setHeader('ETag', hash);
        res.setHeader('X-Cache', 'MISS');
        originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Conditional cache error:', error);
      next();
    }
  };
};

// Disable cache for specific routes
const noCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
};

module.exports = {
  cache,
  clearCache,
  invalidateUserCache,
  invalidateRouteCache,
  conditionalCache,
  noCache,
};