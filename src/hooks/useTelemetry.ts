import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { startTelemetry } from '../lib/telemetry';

export const useTelemetry = () => {
  const { telemetryEnabled, setRealtimeConnected } = useAppStore();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!telemetryEnabled) {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      setRealtimeConnected(false);
      return;
    }

    // Start telemetry (mock for now, RMF later)
    cleanupRef.current = startTelemetry('mock');
    setRealtimeConnected(true);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      setRealtimeConnected(false);
    };
  }, [telemetryEnabled, setRealtimeConnected]);

  return {
    isConnected: useAppStore((state) => state.isRealtimeConnected),
    telemetryEnabled: useAppStore((state) => state.telemetryEnabled),
  };
};