/**
 * SSE (Server-Sent Events) Service
 * Handles real-time notifications to clients when database changes occur
 */

const clients = new Set();

// Add a new client connection
function addClient(res) {
  clients.add(res);
  console.log(`SSE Client connected. Total clients: ${clients.size}`);
  
  // Send initial connection confirmation
  sendToClient(res, { type: 'connected', message: 'SSE connection established' });
  
  // Remove client on close
  res.on('close', () => {
    clients.delete(res);
    console.log(`SSE Client disconnected. Total clients: ${clients.size}`);
  });
}

// Send message to a specific client
function sendToClient(res, data) {
  if (res && !res.writableEnded) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    res.write(message);
  }
}

// Broadcast message to all connected clients
function broadcast(eventType, data) {
  const message = {
    type: eventType,
    timestamp: new Date().toISOString(),
    data
  };
  
  console.log(`[SSE] Broadcasting ${eventType}:`, data);
  
  for (const client of clients) {
    sendToClient(client, message);
  }
}

// Broadcast profile update event
function broadcastProfileUpdate(userId, updatedFields) {
  broadcast('profile_updated', {
    userId,
    updatedFields,
    message: 'Profile data has been updated'
  });
}

// Broadcast admin data update event (for admin dashboard refresh)
function broadcastAdminUpdate(updateType, data) {
  broadcast('admin_update', {
    updateType,
    data,
    message: `Admin data updated: ${updateType}`
  });
}

// Broadcast to specific user (by userId)
function notifyUser(userId, eventType, data) {
  const message = {
    type: eventType,
    timestamp: new Date().toISOString(),
    data: {
      ...data,
      targetUserId: userId
    }
  };
  
  // This will notify all clients - in production, you'd want to track user-specific connections
  broadcast(eventType, {
    ...data,
    targetUserId: userId
  });
}

// Get connected client count
function getClientCount() {
  return clients.size;
}

module.exports = {
  addClient,
  sendToClient,
  broadcast,
  broadcastProfileUpdate,
  broadcastAdminUpdate,
  notifyUser,
  getClientCount
};
