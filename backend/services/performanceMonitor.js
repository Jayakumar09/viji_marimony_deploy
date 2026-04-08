const os = require('os');

const PERFORMANCE_THRESHOLDS = {
  CPU_WARNING: 60,
  CPU_CRITICAL: 80,
  MEMORY_WARNING: 75,
  MEMORY_CRITICAL: 90,
  RESPONSE_TIME_WARNING: 800,
  RESPONSE_TIME_CRITICAL: 2000,
  HEAP_WARNING: 75,
  HEAP_CRITICAL: 90
};

const RESTART_GRACE_PERIOD_MS = 120000;
const CRITICAL_CHECK_COUNT = 3;

const cache = new Map();
const CACHE_TTL_MS = 15000;

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

class MemoryMonitor {
  constructor() {
    this.peakHeapUsed = 0;
    this.peakMemoryUsed = 0;
    this.restartCount = 0;
    this.lastCheckTime = Date.now();
    this.checkInterval = null;
    this.startTime = Date.now();
    this.criticalCount = 0;
    this.isRestarting = false;
  }

  start() {
    this.checkInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 60000);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  isStartupPhase() {
    return Date.now() - this.startTime < RESTART_GRACE_PERIOD_MS;
  }

  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const heapTotal = memUsage.heapTotal;
    const heapPercent = (heapUsed / heapTotal) * 100;

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = (usedMem / totalMem) * 100;

    if (heapUsed > this.peakHeapUsed) {
      this.peakHeapUsed = heapUsed;
    }
    if (usedMem > this.peakMemoryUsed) {
      this.peakMemoryUsed = usedMem;
    }

    if (this.isStartupPhase()) {
      return {
        heapUsed,
        heapTotal,
        heapPercent,
        memoryUsed: usedMem,
        memoryTotal: totalMem,
        memoryPercent: memPercent,
        peakHeapUsed: this.peakHeapUsed,
        peakMemoryUsed: this.peakMemoryUsed,
        isStartupPhase: true
      };
    }

    const heapCritical = heapPercent >= PERFORMANCE_THRESHOLDS.HEAP_CRITICAL;
    const memCritical = memPercent >= PERFORMANCE_THRESHOLDS.MEMORY_CRITICAL;

    if (heapCritical || memCritical) {
      this.criticalCount++;
      
      if (this.criticalCount >= CRITICAL_CHECK_COUNT && !this.isRestarting) {
        console.error(`[Performance] CRITICAL: Heap ${heapPercent.toFixed(1)}%, Memory ${memPercent.toFixed(1)}% (${this.criticalCount} consecutive checks)`);
        this.triggerRestart();
      }
    } else {
      this.criticalCount = Math.max(0, this.criticalCount - 1);
    }

    return {
      heapUsed,
      heapTotal,
      heapPercent,
      memoryUsed: usedMem,
      memoryTotal: totalMem,
      memoryPercent: memPercent,
      peakHeapUsed: this.peakHeapUsed,
      peakMemoryUsed: this.peakMemoryUsed,
      criticalCount: this.criticalCount,
      isStartupPhase: false
    };
  }

  triggerRestart() {
    if (this.isRestarting) return;
    
    this.isRestarting = true;
    this.restartCount++;
    
    console.error(`[Performance] Triggering graceful restart #${this.restartCount}`);
    
    setTimeout(() => {
      console.log('[Performance] Initiating graceful shutdown for restart');
      this.isRestarting = false;
      process.exit(1);
    }, 5000);
  }

  getStats() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    return {
      current: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        heapPercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        memoryUsed: totalMem - freeMem,
        memoryTotal: totalMem,
        memoryPercent: ((totalMem - freeMem) / totalMem) * 100,
        external: memUsage.external,
        rss: memUsage.rss
      },
      peak: {
        heapUsed: this.peakHeapUsed,
        memoryUsed: this.peakMemoryUsed
      },
      restartCount: this.restartCount,
      uptime: process.uptime(),
      startupPhase: this.isStartupPhase(),
      criticalCount: this.criticalCount
    };
  }
}

class CPUMonitor {
  constructor() {
    this.samples = [];
    this.maxSamples = 30;
  }

  recordSample() {
    const load = os.loadavg();
    const cpuCount = os.cpus().length;
    const cpuUsage = (load[0] / cpuCount) * 100;

    if (this.samples.length >= this.maxSamples) {
      this.samples.shift();
    }
    
    this.samples.push(cpuUsage);
    return cpuUsage;
  }

  getStats() {
    if (this.samples.length === 0) {
      return { current: 0, average: 0, peak: 0 };
    }

    const usages = this.samples;
    const current = usages[usages.length - 1];
    const average = usages.reduce((a, b) => a + b, 0) / usages.length;
    const peak = Math.max(...usages);

    return {
      current: parseFloat(current.toFixed(2)),
      average: parseFloat(average.toFixed(2)),
      peak: parseFloat(peak.toFixed(2)),
      loadAvg: os.loadavg().map(l => parseFloat(l.toFixed(2))),
      cpuCount: os.cpus().length
    };
  }
}

const memoryMonitor = new MemoryMonitor();
const cpuMonitor = new CPUMonitor();

const getSystemHealth = () => {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = (usedMem / totalMem) * 100;
  const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  const cpuUsage = cpuMonitor.recordSample();

  return {
    memory: {
      used: usedMem,
      total: totalMem,
      percent: parseFloat(memPercent.toFixed(2)),
      status: memPercent >= PERFORMANCE_THRESHOLDS.MEMORY_CRITICAL ? 'critical' 
            : memPercent >= PERFORMANCE_THRESHOLDS.MEMORY_WARNING ? 'warning' : 'healthy'
    },
    heap: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percent: parseFloat(heapPercent.toFixed(2)),
      status: heapPercent >= PERFORMANCE_THRESHOLDS.HEAP_CRITICAL ? 'critical'
            : heapPercent >= PERFORMANCE_THRESHOLDS.HEAP_WARNING ? 'warning' : 'healthy'
    },
    cpu: {
      ...cpuMonitor.getStats(),
      status: cpuUsage >= PERFORMANCE_THRESHOLDS.CPU_CRITICAL ? 'critical'
            : cpuUsage >= PERFORMANCE_THRESHOLDS.CPU_WARNING ? 'warning' : 'healthy'
    }
  };
};

const shouldThrottle = () => {
  if (memoryMonitor.isStartupPhase()) return false;
  
  const health = getSystemHealth();
  return health.memory.percent >= PERFORMANCE_THRESHOLDS.MEMORY_WARNING + 10 ||
         health.heap.percent >= PERFORMANCE_THRESHOLDS.HEAP_WARNING + 10 ||
         health.cpu.current >= PERFORMANCE_THRESHOLDS.CPU_WARNING + 10;
};

const createPerformanceMiddleware = () => {
  return (req, res, next) => {
    const startTime = Date.now();
    const startCpu = process.cpuUsage();

    res.on('finish', () => {
      if (memoryMonitor.isStartupPhase()) return;
      
      const duration = Date.now() - startTime;
      
      if (duration > PERFORMANCE_THRESHOLDS.RESPONSE_TIME_CRITICAL) {
        console.warn(`[Performance] Slow request: ${req.method} ${req.path} took ${duration}ms`);
      }
    });

    next();
  };
};

const logPerformance = (label, fn) => {
  return async (...args) => {
    const startTime = Date.now();
    const startMem = process.memoryUsage().heapUsed;
    
    try {
      const result = await fn(...args);
      
      const duration = Date.now() - startTime;
      const memDelta = process.memoryUsage().heapUsed - startMem;
      
      if (duration > PERFORMANCE_THRESHOLDS.RESPONSE_TIME_CRITICAL) {
        console.warn(`[Performance] SLOW: ${label} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Performance] ERROR in ${label}: ${error.message} (${duration}ms)`);
      throw error;
    }
  };
};

memoryMonitor.start();

if (global.gc) {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (heapPercent > 80) {
      console.log('[GC] Running garbage collection...');
      global.gc();
    }
  }, 120000);
}

process.on('SIGTERM', () => {
  memoryMonitor.stop();
});

process.on('exit', () => {
  memoryMonitor.stop();
});

module.exports = {
  PERFORMANCE_THRESHOLDS,
  MemoryMonitor,
  CPUMonitor,
  memoryMonitor,
  cpuMonitor,
  getSystemHealth,
  shouldThrottle,
  createPerformanceMiddleware,
  logPerformance,
  formatBytes
};
