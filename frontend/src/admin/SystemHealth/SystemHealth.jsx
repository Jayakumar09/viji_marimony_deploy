import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, LinearProgress,
  Chip, Alert, IconButton, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, List,
  ListItem, ListItemText, ListItemIcon, Divider, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon, Cloud, Folder, Hub,
  CheckCircle, Warning, Error as ErrorIcon, Info, Close,
  TrendingUp, TrendingDown, Dns, DeleteSweep, Schedule,
  Storage as StorageIcon, DataUsage, Speed, Timer
} from '@mui/icons-material';
import api from '../../services/api';

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

const getSeverityChip = (severity) => {
  const config = {
    info: { color: 'info', bgcolor: '#dbeafe', textcolor: '#1e40af' },
    warning: { color: 'warning', bgcolor: '#fef9c3', textcolor: '#854d0e' },
    error: { color: 'error', bgcolor: '#fee2e2', textcolor: '#991b1b' },
    critical: { color: 'error', bgcolor: '#fecaca', textcolor: '#7f1d1d' }
  };
  const c = config[severity] || config.info;
  return (
    <Chip 
      label={severity.toUpperCase()} 
      size="small"
      sx={{ 
        bgcolor: c.bgcolor, 
        color: c.textcolor, 
        fontWeight: 600,
        fontSize: '0.65rem',
        height: 20
      }} 
    />
  );
};

const UsageBar = ({ value, label, sublabel, color }) => {
  const bgColor = color || getUsageBgColor(value);
  const barColor = color || getUsageColor(value);
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="textSecondary">{label}</Typography>
          {sublabel && (
            <Typography variant="caption" color="textSecondary" sx={{ opacity: 0.7 }}>({sublabel})</Typography>
          )}
        </Box>
        <Typography variant="body2" fontWeight={600} sx={{ color: barColor }}>
          {typeof value === 'number' ? value.toFixed(1) : value}%
        </Typography>
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

const MetricCard = ({ title, icon, iconColor, children, status = 'healthy', action }) => {
  const statusColors = {
    healthy: { border: '#22c55e', bg: '#dcfce7' },
    warning: { border: '#eab308', bg: '#fef9c3' },
    error: { border: '#ef4444', bg: '#fee2e2' },
    degraded: { border: '#f97316', bg: '#ffedd5' },
    unknown: { border: '#94a3b8', bg: '#f1f5f9' }
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
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
            <Box>
              <Typography variant="h6" fontWeight={600}>{title}</Typography>
            </Box>
          </Box>
          {action}
        </Box>
        {children}
      </CardContent>
    </Card>
  );
};

const ServiceStatusBadge = ({ status, size = 'small' }) => {
  const statusConfig = {
    healthy: { color: 'success', label: 'Healthy', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
    warning: { color: 'warning', label: 'Warning', icon: <Warning sx={{ fontSize: 14 }} /> },
    error: { color: 'error', label: 'Error', icon: <ErrorIcon sx={{ fontSize: 14 }} /> },
    degraded: { color: 'warning', label: 'Degraded', icon: <Warning sx={{ fontSize: 14 }} /> },
    not_configured: { color: 'default', label: 'Not Configured', icon: <Info sx={{ fontSize: 14 }} /> },
    no_backups: { color: 'warning', label: 'No Backups', icon: <Warning sx={{ fontSize: 14 }} /> },
    disabled: { color: 'default', label: 'Disabled', icon: <Info sx={{ fontSize: 14 }} /> },
    scheduled: { color: 'success', label: 'Scheduled', icon: <Schedule sx={{ fontSize: 14 }} /> },
    excellent: { color: 'success', label: 'Excellent', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
    slow: { color: 'warning', label: 'Slow', icon: <Warning sx={{ fontSize: 14 }} /> },
    disconnected: { color: 'error', label: 'Disconnected', icon: <ErrorIcon sx={{ fontSize: 14 }} /> },
    unknown: { color: 'default', label: 'Unknown', icon: <Info sx={{ fontSize: 14 }} /> }
  };
  const config = statusConfig[status] || statusConfig.unknown;
  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size={size}
      sx={{ fontWeight: 500 }}
    />
  );
};

const ConnectionIndicator = ({ connected }) => (
  <Tooltip title={connected ? 'Connected' : 'Disconnected'}>
    <Box sx={{
      width: 10,
      height: 10,
      borderRadius: '50%',
      bgcolor: connected ? '#22c55e' : '#ef4444',
      ml: 1
    }} />
  </Tooltip>
);

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
    if (isManualRefresh) setRefreshing(true);
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

  const clearOldAlerts = async () => {
    if (!window.confirm('Delete read alerts older than 30 days?')) return;
    try {
      await api.delete('/admin/health/alerts/cleanup?days=30');
      fetchAlerts();
    } catch (error) {
      console.error('Failed to clear old alerts:', error);
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
    return () => { if (interval) clearInterval(interval); };
  }, [autoRefresh, fetchMetrics, fetchAlerts]);

  const getOverallStatus = () => {
    if (!metrics) return 'unknown';
    const { postgresql, cloudinary, googleDrive, render } = metrics;
    if (postgresql?.status === 'unhealthy' || render?.status === 'error') return 'error';
    if (postgresql?.storageUsagePercent > 85 || cloudinary?.storagePercent > 85 || render?.memoryUsagePercent > 85) return 'error';
    if (postgresql?.storageUsagePercent > 70 || cloudinary?.storagePercent > 70 || render?.memoryUsagePercent > 70) return 'warning';
    if (googleDrive?.totalBackups === 0) return 'warning';
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

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'error');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">System Health & Usage</Typography>
          <Typography variant="body2" color="textSecondary">
            Real-time infrastructure and service monitoring
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} size="small" />
            }
            label="Auto-refresh"
          />
          <Button
            variant="outlined"
            color={unreadCount > 0 ? 'warning' : 'inherit'}
            startIcon={unreadCount > 0 ? <Warning sx={{ fontSize: 18 }} /> : <Info sx={{ fontSize: 18 }} />}
            onClick={() => setAlertsDialogOpen(true)}
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
          Last updated: {lastUpdated.toLocaleTimeString('en-IN')} · Auto-refresh: {autoRefresh ? 'ON (30s)' : 'OFF'}
        </Typography>
      )}

      {overallStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} icon={<ErrorIcon />}>
          <strong>Critical:</strong> One or more services have errors or critical usage levels. Immediate action required.
        </Alert>
      )}

      {overallStatus === 'warning' && unreadCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} icon={<Warning />}>
          <strong>Warning:</strong> Services approaching usage limits. Review recommended.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="PostgreSQL"
            icon={<Dns sx={{ color: '#8B5CF6', fontSize: 22 }} />}
            iconColor="#8B5CF6"
            status={metrics?.postgresql?.status === 'unhealthy' ? 'error' : metrics?.postgresql?.storageUsagePercent > 70 ? 'warning' : 'healthy'}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ServiceStatusBadge status={metrics?.postgresql?.connectionHealth || 'unknown'} />
              <ConnectionIndicator connected={metrics?.postgresql?.connected} />
            </Box>
            
            <UsageBar
              label="Storage"
              sublabel={`${formatBytesGB(metrics?.postgresql?.currentSizeBytes || 0)} / ${formatBytesGB(metrics?.postgresql?.storageLimitGB * 1024 * 1024 * 1024 || 0)}`}
              value={metrics?.postgresql?.storageUsagePercent || 0}
            />
            <UsageBar
              label="Connections"
              sublabel={`${metrics?.postgresql?.activeConnections || 0} / ${metrics?.postgresql?.maxConnections || 100}`}
              value={metrics?.postgresql?.connectionUsagePercent || 0}
            />

            <Divider sx={{ my: 1.5 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Response Time</Typography>
              <Typography variant="caption" fontWeight={600} sx={{ color: metrics?.postgresql?.connectionTimeMs < 500 ? '#22c55e' : '#eab308' }}>
                {metrics?.postgresql?.connectionTimeMs || 0}ms
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Tables</Typography>
              <Typography variant="caption" fontWeight={600}>{metrics?.postgresql?.tableCount || 0}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Backups (7d)</Typography>
              <Typography variant="caption" fontWeight={600}>{metrics?.postgresql?.backupCount7Days || 0}</Typography>
            </Box>

            {metrics?.postgresql?.growthTrend && (
              <Box sx={{ mt: 1.5, p: 1, bgcolor: '#f8fafc', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {metrics.postgresql.growthTrend.direction === 'increasing' ? (
                    <TrendingUp sx={{ fontSize: 14, color: '#f97316' }} />
                  ) : (
                    <TrendingDown sx={{ fontSize: 14, color: '#22c55e' }} />
                  )}
                  <Typography variant="caption" color="textSecondary">
                    Growth: {metrics.postgresql.growthTrend.dailyGrowthFormatted}/day
                  </Typography>
                </Box>
              </Box>
            )}
          </MetricCard>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="Cloudinary"
            icon={<Cloud sx={{ color: '#3448c5', fontSize: 22 }} />}
            iconColor="#3448c5"
            status={metrics?.cloudinary?.status === 'error' ? 'error' : metrics?.cloudinary?.storagePercent > 70 ? 'warning' : 'healthy'}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ServiceStatusBadge status={metrics?.cloudinary?.connected ? 'healthy' : 'not_configured'} />
              <ConnectionIndicator connected={metrics?.cloudinary?.connected} />
            </Box>
            
            <UsageBar
              label="Storage"
              sublabel={`${formatBytes(metrics?.cloudinary?.storageUsed || 0)} / ${formatBytesGB(metrics?.cloudinary?.storageLimit || 0)}`}
              value={metrics?.cloudinary?.storagePercent || 0}
            />
            <UsageBar
              label="Bandwidth"
              sublabel={`${formatBytes(metrics?.cloudinary?.bandwidthUsed || 0)} / ${formatBytesGB(metrics?.cloudinary?.bandwidthLimit || 0)}`}
              value={metrics?.cloudinary?.bandwidthPercent || 0}
            />

            <Divider sx={{ my: 1.5 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Assets</Typography>
              <Typography variant="caption" fontWeight={600}>{metrics?.cloudinary?.assetCount?.toLocaleString() || 0}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Transformations</Typography>
              <Typography variant="caption" fontWeight={600}>{metrics?.cloudinary?.transformationCount?.toLocaleString() || 0}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Plan</Typography>
              <Typography variant="caption" fontWeight={600}>{metrics?.cloudinary?.plan || 'unknown'}</Typography>
            </Box>
          </MetricCard>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="Google Drive"
            icon={<Folder sx={{ color: '#1a73e8', fontSize: 22 }} />}
            iconColor="#1a73e8"
            status={metrics?.googleDrive?.status === 'error' ? 'error' : metrics?.googleDrive?.totalBackups === 0 ? 'warning' : 'healthy'}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ServiceStatusBadge status={metrics?.googleDrive?.connected ? 'healthy' : metrics?.googleDrive?.totalBackups > 0 ? 'healthy' : 'no_backups'} />
              <ConnectionIndicator connected={metrics?.googleDrive?.connected} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
              <Typography variant="h3" fontWeight="bold" color="primary">
                {metrics?.googleDrive?.totalBackups || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">total backups</Typography>
            </Box>

            <Divider sx={{ my: 1.5 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Last Backup</Typography>
              <Typography variant="caption" fontWeight={600}>
                {metrics?.googleDrive?.lastBackup?.completedAt
                  ? new Date(metrics.googleDrive.lastBackup.completedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                  : 'Never'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Last Size</Typography>
              <Typography variant="caption" fontWeight={600}>
                {metrics?.googleDrive?.lastBackup?.fileSizeFormatted || 'N/A'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Recent (7d)</Typography>
              <Typography variant="caption" fontWeight={600}>{metrics?.googleDrive?.recentBackupCount || 0}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Retention</Typography>
              <Typography variant="caption" fontWeight={600}>{metrics?.googleDrive?.retentionDays || 30} days</Typography>
            </Box>
          </MetricCard>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="Render Backend"
            icon={<Hub sx={{ color: '#673ab7', fontSize: 22 }} />}
            iconColor="#673ab7"
            status={metrics?.render?.status === 'error' ? 'error' : metrics?.render?.memoryUsagePercent > 70 ? 'warning' : 'healthy'}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ServiceStatusBadge status={metrics?.render?.apiHealth || 'unknown'} />
              <ConnectionIndicator connected={metrics?.render?.dbConnectionOk} />
              <Typography variant="caption" color="textSecondary" sx={{ ml: 0.5 }}>DB</Typography>
            </Box>
            
            <UsageBar
              label="Memory (System)"
              sublabel={`${formatBytes(metrics?.render?.memoryUsed || 0)} / ${formatBytesGB(metrics?.render?.memoryTotal || 0)}`}
              value={metrics?.render?.memoryUsagePercent || 0}
            />
            <UsageBar
              label="Heap"
              sublabel={`${formatBytesMB(metrics?.render?.heapUsed || 0)} / ${formatBytesMB(metrics?.render?.heapTotal || 0)}`}
              value={metrics?.render?.heapUsagePercent || 0}
            />
            <UsageBar
              label="CPU Load"
              value={metrics?.render?.cpuUsage || 0}
            />

            <Divider sx={{ my: 1.5 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Uptime</Typography>
              <Typography variant="caption" fontWeight={600}>{metrics?.render?.uptimeFormatted || '0m'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Environment</Typography>
              <Typography variant="caption" fontWeight={600}>{metrics?.render?.environment || 'unknown'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Error Rate</Typography>
              <Typography variant="caption" fontWeight={600} sx={{ color: metrics?.render?.errorRate > 0 ? '#ef4444' : 'inherit' }}>
                {metrics?.render?.errorRate || 0}%
              </Typography>
            </Box>
          </MetricCard>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>Scheduled Jobs</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Schedule sx={{ color: '#8B5CF6' }} />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>Daily Database Backup</Typography>
                      <Typography variant="caption" color="textSecondary">
                        Schedule: {metrics?.cron?.schedule || '0 2 * * *'} ({metrics?.cron?.timezone || 'Asia/Kolkata'})
                      </Typography>
                    </Box>
                  </Box>
                  <ServiceStatusBadge status={metrics?.cron?.status || 'unknown'} />
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Last Run</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {metrics?.cron?.lastRun
                        ? new Date(metrics.cron.lastRun).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                        : 'Never'}
                    </Typography>
                    {metrics?.cron?.lastRunStatus && (
                      <Chip 
                        label={metrics.cron.lastRunStatus === 'success' ? 'Success' : 'Failed'} 
                        size="small"
                        color={metrics.cron.lastRunStatus === 'success' ? 'success' : 'error'}
                        sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }}
                      />
                    )}
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Next Run</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {metrics?.cron?.nextRun
                        ? new Date(metrics.cron.nextRun).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                        : 'Not scheduled'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>Usage Thresholds</Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: '#dcfce7', border: '1px solid #22c55e' }} />
            <Typography variant="caption">&lt;70% Good</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: '#fef9c3', border: '1px solid #eab308' }} />
            <Typography variant="caption">70-85% Caution</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: '#ffedd5', border: '1px solid #f97316' }} />
            <Typography variant="caption">85-95% Warning</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: '#fee2e2', border: '1px solid #ef4444' }} />
            <Typography variant="caption">&gt;95% Critical</Typography>
          </Box>
        </Box>
      </Box>

      <Dialog
        open={alertsDialogOpen}
        onClose={() => setAlertsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning sx={{ color: '#eab308' }} />
            <span>System Alerts</span>
            {unreadCount > 0 && <Chip label={`${unreadCount} unread`} size="small" color="warning" />}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" startIcon={<DeleteSweep />} onClick={clearOldAlerts}>
              Cleanup
            </Button>
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
        <DialogContent dividers sx={{ maxHeight: 500 }}>
          {alerts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle sx={{ fontSize: 48, color: '#22c55e', mb: 1 }} />
              <Typography color="textSecondary">No alerts at this time. All systems healthy.</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {alerts.map((alert) => (
                <ListItem
                  key={alert.id}
                  sx={{
                    bgcolor: alert.isRead ? 'transparent' : '#f0f9ff',
                    borderRadius: 2,
                    mb: 1,
                    border: '1px solid #e2e8f0',
                    flexDirection: 'column',
                    alignItems: 'stretch'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {alert.severity === 'critical' ? (
                        <ErrorIcon sx={{ color: '#ef4444' }} />
                      ) : alert.severity === 'error' ? (
                        <ErrorIcon sx={{ color: '#ef4444' }} />
                      ) : alert.severity === 'warning' ? (
                        <Warning sx={{ color: '#eab308' }} />
                      ) : (
                        <Info sx={{ color: '#3b82f6' }} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography fontWeight={alert.isRead ? 400 : 600}>{alert.title}</Typography>
                          {getSeverityChip(alert.severity)}
                          <Chip label={alert.service} size="small" variant="outlined" />
                          {alert.metricName && (
                            <Typography variant="caption" color="textSecondary">
                              {alert.metricName}: {alert.metricValue}{alert.threshold ? ` (threshold: ${alert.threshold})` : ''}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="textSecondary">{alert.message}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(alert.createdAt).toLocaleString('en-IN')}
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f8fafc' }}>
          <Typography variant="caption" color="textSecondary" sx={{ flex: 1 }}>
            Alerts auto-generate when thresholds are exceeded. Unread alerts trigger banner warnings.
          </Typography>
          <Button onClick={() => setAlertsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemHealth;
