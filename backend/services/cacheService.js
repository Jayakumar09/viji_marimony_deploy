const { performance } = require('perf_hooks');

const DEFAULT_TTL_MS = 30000;
const MAX_CACHE_SIZE = 100;

class CacheService {
  constructor() {
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value;
  }

  set(key, value, ttlMs = DEFAULT_TTL_MS) {
    if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now()
    });
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }

  evictLRU() {
    let oldest = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldest = key;
      }
    }

    if (oldest) {
      this.cache.delete(oldest);
      this.evictions++;
    }
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: MAX_CACHE_SIZE,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%',
      evictions: this.evictions
    };
  }

  keys() {
    return Array.from(this.cache.keys());
  }

  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
}

const cache = new CacheService();

setInterval(() => {
  const cleaned = cache.cleanup();
  if (cleaned > 0) {
    console.log(`[Cache] Cleaned ${cleaned} expired entries`);
  }
}, 60000);

const getCached = async (key, fetchFn, ttlMs = DEFAULT_TTL_MS) => {
  const cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }

  const startTime = performance.now();
  const result = await fetchFn();
  const duration = performance.now() - startTime;

  cache.set(key, result, ttlMs);
  
  if (duration > 1000) {
    console.log(`[Cache] Cache miss for "${key}" - fetch took ${duration.toFixed(0)}ms`);
  }

  return result;
};

const invalidateCache = (key) => {
  if (key) {
    return cache.delete(key);
  }
  return cache.clear();
};

const cacheMiddleware = (ttlMs = DEFAULT_TTL_MS) => {
  return (req, res, next) => {
    const cacheKey = `${req.originalUrl}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode === 200) {
        cache.set(cacheKey, data, ttlMs);
      }
      return originalJson(data);
    };

    next();
  };
};

const memoize = (fn, ttlMs = DEFAULT_TTL_MS) => {
  const cache = new Map();
  
  return async (...args) => {
    const key = JSON.stringify(args);
    const entry = cache.get(key);
    
    if (entry && Date.now() < entry.expiresAt) {
      return entry.value;
    }

    const result = await fn(...args);
    cache.set(key, { value: result, expiresAt: Date.now() + ttlMs });
    
    if (cache.size > MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
};

module.exports = {
  CacheService,
  cache,
  getCached,
  invalidateCache,
  cacheMiddleware,
  memoize,
  DEFAULT_TTL_MS,
  MAX_CACHE_SIZE
};
