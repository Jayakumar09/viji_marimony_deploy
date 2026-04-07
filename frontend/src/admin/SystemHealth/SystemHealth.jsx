import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, LinearProgress,
  Chip, Alert, IconButton, Tooltip, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, List,
  ListItem, ListItemText, ListItemIcon, Divider, CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon, Storage, Cloud, Folder, Server,
  CheckCircle, Warning, Error as ErrorIcon, Info, Close,
  TrendingUp, Database, NetworkCheck, Schedule, DeleteSweep
} from '@mui/icons-material';
import api from '../../../services/api';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getUsageColor = (percent) => {
  if (percent < 70) return '#22c55e';
  if (percent < 85) return '#eab308';
  if (percent < 95) return '#f97316';
  return '#ef4444';
};

const getUsageBgColor = (percent) => {
  if (percent < 70) return '#dcfce7';
  if (percent < 85) return '#fef9c3';
  if (percent < 95) return '#ffedd5';
  return '#fee2e2';
};

const UsageBar = ({ value, label, showPercent = true, color }) => {
  const bgColor = color || getUsageBgColor(value);
  const barColor = color || getUsageColor(value);
  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" color="textSecondary">{label}</Typography>
        {showPercent && (
          <Typography variant="body2" fontWeight={600} sx={{ color: barColor }}>
            {value}%
          </Typography>
        )}
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(value, 100)}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: '#f1f5f9',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            bgcolor: barColor
          }
        }}
      />
    </Box>
  );
};

const MetricCard = ({ title, icon, children, status = 'healthy' }) => {
  const statusColors = {
    healthy: { border: '#22c55e', bg: '#dcfce7', icon: '#22c55e' },
    warning: { border: '#eab308', bg: '#fef9c3', icon: '#eab308' },
    error: { border: '#ef4444', bg: '#fee2e2', icon: '#ef4444' },
    unknown: { border: '#94a3b8', bg: '#f1f5f9', icon: '#94a3b8' }
  };
  const colors = statusColors[status] || statusColors.unknown;

  return (
    <Card sx={{
      height: '100%',
      borderRadius: 3,
      border: `3px solid ${colors.border}`,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1.5 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </Box>
          <Typography variant="h6" fontWeight={600}>{title}</Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
};

const ServiceStatusBadge = ({ status }) => {
  const statusConfig = {
    healthy: { color: 'success', label: 'Healthy', icon: <CheckCircle sx={{ fontSize: 16 }} /> },
    warning: { color: 'warning', label: 'Warning', icon: <Warning sx={{ fontSize: 16 }} /> },
    error: { color: 'error', label: 'Error', icon: <ErrorIcon sx={{ fontSize: 16 }} /> },
    degraded: { color: 'warning', label: 'Degraded', icon: <Warning sx={{ fontSize: 16 }} /> },
    not_configured: { color: 'default', label: 'Not Configured', icon: <Info sx={{ fontSize: 16 }} /> },
    no_backups: { color: 'warning', label: 'No Backups', icon: <Warning sx={{ fontSize: 16 }} /> },
    unknown: { color: 'default', label: 'Unknown', icon: <Info sx={{ fontSize: 16 }} /> }
  };
  const config = statusConfig[status] || statusConfig.unknown;
  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size="small"
      sx={{ fontWeight: 500 }}
    />
  );
};

const SystemHealth = () => {
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alertsDialogOpen, setAlertsDialogOpen] = useState(false);

  const fetchMetrics = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    }
    try {
      const response = await api.get('/admin/health/metrics');
      setMetrics(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await api.get('/admin/health/alerts');
      setAlerts(response.data.alerts || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/admin/health/alerts/read-all');
      fetchAlerts();
    } catch (error) {
      console.error('Failed to mark alerts read:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchAlerts();
  }, [fetchMetrics, fetchAlerts]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchMetrics();
        fetchAlerts();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, fetchMetrics, fetchAlerts]);

  const getOverallStatus = () => {
    if (!metrics) return 'unknown';
    const { postgresql, cloudinary, googleDrive, render } = metrics;
    if (postgresql?.status === 'unhealthy' || render?.status === 'error') return 'error';
    if (postgresql?.storageUsagePercent > 85 || cloudinary?.storagePercent > 85 || render?.memoryUsagePercent > 85) return 'error';
    if (postgresql?.storageUsagePercent > 70 || cloudinary?.storagePercent > 70 || render?.memoryUsagePercent > 70) return 'warning';
    return 'healthy';
  };

  const overallStatus = getOverallStatus();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">System Health & Usage</Typography>
          <Typography variant="body2" color="textSecondary">
            Monitor infrastructure and third-party service usage
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                size="small"
              />
            }
            label="Auto-refresh (30s)"
          />
          <Button
            variant="outlined"
            startIcon={<DeleteSweep />}
            onClick={() => { setAlertsDialogOpen(true); }}
            sx={{ borderRadius: 2 }}
          >
            Alerts ({unreadCount})
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            sx={{ borderRadius: 2 }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {lastUpdated && (
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
          Last updated: {lastUpdated.toLocaleTimeString('en-IN')}
        </Typography>
      )}

      {overallStatus === 'error' && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2 }}
          icon={<ErrorIcon />}
        >
          <strong>Critical:</strong> One or more services are experiencing high usage or errors.
          Please take immediate action to prevent service disruption.
        </Alert>
      )}

      {overallStatus === 'warning' && unreadCount > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3, borderRadius: 2 }}
          icon={<Warning />}
        >
          <strong>Warning:</strong> Some services are approaching their usage limits.
          Consider upgrading or optimizing resources.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="PostgreSQL"
            icon={<Database sx={{ color: '#8B5CF6' }} />}
            status={metrics?.postgresql?.status === 'unhealthy' ? 'error' : 'healthy'}
          >
            <ServiceStatusBadge status={metrics?.postgresql?.connectionHealth === 'good' ? 'healthy' : 'warning'} />
            <Box sx={{ mt: 2 }}>
              <UsageBar
                label="Storage"
                value={metrics?.postgresql?.storageUsagePercent || 0}
              />
              <UsageBar
                label="Connections"
                value={metrics?.postgresql?.connectionUsagePercent || 0}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                {metrics?.postgresql?.currentSizeGB || 0} GB / {metrics?.postgresql?.estimatedLimitGB || 0} GB
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {metrics?.postgresql?.activeConnections || 0} / {metrics?.postgresql?.maxConnections || 100} connections
              </Typography>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="textSecondary">Tables</Typography>
              <Typography variant="caption" fontWeight={600}>{metrics?.postgresql?.tableCount || 0}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Last Backup</Typography>
              <Typography variant="caption" fontWeight={600}>
                {metrics?.postgresql?.lastBackup?.completedAt
                  ? new Date(metrics.postgresql.lastBackup.completedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                  : 'Never'}
              </Typography>
            </Box>
          </MetricCard>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="Cloudinary"
            icon={<Cloud sx={{ color: '#3448c5' }} />}
            status={metrics?.cloudinary?.status === 'error' ? 'error' : metrics?.cloudinary?.storagePercent > 70 ? 'warning' : 'healthy'}
          >
            <ServiceStatusBadge status={metrics?.cloudinary?.status === 'not_configured' ? 'not_configured' : 'healthy'} />
            <Box sx={{ mt: 2 }}>
              <UsageBar
                label="Storage"
                value={metrics?.cloudinary?.storagePercent || 0}
              />
              <UsageBar
                label="Bandwidth"
                value={metrics?.cloudinary?.bandwidthPercent || 0}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                {formatBytes(metrics?.cloudinary?.storageUsed || 0)} / {formatBytes(metrics?.cloudinary?.storageLimit || 0)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {formatBytes(metrics?.cloudinary?.bandwidthUsed || 0)} bandwidth used
              </Typography>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="textSecondary">Assets</Typography>
              <Typography variant="caption" fontWeight={600}>{metrics?.cloudinary?.assetCount?.toLocaleString() || 0}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Transformations</Typography>
              <Typography variant="caption" fontWeight={600}>{metrics?.cloudinary?.transformations?.toLocaleString() || 0}</Typography>
            </Box>
          </MetricCard>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="Google Drive"
            icon={<Folder sx={{ color: '#1a73e8' }} />}
            status={metrics?.googleDrive?.status === 'error' ? 'error' : metrics?.googleDrive?.totalBackups === 0 ? 'warning' : 'healthy'}
          >
            <ServiceStatusBadge status={metrics?.googleDrive?.status || 'unknown'} />
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Total Backups
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {metrics?.googleDrive?.totalBackups || 0}
              </Typography>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="textSecondary">Last Backup</Typography>
              <Typography variant="caption" fontWeight={600}>
                {metrics?.googleDrive?.lastBackup?.completedAt
                  ? new Date(metrics.googleDrive.lastBackup.completedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                  : 'Never'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Last Size</Typography>
              <Typography variant="caption" fontWeight={600}>
                {metrics?.googleDrive?.lastBackup?.fileSize
                  ? formatBytes(Number(metrics.googleDrive.lastBackup.fileSize))
                  : 'N/A'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Next Run</Typography>
              <Typography variant="caption" fontWeight={600}>
                {metrics?.googleDrive?.nextScheduledRun
                  ? new Date(metrics.googleDrive.nextScheduledRun).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                  : 'Not scheduled'}
              </Typography>
            </Box>
          </MetricCard>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="Render (Backend)"
            icon={<Server sx={{ color: '#673ab7' }} />}
            status={metrics?.render?.status === 'error' ? 'error' : metrics?.render?.memoryUsagePercent > 70 ? 'warning' : 'healthy'}
          >
            <ServiceStatusBadge status={metrics?.render?.apiHealth === 'healthy' ? 'healthy' : 'degraded'} />
            <Box sx={{ mt: 2 }}>
              <UsageBar
                label="Memory"
                value={metrics?.render?.memoryUsagePercent || 0}
              />
              <UsageBar
                label="CPU (Load)"
                value={metrics?.render?.cpuUsage || 0}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                {formatBytes(metrics?.render?.memoryUsed || 0)} / {formatBytes(metrics?.render?.memoryTotal || 0)}
              </Typography>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="textSecondary">Uptime</Typography>
              <Typography variant="caption" fontWeight={600}>{metrics?.render?.uptimeFormatted || '0m'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Environment</Typography>
              <Typography variant="caption" fontWeight={600}>{metrics?.render?.environment || 'unknown'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Error Rate</Typography>
              <Typography variant="caption" fontWeight={600} sx={{ color: metrics?.render?.errorRate > 0 ? '#ef4444' : 'inherit' }}>
                {metrics?.render?.errorRate || 0}%
              </Typography>
            </Box>
          </MetricCard>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>Usage Legend</Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: '#dcfce7', border: '1px solid #22c55e' }} />
            <Typography variant="caption">Green: &lt;70% (Good)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: '#fef9c3', border: '1px solid #eab308' }} />
            <Typography variant="caption">Yellow: 70-85% (Caution)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: '#ffedd5', border: '1px solid #f97316' }} />
            <Typography variant="caption">Orange: 85-95% (Warning)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: '#fee2e2', border: '1px solid #ef4444' }} />
            <Typography variant="caption">Red: &gt;95% (Critical)</Typography>
          </Box>
        </Box>
      </Box>

      <Dialog
        open={alertsDialogOpen}
        onClose={() => setAlertsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning sx={{ color: '#eab308' }} />
            <span>System Alerts</span>
            {unreadCount > 0 && <Chip label={`${unreadCount} unread`} size="small" color="warning" />}
          </Box>
          <Box>
            {unreadCount > 0 && (
              <Button size="small" onClick={markAllRead} startIcon={<CheckCircle />}>
                Mark All Read
              </Button>
            )}
            <IconButton onClick={() => setAlertsDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {alerts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle sx={{ fontSize: 48, color: '#22c55e', mb: 1 }} />
              <Typography color="textSecondary">No alerts at this time</Typography>
            </Box>
          ) : (
            <List>
              {alerts.map((alert) => (
                <ListItem
                  key={alert.id}
                  sx={{
                    bgcolor: alert.isRead ? 'transparent' : '#f0f9ff',
                    borderRadius: 2,
                    mb: 1,
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <ListItemIcon>
                    {alert.severity === 'critical' || alert.severity === 'error' ? (
                      <ErrorIcon sx={{ color: '#ef4444' }} />
                    ) : alert.severity === 'warning' ? (
                      <Warning sx={{ color: '#eab308' }} />
                    ) : (
                      <Info sx={{ color: '#3b82f6' }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={alert.isRead ? 400 : 600}>{alert.title}</Typography>
                        <Chip label={alert.service} size="small" variant="outlined" />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">{alert.message}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {new Date(alert.createdAt).toLocaleString('en-IN')}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemHealth;
