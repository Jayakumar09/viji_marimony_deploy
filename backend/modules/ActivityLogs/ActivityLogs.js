const express = require("express");
const router = express.Router();
const { prisma } = require("../../utils/database");

/* =========================
   INITIALIZE TABLES (ensure they exist in PostgreSQL)
   This runs once on server startup
========================= */
const initializeActivityLogTables = async () => {
  try {
    // Check if activity_logs table exists
    await prisma.$queryRaw`SELECT 1 FROM activity_logs LIMIT 1`;
    console.log("[ActivityLogs] activity_logs table exists");
  } catch (err) {
    console.log("[ActivityLogs] Creating activity_logs table...");
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          actor_type TEXT,
          actor_id TEXT,
          actor_name TEXT,
          action TEXT,
          status TEXT,
          details TEXT,
          resource_type TEXT,
          resource_id TEXT,
          ip_address TEXT,
          user_agent TEXT,
          metadata TEXT,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log("[ActivityLogs] activity_logs table created");
    } catch (createErr) {
      console.error("[ActivityLogs] Failed to create activity_logs:", createErr.message);
    }
  }

  try {
    // Check if admin_activity_logs table exists
    await prisma.$queryRaw`SELECT 1 FROM admin_activity_logs LIMIT 1`;
    console.log("[ActivityLogs] admin_activity_logs table exists");
  } catch (err) {
    console.log("[ActivityLogs] Creating admin_activity_logs table...");
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS admin_activity_logs (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          admin_id TEXT NOT NULL,
          action TEXT NOT NULL,
          target_user_id TEXT,
          details TEXT,
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log("[ActivityLogs] admin_activity_logs table created");
    } catch (createErr) {
      console.error("[ActivityLogs] Failed to create admin_activity_logs:", createErr.message);
    }
  }
};

// Run initialization once on module load
initializeActivityLogTables();

/* =========================
   INSERT LOG (standalone function)
========================= */
const logActivity = async ({
  actor_type,
  actor_id,
  actor_name = null,
  action,
  resource_type = null,
  resource_id = null,
  description = null,
  status = "Success",
  details,
  ip_address,
  user_agent,
  metadata = null,
  error_message = null,
}) => {
  try {
    await prisma.activityLog.create({
      data: {
        actorType: actor_type || "USER",
        actorId: actor_id || "unknown",
        actorName: actor_name,
        action: action || "unknown",
        status: status || "Success",
        details: details || description || "",
        resourceType: resource_type,
        resourceId: resource_id,
        ipAddress: ip_address || null,
        userAgent: user_agent || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        errorMessage: error_message,
      },
    });
    return { success: true };
  } catch (err) {
    console.error("Log error:", err.message);
    return { success: false, error: err.message };
  }
};

/* =========================
   CREATE LOG
========================= */
router.post("/", async (req, res) => {
  try {
    const {
      actor_type,
      actor_id,
      actor_name,
      action,
      status,
      details,
      description,
      resource_type,
      resource_id,
      ip_address,
      user_agent,
      metadata,
      error_message,
    } = req.body;

    const log = await prisma.activityLog.create({
      data: {
        actorType: actor_type || "USER",
        actorId: actor_id || "unknown",
        actorName: actor_name,
        action: action || "unknown",
        status: status || "Success",
        details: details || description || "",
        resourceType: resource_type,
        resourceId: resource_id,
        ipAddress: ip_address || req.ip,
        userAgent: user_agent || req.get("User-Agent"),
        metadata: metadata ? JSON.stringify(metadata) : null,
        errorMessage: error_message,
      },
    });

    res.json({ success: true, log });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   GET LOGS (with pagination & filtering)
========================= */
router.get("/", async (req, res) => {
  try {
    const {
      search = "",
      actorType = "ALL",
      timeFilter = "ALL",
      statusFilter = "ALL",
      startDate,
      endDate,
      action,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const offset = (page - 1) * limit;
    const limitInt = parseInt(limit) || 20;
    const pageInt = parseInt(page) || 1;

    // Build where conditions using Prisma style
    const whereConditions = [];

    if (search) {
      whereConditions.push({
        OR: [
          { action: { contains: search, mode: "insensitive" } },
          { details: { contains: search, mode: "insensitive" } },
          { actorName: { contains: search, mode: "insensitive" } },
          { actorId: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (actorType !== "ALL") {
      whereConditions.push({ actorType: actorType });
    }

    if (statusFilter !== "ALL") {
      whereConditions.push({ status: statusFilter });
    }

    // Handle action filter from frontend (actionFilter parameter)
    const actionFilter = req.query.actionFilter || req.query.action;
    if (actionFilter && actionFilter !== "ALL") {
      whereConditions.push({ action: actionFilter });
    }

    // Time filter
    let startDateFilter = null;
    const now = new Date();
    if (timeFilter === "TODAY") {
      startDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeFilter === "7_DAYS") {
      startDateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeFilter === "30_DAYS") {
      startDateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (startDate) {
      startDateFilter = new Date(startDate);
    }

    if (startDateFilter) {
      whereConditions.push({ createdAt: { gte: startDateFilter } });
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      whereConditions.push({ createdAt: { lte: endDateObj } });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Validate sortOrder
    const validSortOrder = sortOrder.toLowerCase() === "asc" ? "asc" : "desc";

    // Get logs with pagination - include user details for USER actor type
    const logs = await prisma.activityLog.findMany({
      where: where,
      orderBy: { [sortBy]: validSortOrder },
      skip: offset,
      take: limitInt,
    });

    // Enhance logs with user details for USER actor type
    const enhancedLogs = await Promise.all(
      logs.map(async (log) => {
        if (log.actorType === "USER" && log.actorId) {
          try {
            const user = await prisma.user.findUnique({
              where: { id: log.actorId },
              select: { firstName: true, lastName: true, email: true, phone: true },
            });
            if (user) {
              return {
                ...log,
                userDetails:
                  `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                  user.email ||
                  user.phone ||
                  "Unknown",
              };
            }
          } catch (err) {
            // User not found
          }
        }
        return log;
      })
    );

    const totalCount = await prisma.activityLog.count({ where: where });

    // Get today's date for stats
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get stats using multiple queries (SQLite compatible)
    const [totalToday, adminToday, userToday, errorsToday] = await Promise.all([
      prisma.activityLog.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.activityLog.count({
        where: { actorType: "ADMIN", createdAt: { gte: todayStart } },
      }),
      prisma.activityLog.count({
        where: { actorType: "USER", createdAt: { gte: todayStart } },
      }),
      prisma.activityLog.count({
        where: { status: "Error", createdAt: { gte: todayStart } },
      }),
    ]);

    res.json({
      success: true,
      logs: enhancedLogs,
      stats: {
        total_today: totalToday,
        admin_logs_today: adminToday,
        user_logs_today: userToday,
        errors_today: errorsToday,
      },
      pagination: {
        total: totalCount,
        page: pageInt,
        totalPages: Math.ceil(totalCount / limitInt),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   GET STATS (daily statistics)
========================= */
router.get("/stats", async (req, res) => {
  try {
    const { days = 7, startDate, endDate } = req.query;
    const daysInt = parseInt(days) || 7;
    const now = new Date();

    let startDateFilter;
    if (startDate && endDate) {
      startDateFilter = new Date(startDate);
      startDateFilter.setHours(0, 0, 0, 0);
    } else {
      startDateFilter = new Date(now.getTime() - daysInt * 24 * 60 * 60 * 1000);
    }

    const endDateFilter = endDate ? new Date(endDate) : now;

    // Get daily stats
    const dailyStats = await prisma.$queryRaw`
      SELECT 
        date(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'Error' THEN 1 ELSE 0 END) as failed_count
      FROM activity_logs
      WHERE created_at >= ${startDateFilter} AND created_at <= ${endDateFilter}
      GROUP BY date(created_at)
      ORDER BY date DESC
    `;

    // Get top actions
    const topActions = await prisma.activityLog.groupBy({
      by: ["action"],
      where: {
        createdAt: { gte: startDateFilter },
      },
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: "desc",
        },
      },
      take: 10,
    });

    // Get actor stats
    const actorStats = await prisma.activityLog.groupBy({
      by: ["actorType"],
      where: {
        createdAt: { gte: startDateFilter },
      },
      _count: {
        actorType: true,
      },
    });

    // Calculate summary
    const totalLogs = dailyStats.reduce((sum, d) => sum + Number(d.total), 0);
    const successLogs = dailyStats.reduce((sum, d) => sum + Number(d.success_count || 0), 0);
    const successRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 0;
    const avgPerDay = dailyStats.length > 0 ? Math.round(totalLogs / dailyStats.length) : 0;

    res.json({
      success: true,
      dailyStats: dailyStats.map((d) => ({
        date: d.date,
        total: Number(d.total),
        success_count: Number(d.success_count || 0),
        failed_count: Number(d.failed_count || 0),
      })),
      topActions: topActions.map((a) => ({
        action: a.action,
        count: a._count.action,
      })),
      actorStats: actorStats.map((a) => ({
        actorType: a.actorType,
        count: a._count.actorType,
      })),
      summary: {
        total: totalLogs,
        successRate,
        avgPerDay,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   GET LOG BY ID
========================= */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const log = await prisma.activityLog.findUnique({
      where: { id },
    });

    if (!log) {
      return res.status(404).json({ success: false, error: "Log not found" });
    }

    // If USER actor, get user details
    if (log.actorType === "USER" && log.actorId) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: log.actorId },
          select: { firstName: true, lastName: true, email: true, phone: true },
        });
        if (user) {
          log.userDetails =
            `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
            user.email ||
            user.phone ||
            "Unknown";
        }
      } catch (err) {
        // User not found
      }
    }

    res.json({ success: true, log });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   DELETE LOG
========================= */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.activityLog.delete({
      where: { id },
    });

    res.json({ success: true, message: "Log deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   CLEAN OLD LOGS
========================= */
router.delete("/", async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;
    const daysInt = parseInt(daysToKeep) || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInt);

    const result = await prisma.activityLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    res.json({
      success: true,
      message: `Deleted ${result.count} old logs`,
      deletedCount: result.count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   EXPORT FUNCTIONS
========================= */
module.exports = {
  router,
  logActivity,
};

/* =========================
   ADMIN ACTIVITY LOGS ENDPOINTS
   Fetch from admin_activity_logs table
========================= */

// Get admin activity logs
router.get("/admin", async (req, res) => {
  try {
    const {
      search = "",
      action,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const offset = (page - 1) * limit;
    const limitInt = parseInt(limit) || 20;
    const pageInt = parseInt(page) || 1;

    // Build where conditions
    const whereConditions = [];

    if (search) {
      whereConditions.push({
        OR: [
          { action: { contains: search, mode: "insensitive" } },
          { details: { contains: search, mode: "insensitive" } },
          { targetUserId: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (action) {
      whereConditions.push({ action: action });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Get logs
    const logs = await prisma.$queryRaw`
      SELECT * FROM admin_activity_logs
      ORDER BY ${sortBy === "createdAt" ? "created_at" : "action"} ${sortOrder.toUpperCase()}
      LIMIT ${limitInt} OFFSET ${offset}
    `;

    // Get total count
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM admin_activity_logs
      ${whereConditions.length > 0 ? 
        `WHERE action LIKE '%${search}%' OR details LIKE '%${search}%'` : ''}
    `;
    const totalCount = parseInt(countResult[0]?.total || 0);

    res.json({
      success: true,
      logs: logs,
      pagination: {
        total: totalCount,
        page: pageInt,
        totalPages: Math.ceil(totalCount / limitInt),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});
