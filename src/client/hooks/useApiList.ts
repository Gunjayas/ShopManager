import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api";

// Loads a collection and exposes a reusable refresh action after local mutations.
export function useApiList<T>(path: string, key: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await apiRequest<Record<string, T[]>>(path); setData(response[key] ?? []); }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "The list could not be loaded."); }
    finally { setLoading(false); }
  }, [key, path]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh, setData };
}