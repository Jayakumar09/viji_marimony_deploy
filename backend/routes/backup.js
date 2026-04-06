const express = require('express');
const router = express.Router();
const { adminMiddleware } = require('../controllers/adminController');
const backupController = require('../controllers/backupController');

router.use(adminMiddleware);

router.get('/status', async (req, res) => {
  try {
    const status = await backupController.getBackupStatus();
    res.json(status);
  } catch (error) {
    console.error('Get backup status error:', error);
    res.status(500).json({ error: 'Failed to get backup status' });
  }
});

router.get('/list', async (req, res) => {
  try {
    const backups = await backupController.listBackups();
    res.json({ backups });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

router.post('/create', async (req, res) => {
  try {
    const adminId = req.admin?.id;
    console.log(`[Backup] Manual backup requested by admin: ${adminId}`);
    
    const result = await backupController.createBackup(adminId);
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      ...result
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create backup'
    });
  }
});

router.get('/download/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    const backup = await backupController.downloadBackup(backupId);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.name}"`);
    res.send(backup.content);
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({ error: error.message || 'Failed to download backup' });
  }
});

router.delete('/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    const adminId = req.admin?.id;
    
    const result = await backupController.deleteBackup(backupId);
    
    const { logSystemActivity } = require('../modules/ActivityLogs/ActivityLogs');
    await logSystemActivity({
      action: 'BACKUP_DELETED',
      description: `Backup deleted by admin`,
      details: `Deleted backup: ${result.name || result.id}`,
      metadata: { backupId, location: result.location, deletedBy: adminId }
    });
    
    res.json({
      success: true,
      message: 'Backup deleted successfully',
      ...result
    });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete backup'
    });
  }
});

router.post('/enforce-retention', async (req, res) => {
  try {
    const result = await backupController.enforceRetentionPolicy();
    res.json({
      success: true,
      message: 'Retention policy enforced',
      ...result
    });
  } catch (error) {
    console.error('Enforce retention error:', error);
    res.status(500).json({ error: error.message || 'Failed to enforce retention policy' });
  }
});

module.exports = router;
