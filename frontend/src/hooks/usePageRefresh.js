import { useState, useEffect, useRef, useCallback } from 'react';

const MIN_REFRESH_INTERVAL_MS = 5000;
const THROTTLE_MS = 3000;

export const usePageRefresh = (fetchFn, options = {}) => {
  const {
    enabled = true,
    refreshOnMount = true,
    refreshOnVisible = true,
    refreshOnFocus = true,
    minInterval = MIN_REFRESH_INTERVAL_MS,
    throttleMs = THROTTLE_MS,
    dependencies = []
  } = options;

  const [loading, setLoading] = useState(refreshOnMount);
  const [lastRefresh, setLastRefresh] = useState(null);
  
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const isPageVisibleRef = useRef(true);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (!enabled || !mountedRef.current) return;
    
    const now = Date.now();
    
    if (isFetchingRef.current) return;
    
    if (!isManualRefresh && now - lastFetchTimeRef.current < throttleMs) return;
    
    if (!isPageVisibleRef.current && !isManualRefresh) return;
    
    if (!isManualRefresh && now - lastFetchTimeRef.current < minInterval) return;

    isFetchingRef.current = true;
    
    try {
      await fetchFn();
      if (mountedRef.current) {
        lastFetchTimeRef.current = now;
        setLastRefresh(new Date());
        setLoading(false);
      }
    } catch (error) {
      if (mountedRef.current) {
        setLoading(false);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [fetchFn, enabled, minInterval, throttleMs, ...dependencies]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (refreshOnMount && enabled) {
      fetchData(true);
    } else {
      setLoading(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [refreshOnMount, enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (refreshOnVisible) {
      const handleVisibilityChange = () => {
        isPageVisibleRef.current = document.visibilityState === 'visible';
        
        if (document.visibilityState === 'visible') {
          fetchData();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [enabled, refreshOnVisible, fetchData]);

  useEffect(() => {
    if (!enabled || !refreshOnFocus) return;

    const handleFocus = () => {
      fetchData();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, refreshOnFocus, fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    loading,
    lastRefresh,
    refresh,
    isFetching: isFetchingRef.current
  };
};

export default usePageRefresh;
