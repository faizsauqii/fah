import { useCallback, useEffect, useRef, useState } from "react";
import { friendlyMessage } from "../services/ApiService";
import { useAuth } from "../context/AuthContext";

export default function useApiData(fetcher, deps = [], { enabled = true, auto = true } = {}) {
  const { handleAuthError } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mounted.current) setData(result);
    } catch (e) {
      const endedSession = await handleAuthError(e);
      if (mounted.current && !endedSession) {
        setError({ message: friendlyMessage(e), code: e?.code, status: e?.status });
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [enabled, handleAuthError, ...deps]);

  useEffect(() => {
    if (auto) load();
  }, [auto, load]);

  return { data, loading, error, reload: load, setData };
}
