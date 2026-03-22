import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api';

const RealTimeContext = createContext();

// Get API base URL
const getApiBaseUrl = () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
  return backendUrl;
};

export const useRealTime = () => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
};

export const RealTimeProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Callback functions that will be called when events are received
  const onProfileUpdateRef = useRef(null);
  const onAdminUpdateRef = useRef(null);

  // Set up callbacks
  const onProfileUpdate = useCallback((callback) => {
    onProfileUpdateRef.current = callback;
  }, []);

  const onAdminUpdate = useCallback((callback) => {
    onAdminUpdateRef.current = callback;
  }, []);

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const baseUrl = getApiBaseUrl();
    const eventSource = new EventSource(`${baseUrl}/api/sse`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected to real-time updates');
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Received event:', data);
        setLastEvent(data);

        // Handle different event types
        if (data.type === 'profile_updated' && onProfileUpdateRef.current) {
          onProfileUpdateRef.current(data.data);
        }

        if (data.type === 'admin_update' && onAdminUpdateRef.current) {
          onAdminUpdateRef.current(data.data);
        }

        if (data.type === 'connected') {
          console.log('[SSE] Connection confirmed:', data.message);
        }
      } catch (error) {
        console.error('[SSE] Error parsing event data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      setIsConnected(false);
      eventSource.close();

      // Attempt to reconnect
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      } else {
        console.error('[SSE] Max reconnection attempts reached');
      }
    };
  }, []);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsConnected(false);
    console.log('[SSE] Disconnected');
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const value = {
    isConnected,
    lastEvent,
    onProfileUpdate,
    onAdminUpdate,
    connect,
    disconnect
  };

  return (
    <RealTimeContext.Provider value={value}>
      {children}
    </RealTimeContext.Provider>
  );
};

export default RealTimeContext;
