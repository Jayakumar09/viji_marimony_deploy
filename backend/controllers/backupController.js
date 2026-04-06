const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { prisma } = require('../utils/database');
const googleDriveService = require('../services/googleDriveService');
const { logSystemActivity } = require('../modules/ActivityLogs/ActivityLogs');

const BACKUP_FOLDER = process.env.BACKUP_LOCAL_PATH || path.join(__dirname, '../../backups');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS) || 7;
const USE_GOOGLE_DRIVE = process.env.USE_GOOGLE_DRIVE !== 'false';
const USE_LOCAL_BACKUP = process.env.USE_LOCAL_BACKUP === 'true';

const ensureBackupFolder = () => {
  if (!fs.existsSync(BACKUP_FOLDER)) {
    fs.mkdirSync(BACKUP_FOLDER, { recursive: true });
  }
};

const getBackupFileName = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `matrimony_backup_${timestamp}.sql`;
};

const generatePostgresDump = async () => {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  const tempFile = path.join(BACKUP_FOLDER, getBackupFileName());
  ensureBackupFolder();

  let command;
  if (dbUrl.includes('sslmode=require')) {
    command = `pg_dump "${dbUrl}" -f "${tempFile}" --no-owner --no-acl`;
  } else {
    command = `pg_dump "${dbUrl}" -f "${tempFile}" --no-owner --no-acl`;
  }

  console.log('[Backup] Generating PostgreSQL dump...');
  
  try {
    await execAsync(command, { timeout: 300000 });
    const stats = fs.statSync(tempFile);
    console.log(`[Backup] Dump created: ${tempFile} (${stats.size} bytes)`);
    return tempFile;
  } catch (error) {
    console.error('[Backup] pg_dump failed:', error.message);
    throw new Error(`Failed to generate database dump: ${error.message}`);
  }
};

const uploadToGoogleDrive = async (filePath) => {
  if (!USE_GOOGLE_DRIVE) {
    console.log('[Backup] Google Drive upload disabled');
    return null;
  }

  const initialized = await googleDriveService.initialize();
  if (!initialized) {
    throw new Error('Google Drive not configured or failed to initialize');
  }

  const fileName = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath);
  
  const result = await googleDriveService.uploadFile(fileName, fileContent);
  console.log(`[Backup] Uploaded to Google Drive: ${result.name}`);
  return result;
};

const deleteLocalFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Backup] Deleted local file: ${filePath}`);
    }
  } catch (error) {
    console.error('[Backup] Failed to delete local file:', error.message);
  }
};

const getBackupStatus = async () => {
  try {
    const backups = await googleDriveService.listFiles();
    const localBackups = USE_LOCAL_BACKUP ? fs.readdirSync(BACKUP_FOLDER).filter(f => f.endsWith('.sql')) : [];
    
    let lastBackup = null;
    if (backups.length > 0) {
      lastBackup = backups[0];
    } else if (localBackups.length > 0) {
      const latestLocal = localBackups.sort().reverse()[0];
      const stats = fs.statSync(path.join(BACKUP_FOLDER, latestLocal));
      lastBackup = {
        name: latestLocal,
        createdTime: stats.mtime.toISOString(),
        size: stats.size,
        location: 'local'
      };
    }

    return {
      googleDriveConfigured: USE_GOOGLE_DRIVE && googleDriveService.isInitialized,
      localBackupConfigured: USE_LOCAL_BACKUP,
      lastBackup,
      retentionDays: RETENTION_DAYS,
      totalBackups: backups.length,
      totalLocalBackups: localBackups.length
    };
  } catch (error) {
    console.error('[Backup] Failed to get backup status:', error.message);
    return {
      googleDriveConfigured: false,
      localBackupConfigured: USE_LOCAL_BACKUP,
      lastBackup: null,
      retentionDays: RETENTION_DAYS,
      totalBackups: 0,
      totalLocalBackups: 0,
      error: error.message
    };
  }
};

const listBackups = async () => {
  try {
    const backups = await googleDriveService.listFiles();
    
    const localBackups = USE_LOCAL_BACKUP ? fs.readdirSync(BACKUP_FOLDER).filter(f => f.endsWith('.sql')).map(f => {
      const stats = fs.statSync(path.join(BACKUP_FOLDER, f));
      return {
        id: `local-${f}`,
        name: f,
        createdTime: stats.mtime.toISOString(),
        size: stats.size,
        location: 'local'
      };
    }) : [];

    return [...backups.map(b => ({ ...b, location: 'google_drive' })), ...localBackups]
      .sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
  } catch (error) {
    console.error('[Backup] Failed to list backups:', error.message);
    return [];
  }
};

const deleteBackup = async (backupId) => {
  if (backupId.startsWith('local-')) {
    if (!USE_LOCAL_BACKUP) {
      throw new Error('Local backup not enabled');
    }
    const fileName = backupId.replace('local-', '');
    const filePath = path.join(BACKUP_FOLDER, fileName);
    deleteLocalFile(filePath);
    return { location: 'local', name: fileName };
  }

  if (!USE_GOOGLE_DRIVE) {
    throw new Error('Google Drive backup not enabled');
  }

  const result = await googleDriveService.deleteFile(backupId);
  return { location: 'google_drive', id: backupId };
};

const enforceRetentionPolicy = async () => {
  try {
    const backups = await listBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    let deletedCount = 0;
    for (const backup of backups) {
      const backupDate = new Date(backup.createdTime);
      if (backupDate < cutoffDate) {
        await deleteBackup(backup.id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`[Backup] Retention policy: deleted ${deletedCount} old backups`);
      await logSystemActivity({
        action: 'BACKUP_RETENTION_ENFORCED',
        description: `Retention policy enforced: ${deletedCount} backups deleted`,
        details: `Kept last ${RETENTION_DAYS} days of backups`,
        metadata: { deletedCount, retentionDays: RETENTION_DAYS }
      });
    }

    return { deletedCount, retainedCount: backups.length - deletedCount };
  } catch (error) {
    console.error('[Backup] Retention policy failed:', error.message);
    throw error;
  }
};

const createBackup = async (adminId = null) => {
  const startTime = Date.now();
  let backupResult = null;
  let localFilePath = null;

  try {
    console.log('[Backup] Starting backup process...');

    localFilePath = await generatePostgresDump();
    
    if (USE_GOOGLE_DRIVE) {
      backupResult = await uploadToGoogleDrive(localFilePath);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    await logSystemActivity({
      action: 'BACKUP_CREATED',
      description: `Database backup created successfully`,
      status: 'Success',
      details: `Backup completed in ${duration}s`,
      metadata: {
        fileName: backupResult?.name || path.basename(localFilePath),
        fileSize: fs.statSync(localFilePath).size,
        location: USE_GOOGLE_DRIVE ? 'google_drive' : 'local',
        driveFileId: backupResult?.id,
        duration: parseFloat(duration),
        initiatedBy: adminId || 'system'
      }
    });

    if (!USE_LOCAL_BACKUP && localFilePath) {
      deleteLocalFile(localFilePath);
    }

    await enforceRetentionPolicy();

    return {
      success: true,
      fileName: backupResult?.name || path.basename(localFilePath),
      fileId: backupResult?.id,
      location: USE_GOOGLE_DRIVE ? 'google_drive' : 'local',
      size: fs.statSync(localFilePath).size,
      duration: parseFloat(duration),
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    await logSystemActivity({
      action: 'BACKUP_FAILED',
      description: `Database backup failed`,
      status: 'Error',
      error_message: error.message,
      metadata: {
        error: error.message,
        duration: parseFloat(duration),
        initiatedBy: adminId || 'system'
      }
    });

    throw error;
  }
};

const downloadBackup = async (backupId) => {
  if (backupId.startsWith('local-')) {
    const fileName = backupId.replace('local-', '');
    const filePath = path.join(BACKUP_FOLDER, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error('Local backup file not found');
    }
    return {
      name: fileName,
      content: fs.readFileSync(filePath),
      location: 'local'
    };
  }

  if (!USE_GOOGLE_DRIVE) {
    throw new Error('Google Drive not configured');
  }

  const content = await googleDriveService.downloadFile(backupId);
  const backups = await googleDriveService.listFiles();
  const backup = backups.find(b => b.id === backupId);
  
  return {
    name: backup?.name || 'backup.sql',
    content,
    location: 'google_drive'
  };
};

module.exports = {
  createBackup,
  getBackupStatus,
  listBackups,
  deleteBackup,
  downloadBackup,
  enforceRetentionPolicy
};
