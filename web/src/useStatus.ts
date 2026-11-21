import { useCallback, useEffect, useRef, useState } from "react";
import { isSnapshot, type Snapshot } from "./status";

export function useStatus() {
  const [, tick] = useState(0);
  const [data, setData] = useState<Snapshot>();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);
  const lifetime = useRef<AbortController | undefined>(undefined);
  const refresh = useCallback(async (signal?: AbortSignal, manual = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const response = await fetch(manual ? "/api/refresh" : "/api/status", {
        method: manual ? "POST" : "GET",
        headers: manual ? { "X-TunnelPulse-Refresh": "1" } : {},
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
          : AbortSignal.timeout(12000),
      });
      if (!response.ok) throw Error();
      const snapshot: unknown = await response.json();
      if (!isSnapshot(snapshot)) throw new Error("Invalid status response");
      setData(snapshot);
      setError(false);
    } catch (err) {
      if (!signal?.aborted) setError(true);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    void refresh(controller.signal);
    const timer = setInterval(() => void refresh(controller.signal), 15000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    const timer = setInterval(() => tick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return {
    data,
    error,
    loading,
    refresh: () => refresh(lifetime.current?.signal, true),
  };
}
