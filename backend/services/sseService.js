/**
 * SSE (Server-Sent Events) Service - Optimized
 * - Tracks clients by session to prevent duplicates
 * - Memory-efficient client management
 * - Automatic cleanup of stale connections
 */

const clients = new Map();
const CLEANUP_INTERVAL = 60000;
const HEARTBEAT_INTERVAL = 30000;
const MAX_CLIENT_AGE = 3600000;

let cleanupTimer = null;
let heartbeatTimer = null;

function sendToClient(res, data) {
  if (res && !res.writableEnded && !res.destroyed) {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      console.error('[SSE] Write error:', e.message);
    }
  }
}

function addClient(res, sessionId = 'anonymous') {
  const key = `${sessionId}:${res.req?.ip || 'unknown'}`;
  
  if (clients.has(key)) {
    const existing = clients.get(key);
    if (existing && !existing.destroyed) {
      existing.destroy();
    }
    clients.delete(key);
  }
  
  const clientInfo = {
    res,
    sessionId,
    connectedAt: Date.now(),
    lastActivity: Date.now()
  };
  
  clients.set(key, clientInfo);
  sendToClient(res, { type: 'connected', message: 'SSE connection established', clients: clients.size });
  
  res.on('close', () => {
    clients.delete(key);
    scheduleCleanup();
  });
  
  res.on('error', () => {
    clients.delete(key);
  });
  
  scheduleCleanup();
}

function scheduleCleanup() {
  if (cleanupTimer) return;
  
  cleanupTimer = setTimeout(() => {
    cleanupStaleClients();
    cleanupTimer = null;
  }, CLEANUP_INTERVAL);
}

function cleanupStaleClients() {
  const now = Date.now();
  let removed = 0;
  
  for (const [key, client] of clients) {
    if (now - client.connectedAt > MAX_CLIENT_AGE) {
      if (client.res && !client.res.destroyed) {
        client.res.destroy();
      }
      clients.delete(key);
      removed++;
    }
  }
  
  if (removed > 0) {
    console.log(`[SSE] Cleaned up ${removed} stale clients. Active: ${clients.size}`);
  }
}

function broadcast(eventType, data, excludeSession = null) {
  const message = JSON.stringify({
    type: eventType,
    timestamp: new Date().toISOString(),
    data
  });
  
  const now = Date.now();
  
  for (const [key, client] of clients) {
    if (excludeSession && key.startsWith(excludeSession)) continue;
    
    if (client.res && !client.res.destroyed && !client.res.writableEnded) {
      try {
        client.res.write(`data: ${message}\n\n`);
        client.lastActivity = now;
      } catch (e) {
        clients.delete(key);
      }
    }
  }
}

function broadcastProfileUpdate(userId, updatedFields) {
  broadcast('profile_updated', { userId, updatedFields });
}

function broadcastAdminUpdate(updateType, data) {
  broadcast('admin_update', { updateType, data });
}

function notifyUser(userId, eventType, data) {
  broadcast(eventType, { ...data, targetUserId: userId });
}

function getClientCount() {
  return clients.size;
}

function getStats() {
  return {
    activeClients: clients.size,
    sessions: new Set([...clients.values()].map(c => c.sessionId)).size
  };
}

process.on('exit', () => {
  if (cleanupTimer) clearTimeout(cleanupTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
});

module.exports = {
  addClient,
  broadcast,
  broadcastProfileUpdate,
  broadcastAdminUpdate,
  notifyUser,
  getClientCount,
  getStats
};
