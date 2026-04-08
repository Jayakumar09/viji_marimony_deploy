import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api';

const RealTimeContext = createContext();

const getApiBaseUrl = () => {
  const backendUrl = process.env.REACT_APP_API_URL || 'https://viji-marimony-deploy-backend.onrender.com/api';
  return backendUrl.replace('/api', '');
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
  const maxReconnectAttempts = 3;
  const reconnectDelay = useRef(10000);
  const isAdminRef = useRef(false);

  const onProfileUpdateRef = useRef(null);
  const onAdminUpdateRef = useRef(null);

  const onProfileUpdate = useCallback((callback) => {
    onProfileUpdateRef.current = callback;
  }, []);

  const onAdminUpdate = useCallback((callback) => {
    onAdminUpdateRef.current = callback;
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  const connect = useCallback(() => {
    if (!isAdminRef.current) return;
    if (eventSourceRef.current) return;

    const baseUrl = getApiBaseUrl();
    const eventSource = new EventSource(`${baseUrl}/api/sse`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent(data);

        if (data.type === 'profile_updated' && onProfileUpdateRef.current) {
          onProfileUpdateRef.current(data.data);
        }

        if (data.type === 'admin_update' && onAdminUpdateRef.current) {
          onAdminUpdateRef.current(data.data);
        }
      } catch (error) {
        console.error('[SSE] Parse error:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);

      if (reconnectAttempts.current < maxReconnectAttempts && isAdminRef.current) {
        console.log(`[SSE] Reconnecting in ${reconnectDelay.current}ms...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, reconnectDelay.current);
      } else {
        console.log('[SSE] Connection stopped');
      }
    };
  }, []);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    isAdminRef.current = !!adminToken;

    if (isAdminRef.current) {
      connect();
    }

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
