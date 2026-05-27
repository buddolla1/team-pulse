import { useEffect } from 'react';

export default function usePolling(callback, intervalSeconds) {
  useEffect(() => {
    callback();
    const intervalId = setInterval(callback, intervalSeconds * 1000);
    return () => clearInterval(intervalId);
  }, [callback, intervalSeconds]);
}
