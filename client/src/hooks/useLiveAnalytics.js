import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/Axios';
import { toast } from 'react-hot-toast';

export const useLiveAnalytics = (endpoint, refreshInterval = 30000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(
    async (isBackground = false) => {
      if (isFetchingRef.current) return;

      isFetchingRef.current = true;
      if (!isBackground) setLoading(true);
      try {
        const response = await api.get(endpoint);
        if (isMountedRef.current) {
          setData(response.data.data);
          setLastUpdated(new Date());
          setError(null);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err);
          if (!isBackground) toast.error('Failed to sync live data.');
        }
      } finally {
        isFetchingRef.current = false;
        if (isMountedRef.current) setLoading(false);
      }
    },
    [endpoint]
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchData(); // Initial load

    let intervalId;

    // --- PHASE 3: SMART POLLING ---
    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => fetchData(true), refreshInterval);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true); // Fetch instantly when user comes back
        startPolling();
      } else {
        stopPolling(); // Save battery/backend load when tab is hidden
      }
    };

    // Start polling initially if visible
    if (document.visibilityState === 'visible') startPolling();

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchData, refreshInterval]);

  return { data, loading, error, lastUpdated, forceRefresh: () => fetchData(false) };
};
