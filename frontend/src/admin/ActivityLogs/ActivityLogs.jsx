import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./ActivityLogs.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

// Date parsing utilities
const parseDate = (dateStr) => {
  if (!dateStr) return new Date();
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    const normalized = dateStr.replace(" ", "T");
    const altDate = new Date(normalized);
    if (!isNaN(altDate.getTime())) return altDate;
    return new Date();
  }
  return date;
};

const formatDate = (dateStr) => {
  const date = parseDate(dateStr);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
};

const formatRelativeTime = (dateStr) => {
  const date = parseDate(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(Math.abs(diffMs) / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
};

// Badge components
const StatusBadge = ({ status }) => {
  const statusClass = `status-badge status-${status?.toLowerCase()}`;
  return <span className={statusClass}>{status || "Unknown"}</span>;
};

const ActorBadge = ({ type }) => {
  const typeClass = `actor-badge actor-${type?.toLowerCase()}`;
  return <span className={typeClass}>{type || "System"}</span>;
};

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => (
  <div className="stat-card" style={{ "--accent-color": color }}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <span className="stat-value">{value}</span>
      <span className="stat-title">{title}</span>
    </div>
  </div>
);

// Filter Bar Component
const FilterBar = ({ filters, setFilters, onSearch, onReset }) => (
  <div className="filter-bar">
    <div className="search-box">
      <input
        type="text"
        placeholder="Search logs..."
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && onSearch()}
      />
      <button onClick={onSearch}>Search</button>
    </div>
    <div className="filter-group">
      <select
        value={filters.actorType}
        onChange={(e) => setFilters({ ...filters, actorType: e.target.value })}
      >
        <option value="ALL">All Actors</option>
        <option value="ADMIN">Admin</option>
        <option value="USER">User</option>
        <option value="SYSTEM">System</option>
      </select>
      <select
        value={filters.statusFilter}
        onChange={(e) => setFilters({ ...filters, statusFilter: e.target.value })}
      >
        <option value="ALL">All Status</option>
        <option value="Success">Success</option>
        <option value="Error">Error</option>
      </select>
      <select
        value={filters.timeFilter}
        onChange={(e) => setFilters({ ...filters, timeFilter: e.target.value })}
      >
        <option value="ALL">All Time</option>
        <option value="TODAY">Today</option>
        <option value="7_DAYS">7 Days</option>
        <option value="30_DAYS">30 Days</option>
      </select>
      <input
        type="date"
        value={filters.startDate}
        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
        placeholder="Start Date"
      />
      <input
        type="date"
        value={filters.endDate}
        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
        placeholder="End Date"
      />
    </div>
    <button className="clear-btn" onClick={onReset}>
      Clear
    </button>
  </div>
);

// Log Row Component
const LogRow = ({ log, onView }) => (
  <tr onClick={() => onView(log)} className="log-row">
    <td>
      <div className="time-cell">
        <span className="time-relative">{formatRelativeTime(log.createdAt)}</span>
        <span className="time-absolute">{formatDate(log.createdAt)}</span>
      </div>
    </td>
    <td>
      <ActorBadge type={log.actorType} />
    </td>
    <td>{log.actorName || log.actorId || "-"}</td>
    <td>
      <span className="action-tag">{log.action}</span>
    </td>
    <td>{log.details || "-"}</td>
    <td>
      <StatusBadge status={log.status} />
    </td>
    <td>
      <button className="view-btn">View</button>
    </td>
  </tr>
);

// Log Detail Modal Component
const LogDetailModal = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Log Details</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="detail-row">
            <span className="detail-label">ID</span>
            <span className="detail-value">{log.id}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Timestamp</span>
            <span className="detail-value">{formatDate(log.createdAt)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Actor Type</span>
            <span className="detail-value">
              <ActorBadge type={log.actorType} />
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Actor</span>
            <span className="detail-value">
              {log.actorName || log.actorId || "System"}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Action</span>
            <span className="detail-value">
              <span className="action-tag">{log.action}</span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Resource</span>
            <span className="detail-value">
              {log.resourceType || "-"}{" "}
              {log.resourceId ? `(ID: ${log.resourceId})` : ""}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Description</span>
            <span className="detail-value">{log.details || "-"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value">
              <StatusBadge status={log.status} />
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">IP Address</span>
            <span className="detail-value">{log.ipAddress || "-"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">User Agent</span>
            <span className="detail-value">{log.userAgent || "-"}</span>
          </div>
          {log.metadata && (
            <div className="detail-row full-width">
              <span className="detail-label">
                Metadata <span className="metadata-hint">(Technical Details)</span>
              </span>
              <pre className="metadata-json">
                {JSON.stringify(JSON.parse(log.metadata), null, 2)}
              </pre>
            </div>
          )}
          {log.errorMessage && (
            <div className="detail-row full-width">
              <span className="detail-label">Error</span>
              <span className="detail-value error">{log.errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Daily Chart Component
const DailyChart = ({ stats }) => {
  if (!stats || !stats.dailyStats || stats.dailyStats.length === 0) {
    return <div className="chart-placeholder">No data available</div>;
  }

  const maxCount = Math.max(...stats.dailyStats.map((d) => d.total));
  const chartHeight = 150;

  return (
    <div className="daily-chart">
      <h4>Daily Activity</h4>
      <div className="chart-bars">
        {stats.dailyStats.slice().reverse().map((day) => (
          <div key={day.date} className="chart-bar-container">
            <div
              className="chart-bar"
              style={{ height: `${(day.total / maxCount) * chartHeight}px` }}
              title={`${day.date}: ${day.total} logs`}
            >
              <span className="bar-value">{day.total}</span>
            </div>
            <span className="bar-label">
              {new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Top Actions Component
const TopActions = ({ actions }) => {
  if (!actions || actions.length === 0) {
    return <div className="chart-placeholder">No data</div>;
  }

  return (
    <div className="top-actions">
      <h4>Top Actions</h4>
      <ul>
        {actions.map((action, index) => (
          <li key={action.action}>
            <span className="rank">#{index + 1}</span>
            <span className="action-name">{action.action}</span>
            <span className="action-count">{action.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Main Component
const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    actorType: "ALL",
    statusFilter: "ALL",
    timeFilter: "ALL",
    startDate: "",
    endDate: "",
  });

  // Fetch logs
  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const adminToken = localStorage.getItem("adminToken");

        const params = new URLSearchParams({
          page,
          limit: pagination.limit,
          ...filters,
        });

        // Remove empty params
        Object.keys(filters).forEach((key) => {
          if (filters[key] && filters[key] !== "ALL") {
            params.set(key, filters[key]);
          }
        });

        const response = await axios.get(`${API_BASE}/api/activity-logs`, {
          params,
          headers: adminToken
            ? {
                Authorization: `Bearer ${adminToken}`,
                "admin-token": adminToken,
              }
            : {},
        });

        if (response.data?.success) {
          setLogs(response.data.logs || []);
          setPagination(response.data.pagination || {
            page,
            limit: 20,
            total: 0,
            totalPages: 0,
          });
        }
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit]
  );

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const adminToken = localStorage.getItem("adminToken");

      const response = await axios.get(
        `${API_BASE}/api/activity-logs/stats?days=7`,
        {
          headers: adminToken
            ? {
                Authorization: `Bearer ${adminToken}`,
                "admin-token": adminToken,
              }
            : {},
        }
      );

      if (response.data?.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLogs(1);
    fetchStats();
  }, []);

  const handleSearch = () => {
    fetchLogs(1);
  };

  const handleReset = () => {
    setFilters({
      search: "",
      actorType: "ALL",
      statusFilter: "ALL",
      timeFilter: "ALL",
      startDate: "",
      endDate: "",
    });
    fetchLogs(1);
  };

  const handlePageChange = (newPage) => {
    fetchLogs(newPage);
  };

  const handleViewLog = (log) => {
    setSelectedLog(log);
  };

  // Test log creation
  const handleTestLog = async () => {
    try {
      const adminToken = localStorage.getItem("adminToken");
      await axios.post(
        `${API_BASE}/api/activity-logs`,
        {
          actor_type: "ADMIN",
          actor_id: "1",
          action: "Test from Frontend",
          status: "Success",
          details: "Testing activity logs from frontend",
        },
        {
          headers: adminToken
            ? {
                Authorization: `Bearer ${adminToken}`,
                "admin-token": adminToken,
              }
            : {},
        }
      );
      fetchLogs(1);
      fetchStats();
      alert("Test log created!");
    } catch (err) {
      console.error(err);
      alert("Failed to create test log");
    }
  };

  return (
    <div className="activity-logs-container">
      <header className="header">
        <div className="header-left">
          <h1>Activity Logs</h1>
          <span className="user-info">Monitor admin & user activities</span>
        </div>
        <button className="test-log-btn" onClick={handleTestLog}>
          Add Test Log
        </button>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Today"
          value={stats?.summary?.total || 0}
          icon="📊"
          color="#6366f1"
        />
        <StatCard
          title="Success Rate"
          value={`${stats?.summary?.successRate || 0}%`}
          icon="✓"
          color="#22c55e"
        />
        <StatCard
          title="Avg/Day"
          value={stats?.summary?.avgPerDay || 0}
          icon="📈"
          color="#f59e0b"
        />
        <StatCard
          title="Total Pages"
          value={pagination.totalPages}
          icon="📄"
          color="#8b5cf6"
        />
      </div>

      {/* Charts Section */}
      {stats && (
        <div className="charts-section">
          <DailyChart stats={stats} />
          <TopActions actions={stats.topActions} />
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* Logs Table */}
      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Name</th>
              <th>Action</th>
              <th>Details</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="loading-cell">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  No logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <LogRow key={log.id} log={log} onView={handleViewLog} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button
          disabled={pagination.page === 1}
          onClick={() => handlePageChange(pagination.page - 1)}
        >
          Prev
        </button>
        <span>
          Page {pagination.page} / {pagination.totalPages || 1}
        </span>
        <button
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => handlePageChange(pagination.page + 1)}
        >
          Next
        </button>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
};

export default ActivityLogs;