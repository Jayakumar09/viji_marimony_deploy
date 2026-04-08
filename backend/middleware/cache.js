/**
 * Simple in-memory cache middleware
 * TTL-based caching with size limits
 */

const CACHE_TTL = 30000;
const cache = new Map();

const withCache = (keyPrefix, ttl = CACHE_TTL) => {
  return async (req, res, next) => {
    const cacheKey = `${keyPrefix}:${req.originalUrl}`;
    
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < ttl) {
        return res.json(cached.data);
      }
      cache.delete(cacheKey);
    }
    
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (data && !data.error) {
        cache.set(cacheKey, { data, timestamp: Date.now() });
        
        if (cache.size > 20) {
          const oldestKey = cache.keys().next().value;
          cache.delete(oldestKey);
        }
      }
      return originalJson(data);
    };
    
    next();
  };
};

const clearCache = (prefix = null) => {
  if (prefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

const getCacheStats = () => ({
  size: cache.size,
  keys: [...cache.keys()]
});

module.exports = { withCache, clearCache, getCacheStats };
