const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const os = require('os');

const ALERT_THRESHOLDS = {
  WARNING: 85,
  ERROR: 92,
  CRITICAL: 95
};

const RESPONSE_TIME_THRESHOLDS = {
  EXCELLENT: 200,
  GOOD: 1000,
  SLOW: 3000,
  CRITICAL: 5000
};

const POSTGRES_LIMITS = {
  maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 100,
  storageLimitGB: parseFloat(process.env.POSTGRES_STORAGE_GB_LIMIT) || 100,
};

const CACHE_TTL_MS = 30000;
const STARTUP_GRACE_MS = 120000;

const startupTime = Date.now();
const isStartupPhase = () => Date.now() - startupTime < STARTUP_GRACE_MS;
const cache = {
  healthMetrics: { data: null, timestamp: 0 },
  backupMetadata: { data: null, timestamp: 0 },
  postgresHealth: { data: null, timestamp: 0 },
  freshAlerts: { data: null, timestamp: 0 }
};

const isCacheValid = (cacheKey) => {
  return cache[cacheKey].data && (Date.now() - cache[cacheKey].timestamp) < CACHE_TTL_MS;
};

const getCached = (cacheKey) => {
  if (isCacheValid(cacheKey)) {
    return cache[cacheKey].data;
  }
  return null;
};

const setCached = (cacheKey, data) => {
  cache[cacheKey] = { data, timestamp: Date.now() };
};

const invalidateCache = (cacheKey = null) => {
  if (cacheKey) {
    cache[cacheKey] = { data: null, timestamp: 0 };
  } else {
    Object.keys(cache).forEach(key => {
      cache[key] = { data: null, timestamp: 0 };
    });
  }
};

const sanitizeMetricsForResponse = (metrics) => {
  if (!metrics) return null;
  
  return {
    postgresql: {
      status: metrics.postgresql?.status,
      connected: metrics.postgresql?.connected,
      connectionHealth: metrics.postgresql?.connectionHealth,
      connectionTimeMs: metrics.postgresql?.connectionTimeMs,
      avgResponseTimeMs: metrics.postgresql?.avgResponseTimeMs,
      responseTimeStatus: metrics.postgresql?.responseTimeStatus,
      responseTimeColor: metrics.postgresql?.responseTimeColor,
      activeConnections: metrics.postgresql?.activeConnections,
      maxConnections: metrics.postgresql?.maxConnections,
      connectionUsagePercent: metrics.postgresql?.connectionUsagePercent,
      currentSizeMB: metrics.postgresql?.currentSizeMB,
      currentSizeGB: metrics.postgresql?.currentSizeGB,
      storageLimitGB: metrics.postgresql?.storageLimitGB,
      storageUsagePercent: metrics.postgresql?.storageUsagePercent,
      tableCount: metrics.postgresql?.tableCount,
      lastBackup: metrics.postgresql?.lastBackup ? {
        fileName: metrics.postgresql.lastBackup.fileName,
        fileSizeFormatted: metrics.postgresql.lastBackup.fileSizeFormatted,
        completedAt: metrics.postgresql.lastBackup.completedAt,
        status: metrics.postgresql.lastBackup.status
      } : null,
      hoursSinceBackup: metrics.postgresql?.hoursSinceBackup,
      backupOverdue: metrics.postgresql?.backupOverdue,
      backupCount7Days: metrics.postgresql?.backupCount7Days
    },
    cloudinary: {
      status: metrics.cloudinary?.status,
      connected: metrics.cloudinary?.connected,
      storagePercent: metrics.cloudinary?.storagePercent,
      bandwidthPercent: metrics.cloudinary?.bandwidthPercent,
      assetCount: metrics.cloudinary?.assetCount
    },
    googleDrive: {
      status: metrics.googleDrive?.status,
      connected: metrics.googleDrive?.connected,
      googleDriveConfigured: metrics.googleDrive?.googleDriveConfigured,
      totalBackups: metrics.googleDrive?.totalBackups,
      lastBackup: metrics.googleDrive?.lastBackup ? {
        fileName: metrics.googleDrive.lastBackup.fileName,
        fileSizeFormatted: metrics.googleDrive.lastBackup.fileSizeFormatted,
        completedAt: metrics.googleDrive.lastBackup.completedAt,
        triggeredBy: metrics.googleDrive.lastBackup.triggeredBy
      } : null,
      hoursSinceBackup: metrics.googleDrive?.hoursSinceBackup,
      backupOverdue: metrics.googleDrive?.backupOverdue,
      recentBackupCount: metrics.googleDrive?.recentBackupCount,
      nextScheduledRun: metrics.googleDrive?.nextScheduledRun,
      scheduledBackupsCount: metrics.googleDrive?.scheduledBackupsCount,
      manualBackupsCount: metrics.googleDrive?.manualBackupsCount
    },
    render: {
      status: metrics.render?.status,
      connected: metrics.render?.connected,
      memoryUsagePercent: metrics.render?.memoryUsagePercent,
      memoryUsedFormatted: metrics.render?.memoryUsedFormatted,
      memoryTotalFormatted: metrics.render?.memoryTotalFormatted,
      heapUsagePercent: metrics.render?.heapUsagePercent,
      cpuUsage: metrics.render?.cpuUsage,
      cpuCores: metrics.render?.cpuCores,
      uptimeFormatted: metrics.render?.uptimeFormatted,
      apiHealth: metrics.render?.apiHealth,
      apiResponseTimeMs: metrics.render?.apiResponseTimeMs,
      dbConnectionOk: metrics.render?.dbConnectionOk,
      environment: metrics.render?.environment,
      platform: metrics.render?.platform
    },
    cron: {
      status: metrics.cron?.status,
      schedule: metrics.cron?.schedule,
      lastRun: metrics.cron?.lastRun,
      lastRunStatus: metrics.cron?.lastRunStatus,
      lastRunDuration: metrics.cron?.lastRunDuration,
      lastRunFileName: metrics.cron?.lastRunFileName,
      lastRunFileSizeFormatted: metrics.cron?.lastRunFileSizeFormatted,
      nextRun: metrics.cron?.nextRun,
      enabled: metrics.cron?.enabled
    },
    timestamp: metrics.timestamp
  };
};

const getBackupMetadata = async () => {
  const cached = getCached('backupMetadata');
  if (cached) return cached;

  try {
    const backupService = require('./backupService');
    const metadata = await backupService.getBackupSummary();
    setCached('backupMetadata', metadata);
    return metadata;
  } catch (error) {
    return {
      googleDriveConfigured: false,
      googleDriveConnected: false,
      totalBackups: 0,
      lastBackup: null,
      hoursSinceBackup: null,
      backupOverdue: false,
      recentBackupCount: 0,
      recentBackups: [],
      scheduledBackups: [],
      manualBackups: []
    };
  }
};

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatBytesMB = (bytes) => {
  if (bytes === 0) return '0 MB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const formatBytesGB = (bytes) => {
  if (bytes === 0) return '0 GB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

const getUsageSeverity = (percentage) => {
  if (percentage < ALERT_THRESHOLDS.WARNING) return 'info';
  if (percentage < ALERT_THRESHOLDS.ERROR) return 'warning';
  if (percentage < ALERT_THRESHOLDS.CRITICAL) return 'error';
  return 'critical';
};

const getResponseTimeStatus = (ms) => {
  if (ms < RESPONSE_TIME_THRESHOLDS.EXCELLENT) return { status: 'excellent', label: 'Excellent', color: '#22c55e' };
  if (ms < RESPONSE_TIME_THRESHOLDS.GOOD) return { status: 'good', label: 'Good', color: '#22c55e' };
  if (ms < RESPONSE_TIME_THRESHOLDS.SLOW) return { status: 'slow', label: 'Slow', color: '#eab308' };
  if (ms < RESPONSE_TIME_THRESHOLDS.CRITICAL) return { status: 'degraded', label: 'Degraded', color: '#f97316' };
  return { status: 'critical', label: 'Critical', color: '#ef4444' };
};

const sendNotification = async (alert) => {
  try {
    const emailEnabled = process.env.HEALTH_ALERT_EMAIL_ENABLED === 'true';
    const smsEnabled = process.env.HEALTH_ALERT_SMS_ENABLED === 'true';
    
    if (emailEnabled) {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.EMAIL_USER || process.env.BUSINESS_EMAIL_USER,
          pass: process.env.EMAIL_PASS || process.env.BUSINESS_EMAIL_PASS
        }
      });

      const adminEmail = process.env.HEALTH_ALERT_EMAIL || 'vijayalakshmijayakumar45@gmail.com';
      
      await transporter.sendMail({
        from: `"Vijayalakshmi Matrimony" <${process.env.FROM_EMAIL || process.env.BUSINESS_EMAIL_USER}>`,
        to: adminEmail,
        subject: `[ALERT] ${alert.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${alert.severity === 'critical' ? '#ef4444' : '#eab308'};">${alert.title}</h2>
            <p><strong>Service:</strong> ${alert.service}</p>
            <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
            <p><strong>Message:</strong> ${alert.message}</p>
            ${alert.metricName ? `<p><strong>Metric:</strong> ${alert.metricName} = ${alert.metricValue}${alert.threshold ? ` (threshold: ${alert.threshold}%)` : ''}</p>` : ''}
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated alert from System Health monitoring.</p>
          </div>
        `
      });
      console.log(`[Health] Email notification sent for alert: ${alert.title}`);
    }

    if (smsEnabled && (alert.severity === 'critical' || alert.severity === 'error')) {
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      const adminPhone = process.env.HEALTH_ALERT_PHONE;
      if (adminPhone) {
        await client.messages.create({
          body: `[ALERT] ${alert.title}: ${alert.message.substring(0, 100)}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: adminPhone
        });
        console.log(`[Health] SMS notification sent for alert: ${alert.title}`);
      }
    }
  } catch (error) {
    console.error('[Notification] Failed:', error.message);
  }
};

const generateFreshAlerts = async (metrics) => {
  if (isStartupPhase()) {
    return [];
  }
  
  const alerts = [];
  const now = new Date();
  
  if (!metrics) return alerts;

  const { postgresql, cloudinary, googleDrive, render, cron } = metrics;

  if (postgresql) {
    if (postgresql.storageUsagePercent >= ALERT_THRESHOLDS.WARNING) {
      alerts.push({
        id: `pg-storage-${now.getTime()}`,
        service: 'postgresql',
        alertType: 'usage_warning',
        severity: getUsageSeverity(postgresql.storageUsagePercent),
        title: 'PostgreSQL Storage Alert',
        message: `Storage usage is at ${postgresql.storageUsagePercent.toFixed(1)}%, threshold: ${ALERT_THRESHOLDS.WARNING}%`,
        metricName: 'storage_usage',
        metricValue: String(postgresql.storageUsagePercent.toFixed(1)),
        threshold: String(ALERT_THRESHOLDS.WARNING),
        isRead: false,
        createdAt: now
      });
    }

    if (postgresql.connectionUsagePercent >= ALERT_THRESHOLDS.WARNING) {
      alerts.push({
        id: `pg-connections-${now.getTime()}`,
        service: 'postgresql',
        alertType: 'usage_warning',
        severity: 'warning',
        title: 'PostgreSQL Connections Alert',
        message: `Connection usage is at ${postgresql.connectionUsagePercent.toFixed(1)}%, threshold: ${ALERT_THRESHOLDS.WARNING}%`,
        metricName: 'connections',
        metricValue: String(postgresql.connectionUsagePercent.toFixed(1)),
        threshold: String(ALERT_THRESHOLDS.WARNING),
        isRead: false,
        createdAt: now
      });
    }

    if (postgresql.avgResponseTimeMs >= RESPONSE_TIME_THRESHOLDS.SLOW) {
      const severity = postgresql.avgResponseTimeMs >= RESPONSE_TIME_THRESHOLDS.CRITICAL ? 'error' : 'warning';
      alerts.push({
        id: `pg-response-${now.getTime()}`,
        service: 'postgresql',
        alertType: 'performance_warning',
        severity,
        title: 'PostgreSQL Response Time Alert',
        message: `Slow response time: ${postgresql.avgResponseTimeMs}ms (threshold: ${RESPONSE_TIME_THRESHOLDS.SLOW}ms)`,
        metricName: 'response_time',
        metricValue: String(postgresql.avgResponseTimeMs),
        threshold: String(RESPONSE_TIME_THRESHOLDS.SLOW),
        isRead: false,
        createdAt: now
      });
    }
  }

  if (cloudinary && cloudinary.connected && cloudinary.status !== 'not_configured') {
    if (cloudinary.storagePercent >= ALERT_THRESHOLDS.WARNING) {
      alerts.push({
        id: `cloudinary-storage-${now.getTime()}`,
        service: 'cloudinary',
        alertType: 'usage_warning',
        severity: getUsageSeverity(cloudinary.storagePercent),
        title: 'Cloudinary Storage Alert',
        message: `Storage usage is at ${cloudinary.storagePercent.toFixed(1)}%, threshold: ${ALERT_THRESHOLDS.WARNING}%`,
        metricName: 'storage',
        metricValue: String(cloudinary.storagePercent.toFixed(1)),
        threshold: String(ALERT_THRESHOLDS.WARNING),
        isRead: false,
        createdAt: now
      });
    }

    if (cloudinary.bandwidthPercent >= ALERT_THRESHOLDS.WARNING) {
      alerts.push({
        id: `cloudinary-bandwidth-${now.getTime()}`,
        service: 'cloudinary',
        alertType: 'usage_warning',
        severity: getUsageSeverity(cloudinary.bandwidthPercent),
        title: 'Cloudinary Bandwidth Alert',
        message: `Bandwidth usage is at ${cloudinary.bandwidthPercent.toFixed(1)}%, threshold: ${ALERT_THRESHOLDS.WARNING}%`,
        metricName: 'bandwidth',
        metricValue: String(cloudinary.bandwidthPercent.toFixed(1)),
        threshold: String(ALERT_THRESHOLDS.WARNING),
        isRead: false,
        createdAt: now
      });
    }
  }

  if (googleDrive) {
    if (!googleDrive.googleDriveConfigured) {
      alerts.push({
        id: `drive-config-${now.getTime()}`,
        service: 'backup',
        alertType: 'configuration_warning',
        severity: 'warning',
        title: 'Google Drive Not Configured',
        message: 'Google Drive backup is not configured. Please set up OAuth credentials.',
        metricName: 'google_drive_config',
        metricValue: '0',
        threshold: '1',
        isRead: false,
        createdAt: now
      });
    } else if (googleDrive.totalBackups === 0) {
      alerts.push({
        id: `drive-no-backup-${now.getTime()}`,
        service: 'backup',
        alertType: 'error',
        severity: 'critical',
        title: 'Backup System Failure',
        message: 'No backups found. Immediate backup recommended.',
        metricName: 'no_backup',
        metricValue: '0',
        threshold: '1',
        isRead: false,
        createdAt: now
      });
    } else if (googleDrive.hoursSinceBackup !== null && googleDrive.hoursSinceBackup > 24) {
      const severity = googleDrive.hoursSinceBackup > 48 ? 'critical' : 'warning';
      alerts.push({
        id: `drive-stale-${now.getTime()}`,
        service: 'backup',
        alertType: 'warning',
        severity,
        title: googleDrive.hoursSinceBackup > 48 ? 'Critical: Backup Overdue' : 'Backup Overdue',
        message: `No successful backup in the last ${Math.floor(googleDrive.hoursSinceBackup)} hours.${googleDrive.lastBackup ? ` Last backup: ${googleDrive.lastBackup.fileName}` : ''}`,
        metricName: 'backup_stale',
        metricValue: String(googleDrive.hoursSinceBackup.toFixed(1)),
        threshold: '24',
        isRead: false,
        createdAt: now
      });
    }
  }

  if (render) {
    if (render.memoryUsagePercent >= ALERT_THRESHOLDS.CRITICAL) {
      alerts.push({
        id: `render-memory-crit-${now.getTime()}`,
        service: 'render',
        alertType: 'usage_warning',
        severity: 'critical',
        title: 'Critical Memory Usage',
        message: `Critical memory usage: ${render.memoryUsagePercent.toFixed(1)}% (threshold: ${ALERT_THRESHOLDS.CRITICAL}%)`,
        metricName: 'memory_critical',
        metricValue: String(render.memoryUsagePercent.toFixed(1)),
        threshold: String(ALERT_THRESHOLDS.CRITICAL),
        isRead: false,
        createdAt: now
      });
    } else if (render.memoryUsagePercent >= ALERT_THRESHOLDS.WARNING) {
      alerts.push({
        id: `render-memory-${now.getTime()}`,
        service: 'render',
        alertType: 'usage_warning',
        severity: 'warning',
        title: 'Memory Usage Alert',
        message: `Memory usage is at ${render.memoryUsagePercent.toFixed(1)}%, threshold: ${ALERT_THRESHOLDS.WARNING}%`,
        metricName: 'memory',
        metricValue: String(render.memoryUsagePercent.toFixed(1)),
        threshold: String(ALERT_THRESHOLDS.WARNING),
        isRead: false,
        createdAt: now
      });
    }

    if (render.cpuUsage >= ALERT_THRESHOLDS.WARNING) {
      alerts.push({
        id: `render-cpu-${now.getTime()}`,
        service: 'render',
        alertType: 'usage_warning',
        severity: getUsageSeverity(render.cpuUsage),
        title: 'CPU Usage Alert',
        message: `CPU usage is at ${render.cpuUsage.toFixed(1)}%, threshold: ${ALERT_THRESHOLDS.WARNING}%`,
        metricName: 'cpu',
        metricValue: String(render.cpuUsage.toFixed(1)),
        threshold: String(ALERT_THRESHOLDS.WARNING),
        isRead: false,
        createdAt: now
      });
    }

    if (render.apiResponseTimeMs >= RESPONSE_TIME_THRESHOLDS.SLOW) {
      const severity = render.apiResponseTimeMs >= RESPONSE_TIME_THRESHOLDS.CRITICAL ? 'error' : 'warning';
      alerts.push({
        id: `render-api-response-${now.getTime()}`,
        service: 'render',
        alertType: 'performance_warning',
        severity,
        title: 'API Response Time Alert',
        message: `Slow API response time: ${render.apiResponseTimeMs}ms (threshold: ${RESPONSE_TIME_THRESHOLDS.SLOW}ms)`,
        metricName: 'response_time',
        metricValue: String(render.apiResponseTimeMs),
        threshold: String(RESPONSE_TIME_THRESHOLDS.SLOW),
        isRead: false,
        createdAt: now
      });
    }

    if (render.dbConnectionOk === false) {
      alerts.push({
        id: `render-db-conn-${now.getTime()}`,
        service: 'render',
        alertType: 'error',
        severity: 'critical',
        title: 'Database Connection Failed',
        message: 'Unable to connect to PostgreSQL database.',
        metricName: 'db_connection',
        metricValue: 'failed',
        threshold: 'success',
        isRead: false,
        createdAt: now
      });
    }
  }

  for (const alert of alerts) {
    if (alert.severity === 'critical' || alert.severity === 'error') {
      await sendNotification(alert);
    }
  }

  return alerts;
};

const checkPostgresHealth = async () => {
  const cached = getCached('postgresHealth');
  if (cached) return cached;

  const responseTimes = [];
  let connection = null;
  
  try {
    connection = await prisma.$connect();
    
    const measureTime = async (label) => {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const duration = Date.now() - start;
      responseTimes.push(duration);
      return duration;
    };

    const connectionTime = await measureTime('connection');
    
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

    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : connectionTime;
    const responseTimeStatus = getResponseTimeStatus(avgResponseTime);

    const metadata = await getBackupMetadata();
    const lastBackup = metadata.lastBackup;
    const hoursSinceBackup = metadata.hoursSinceBackup;

    let growthTrend = null;
    if (metadata.recentBackups && metadata.recentBackups.length >= 2) {
      const backups = metadata.recentBackups;
      const oldestWithSize = backups[backups.length - 1];
      const latestWithSize = backups[0];
      if (oldestWithSize?.fileSize && latestWithSize?.fileSize) {
        const sizeDiff = Number(latestWithSize.fileSize) - Number(oldestWithSize.fileSize);
        const oldestDate = new Date(oldestWithSize.completedAt);
        const latestDate = new Date(latestWithSize.completedAt);
        const daysDiff = (latestDate - oldestDate) / (1000 * 60 * 60 * 24);
        const dailyGrowth = daysDiff > 0 ? sizeDiff / daysDiff : 0;
        growthTrend = {
          dailyGrowthBytes: dailyGrowth,
          dailyGrowthFormatted: formatBytesMB(dailyGrowth),
          weeklyGrowthBytes: sizeDiff,
          weeklyGrowthFormatted: formatBytesMB(Math.abs(sizeDiff)),
          direction: sizeDiff > 0 ? 'increasing' : 'decreasing'
        };
      }
    }

    const result = {
      status: 'healthy',
      connected: true,
      connectionHealth: responseTimeStatus.status,
      connectionTimeMs: connectionTime,
      avgResponseTimeMs: parseFloat(avgResponseTime.toFixed(2)),
      responseTimeStatus: responseTimeStatus.label,
      responseTimeColor: responseTimeStatus.color,
      activeConnections,
      maxConnections: POSTGRES_LIMITS.maxConnections,
      connectionUsagePercent: parseFloat(connectionUsagePercent.toFixed(2)),
      currentSizeBytes: dbSizeBytes,
      currentSizeMB: parseFloat(dbSizeMB.toFixed(2)),
      currentSizeGB: parseFloat(dbSizeGB.toFixed(2)),
      storageLimitGB: POSTGRES_LIMITS.storageLimitGB,
      storageUsagePercent: parseFloat(dbUsagePercent.toFixed(2)),
      tableCount,
      lastBackup,
      hoursSinceBackup,
      backupOverdue: hoursSinceBackup !== null && hoursSinceBackup > 24,
      growthTrend,
      backupCount7Days: metadata.recentBackupCount
    };

    setCached('postgresHealth', result);
    return result;
  } catch (error) {
    console.error('[DB] Health check failed:', error.message);
    return {
      status: 'unhealthy',
      connected: false,
      connectionHealth: 'disconnected',
      connectionTimeMs: 0,
      avgResponseTimeMs: 0,
      responseTimeStatus: 'Error',
      responseTimeColor: '#ef4444',
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
      lastBackup: null,
      hoursSinceBackup: null,
      backupOverdue: false,
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
        message: 'Cloudinary not configured',
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
    console.error('[Cloudinary] Health check failed:', error.message);
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
    const metadata = await getBackupMetadata();
    
    let nextScheduledRun = null;
    const hour = process.env.BACKUP_CRON_HOUR || '2';
    const minute = process.env.BACKUP_CRON_MINUTE || '0';
    const now = new Date();
    nextScheduledRun = new Date();
    nextScheduledRun.setHours(parseInt(hour), parseInt(minute), 0, 0);
    if (nextScheduledRun <= now) {
      nextScheduledRun.setDate(nextScheduledRun.getDate() + 1);
    }

    return {
      status: metadata.totalBackups > 0 ? 'healthy' : 'no_backups',
      connected: metadata.googleDriveConnected,
      googleDriveConfigured: metadata.googleDriveConfigured,
      totalBackups: metadata.totalBackups,
      lastBackup: metadata.lastBackup,
      hoursSinceBackup: metadata.hoursSinceBackup,
      backupOverdue: metadata.backupOverdue,
      nextScheduledRun: nextScheduledRun.toISOString(),
      recentBackupCount: metadata.recentBackupCount,
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
      recentBackups: metadata.recentBackups,
      scheduledBackupsCount: metadata.scheduledBackups.length,
      manualBackupsCount: metadata.manualBackups.length
    };
  } catch (error) {
    console.error('[Drive] Health check failed:', error.message);
    return {
      status: 'error',
      connected: false,
      error: error.message,
      totalBackups: 0,
      lastBackup: null,
      hoursSinceBackup: null,
      backupOverdue: false,
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
  let lastRunDuration = null;
  let lastRunFileName = null;
  let lastRunFileSize = null;
  
  try {
    const metadata = await getBackupMetadata();
    
    const scheduledBackups = metadata.scheduledBackups;
    if (scheduledBackups && scheduledBackups.length > 0) {
      const lastScheduledBackup = scheduledBackups[0];
      lastRun = lastScheduledBackup.completedAt;
      lastRunStatus = lastScheduledBackup.status === 'completed' ? 'success' : 'failed';
      lastRunDuration = lastScheduledBackup.duration;
      lastRunFileName = lastScheduledBackup.fileName;
      lastRunFileSize = lastScheduledBackup.fileSize ? Number(lastScheduledBackup.fileSize) : null;
    }
  } catch (e) {
    console.error('[Cron] Health check failed:', e.message);
  }

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
    lastRunDuration,
    lastRunFileName,
    lastRunFileSize,
    lastRunFileSizeFormatted: lastRunFileSize ? formatBytesMB(lastRunFileSize) : null,
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
    let responseTimeMs = 0;

    try {
      const postgresCached = getCached('postgresHealth');
      if (postgresCached) {
        responseTimeMs = postgresCached.connectionTimeMs || 0;
        dbConnectionOk = postgresCached.connected;
        apiHealth = postgresCached.connectionHealth || 'healthy';
      } else {
        const startTime = Date.now();
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;
        await prisma.$disconnect();
        dbConnectionOk = true;
        responseTimeMs = Date.now() - startTime;
        apiHealth = responseTimeMs < RESPONSE_TIME_THRESHOLDS.EXCELLENT ? 'healthy' 
                  : responseTimeMs < RESPONSE_TIME_THRESHOLDS.GOOD ? 'healthy'
                  : responseTimeMs < RESPONSE_TIME_THRESHOLDS.SLOW ? 'degraded' 
                  : 'unhealthy';
      }
    } catch (e) {
      apiHealth = 'unhealthy';
      errorRate = 100;
    }

    const isRender = process.env.RENDER === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

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
      heapTotalFormatted: formatBytesMB(heapTotal),
      cpuUsage: parseFloat(cpuUsage.toFixed(2)),
      cpuCores: os.cpus().length,
      cpuLoad: cpuLoad.map(l => parseFloat(l.toFixed(2))),
      uptime: serverUptimeSeconds,
      uptimeFormatted: formatUptime(serverUptimeSeconds),
      apiHealth,
      apiResponseTimeMs: responseTimeMs,
      dbConnectionOk,
      errorRate,
      environment: isProduction ? 'production' : 'development',
      platform: isRender ? 'render' : 'local',
      nodeVersion: process.version,
      pid: process.pid
    };
  } catch (error) {
    console.error('[Render] Health check failed:', error.message);
    return {
      status: 'error',
      connected: false,
      error: error.message,
      memoryUsagePercent: 0,
      cpuUsage: 0,
      uptime: 0,
      uptimeFormatted: '0s',
      apiHealth: 'unknown',
      apiResponseTimeMs: 0,
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

const getAllHealthMetrics = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCached('healthMetrics');
    if (cached) {
      return sanitizeMetricsForResponse(cached);
    }
  }

  const [postgres, cloudinary, googleDrive, render, cron] = await Promise.all([
    checkPostgresHealth(),
    checkCloudinaryHealth(),
    checkGoogleDriveHealth(),
    checkRenderHealth(),
    checkCronJobHealth()
  ]);

  const metrics = {
    postgresql: postgres,
    cloudinary,
    googleDrive,
    render,
    cron,
    timestamp: new Date().toISOString()
  };

  setCached('healthMetrics', metrics);
  
  if (!isStartupPhase()) {
    const alerts = await generateFreshAlerts(metrics);
    setCached('freshAlerts', alerts);
  }

  return sanitizeMetricsForResponse(metrics);
};

const getRecentAlerts = async (limit = 50) => {
  const cachedAlerts = getCached('freshAlerts');
  if (cachedAlerts) {
    return cachedAlerts.slice(0, limit);
  }

  const cachedMetrics = getCached('healthMetrics');
  if (cachedMetrics && !isStartupPhase()) {
    const alerts = await generateFreshAlerts(cachedMetrics);
    setCached('freshAlerts', alerts);
    return alerts.slice(0, limit);
  }

  const metrics = await getAllHealthMetrics();
  if (!isStartupPhase()) {
    const alerts = await generateFreshAlerts(metrics);
    setCached('freshAlerts', alerts);
    return alerts.slice(0, limit);
  }
  
  return [];
};

const getUnreadAlertCount = async () => {
  const alerts = await getRecentAlerts(100);
  return alerts.filter(a => !a.isRead).length;
};

const executeBackup = async (adminId = 'manual') => {
  try {
    const backupController = require('../controllers/backupController');
    await backupController.createBackup(adminId);
    invalidateCache();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const runServiceCheck = async () => {
  invalidateCache();
  return getAllHealthMetrics(true);
};

const markAlertRead = async (alertId, adminId) => {
  const alerts = await getRecentAlerts(1000);
  const alertIndex = alerts.findIndex(a => a.id === alertId);
  if (alertIndex !== -1) {
    alerts[alertIndex].isRead = true;
    alerts[alertIndex].readAt = new Date();
    alerts[alertIndex].readBy = adminId;
    setCached('freshAlerts', alerts);
  }
  return { success: true };
};

const markAllAlertsRead = async (adminId) => {
  const alerts = await getRecentAlerts(1000);
  const now = new Date();
  for (const alert of alerts) {
    alert.isRead = true;
    alert.readAt = now;
    alert.readBy = adminId;
  }
  setCached('freshAlerts', alerts);
  return { success: true };
};

const clearOldAlerts = async () => {
  return { success: true, message: 'Alerts are generated dynamically' };
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
  executeBackup,
  runServiceCheck,
  getBackupMetadata,
  invalidateCache,
  generateFreshAlerts,
  getUsageSeverity,
  formatUptime,
  formatBytes,
  formatBytesMB,
  ALERT_THRESHOLDS,
  RESPONSE_TIME_THRESHOLDS
};
