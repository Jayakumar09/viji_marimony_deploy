const cron = require('node-cron');
const backupController = require('../controllers/backupController');
const { logSystemActivity } = require('../modules/ActivityLogs/ActivityLogs');

let scheduledTask = null;

const isProduction = process.env.NODE_ENV === 'production';
const isRender = process.env.RENDER === 'true';

const getScheduleTime = () => {
  const hour = process.env.BACKUP_CRON_HOUR || '2';
  const minute = process.env.BACKUP_CRON_MINUTE || '0';
  return `${minute} ${hour} * * *`;
};

const runDailyBackup = async () => {
  console.log('[Cron] Starting daily backup job...');
  const startTime = Date.now();

  try {
    const result = await backupController.createBackup('system');
    
    console.log(`[Cron] Daily backup completed successfully: ${result.fileName}`);
    console.log(`[Cron] Duration: ${result.duration}s, Size: ${result.size} bytes`);
    
    return result;
  } catch (error) {
    console.error('[Cron] Daily backup failed:', error.message);
    
    await logSystemActivity({
      action: 'SCHEDULED_BACKUP_FAILED',
      description: `Scheduled daily backup failed`,
      status: 'Error',
      error_message: error.message,
      metadata: {
        error: error.message,
        duration: ((Date.now() - startTime) / 1000).toFixed(2)
      }
    });
    
    throw error;
  }
};

const startScheduler = () => {
  if (scheduledTask) {
    console.log('[Cron] Backup scheduler already running');
    return;
  }

  const schedule = getScheduleTime();
  
  console.log(`[Cron] Scheduling daily backup at: ${schedule}`);
  console.log(`[Cron] Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`[Cron] Render: ${isRender ? 'yes' : 'no'}`);

  if (isProduction || isRender) {
    scheduledTask = cron.schedule(schedule, async () => {
      console.log('[Cron] Triggered: Daily backup');
      try {
        await runDailyBackup();
      } catch (error) {
        console.error('[Cron] Job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    console.log('[Cron] Daily backup scheduler started');
  } else {
    console.log('[Cron] Backup scheduler disabled in development mode');
    console.log('[Cron] Set NODE_ENV=production to enable scheduled backups');
  }
};

const stopScheduler = () => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Cron] Backup scheduler stopped');
  }
};

const getSchedulerStatus = () => {
  return {
    running: scheduledTask !== null,
    schedule: getScheduleTime(),
    timezone: 'Asia/Kolkata',
    environment: isProduction ? 'production' : 'development'
  };
};

const runManualCron = async () => {
  console.log('[Cron] Running manual cron job...');
  return await runDailyBackup();
};

module.exports = {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  runDailyBackup,
  runManualCron
};
