const cron = require('node-cron');
const { performance } = require('perf_hooks');

const JOB_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

class BackgroundJobQueue {
  constructor() {
    this.jobs = new Map();
    this.runningJobs = new Map();
    this.jobHistory = [];
    this.maxHistory = 100;
  }

  register(name, fn, options = {}) {
    const {
      concurrency = 1,
      retryAttempts = 0,
      retryDelay = 5000
    } = options;

    this.jobs.set(name, {
      name,
      fn,
      concurrency,
      retryAttempts,
      retryDelay,
      status: JOB_STATUS.IDLE,
      lastRun: null,
      lastDuration: null,
      lastStatus: null,
      runCount: 0,
      errorCount: 0
    });

    console.log(`[JobQueue] Registered job: ${name}`);
  }

  async run(name, ...args) {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Job ${name} not found`);
    }

    const startTime = performance.now();
    const jobId = `${name}_${Date.now()}`;
    this.runningJobs.set(jobId, { name, startTime, args });

    try {
      console.log(`[JobQueue] Starting job: ${name}`);
      const result = await job.fn(...args);
      const duration = performance.now() - startTime;

      job.lastRun = new Date();
      job.lastDuration = duration;
      job.lastStatus = JOB_STATUS.COMPLETED;
      job.runCount++;

      this.runningJobs.delete(jobId);
      this.addToHistory(name, JOB_STATUS.COMPLETED, duration, result);

      console.log(`[JobQueue] Completed job: ${name} (${duration.toFixed(0)}ms)`);
      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      job.lastStatus = JOB_STATUS.FAILED;
      job.errorCount++;

      this.runningJobs.delete(jobId);
      this.addToHistory(name, JOB_STATUS.FAILED, duration, null, error);

      console.error(`[JobQueue] Failed job: ${name} - ${error.message}`);

      if (job.retryAttempts > 0) {
        this.scheduleRetry(name, args, job.retryAttempts, job.retryDelay);
      }

      throw error;
    }
  }

  scheduleRetry(name, args, attemptsRemaining, delay) {
    setTimeout(async () => {
      try {
        console.log(`[JobQueue] Retrying job: ${name} (${attemptsRemaining} attempts left)`);
        await this.run(name, ...args);
      } catch (error) {
        // Retry handled by next iteration
      }
    }, delay);
  }

  addToHistory(name, status, duration, result, error = null) {
    this.jobHistory.push({
      name,
      status,
      duration: duration.toFixed(0),
      timestamp: new Date().toISOString(),
      result: status === JOB_STATUS.COMPLETED ? 'success' : undefined,
      error: error ? error.message : undefined
    });

    if (this.jobHistory.length > this.maxHistory) {
      this.jobHistory.shift();
    }
  }

  getStats() {
    const stats = {
      totalJobs: this.jobs.size,
      runningJobs: this.runningJobs.size,
      jobs: []
    };

    for (const [name, job] of this.jobs) {
      stats.jobs.push({
        name,
        status: job.status,
        lastRun: job.lastRun,
        lastDuration: job.lastDuration ? `${job.lastDuration.toFixed(0)}ms` : null,
        lastStatus: job.lastStatus,
        runCount: job.runCount,
        errorCount: job.errorCount
      });
    }

    return stats;
  }

  getHistory(limit = 50) {
    return this.jobHistory.slice(-limit);
  }

  isRunning(name) {
    return this.runningJobs.has(`${name}_${Date.now()}`) ||
           Array.from(this.runningJobs.values()).some(j => j.name === name);
  }
}

const jobQueue = new BackgroundJobQueue();

const createScheduledJob = (name, schedule, fn, options = {}) => {
  const {
    enabled = true,
    runOnStartup = false
  } = options;

  if (!cron.validate(schedule)) {
    throw new Error(`Invalid cron expression: ${schedule}`);
  }

  jobQueue.register(name, fn, options);

  if (!enabled) {
    console.log(`[ScheduledJob] ${name} is disabled`);
    return null;
  }

  const task = cron.schedule(schedule, async () => {
    try {
      await jobQueue.run(name);
    } catch (error) {
      console.error(`[ScheduledJob] ${name} failed:`, error.message);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  console.log(`[ScheduledJob] ${name} scheduled: ${schedule}`);

  if (runOnStartup) {
    console.log(`[ScheduledJob] Running ${name} on startup...`);
    setTimeout(() => jobQueue.run(name), 5000);
  }

  return {
    name,
    task,
    schedule,
    run: () => jobQueue.run(name),
    stop: () => task.stop(),
    start: () => task.start(),
    getStats: () => jobQueue.getStats().jobs.find(j => j.name === name)
  };
};

const defer = (fn, delayMs = 100) => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, delayMs);
  });
};

const processInChunks = async (items, chunkSize, processFn, options = {}) => {
  const { onProgress, continueOnError = true } = options;
  const results = [];
  const errors = [];
  const totalChunks = Math.ceil(items.length / chunkSize);

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkIndex = Math.floor(i / chunkSize);

    try {
      const chunkResults = await Promise.all(
        chunk.map(item => processFn(item))
      );
      results.push(...chunkResults);

      if (onProgress) {
        onProgress({
          progress: ((chunkIndex + 1) / totalChunks * 100).toFixed(0),
          processed: Math.min(i + chunkSize, items.length),
          total: items.length,
          chunk: chunkIndex + 1,
          totalChunks
        });
      }
    } catch (error) {
      if (continueOnError) {
        errors.push({ chunk: chunkIndex, error: error.message });
      } else {
        throw error;
      }
    }
  }

  return { results, errors, processed: results.length };
};

module.exports = {
  BackgroundJobQueue,
  jobQueue,
  createScheduledJob,
  defer,
  processInChunks,
  JOB_STATUS
};
