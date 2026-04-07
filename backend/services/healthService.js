const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const os = require('os');

const ALERT_THRESHOLDS = {
  WARNING: 70,
  ERROR: 85,
  CRITICAL: 90
};

const RESPONSE_TIME_THRESHOLDS = {
  EXCELLENT: 100,
  GOOD: 500,
  SLOW: 1000,
  CRITICAL: 2000
};

const POSTGRES_LIMITS = {
  maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 100,
  storageLimitGB: parseFloat(process.env.POSTGRES_STORAGE_GB_LIMIT) || 100,
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
    console.error('[Health] Failed to send notification:', error.message);
  }
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
      const alert = await prisma.systemAlert.create({
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

      if (severity === 'critical' || severity === 'error') {
        await sendNotification(alert);
      }
      
      return alert;
    }
  } catch (error) {
    console.error(`[Health] Failed to create alert for ${service}:${metricName}`, error.message);
  }
};

const checkBackupAlerts = async () => {
  try {
    const lastBackup = await prisma.backupLog.findFirst({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' }
    });

    const hoursSinceBackup = lastBackup 
      ? (Date.now() - new Date(lastBackup.completedAt).getTime()) / (1000 * 60 * 60)
      : null;

    if (!lastBackup) {
      const existingAlert = await prisma.systemAlert.findFirst({
        where: {
          service: 'backup',
          metricName: 'no_backup',
          isRead: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      if (!existingAlert) {
        const alert = await prisma.systemAlert.create({
          data: {
            service: 'backup',
            alertType: 'error',
            severity: 'critical',
            title: 'No Backup Found',
            message: 'No successful backup found. Database backup system may be broken.',
            metricName: 'no_backup',
            metricValue: '0',
            threshold: '1',
          }
        });
        await sendNotification(alert);
      }
    } else if (hoursSinceBackup > 24) {
      const existingAlert = await prisma.systemAlert.findFirst({
        where: {
          service: 'backup',
          metricName: 'backup_stale',
          isRead: false,
          createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) }
        }
      });

      if (!existingAlert) {
        const severity = hoursSinceBackup > 48 ? 'critical' : 'error';
        const alert = await prisma.systemAlert.create({
          data: {
            service: 'backup',
            alertType: 'warning',
            severity,
            title: 'Backup Overdue',
            message: `Last successful backup was ${Math.floor(hoursSinceBackup)} hours ago. Expected daily backup.`,
            metricName: 'backup_stale',
            metricValue: hoursSinceBackup.toFixed(1),
            threshold: '24',
          }
        });
        if (severity === 'critical') {
          await sendNotification(alert);
        }
      }
    }
  } catch (error) {
    console.error('[Health] Failed to check backup alerts:', error.message);
  }
};

const checkResponseTimeAlert = async (service, responseTimeMs) => {
  if (responseTimeMs >= RESPONSE_TIME_THRESHOLDS.SLOW) {
    const severity = responseTimeMs >= RESPONSE_TIME_THRESHOLDS.CRITICAL ? 'error' : 'warning';
    await shouldCreateAlert(
      service,
      'response_time',
      responseTimeMs,
      RESPONSE_TIME_THRESHOLDS.SLOW,
      severity,
      `Slow response time: ${responseTimeMs}ms (threshold: ${RESPONSE_TIME_THRESHOLDS.SLOW}ms)`
    );
  }
};

const checkMemoryCriticalAlert = async (memoryPercent) => {
  if (memoryPercent >= ALERT_THRESHOLDS.CRITICAL) {
    await shouldCreateAlert(
      'render',
      'memory_critical',
      memoryPercent,
      ALERT_THRESHOLDS.CRITICAL,
      'critical',
      `Critical memory usage: ${memoryPercent.toFixed(1)}% (threshold: ${ALERT_THRESHOLDS.CRITICAL}%)`
    );
  }
};

const checkPostgresHealth = async () => {
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

    const lastBackup = await prisma.backupLog.findFirst({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' }
    });

    const recentBackups = await prisma.backupLog.findMany({
      where: { 
        status: 'completed',
        completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
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
          weeklyGrowthFormatted: formatBytesMB(Math.abs(sizeDiff)),
          direction: sizeDiff > 0 ? 'increasing' : 'decreasing'
        };
      }
    }

    const hoursSinceBackup = lastBackup 
      ? (Date.now() - new Date(lastBackup.completedAt).getTime()) / (1000 * 60 * 60)
      : null;

    const severity = getUsageSeverity(dbUsagePercent);
    if (dbUsagePercent >= ALERT_THRESHOLDS.WARNING) {
      await shouldCreateAlert('postgresql', 'storage_usage', dbUsagePercent, ALERT_THRESHOLDS.WARNING, severity);
    }
    if (connectionUsagePercent >= ALERT_THRESHOLDS.WARNING) {
      await shouldCreateAlert('postgresql', 'connections', connectionUsagePercent, ALERT_THRESHOLDS.WARNING, 'warning');
    }
    if (avgResponseTime >= RESPONSE_TIME_THRESHOLDS.SLOW) {
      await checkResponseTimeAlert('postgresql', avgResponseTime);
    }

    return {
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
      lastBackup: lastBackup ? {
        fileName: lastBackup.fileName,
        fileSize: lastBackup.fileSize ? Number(lastBackup.fileSize) : null,
        fileSizeFormatted: lastBackup.fileSize ? formatBytesMB(Number(lastBackup.fileSize)) : null,
        completedAt: lastBackup.completedAt,
        status: lastBackup.status,
        triggeredBy: lastBackup.triggeredBy
      } : null,
      hoursSinceBackup: hoursSinceBackup ? parseFloat(hoursSinceBackup.toFixed(1)) : null,
      backupOverdue: hoursSinceBackup !== null && hoursSinceBackup > 24,
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

    if (storagePercent >= ALERT_THRESHOLDS.WARNING) {
      await shouldCreateAlert('cloudinary', 'storage', storagePercent, ALERT_THRESHOLDS.WARNING, getUsageSeverity(storagePercent));
    }
    if (bandwidthPercent >= ALERT_THRESHOLDS.WARNING) {
      await shouldCreateAlert('cloudinary', 'bandwidth', bandwidthPercent, ALERT_THRESHOLDS.WARNING, getUsageSeverity(bandwidthPercent));
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
            googleDriveId: files[0].id,
            location: 'google_drive'
          };
        }

        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        recentBackups = files.filter(f => new Date(f.createdTime) >= oneWeekAgo);
      }
    } catch (gdError) {
      console.log('[Health] Google Drive service not available, using BackupLog');
    }

    const backupLogs = await prisma.backupLog.findMany({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' },
      take: 1
    });

    const lastBackupLog = backupLogs[0];
    
    if (!lastBackup && lastBackupLog) {
      lastBackup = {
        fileName: lastBackupLog.fileName,
        fileSize: lastBackupLog.fileSize ? Number(lastBackupLog.fileSize) : null,
        fileSizeFormatted: lastBackupLog.fileSize ? formatBytesMB(Number(lastBackupLog.fileSize)) : null,
        completedAt: lastBackupLog.completedAt,
        triggeredBy: lastBackupLog.triggeredBy,
        location: lastBackupLog.googleDriveId ? 'google_drive' : 'local'
      };
    }

    const hoursSinceBackup = lastBackup 
      ? (Date.now() - new Date(lastBackup.completedAt).getTime()) / (1000 * 60 * 60)
      : null;

    await checkBackupAlerts();

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
      status: totalBackups > 0 || lastBackup ? 'healthy' : 'no_backups',
      connected: googleDriveConnected,
      googleDriveConfigured: googleDriveConnected,
      totalBackups: Math.max(totalBackups, backupLogs.length),
      lastBackup,
      hoursSinceBackup: hoursSinceBackup ? parseFloat(hoursSinceBackup.toFixed(1)) : null,
      backupOverdue: hoursSinceBackup !== null && hoursSinceBackup > 24,
      nextScheduledRun: nextScheduledRun.toISOString(),
      recentBackupCount: recentBackups.length,
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
      backupLogsCount: backupLogs.length
    };
  } catch (error) {
    console.error('[Health] Google Drive check failed:', error.message);
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
  
  try {
    const lastBackupJob = await prisma.backupLog.findFirst({
      where: { triggeredBy: 'scheduled' },
      orderBy: { completedAt: 'desc' }
    });
    
    if (lastBackupJob) {
      lastRun = lastBackupJob.completedAt;
      lastRunStatus = lastBackupJob.status === 'completed' ? 'success' : 'failed';
      lastRunDuration = lastBackupJob.duration;
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
    lastRunDuration,
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
    } catch (e) {
      apiHealth = 'unhealthy';
      errorRate = 100;
    }

    const isRender = process.env.RENDER === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    if (memUsagePercent >= ALERT_THRESHOLDS.WARNING) {
      await shouldCreateAlert('render', 'memory', memUsagePercent, ALERT_THRESHOLDS.WARNING, getUsageSeverity(memUsagePercent));
    }
    if (memUsagePercent >= ALERT_THRESHOLDS.CRITICAL) {
      await checkMemoryCriticalAlert(memUsagePercent);
    }
    if (cpuUsage >= ALERT_THRESHOLDS.WARNING) {
      await shouldCreateAlert('render', 'cpu', cpuUsage, ALERT_THRESHOLDS.WARNING, getUsageSeverity(cpuUsage));
    }
    if (responseTimeMs >= RESPONSE_TIME_THRESHOLDS.SLOW) {
      await checkResponseTimeAlert('api', responseTimeMs);
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

const executeBackup = async (adminId = 'manual') => {
  try {
    const backupController = require('../controllers/backupController');
    const result = await backupController.createBackup(adminId);
    return { success: true, result };
  } catch (error) {
    console.error('[Health] Manual backup failed:', error.message);
    return { success: false, error: error.message };
  }
};

const runServiceCheck = async () => {
  await checkBackupAlerts();
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
  executeBackup,
  runServiceCheck,
  getUsageSeverity,
  formatUptime,
  formatBytes,
  ALERT_THRESHOLDS,
  RESPONSE_TIME_THRESHOLDS
};
