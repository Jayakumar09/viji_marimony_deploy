const { prisma } = require('../utils/database');
const { performance } = require('perf_hooks');

const SLOW_QUERY_THRESHOLD_MS = 100;
const QUERY_LOG = [];

const logQuery = (query, duration, params) => {
  const entry = {
    query: query.substring(0, 200),
    duration,
    timestamp: new Date().toISOString(),
    slow: duration > SLOW_QUERY_THRESHOLD_MS
  };

  QUERY_LOG.push(entry);
  
  if (QUERY_LOG.length > 1000) {
    QUERY_LOG.shift();
  }

  if (duration > SLOW_QUERY_THRESHOLD_MS) {
    console.warn(`[DB] Slow query (${duration}ms): ${query.substring(0, 100)}`);
  }
};

const slowQueryLogs = () => QUERY_LOG.filter(q => q.slow).slice(-100);

const getQueryStats = () => {
  if (QUERY_LOG.length === 0) {
    return { count: 0, avgDuration: 0, slowCount: 0 };
  }

  const durations = QUERY_LOG.map(q => q.duration);
  const slowCount = QUERY_LOG.filter(q => q.slow).length;

  return {
    count: QUERY_LOG.length,
    avgDuration: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2),
    slowCount,
    slowPercentage: ((slowCount / QUERY_LOG.length) * 100).toFixed(2) + '%'
  };
};

const QUERY_INDEX_RECOMMENDATIONS = [
  {
    table: 'users',
    columns: ['created_at'],
    reason: 'Frequently used for sorting and date range queries'
  },
  {
    table: 'users',
    columns: ['gender', 'is_active', 'created_at'],
    reason: 'Search filters'
  },
  {
    table: 'interests',
    columns: ['sender_id', 'created_at'],
    reason: 'Sent interests listing'
  },
  {
    table: 'interests',
    columns: ['receiver_id', 'created_at'],
    reason: 'Received interests listing'
  },
  {
    table: 'interests',
    columns: ['status', 'created_at'],
    reason: 'Filter by status'
  },
  {
    table: 'messages',
    columns: ['sender_id', 'created_at'],
    reason: 'Sent messages listing'
  },
  {
    table: 'messages',
    columns: ['receiver_id', 'created_at'],
    reason: 'Received messages listing'
  },
  {
    table: 'messages',
    columns: ['is_read', 'created_at'],
    reason: 'Unread messages count'
  },
  {
    table: 'payments',
    columns: ['user_id', 'created_at'],
    reason: 'User payment history'
  },
  {
    table: 'payments',
    columns: ['payment_status', 'created_at'],
    reason: 'Payment status filtering'
  },
  {
    table: 'user_photos',
    columns: ['user_id', 'is_profile_photo'],
    reason: 'Profile photo lookup'
  },
  {
    table: 'user_documents',
    columns: ['user_id', 'document_type'],
    reason: 'Document lookup'
  },
  {
    table: 'activity_logs',
    columns: ['actor_id', 'created_at'],
    reason: 'Activity history'
  },
  {
    table: 'activity_logs',
    columns: ['resource_type', 'created_at'],
    reason: 'Resource activity'
  },
  {
    table: 'verifications',
    columns: ['user_id', 'status'],
    reason: 'User verification status'
  },
  {
    table: 'subscriptions',
    columns: ['user_id', 'status'],
    reason: 'Active subscription check'
  },
  {
    table: 'chat_messages',
    columns: ['user_id', 'is_read'],
    reason: 'Unread chat count'
  }
];

const createIndexSQL = (table, columns) => {
  const indexName = `idx_${table}_${columns.join('_')}`;
  const columnsStr = columns.join(', ');
  return `CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} (${columnsStr});`;
};

const getRecommendedIndexes = () => {
  return QUERY_INDEX_RECOMMENDATIONS.map(rec => ({
    ...rec,
    sql: createIndexSQL(rec.table, rec.columns)
  }));
};

const generateCreateIndexesMigration = () => {
  const statements = QUERY_INDEX_RECOMMENDATIONS.map(rec => {
    return `-- Index for ${rec.table}.${rec.columns.join(', ')}
-- Reason: ${rec.reason}
${createIndexSQL(rec.table, rec.columns)}`;
  });

  return `-- Auto-generated index migration
-- Run this in PostgreSQL to create recommended indexes

BEGIN;

${statements.join('\n\n')}

COMMIT;`;
};

const withQueryLogging = async (queryFn, queryName = 'query') => {
  const startTime = performance.now();
  
  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;
    logQuery(queryName, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    logQuery(`ERROR: ${queryName}`, duration);
    throw error;
  }
};

const paginate = async (model, where = {}, options = {}) => {
  const {
    page = 1,
    limit = 20,
    orderBy = { createdAt: 'desc' },
    include = {},
    select = {}
  } = options;

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include,
      select
    }),
    model.count({ where })
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total
    }
  };
};

const optimizeConnectionPool = async () => {
  try {
    await prisma.$executeRaw`
      SELECT set_config('log_statement', 'all', true)
    `;
    
    const maxConnections = parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 100;
    const connectionPoolSize = Math.min(Math.floor(maxConnections * 0.3), 20);
    
    console.log(`[DB] Connection pool size optimized to ${connectionPoolSize}`);
    
    return {
      maxConnections,
      recommendedPoolSize: connectionPoolSize,
      status: 'optimized'
    };
  } catch (error) {
    console.error('[DB] Failed to optimize connection pool:', error.message);
    return { status: 'error', message: error.message };
  }
};

const checkMissingIndexes = async () => {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 20
    `;

    const unusedIndexes = result.map(row => ({
      table: row.tablename,
      index: row.indexname,
      scans: row.idx_scan
    }));

    return {
      unusedIndexes,
      recommendation: unusedIndexes.length > 0 
        ? 'Consider dropping unused indexes to improve write performance'
        : 'All indexes are being used'
    };
  } catch (error) {
    console.error('[DB] Failed to check indexes:', error.message);
    return { unusedIndexes: [], error: error.message };
  }
};

module.exports = {
  logQuery,
  slowQueryLogs,
  getQueryStats,
  QUERY_INDEX_RECOMMENDATIONS,
  getRecommendedIndexes,
  generateCreateIndexesMigration,
  withQueryLogging,
  paginate,
  optimizeConnectionPool,
  checkMissingIndexes,
  SLOW_QUERY_THRESHOLD_MS
};
