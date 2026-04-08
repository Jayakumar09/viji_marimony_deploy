import { useState, useEffect, useRef, useCallback } from 'react';

const MIN_INTERVAL = 10000;
const THROTTLE = 5000;

export const usePageRefresh = (fetchFn, options = {}) => {
  const {
    enabled = true,
    refreshOnMount = true,
    refreshOnVisible = false,
    refreshOnFocus = false,
    minInterval = MIN_INTERVAL,
    throttleMs = THROTTLE
  } = options;

  const [loading, setLoading] = useState(false);
  const fetchDataRef = useRef(fetchFn);
  const lastFetchRef = useRef(0);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    fetchDataRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const executeFetch = useCallback(async (isManual = false) => {
    if (!enabled || !isMountedRef.current || isFetchingRef.current) return;

    const now = Date.now();
    const minWait = isManual ? throttleMs : Math.max(throttleMs, minInterval);
    
    if (!isManual && now - lastFetchRef.current < minWait) return;

    isFetchingRef.current = true;
    setLoading(true);

    try {
      await fetchDataRef.current();
      if (isMountedRef.current) {
        lastFetchRef.current = Date.now();
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [enabled, minInterval, throttleMs]);

  useEffect(() => {
    if (enabled && refreshOnMount) {
      executeFetch(true);
    }
  }, [enabled, refreshOnMount]);

  useEffect(() => {
    if (!enabled || !refreshOnVisible) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        executeFetch(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled, refreshOnVisible]);

  useEffect(() => {
    if (!enabled || !refreshOnFocus) return;

    const handleFocus = () => executeFetch(false);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enabled, refreshOnFocus]);

  const refresh = useCallback(() => {
    executeFetch(true);
  }, [executeFetch]);

  return { loading, refresh };
};

export default usePageRefresh;
