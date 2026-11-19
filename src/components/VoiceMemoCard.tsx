import React, { useEffect, useRef, useState } from 'react';
import { useWavesurfer } from '@wavesurfer/react';
import { Play, Pause, Trash2, Loader2, Repeat, Download } from 'lucide-react';
import { api } from '../utils/apiClient';
import { cn } from '../utils/cn';
import { resolveApiUrl } from '../utils/nativeApiBase';
import { useCssColors, formatDuration } from '../hooks/useCssColors';

interface VoiceMemo {
  id: string;
  project_id: string;
  audio_url: string;
  created_at: string;
  isOptimistic?: boolean;
}

interface VoiceMemoCardProps {
  memo: VoiceMemo;
  label: string;
  isPlaying: boolean;
  onPlayToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const RATES = [1, 0.75, 0.5] as const;

function formatWhen(dateString: string): string {
  const d = new Date(dateString);
  const now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
}

const iconBtn =
  'w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-paper-active transition-colors cursor-pointer';

export const VoiceMemoCard: React.FC<VoiceMemoCardProps> = ({ memo, label, isPlaying, onPlayToggle, onDelete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loop, setLoop] = useState(false);
  const [rateIndex, setRateIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Canvas can't resolve CSS variables, so pass concrete colours (they follow the theme).
  const colors = useCssColors({ wave: '--color-ink-light', progress: '--color-terracotta' });

  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    url: resolveApiUrl(memo.audio_url),
    waveColor: colors.wave,
    progressColor: colors.progress,
    height: 40,
    barWidth: 2,
    barGap: 2,
    barRadius: 2,
    cursorWidth: 0,
    dragToSeek: true,
  });

  useEffect(() => {
    wavesurfer?.setOptions({ waveColor: colors.wave, progressColor: colors.progress });
  }, [wavesurfer, colors.wave, colors.progress]);

  // Keep the latest loop/toggle values available to wavesurfer listeners.
  const loopRef = useRef(loop);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    loopRef.current = loop;
    isPlayingRef.current = isPlaying;
  }, [loop, isPlaying]);

  useEffect(() => {
    if (!wavesurfer) return;
    const unsubs = [
      wavesurfer.on('ready', (d) => {
        setIsReady(true);
        setDuration(d);
      }),
      wavesurfer.on('error', () => setLoadFailed(true)),
      wavesurfer.on('timeupdate', (t) => setCurrentTime(t)),
      wavesurfer.on('finish', () => {
        if (loopRef.current) {
          wavesurfer.seekTo(0);
          wavesurfer.play().catch(() => {});
        } else {
          wavesurfer.seekTo(0);
          if (isPlayingRef.current) onPlayToggle(memo.id);
        }
      }),
      // Clicking the waveform while stopped should start playback from that point.
      wavesurfer.on('interaction', () => {
        if (!isPlayingRef.current) onPlayToggle(memo.id);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [wavesurfer, memo.id, onPlayToggle]);

  // Sync playback with the panel (only one memo plays at a time).
  useEffect(() => {
    if (!wavesurfer || !isReady) return;
    if (isPlaying) wavesurfer.play().catch((err) => console.error('Playback error:', err));
    else wavesurfer.pause();
  }, [isPlaying, isReady, wavesurfer]);

  useEffect(() => {
    wavesurfer?.setPlaybackRate(RATES[rateIndex], true);
  }, [wavesurfer, rateIndex]);

  // Two-step delete: the confirm state times out so a stray click can't delete later.
  useEffect(() => {
    if (!confirmDelete) return;
    const id = window.setTimeout(() => setConfirmDelete(false), 3000);
    return () => window.clearTimeout(id);
  }, [confirmDelete]);

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(memo.id);
    api.voiceMemos.delete(memo.project_id, memo.id).catch((err) => {
      console.warn('Backend memo delete error (handled):', err);
    });
  };

  return (
    <div
      className={cn(
        'bg-paper border rounded-xl p-3 flex flex-col gap-2 select-none transition-colors',
        isPlaying ? 'border-terracotta/60' : 'border-paper-darker hover:border-ink-light',
      )}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{label}</p>
          <p className="text-xs text-ink-muted">{formatWhen(memo.created_at)}</p>
        </div>

        {memo.isOptimistic ? (
          <span className="flex items-center gap-1 text-[11px] text-ink-muted pt-0.5" role="status">
            <Loader2 className="w-3 h-3 animate-spin text-terracotta" /> Saving…
          </span>
        ) : (
          <div className="flex items-center gap-0.5 -mr-1">
            <a href={resolveApiUrl(memo.audio_url)} download={`${label}.wav`} className={iconBtn} title="Download" aria-label={`Download ${label}`}>
              <Download className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={handleDelete}
              className={cn(
                confirmDelete
                  ? 'h-7 px-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 cursor-pointer transition-colors'
                  : cn(iconBtn, 'hover:text-red-500'),
              )}
              title={confirmDelete ? 'Click again to delete' : 'Delete memo'}
              aria-label={confirmDelete ? `Confirm delete ${label}` : `Delete ${label}`}
            >
              {confirmDelete ? 'Delete?' : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Player */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onPlayToggle(memo.id)}
          disabled={!isReady}
          className={cn(
            'w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
            isPlaying ? 'bg-terracotta text-paper hover:bg-terracotta-hover' : 'bg-terracotta-light text-terracotta hover:bg-paper-active',
          )}
          aria-label={isPlaying ? `Pause ${label}` : `Play ${label}`}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0 min-h-[40px] relative flex items-center">
          {!isReady && !loadFailed && (
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full h-1 rounded-full bg-paper-active animate-pulse" />
            </div>
          )}
          {loadFailed && <p className="text-xs text-ink-muted">Audio unavailable</p>}
          <div ref={containerRef} className={cn('w-full cursor-pointer', loadFailed && 'hidden')} />
        </div>
      </div>

      {/* Time + playback options */}
      <div className="flex items-center justify-between pl-[52px]">
        <span className="font-mono text-[11px] tabular-nums text-ink-muted">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRateIndex((i) => (i + 1) % RATES.length)}
            disabled={!isReady}
            className={cn(
              'h-6 px-1.5 rounded-md text-[11px] font-mono font-semibold transition-colors cursor-pointer disabled:opacity-40',
              rateIndex === 0 ? 'text-ink-muted hover:bg-paper-active hover:text-ink' : 'bg-terracotta-light text-terracotta',
            )}
            title="Playback speed (slow down to learn the melody)"
            aria-label={`Playback speed ${RATES[rateIndex]}x`}
          >
            {RATES[rateIndex]}×
          </button>
          <button
            onClick={() => setLoop((l) => !l)}
            disabled={!isReady}
            className={cn(
              'w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40',
              loop ? 'bg-terracotta-light text-terracotta' : 'text-ink-muted hover:bg-paper-active hover:text-ink',
            )}
            title="Loop"
            aria-label="Loop"
            aria-pressed={loop}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
