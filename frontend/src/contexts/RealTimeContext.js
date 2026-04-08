import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const RealTimeContext = createContext(null);

export const useRealTime = () => useContext(RealTimeContext);

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 5000;

export const RealTimeProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  const eventSourceRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const retryCountRef = useRef(0);

  const cleanupConnection = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    const adminToken = localStorage.getItem('adminToken');
    
    if (!adminToken) return;
    if (eventSourceRef.current) return;

    const apiBase = process.env.REACT_APP_API_URL || '';
    const cleanBase = apiBase.replace('/api', '');
    const url = `${cleanBase}/api/sse`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      retryCountRef.current = 0;
      setIsConnected(true);
      console.log('[SSE] Connected');
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setLastEvent(parsed);
      } catch {
        setLastEvent(event.data);
      }
    };

    es.onerror = () => {
      console.warn('[SSE] Connection error');
      cleanupConnection();

      if (retryCountRef.current >= MAX_RETRIES) {
        console.warn('[SSE] Max reconnect attempts reached');
        return;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, retryCountRef.current);
      retryCountRef.current += 1;

      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [cleanupConnection]);

  useEffect(() => {
    connect();

    return () => {
      cleanupConnection();
    };
  }, [connect, cleanupConnection]);

  const value = {
    isConnected,
    lastEvent,
  };

  return (
    <RealTimeContext.Provider value={value}>
      {children}
    </RealTimeContext.Provider>
  );
};

export default RealTimeContext;
