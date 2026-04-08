const cache = require('../utils/cache');

function cacheMiddleware(prefix, ttlMs = 30000) {
  return (req, res, next) => {
    const key = `${prefix}:${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached) {
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, ttlMs);
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = cacheMiddleware;
