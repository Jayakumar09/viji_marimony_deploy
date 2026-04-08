import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function usePageRefresh(onEnter) {
  const location = useLocation();
  const callbackRef = useRef(onEnter);
  
  useEffect(() => {
    callbackRef.current = onEnter;
  }, [onEnter]);
  
  useEffect(() => {
    if (callbackRef.current) {
      callbackRef.current();
    }
  }, [location.pathname]);
}

export default usePageRefresh;
