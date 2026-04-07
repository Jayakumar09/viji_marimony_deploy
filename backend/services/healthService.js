const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const os = require('os');

const ALERT_THRESHOLDS = {
  WARNING: 70,
  ERROR: 85,
  CRITICAL: 95
};

const POSTGRES_LIMITS = {
  maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 100,
  storageLimitGB: parseFloat(process.env.POSTGRES_STORAGE_GB_LIMIT) || 100,
};

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatBytesGB = (bytes) => {
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

const formatBytesMB = (bytes) => {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const getUsageSeverity = (percentage) => {
  if (percentage < ALERT_THRESHOLDS.WARNING) return 'info';
  if (percentage < ALERT_THRESHOLDS.ERROR) return 'warning';
  if (percentage < ALERT_THRESHOLDS.CRITICAL) return 'error';
  return 'critical';
};

const shouldCreateAlert = async (service, metricName, value, threshold, severity, customMessage = null) => {
  try {
    const existingAlert = await prisma.systemAlert.findFirst({
      where: {
        service,
        metricName,
        isRead: false,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!existingAlert) {
      const metricValue = typeof value === 'number' ? value.toFixed(1) : value;
      await prisma.systemAlert.create({
        data: {
          service,
          alertType: 'usage_warning',
          severity,
          title: customMessage || `${service.toUpperCase()} ${metricName.replace(/_/g, ' ')} Alert`,
          message: customMessage || `${metricName.replace(/_/g, ' ')} is at ${metricValue}%, threshold: ${threshold}%`,
          metricName,
          metricValue: String(value),
          threshold: String(threshold),
        }
      });
    }
  } catch (error) {
    console.error(`[Health] Failed to create alert for ${service}:${metricName}`, error.message);
  }
};

const checkBackupFailureAlert = async (errorMessage = null) => {
  try {
    const recentFailures = await prisma.systemAlert.findFirst({
      where: {
        service: 'backup',
        metricName: 'backup_failure',
        isRead: false,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!recentFailures) {
      await prisma.systemAlert.create({
        data: {
          service: 'backup',
          alertType: 'error',
          severity: 'critical',
          title: 'Backup Failed',
          message: errorMessage || 'Scheduled database backup failed. Please check backup configuration.',
          metricName: 'backup_failure',
          metricValue: '1',
          threshold: '0',
        }
      });
    }
  } catch (error) {
    console.error('[Health] Failed to create backup failure alert:', error.message);
  }
};

const checkNoBackupAlert = async () => {
  try {
    const lastSuccessfulBackup = await prisma.backupLog.findFirst({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' }
    });

    if (!lastSuccessfulBackup) {
      const existingAlert = await prisma.systemAlert.findFirst({
        where: {
          service: 'backup',
          metricName: 'no_backup',
          isRead: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      if (!existingAlert) {
        await prisma.systemAlert.create({
          data: {
            service: 'backup',
            alertType: 'error',
            severity: 'critical',
            title: 'No Backup Found',
            message: 'No successful backup found in the system. Please verify backup is working.',
            metricName: 'no_backup',
            metricValue: '0',
            threshold: '1',
          }
        });
      }
      return;
    }

    const hoursSinceBackup = (Date.now() - new Date(lastSuccessfulBackup.completedAt).getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceBackup > 24) {
      const existingAlert = await prisma.systemAlert.findFirst({
        where: {
          service: 'backup',
          metricName: 'backup_stale',
          isRead: false,
          createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) }
        }
      });

      if (!existingAlert) {
        await prisma.systemAlert.create({
          data: {
            service: 'backup',
            alertType: 'warning',
            severity: hoursSinceBackup > 48 ? 'error' : 'warning',
            title: 'Backup Overdue',
            message: `Last successful backup was ${Math.floor(hoursSinceBackup)} hours ago. Expected daily backup.`,
            metricName: 'backup_stale',
            metricValue: hoursSinceBackup.toFixed(1),
            threshold: '24',
          }
        });
      }
    }
  } catch (error) {
    console.error('[Health] Failed to check backup alert:', error.message);
  }
};

const checkPostgresHealth = async () => {
  let connection = null;
  try {
    connection = await prisma.$connect();
    
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const connectionTime = Date.now() - startTime;

    const connectionResult = await prisma.$queryRaw`
      SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
    `;
    const activeConnections = parseInt(connectionResult[0]?.count || 0);

    const tableCountResult = await prisma.$queryRaw`
      SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'
    `;
    const tableCount = parseInt(tableCountResult[0]?.count || 0);

    const dbSizeResult = await prisma.$queryRaw`
      SELECT pg_database_size(current_database()) as size
    `;
    const dbSizeBytes = parseInt(dbSizeResult[0]?.size || 0);
    const dbSizeGB = dbSizeBytes / (1024 * 1024 * 1024);
    const dbSizeMB = dbSizeBytes / (1024 * 1024);
    const dbUsagePercent = Math.min((dbSizeGB / POSTGRES_LIMITS.storageLimitGB) * 100, 100);
    const connectionUsagePercent = (activeConnections / POSTGRES_LIMITS.maxConnections) * 100;

    const lastBackupResult = await prisma.backupLog.findFirst({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' }
    });

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    
    const weekAgoSizeResult = await prisma.$queryRaw`
      SELECT pg_database_size(current_database()) as size
    `;
    
    const recentBackups = await prisma.backupLog.findMany({
      where: { 
        status: 'completed',
        completedAt: { gte: weekAgo }
      },
      orderBy: { completedAt: 'desc' }
    });

    let growthTrend = null;
    if (recentBackups.length >= 2) {
      const oldestWithSize = recentBackups[recentBackups.length - 1];
      const latestWithSize = recentBackups[0];
      if (oldestWithSize?.fileSize && latestWithSize?.fileSize) {
        const sizeDiff = Number(latestWithSize.fileSize) - Number(oldestWithSize.fileSize);
        const daysDiff = (new Date(latestWithSize.completedAt) - new Date(oldestWithSize.completedAt)) / (1000 * 60 * 60 * 24);
        const dailyGrowth = daysDiff > 0 ? sizeDiff / daysDiff : 0;
        growthTrend = {
          dailyGrowthBytes: dailyGrowth,
          dailyGrowthFormatted: formatBytesMB(dailyGrowth),
          weeklyGrowthBytes: sizeDiff,
          weeklyGrowthFormatted: formatBytesMB(sizeDiff),
          direction: dailyGrowth > 0 ? 'increasing' : 'decreasing'
        };
      }
    }

    const severity = getUsageSeverity(dbUsagePercent);
    if (dbUsagePercent >= ALERT_THRESHOLDS.WARNING) {
      await shouldCreateAlert('postgresql', 'storage_usage', dbUsagePercent, ALERT_THRESHOLDS.WARNING, severity);
    }
    if (connectionUsagePercent >= ALERT_THRESHOLDS.WARNING) {
      await shouldCreateAlert('postgresql', 'connections', connectionUsagePercent, ALERT_THRESHOLDS.WARNING, 'warning');
    }

    return {
      status: 'healthy',
      connected: true,
      connectionHealth: connectionTime < 500 ? 'excellent' : connectionTime < 1000 ? 'good' : 'slow',
      connectionTimeMs: connectionTime,
      activeConnections,
      maxConnections: POSTGRES_LIMITS.maxConnections,
      connectionUsagePercent: parseFloat(connectionUsagePercent.toFixed(2)),
      currentSizeBytes: dbSizeBytes,
      currentSizeMB: parseFloat(dbSizeMB.toFixed(2)),
      currentSizeGB: parseFloat(dbSizeGB.toFixed(2)),
      storageLimitGB: POSTGRES_LIMITS.storageLimitGB,
      storageUsagePercent: parseFloat(dbUsagePercent.toFixed(2)),
      tableCount,
      indexCount: 0,
      lastBackup: lastBackupResult ? {
        fileName: lastBackupResult.fileName,
        fileSize: lastBackupResult.fileSize ? Number(lastBackupResult.fileSize) : null,
        fileSizeFormatted: lastBackupResult.fileSize ? formatBytesMB(Number(lastBackupResult.fileSize)) : null,
        completedAt: lastBackupResult.completedAt,
        status: lastBackupResult.status,
        triggeredBy: lastBackupResult.triggeredBy
      } : null,
      growthTrend,
      backupCount7Days: recentBackups.length
    };
  } catch (error) {
    console.error('[Health] PostgreSQL check failed:', error.message);
    return {
      status: 'unhealthy',
      connected: false,
      connectionHealth: 'disconnected',
      connectionTimeMs: 0,
      error: error.message,
      activeConnections: 0,
      maxConnections: POSTGRES_LIMITS.maxConnections,
      connectionUsagePercent: 0,
      currentSizeBytes: 0,
      currentSizeMB: 0,
      currentSizeGB: 0,
      storageLimitGB: POSTGRES_LIMITS.storageLimitGB,
      storageUsagePercent: 0,
      tableCount: 0,
      indexCount: 0,
      lastBackup: null,
      growthTrend: null,
      backupCount7Days: 0
    };
  } finally {
    if (connection) {
      try {
        await prisma.$disconnect();
      } catch (e) {}
    }
  }
};

const checkCloudinaryHealth = async () => {
  try {
    const cloudinary = require('cloudinary').v2;
    
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET.includes('your_')) {
      return {
        status: 'not_configured',
        message: 'Cloudinary not configured or using placeholder credentials',
        connected: false,
        storageUsed: 0,
        storageLimit: 0,
        storagePercent: 0,
        bandwidthUsed: 0,
        bandwidthLimit: 0,
        bandwidthPercent: 0,
        assetCount: 0,
        transformationCount: 0,
        plan: 'unknown'
      };
    }

    const result = await cloudinary.api.usage();

    const storageBytes = result.storage?.used || 0;
    const storageLimit = result.plan?.name === 'Enterprise' ? result.storage?.limit : 25 * 1024 * 1024 * 1024;
    const storagePercent = storageLimit > 0 ? (storageBytes / storageLimit) * 100 : 0;

    const bandwidthBytes = result.bandwidth?.used || 0;
    const bandwidthLimit = result.plan?.name === 'Enterprise' ? result.bandwidth?.limit : 50 * 1024 * 1024 * 1024;
    const bandwidthPercent = bandwidthLimit > 0 ? (bandwidthBytes / bandwidthLimit) * 100 : 0;

    const assetCount = result.resources?.count || 0;
    const transformationCount = result.transformations?.count || 0;

    const storageSeverity = getUsageSeverity(storagePercent);
    const bandwidthSeverity = getUsageSeverity(bandwidthPercent);

    if (storagePercent >= ALERT_THRESHOLDS.WARNING) {
      await shouldCreateAlert('cloudinary', 'storage', storagePercent, ALERT_THRESHOLDS.WARNING, storageSeverity);
    }
    if (bandwidthPercent >= ALERT_THRESHOLDS.WARNING) {
      await shouldCreateAlert('cloudinary', 'bandwidth', bandwidthPercent, ALERT_THRESHOLDS.WARNING, bandwidthSeverity);
    }

    return {
      status: 'healthy',
      connected: true,
      storageUsed: storageBytes,
      storageLimit,
      storagePercent: parseFloat(storagePercent.toFixed(2)),
      storageUsedFormatted: formatBytes(storageBytes),
      storageLimitFormatted: formatBytesGB(storageLimit),
      bandwidthUsed: bandwidthBytes,
      bandwidthLimit,
      bandwidthPercent: parseFloat(bandwidthPercent.toFixed(2)),
      bandwidthUsedFormatted: formatBytes(bandwidthBytes),
      bandwidthLimitFormatted: formatBytesGB(bandwidthLimit),
      assetCount,
      transformationCount,
      plan: result.plan?.name || 'unknown'
    };
  } catch (error) {
    console.error('[Health] Cloudinary check failed:', error.message);
    return {
      status: 'error',
      connected: false,
      error: error.message,
      storageUsed: 0,
      storageLimit: 0,
      storagePercent: 0,
      bandwidthUsed: 0,
      bandwidthLimit: 0,
      bandwidthPercent: 0,
      assetCount: 0,
      transformationCount: 0,
      plan: 'unknown'
    };
  }
};

const checkGoogleDriveHealth = async () => {
  try {
    let googleDriveConnected = false;
    let totalBackups = 0;
    let lastBackup = null;
    let recentBackups = [];

    try {
      const googleDriveService = require('./googleDriveService');
      googleDriveConnected = googleDriveService.isInitialized;
      
      if (googleDriveConnected) {
        const files = await googleDriveService.listFiles();
        totalBackups = files.length;
        
        if (files.length > 0) {
          lastBackup = {
            fileName: files[0].name,
            fileSize: files[0].size,
            fileSizeFormatted: formatBytes(files[0].size),
            completedAt: files[0].createdTime,
            googleDriveId: files[0].id
          };
        }

        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        recentBackups = files.filter(f => new Date(f.createdTime) >= oneWeekAgo);
      }
    } catch (gdError) {
      console.error('[Health] Google Drive service error:', gdError.message);
    }

    const backupLogs = await prisma.backupLog.findMany({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' },
      take: 10
    });

    const lastBackupLog = backupLogs[0];
    const hasRecentBackup = lastBackupLog && 
      (Date.now() - new Date(lastBackupLog.completedAt).getTime()) < 25 * 60 * 60 * 1000;

    let nextScheduledRun = null;
    const hour = process.env.BACKUP_CRON_HOUR || '2';
    const minute = process.env.BACKUP_CRON_MINUTE || '0';
    const now = new Date();
    nextScheduledRun = new Date();
    nextScheduledRun.setHours(parseInt(hour), parseInt(minute), 0, 0);
    if (nextScheduledRun <= now) {
      nextScheduledRun.setDate(nextScheduledRun.getDate() + 1);
    }

    await checkNoBackupAlert();

    if (!hasRecentBackup && lastBackupLog) {
      const hoursSince = (Date.now() - new Date(lastBackupLog.completedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSince > 24) {
        await checkNoBackupAlert();
      }
    }

    return {
      status: totalBackups > 0 ? 'healthy' : 'no_backups',
      connected: googleDriveConnected,
      googleDriveConfigured: googleDriveConnected,
      totalBackups,
      lastBackup: lastBackup || (lastBackupLog ? {
        fileName: lastBackupLog.fileName,
        fileSize: lastBackupLog.fileSize ? Number(lastBackupLog.fileSize) : null,
        fileSizeFormatted: lastBackupLog.fileSize ? formatBytesMB(Number(lastBackupLog.fileSize)) : null,
        completedAt: lastBackupLog.completedAt,
        triggeredBy: lastBackupLog.triggeredBy
      } : null),
      nextScheduledRun: nextScheduledRun.toISOString(),
      recentBackupCount: recentBackups.length,
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
      backupLogsCount: backupLogs.length
    };
  } catch (error) {
    console.error('[Health] Google Drive check failed:', error.message);
    await checkBackupFailureAlert(error.message);
    return {
      status: 'error',
      connected: false,
      error: error.message,
      totalBackups: 0,
      lastBackup: null,
      nextScheduledRun: null,
      recentBackupCount: 0
    };
  }
};

const checkCronJobHealth = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isRender = process.env.RENDER === 'true';
  
  const hour = process.env.BACKUP_CRON_HOUR || '2';
  const minute = process.env.BACKUP_CRON_MINUTE || '0';
  const cronExpression = `${minute} ${hour} * * *`;
  
  let lastRun = null;
  let lastRunStatus = null;
  
  try {
    const lastBackupJob = await prisma.backupLog.findFirst({
      where: { triggeredBy: 'scheduled' },
      orderBy: { completedAt: 'desc' }
    });
    
    if (lastBackupJob) {
      lastRun = lastBackupJob.completedAt;
      lastRunStatus = lastBackupJob.status === 'completed' ? 'success' : 'failed';
    }
  } catch (e) {}

  let nextRun = new Date();
  nextRun.setHours(parseInt(hour), parseInt(minute), 0, 0);
  if (nextRun <= new Date()) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return {
    status: isProduction || isRender ? 'scheduled' : 'disabled',
    schedule: cronExpression,
    timezone: 'Asia/Kolkata',
    hour: parseInt(hour),
    minute: parseInt(minute),
    lastRun,
    lastRunStatus,
    nextRun: nextRun.toISOString(),
    enabled: isProduction || isRender,
    environment: isProduction ? 'production' : 'development'
  };
};

const checkRenderHealth = async () => {
  try {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const heapTotal = memUsage.heapTotal;
    const rss = memUsage.rss;
    
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;
    const heapUsagePercent = (heapUsed / heapTotal) * 100;

    const cpuLoad = os.loadavg();
    const cpuUsage = cpuLoad[0] * 100 / os.cpus().length;

    const serverUptimeSeconds = process.uptime();
    
    let apiHealth = 'healthy';
    let errorRate = 0;
    let dbConnectionOk = false;

    try {
      const startTime = Date.now();
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      dbConnectionOk = true;
      const responseTime = Date.now() - startTime;
      apiHealth = responseTime < 500 ? 'healthy' : responseTime < 2000 ? 'degraded' : 'unhealthy';
    } catch (e) {
      apiHealth = 'unhealthy';
      errorRate = 100;
    }

    const isRender = process.env.RENDER === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    if (memUsagePercent >= ALERT_THRESHOLDS.WARNING) {
      await shouldCreateAlert('render', 'memory', memUsagePercent, ALERT_THRESHOLDS.WARNING, getUsageSeverity(memUsagePercent));
    }
    if (cpuUsage >= ALERT_THRESHOLDS.WARNING) {
      await shouldCreateAlert('render', 'cpu', cpuUsage, ALERT_THRESHOLDS.WARNING, getUsageSeverity(cpuUsage));
    }
    if (heapUsagePercent >= ALERT_THRESHOLDS.WARNING) {
      await shouldCreateAlert('render', 'heap', heapUsagePercent, ALERT_THRESHOLDS.WARNING, getUsageSeverity(heapUsagePercent));
    }

    return {
      status: apiHealth === 'healthy' ? 'healthy' : apiHealth === 'degraded' ? 'degraded' : 'error',
      connected: true,
      memoryUsed: usedMem,
      memoryTotal: totalMem,
      memoryUsagePercent: parseFloat(memUsagePercent.toFixed(2)),
      memoryUsedFormatted: formatBytes(usedMem),
      memoryTotalFormatted: formatBytesGB(totalMem),
      heapUsed,
      heapTotal,
      heapUsagePercent: parseFloat(heapUsagePercent.toFixed(2)),
      heapUsedFormatted: formatBytesMB(heapUsed),
      cpuUsage: parseFloat(cpuUsage.toFixed(2)),
      cpuCores: os.cpus().length,
      cpuLoad: cpuLoad.map(l => parseFloat(l.toFixed(2))),
      uptime: serverUptimeSeconds,
      uptimeFormatted: formatUptime(serverUptimeSeconds),
      apiHealth,
      dbConnectionOk,
      errorRate,
      environment: isProduction ? 'production' : 'development',
      platform: isRender ? 'render' : 'local',
      nodeVersion: process.version,
      pid: process.pid
    };
  } catch (error) {
    console.error('[Health] Render check failed:', error.message);
    return {
      status: 'error',
      connected: false,
      error: error.message,
      memoryUsagePercent: 0,
      cpuUsage: 0,
      uptime: 0,
      uptimeFormatted: '0s',
      apiHealth: 'unknown',
      dbConnectionOk: false,
      errorRate: 100
    };
  }
};

const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getAllHealthMetrics = async () => {
  const [postgres, cloudinary, googleDrive, render, cron] = await Promise.all([
    checkPostgresHealth(),
    checkCloudinaryHealth(),
    checkGoogleDriveHealth(),
    checkRenderHealth(),
    checkCronJobHealth()
  ]);

  return {
    postgresql: postgres,
    cloudinary,
    googleDrive,
    render,
    cron,
    timestamp: new Date().toISOString()
  };
};

const getRecentAlerts = async (limit = 50) => {
  try {
    const alerts = await prisma.systemAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return alerts;
  } catch (error) {
    console.error('[Health] Failed to get recent alerts:', error.message);
    return [];
  }
};

const markAlertRead = async (alertId, adminId) => {
  try {
    await prisma.systemAlert.update({
      where: { id: alertId },
      data: {
        isRead: true,
        readAt: new Date(),
        readBy: adminId
      }
    });
    return { success: true };
  } catch (error) {
    console.error('[Health] Failed to mark alert read:', error.message);
    return { success: false, error: error.message };
  }
};

const markAllAlertsRead = async (adminId) => {
  try {
    await prisma.systemAlert.updateMany({
      where: { isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
        readBy: adminId
      }
    });
    return { success: true };
  } catch (error) {
    console.error('[Health] Failed to mark all alerts read:', error.message);
    return { success: false, error: error.message };
  }
};

const clearOldAlerts = async (daysOld = 30) => {
  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await prisma.systemAlert.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: cutoffDate }
      }
    });
    return { success: true, deletedCount: result.count };
  } catch (error) {
    console.error('[Health] Failed to clear old alerts:', error.message);
    return { success: false, error: error.message };
  }
};

const getUnreadAlertCount = async () => {
  try {
    const count = await prisma.systemAlert.count({
      where: { isRead: false }
    });
    return count;
  } catch (error) {
    console.error('[Health] Failed to get unread count:', error.message);
    return 0;
  }
};

const triggerBackupCheck = async () => {
  await checkNoBackupAlert();
  const metrics = await getAllHealthMetrics();
  return metrics;
};

module.exports = {
  checkPostgresHealth,
  checkCloudinaryHealth,
  checkGoogleDriveHealth,
  checkRenderHealth,
  checkCronJobHealth,
  getAllHealthMetrics,
  getRecentAlerts,
  markAlertRead,
  markAllAlertsRead,
  clearOldAlerts,
  getUnreadAlertCount,
  triggerBackupCheck,
  getUsageSeverity,
  formatUptime,
  formatBytes,
  ALERT_THRESHOLDS
};
