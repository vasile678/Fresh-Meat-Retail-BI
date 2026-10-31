import { useState, useEffect, useCallback } from 'react';
import { 
  MarketIntelligenceManifest, 
  DEFAULT_MANIFEST, 
  fetchMarketIntelligenceManifest,
  formatUpdatedDisplay
} from '../utils/marketIntelligenceSync';

export function useMarketIntelligence(onDataUpdate?: (manifest: MarketIntelligenceManifest) => void) {
  const [manifest, setManifest] = useState<MarketIntelligenceManifest>(DEFAULT_MANIFEST);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [hasNewUpdate, setHasNewUpdate] = useState<boolean>(false);

  const checkUpdates = useCallback(async (silent = false) => {
    if (!silent) setIsChecking(true);
    try {
      const remote = await fetchMarketIntelligenceManifest();
      setLastChecked(new Date());
      if (remote && remote.modules) {
        setManifest(prev => {
          // Check if any module's last_verified_update or dataset_sha256 changed
          const prevStr = JSON.stringify(prev.modules);
          const nextStr = JSON.stringify(remote.modules);
          if (prevStr !== nextStr) {
            setHasNewUpdate(true);
            if (onDataUpdate) onDataUpdate(remote);
            return remote;
          }
          return prev;
        });
      }
    } finally {
      if (!silent) setIsChecking(false);
    }
  }, [onDataUpdate]);

  // Initial check on mount
  useEffect(() => {
    checkUpdates(true);
  }, [checkUpdates]);

  // Window focus & tab visibility change listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkUpdates(true);
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => checkUpdates(true));

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', () => checkUpdates(true));
    };
  }, [checkUpdates]);

  // Periodic polling every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      checkUpdates(true);
    }, 60000);
    return () => clearInterval(timer);
  }, [checkUpdates]);

  return {
    manifest,
    isChecking,
    lastChecked,
    hasNewUpdate,
    checkUpdates,
    formatUpdatedDisplay
  };
}
