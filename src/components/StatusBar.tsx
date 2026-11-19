import React, { useState, useEffect } from 'react';
import { Check, Cloud, CloudOff, Loader2 } from 'lucide-react';

interface StatusBarProps {
  draftTitle: string;
  isSaving: boolean;
  isLoading?: boolean;
  isCloudMode?: boolean;
  content: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  draftTitle,
  isSaving,
  isLoading = false,
  isCloudMode = false,
  content,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Compute stats
  const stats = React.useMemo(() => {
    const chars = content.length;
    const words = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
    
    // Simple line count
    const lines = content ? content.split('\n').length : 0;

    return { chars, words, lines };
  }, [content]);

  return (
    <div className="h-7 w-full bg-paper border-t border-paper-darker flex items-center justify-between px-4 text-[11px] text-ink-muted select-none z-10 flex-shrink-0">
      {/* Left section: Active draft name */}
      <div className="flex items-center gap-2.5 truncate pr-4">
        <span className="font-medium text-ink truncate max-w-[180px]" title={draftTitle}>
          {draftTitle || 'Untitled'}
        </span>
        <span className="w-1 h-1 rounded-full bg-ink-light" aria-hidden="true" />

        {/* Autosave Status */}
        <div className="flex items-center gap-1" role="status">
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-terracotta" />
              <span>Loading song...</span>
            </>
          ) : isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-terracotta" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check className="w-3 h-3 text-terracotta" />
              <span>
                {isCloudMode ? 'Saved to cloud' : 'Saved to browser'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right section: Counters and connection */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex gap-3 font-mono tabular-nums">
          <span>{stats.lines} lines</span>
          <span>{stats.words} words</span>
          <span>{stats.chars} chars</span>
        </div>

        <span className="w-1 h-1 rounded-full bg-ink-light" aria-hidden="true" />

        {/* Network Status */}
        <div className="flex items-center gap-1" title={isOnline ? 'Cloud database online' : 'Offline - local storage mode'}>
          {isOnline ? (
            <>
              <Cloud className="w-3 h-3 text-terracotta" />
              <span>Online</span>
            </>
          ) : (
            <>
              <CloudOff className="w-3 h-3 text-red-600 dark:text-red-400 animate-pulse" />
              <span className="text-red-600 dark:text-red-400 font-semibold">Offline</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
