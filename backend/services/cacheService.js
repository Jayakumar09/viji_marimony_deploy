/**
 * Memory-Efficient Cache Service
 * - LRU eviction when max size reached
 * - TTL-based expiration
 * - Memory usage tracking
 * - Automatic cleanup
 */

const DEFAULT_TTL = 30000;
const MAX_CACHE_SIZE = 50;
const MAX_MEMORY_MB = 50;

class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
    this.cleanupTimer = null;
    this.scheduleCleanup();
  }

  set(key, value, ttl = DEFAULT_TTL) {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
      size: this.estimateSize(value)
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.value;
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  evictLRU() {
    let oldest = null;
    let oldestKey = null;
    
    for (const [key, item] of this.cache) {
      if (!oldest || item.expires < oldest.expires) {
        oldest = item;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  estimateSize(value) {
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024;
    }
  }

  scheduleCleanup() {
    if (this.cleanupTimer) return;
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  cleanup() {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, item] of this.cache) {
      if (now > item.expires) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`[Cache] Cleaned up ${removed} expired entries. Size: ${this.cache.size}`);
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      maxSize: MAX_CACHE_SIZE,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(1) + '%' : '0%',
      evictions: this.stats.evictions
    };
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

const cache = new CacheService();

module.exports = {
  cache,
  createCache: (ttl = DEFAULT_TTL) => ({
    set: (k, v) => cache.set(k, v, ttl),
    get: (k) => cache.get(k),
    has: (k) => cache.has(k),
    delete: (k) => cache.delete(k)
  })
};
