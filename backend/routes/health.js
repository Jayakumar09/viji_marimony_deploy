const express = require('express');
const router = express.Router();
const { adminAuthMiddleware } = require('../middleware/auth');
const healthService = require('../services/healthService');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const cache = require('../utils/cache');

router.use(adminAuthMiddleware);

router.get('/metrics', cacheMiddleware('health-metrics', 30000), async (req, res) => {
  try {
    const metrics = await healthService.getAllHealthMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health metrics' });
  }
});

router.get('/alerts', cacheMiddleware('health-alerts', 15000), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = await healthService.getRecentAlerts(limit);
    const unreadCount = await healthService.getUnreadAlertCount();
    res.json({ alerts, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.put('/alerts/:id/read', async (req, res) => {
  try {
    const adminId = req.admin?.id || 'system';
    const result = await healthService.markAlertRead(req.params.id, adminId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

router.put('/alerts/read-all', async (req, res) => {
  try {
    const adminId = req.admin?.id || 'system';
    const result = await healthService.markAllAlertsRead(adminId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update alerts' });
  }
});

router.delete('/alerts/cleanup', async (req, res) => {
  try {
    const result = await healthService.clearOldAlerts();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cleanup alerts' });
  }
});

router.post('/backup-execute', async (req, res) => {
  try {
    const adminId = req.admin?.id || 'manual';
    const result = await healthService.executeBackup(adminId);
    cache.clearByPrefix('health-');
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute backup' });
  }
});

router.post('/service-check', async (req, res) => {
  try {
    cache.clearByPrefix('health-');
    const metrics = await healthService.getAllHealthMetrics(true);
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ error: 'Failed to run service check' });
  }
});

module.exports = router;
