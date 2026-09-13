import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw, CheckCircle2, CloudOff } from 'lucide-react';
import { syncManager } from '../services/sync/syncManager';
import { SyncStats } from '../services/sync/types';

export const SyncStatusIndicator: React.FC = () => {
  const [stats, setStats] = useState<SyncStats>(() => syncManager.getStats());
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((newStats) => {
      setStats(newStats);
    });
    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSyncClick = () => {
    setIsManualSyncing(true);
    syncManager.triggerOnlineCheckAndSync().catch((err) => {
      console.warn('[SyncStatusIndicator] Sync trigger warning:', err);
    });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsManualSyncing(false);
    }, 1800);
  };

  const isSyncingActive = isManualSyncing || stats.isSyncing;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 select-none pointer-events-auto">
      <button
        type="button"
        id="sync-status-indicator-capsule"
        onClick={handleSyncClick}
        title="همگام‌سازی اطلاعات با سرور و دیتابیس آنلاین (لمس برای همگام‌سازی فوری)"
        className={`group flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border shadow-lg backdrop-blur-md transition-all duration-300 active:scale-95 cursor-pointer ${
          isSyncingActive
            ? 'bg-stone-900/95 text-amber-300 border-amber-500/50 ring-2 ring-amber-400/20 shadow-amber-900/20'
            : !stats.isOnline
            ? 'bg-stone-900/95 text-rose-300 border-rose-600/50'
            : 'bg-stone-900/90 hover:bg-stone-900 text-stone-100 border-stone-700/70 hover:border-amber-400/50 hover:shadow-xl'
        }`}
        style={{ direction: 'rtl' }}
      >
        {/* Animated Icon */}
        {isSyncingActive ? (
          <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
        ) : !stats.isOnline ? (
          <CloudOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        ) : (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}

        {/* Text Display */}
        <span className="text-xs font-black tracking-wide whitespace-nowrap transition-all duration-300">
          {isSyncingActive ? (
            <span className="text-amber-300">درحال همگام سازی ...</span>
          ) : !stats.isOnline ? (
            <span className="text-rose-300">مزار شهداء گمنام گاوازنگ (آفلاین)</span>
          ) : (
            <span className="text-stone-100 group-hover:text-amber-300 transition-colors">
              مزار شهداء گمنام گاوازنگ
            </span>
          )}
        </span>

        {/* Subtle sync trigger hint on hover */}
        {!isSyncingActive && stats.isOnline && (
          <RefreshCw className="w-3 h-3 text-stone-400 group-hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
        )}
      </button>
    </div>
  );
};
