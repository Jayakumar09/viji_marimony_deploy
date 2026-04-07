const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const os = require('os');

const CLOUDINARY_QUOTA_LIMITS = {
  storage: 25 * 1024 * 1024 * 1024,
  bandwidth: 50 * 1024 * 1024 * 1024,
};

const POSTGRES_LIMITS = {
  maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 100,
  storageEstimateGB: parseInt(process.env.POSTGRES_STORAGE_GB_LIMIT) || 100,
};

const getUsageColor = (percentage) => {
  if (percentage < 70) return 'success';
  if (percentage < 85) return 'warning';
  if (percentage < 95) return 'error';
  return 'critical';
};

const shouldCreateAlert = async (service, metricName, value, threshold, severity) => {
  try {
    const existingAlert = await prisma.systemAlert.findFirst({
      where: {
        service,
        metricName,
        isRead: false,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!existingAlert) {
      await prisma.systemAlert.create({
        data: {
          service,
          alertType: 'usage_warning',
          severity,
          title: `${service.toUpperCase()} ${metricName.replace(/_/g, ' ')} Warning`,
          message: `${metricName.replace(/_/g, ' ')} is at ${value}%, threshold: ${threshold}%`,
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

const checkPostgresHealth = async () => {
  try {
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
    const dbUsagePercent = Math.min((dbSizeGB / POSTGRES_LIMITS.storageEstimateGB) * 100, 100);
    const connectionUsagePercent = (activeConnections / POSTGRES_LIMITS.maxConnections) * 100;

    const lastBackupResult = await prisma.backupLog.findFirst({
      where: { status: 'completed', backupType: 'full' },
      orderBy: { completedAt: 'desc' }
    });

    const alertSeverity = getUsageColor(dbUsagePercent);
    if (dbUsagePercent >= 70) {
      await shouldCreateAlert('postgresql', 'storage_usage', dbUsagePercent.toFixed(1), 70, alertSeverity);
    }
    if (connectionUsagePercent >= 70) {
      await shouldCreateAlert('postgresql', 'connections', connectionUsagePercent.toFixed(1), 70, 'warning');
    }

    return {
      status: 'healthy',
      connectionHealth: connectionTime < 1000 ? 'good' : 'slow',
      connectionTime,
      activeConnections,
      maxConnections: POSTGRES_LIMITS.maxConnections,
      connectionUsagePercent: parseFloat(connectionUsagePercent.toFixed(1)),
      currentSizeGB: parseFloat(dbSizeGB.toFixed(2)),
      estimatedLimitGB: POSTGRES_LIMITS.storageEstimateGB,
      storageUsagePercent: parseFloat(dbUsagePercent.toFixed(1)),
      tableCount,
      lastBackup: lastBackupResult ? {
        fileName: lastBackupResult.fileName,
        fileSize: lastBackupResult.fileSize ? Number(lastBackupResult.fileSize) : null,
        completedAt: lastBackupResult.completedAt,
        status: lastBackupResult.status
      } : null,
    };
  } catch (error) {
    console.error('[Health] PostgreSQL check failed:', error.message);
    return {
      status: 'unhealthy',
      error: error.message,
      activeConnections: 0,
      maxConnections: POSTGRES_LIMITS.maxConnections,
      currentSizeGB: 0,
      estimatedLimitGB: POSTGRES_LIMITS.storageEstimateGB,
      storageUsagePercent: 0,
      tableCount: 0,
      lastBackup: null
    };
  }
};

const checkCloudinaryHealth = async () => {
  try {
    const cloudinary = require('cloudinary').v2;
    
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      return {
        status: 'not_configured',
        message: 'Cloudinary not configured',
        storageUsed: 0,
        storageLimit: CLOUDINARY_QUOTA_LIMITS.storage,
        storagePercent: 0,
        assetCount: 0,
        bandwidthUsed: 0,
        bandwidthLimit: CLOUDINARY_QUOTA_LIMITS.bandwidth,
        bandwidthPercent: 0,
        transformations: 0
      };
    }

    const result = await cloudinary.api.usage();

    const storageBytes = result.storage?.used || 0;
    const storageLimit = result.storage?.limit || CLOUDINARY_QUOTA_LIMITS.storage;
    const storagePercent = (storageBytes / storageLimit) * 100;

    const bandwidthBytes = result.bandwidth?.used || 0;
    const bandwidthLimit = result.bandwidth?.limit || CLOUDINARY_QUOTA_LIMITS.bandwidth;
    const bandwidthPercent = (bandwidthBytes / bandwidthLimit) * 100;

    const assetCount = result.resources?.count || 0;
    const transformations = result.transformations?.count || 0;

    if (storagePercent >= 70) {
      await shouldCreateAlert('cloudinary', 'storage', storagePercent.toFixed(1), 70, getUsageColor(storagePercent));
    }
    if (bandwidthPercent >= 70) {
      await shouldCreateAlert('cloudinary', 'bandwidth', bandwidthPercent.toFixed(1), 70, getUsageColor(bandwidthPercent));
    }

    return {
      status: 'healthy',
      storageUsed: storageBytes,
      storageLimit,
      storagePercent: parseFloat(storagePercent.toFixed(1)),
      bandwidthUsed: bandwidthBytes,
      bandwidthLimit,
      bandwidthPercent: parseFloat(bandwidthPercent.toFixed(1)),
      assetCount,
      transformations,
      plan: result.plan?.name || 'unknown'
    };
  } catch (error) {
    console.error('[Health] Cloudinary check failed:', error.message);
    return {
      status: 'error',
      error: error.message,
      storageUsed: 0,
      storageLimit: CLOUDINARY_QUOTA_LIMITS.storage,
      storagePercent: 0,
      assetCount: 0,
      bandwidthUsed: 0,
      bandwidthLimit: CLOUDINARY_QUOTA_LIMITS.bandwidth,
      bandwidthPercent: 0,
      transformations: 0
    };
  }
};

const checkGoogleDriveHealth = async () => {
  try {
    const lastBackup = await prisma.backupLog.findFirst({
      where: { status: 'completed', googleDriveId: { not: null } },
      orderBy: { completedAt: 'desc' }
    });

    const backupCount = await prisma.backupLog.count({
      where: { status: 'completed', googleDriveId: { not: null } }
    });

    const recentBackups = await prisma.backupLog.findMany({
      where: { status: 'completed', googleDriveId: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 7
    });

    const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    const retentionThreshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const oldBackups = recentBackups.filter(b => b.completedAt && new Date(b.completedAt) < retentionThreshold);

    const nextScheduledRun = (() => {
      const hour = process.env.BACKUP_CRON_HOUR || '2';
      const minute = process.env.BACKUP_CRON_MINUTE || '0';
      const now = new Date();
      const next = new Date();
      next.setHours(parseInt(hour), parseInt(minute), 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next.toISOString();
    })();

    return {
      status: lastBackup ? 'healthy' : 'no_backups',
      totalBackups: backupCount,
      lastBackup: lastBackup ? {
        fileName: lastBackup.fileName,
        fileSize: lastBackup.fileSize ? Number(lastBackup.fileSize) : null,
        completedAt: lastBackup.completedAt,
        googleDriveId: lastBackup.googleDriveId
      } : null,
      nextScheduledRun,
      retentionStatus: oldBackups.length > 0 ? 'retention_active' : 'retention_ok',
      retentionDays,
      recentBackupCount: recentBackups.length
    };
  } catch (error) {
    console.error('[Health] Google Drive check failed:', error.message);
    return {
      status: 'error',
      error: error.message,
      totalBackups: 0,
      lastBackup: null,
      nextScheduledRun: null,
      retentionStatus: 'unknown'
    };
  }
};

const checkRenderHealth = async () => {
  try {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;

    const cpuLoad = os.loadavg();
    const cpuUsage = cpuLoad[0] * 100 / os.cpus().length;

    const uptime = os.uptime();
    const serverUptimeSeconds = process.uptime ? process.uptime() : uptime;

    const envVarsCount = Object.keys(process.env).length;

    let apiHealth = 'healthy';
    let errorRate = 0;

    try {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;
      apiHealth = responseTime < 2000 ? 'healthy' : 'degraded';
    } catch (e) {
      apiHealth = 'unhealthy';
      errorRate = 100;
    }

    const isRender = process.env.RENDER === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    if (memUsagePercent >= 70) {
      await shouldCreateAlert('render', 'memory', memUsagePercent.toFixed(1), 70, getUsageColor(memUsagePercent));
    }
    if (cpuUsage >= 70) {
      await shouldCreateAlert('render', 'cpu', cpuUsage.toFixed(1), 70, getUsageColor(cpuUsage));
    }

    return {
      status: 'healthy',
      memoryUsed: usedMem,
      memoryTotal: totalMem,
      memoryUsagePercent: parseFloat(memUsagePercent.toFixed(1)),
      memoryFree: freeMem,
      cpuUsage: parseFloat(cpuUsage.toFixed(1)),
      cpuCores: os.cpus().length,
      cpuLoad: cpuLoad.map(l => parseFloat(l.toFixed(2))),
      uptime: serverUptimeSeconds,
      uptimeFormatted: formatUptime(serverUptimeSeconds),
      apiHealth,
      errorRate,
      environment: isProduction ? 'production' : 'development',
      platform: isRender ? 'render' : 'local',
      envVarsCount
    };
  } catch (error) {
    console.error('[Health] Render check failed:', error.message);
    return {
      status: 'error',
      error: error.message,
      memoryUsagePercent: 0,
      cpuUsage: 0,
      uptime: 0,
      uptimeFormatted: '0s',
      apiHealth: 'unknown',
      errorRate: 0
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
  const [postgres, cloudinary, googleDrive, render] = await Promise.all([
    checkPostgresHealth(),
    checkCloudinaryHealth(),
    checkGoogleDriveHealth(),
    checkRenderHealth()
  ]);

  return {
    postgresql: postgres,
    cloudinary,
    googleDrive,
    render,
    timestamp: new Date().toISOString()
  };
};

const getRecentAlerts = async (limit = 20) => {
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

module.exports = {
  checkPostgresHealth,
  checkCloudinaryHealth,
  checkGoogleDriveHealth,
  checkRenderHealth,
  getAllHealthMetrics,
  getRecentAlerts,
  markAlertRead,
  markAllAlertsRead,
  getUnreadAlertCount,
  getUsageColor,
  formatUptime
};
