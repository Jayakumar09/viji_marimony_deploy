const rateLimit = require('express-rate-limit');
const { shouldThrottle, getSystemHealth } = require('./performanceMonitor');

const createAdminRateLimiter = () => {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Too many admin requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return req.path.includes('/auth/login') || req.path.includes('/auth/register');
    }
  });
};

const createHealthRateLimiter = () => {
  return rateLimit({
    windowMs: 30 * 1000,
    max: 10,
    message: { error: 'Too many health check requests' },
    standardHeaders: true,
    legacyHeaders: false
  });
};

const createSearchRateLimiter = () => {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Too many search requests' },
    standardHeaders: true,
    legacyHeaders: false
  });
};

const debounceMap = new Map();

const debounce = (key, fn, waitMs = 1000) => {
  const existing = debounceMap.get(key);
  if (existing) {
    clearTimeout(existing.timer);
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(async () => {
      debounceMap.delete(key);
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, waitMs);

    debounceMap.set(key, { timer, resolve, reject });
  });
};

const debounceMiddleware = (waitMs = 1000) => {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const existing = debounceMap.get(key);

    if (existing) {
      clearTimeout(existing.timer);
      return res.status(429).json({ 
        error: 'Request debounced, please wait',
        retryAfter: waitMs / 1000
      });
    }

    const timer = setTimeout(() => {
      debounceMap.delete(key);
    }, waitMs);

    debounceMap.set(key, { timer });
    next();
  };
};

const healthBasedThrottle = (req, res, next) => {
  if (shouldThrottle()) {
    const health = getSystemHealth();
    
    const delay = Math.min(
      (health.memory.percent - 70) * 100,
      (health.heap.percent - 70) * 100,
      (health.cpu.current - 70) * 50
    );

    if (delay > 0) {
      console.warn(`[Throttle] System under load, adding ${delay}ms delay`);
      
      setTimeout(() => {
        next();
      }, delay);
      
      return;
    }
  }
  
  next();
};

const adaptiveRateLimit = (options = {}) => {
  const {
    baseLimit = 100,
    baseWindowMs = 60 * 1000,
    healthCheckInterval = 10000
  } = options;

  let currentLimit = baseLimit;
  let lastHealthCheck = Date.now();

  return rateLimit({
    windowMs: baseWindowMs,
    max: (req) => {
      if (Date.now() - lastHealthCheck > healthCheckInterval) {
        const health = getSystemHealth();
        lastHealthCheck = Date.now();

        if (health.memory.percent > 80 || health.heap.percent > 80) {
          currentLimit = Math.floor(baseLimit * 0.3);
        } else if (health.memory.percent > 70 || health.heap.percent > 70) {
          currentLimit = Math.floor(baseLimit * 0.5);
        } else if (health.cpu.current > 70) {
          currentLimit = Math.floor(baseLimit * 0.7);
        } else {
          currentLimit = baseLimit;
        }
      }

      return currentLimit;
    },
    message: { error: 'Rate limit adjusted due to server load' },
    standardHeaders: true,
    legacyHeaders: false
  });
};

const cleanupDebounceMap = () => {
  const now = Date.now();
  const maxAge = 30000;

  for (const [key, entry] of debounceMap) {
    if (entry.timer && entry._createdAt && now - entry._createdAt > maxAge) {
      clearTimeout(entry.timer);
      debounceMap.delete(key);
    }
  }
};

setInterval(cleanupDebounceMap, 60000);

module.exports = {
  createAdminRateLimiter,
  createHealthRateLimiter,
  createSearchRateLimiter,
  debounce,
  debounceMiddleware,
  healthBasedThrottle,
  adaptiveRateLimit
};
