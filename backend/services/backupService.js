const { prisma } = require('../utils/database');
const googleDriveService = require('./googleDriveService');

const USE_GOOGLE_DRIVE = process.env.USE_GOOGLE_DRIVE !== 'false';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS) || 7;

const formatBytesMB = (bytes) => {
  if (bytes === 0) return '0 MB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const getAllBackups = async () => {
  try {
    let driveBackups = [];
    let googleDriveConnected = false;
    let googleDriveConfigured = false;

    if (USE_GOOGLE_DRIVE) {
      googleDriveConfigured = googleDriveService.isInitialized || await googleDriveService.initialize();
      googleDriveConnected = googleDriveService.isInitialized;
      
      if (googleDriveConnected) {
        driveBackups = await googleDriveService.listFiles();
      }
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const backupLogs = await prisma.backupLog.findMany({
      where: { 
        status: 'completed',
        completedAt: { gte: thirtyDaysAgo }
      },
      orderBy: { completedAt: 'desc' },
      take: 100
    });

    const allBackups = [
      ...driveBackups.map(b => ({
        id: b.id,
        name: b.name,
        createdTime: b.createdTime,
        size: b.size,
        completedAt: b.createdTime,
        fileName: b.name,
        fileSize: b.size,
        location: 'google_drive',
        source: 'drive'
      })),
      ...backupLogs.map(b => ({
        id: b.googleDriveId || `log-${b.id}`,
        name: b.fileName,
        createdTime: b.completedAt?.toISOString(),
        size: b.fileSize ? Number(b.fileSize) : 0,
        completedAt: b.completedAt?.toISOString(),
        fileName: b.fileName,
        fileSize: b.fileSize ? Number(b.fileSize) : 0,
        triggeredBy: b.triggeredBy,
        duration: b.duration,
        status: b.status,
        location: b.googleDriveId ? 'google_drive' : 'local',
        source: 'log'
      }))
    ];

    const uniqueBackups = [];
    const seenIds = new Set();
    for (const backup of allBackups) {
      const key = backup.id || backup.name;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        uniqueBackups.push(backup);
      }
    }

    uniqueBackups.sort((a, b) => new Date(b.completedAt || b.createdTime) - new Date(a.completedAt || a.createdTime));

    return {
      backups: uniqueBackups,
      googleDriveConfigured,
      googleDriveConnected,
      totalBackups: uniqueBackups.length
    };
  } catch (error) {
    console.error('[BackupService] Failed to get all backups:', error.message);
    return {
      backups: [],
      googleDriveConfigured: false,
      googleDriveConnected: false,
      totalBackups: 0
    };
  }
};

const getBackupSummary = async () => {
  const { backups, googleDriveConfigured, googleDriveConnected, totalBackups } = await getAllBackups();
  
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const lastBackup = backups[0] || null;
  
  const recentBackups = backups.filter(b => {
    const backupDate = new Date(b.completedAt || b.createdTime);
    return backupDate >= oneWeekAgo;
  });

  const hoursSinceBackup = lastBackup 
    ? (Date.now() - new Date(lastBackup.completedAt || lastBackup.createdTime).getTime()) / (1000 * 60 * 60)
    : null;

  const scheduledBackups = backups.filter(b => b.triggeredBy === 'scheduled');
  const manualBackups = backups.filter(b => b.triggeredBy !== 'scheduled');

  return {
    googleDriveConfigured,
    googleDriveConnected,
    totalBackups,
    lastBackup: lastBackup ? {
      id: lastBackup.id,
      fileName: lastBackup.fileName || lastBackup.name,
      fileSize: lastBackup.fileSize || lastBackup.size,
      fileSizeFormatted: formatBytesMB(lastBackup.fileSize || lastBackup.size || 0),
      completedAt: lastBackup.completedAt || lastBackup.createdTime,
      location: lastBackup.location,
      triggeredBy: lastBackup.triggeredBy,
      duration: lastBackup.duration,
      status: lastBackup.status
    } : null,
    hoursSinceBackup: hoursSinceBackup ? parseFloat(hoursSinceBackup.toFixed(1)) : null,
    backupOverdue: hoursSinceBackup !== null && hoursSinceBackup > 24,
    recentBackupCount: recentBackups.length,
    recentBackups: recentBackups.slice(0, 3).map(b => ({
      id: b.id,
      fileName: b.fileName || b.name,
      fileSize: b.fileSize || b.size,
      fileSizeFormatted: formatBytesMB(b.fileSize || b.size || 0),
      completedAt: b.completedAt || b.createdTime,
      location: b.location
    })),
    scheduledBackups: scheduledBackups.slice(0, 5),
    manualBackups: manualBackups.slice(0, 5),
    scheduledBackupsCount: scheduledBackups.length,
    manualBackupsCount: manualBackups.length
  };
};

module.exports = {
  getAllBackups,
  getBackupSummary,
  formatBytesMB
};
