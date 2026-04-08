import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function usePageRefresh(onEnter) {
  const location = useLocation();

  useEffect(() => {
    if (typeof onEnter === 'function') {
      onEnter();
    }
  }, [location.pathname, onEnter]);
}

export default usePageRefresh;
