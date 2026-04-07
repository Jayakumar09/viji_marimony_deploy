const express = require('express');
const router = express.Router();
const { adminAuthMiddleware } = require('../middleware/auth');
const healthService = require('../services/healthService');

router.use(adminAuthMiddleware);

router.get('/metrics', async (req, res) => {
  try {
    const metrics = await healthService.getAllHealthMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('[Health API] Failed to get metrics:', error.message);
    res.status(500).json({ error: 'Failed to fetch health metrics' });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = await healthService.getRecentAlerts(limit);
    const unreadCount = await healthService.getUnreadAlertCount();
    res.json({ alerts, unreadCount });
  } catch (error) {
    console.error('[Health API] Failed to get alerts:', error.message);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.put('/alerts/:id/read', async (req, res) => {
  try {
    const adminId = req.admin?.id || 'system';
    const result = await healthService.markAlertRead(req.params.id, adminId);
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('[Health API] Failed to mark alert read:', error.message);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

router.put('/alerts/read-all', async (req, res) => {
  try {
    const adminId = req.admin?.id || 'system';
    const result = await healthService.markAllAlertsRead(adminId);
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('[Health API] Failed to mark all alerts read:', error.message);
    res.status(500).json({ error: 'Failed to update alerts' });
  }
});

router.delete('/alerts/cleanup', async (req, res) => {
  try {
    const daysOld = parseInt(req.query.days) || 30;
    const result = await healthService.clearOldAlerts(daysOld);
    if (result.success) {
      res.json({ success: true, deletedCount: result.deletedCount });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('[Health API] Failed to clear old alerts:', error.message);
    res.status(500).json({ error: 'Failed to cleanup alerts' });
  }
});

router.post('/backup-check', async (req, res) => {
  try {
    const metrics = await healthService.triggerBackupCheck();
    res.json({ success: true, metrics });
  } catch (error) {
    console.error('[Health API] Failed to trigger backup check:', error.message);
    res.status(500).json({ error: 'Failed to trigger backup check' });
  }
});

module.exports = router;
