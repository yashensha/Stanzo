import React, { useState, useEffect, useRef, useCallback } from 'react';
import RecordRTC from 'recordrtc';
import { api } from '../utils/apiClient';
import { VoiceMemoCard } from './VoiceMemoCard';
import { EmptyState } from './ui/Panel';
import { Button } from './ui/Button';
import { useCssColors, formatDuration } from '../hooks/useCssColors';
import { Loader2, Mic, Square, Pause, Play, X, AlertCircle } from 'lucide-react';

interface VoiceMemo {
  id: string;
  project_id: string;
  audio_url: string;
  created_at: string;
  isOptimistic?: boolean;
}

interface VoiceMemosPanelProps {
  projectId: string;
}

type RecState = 'idle' | 'recording' | 'paused';

const DELETED_KEY = 'lyrical_deleted_memos';

function readDeleted(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DELETED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

/** Scrolling level history drawn from the live mic stream (newest bar on the right). */
const LiveWaveform: React.FC<{ stream: MediaStream; paused: boolean }> = ({ stream, paused }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const colors = useCssColors({ active: '--color-terracotta', idle: '--color-ink-light' });
  const colorsRef = useRef(colors);
  useEffect(() => {
    pausedRef.current = paused;
    colorsRef.current = colors;
  }, [paused, colors]);

  useEffect(() => {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);

    const BAR = 3;
    const GAP = 2;
    const levels: number[] = [];
    let raf = 0;
    let last = 0;

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      const maxBars = Math.floor(w / (BAR + GAP));

      // Sample ~20 times a second so the history scrolls at a readable speed.
      if (t - last > 50) {
        last = t;
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        // Perceptual curve: quiet humming still shows movement.
        const level = pausedRef.current ? 0 : Math.min(1, Math.pow(rms * 4, 0.6));
        levels.push(level);
        if (levels.length > maxBars) levels.splice(0, levels.length - maxBars);
      }

      const g = canvas.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      g.fillStyle = pausedRef.current ? colorsRef.current.idle : colorsRef.current.active;
      const offset = w - levels.length * (BAR + GAP);
      levels.forEach((lv, i) => {
        const bh = Math.max(2, lv * h);
        g.beginPath();
        g.roundRect(offset + i * (BAR + GAP), (h - bh) / 2, BAR, bh, 1.5);
        g.fill();
      });
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      ctx.close().catch(() => {});
    };
  }, [stream]);

  return <canvas ref={canvasRef} className="w-full h-14 block" aria-hidden="true" />;
};

export const VoiceMemosPanel: React.FC<VoiceMemosPanelProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [recState, setRecState] = useState<RecState>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<RecordRTC | null>(null);
  // Elapsed time = banked ms from earlier segments + the running segment.
  const bankedMsRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  };

  // Fetch memos on mount or when projectId changes
  useEffect(() => {
    if (!projectId) return;

    let isMounted = true;
    setLoading(true);
    setMemos([]);

    api.voiceMemos
      .list(projectId)
      .then((data) => {
        if (!isMounted) return;
        const deleted = readDeleted();
        setMemos((data || []).filter((m: VoiceMemo) => !deleted.has(m.id)));
      })
      .catch((err) => console.error('Error fetching voice memos:', err))
      .finally(() => isMounted && setLoading(false));

    return () => {
      isMounted = false;
      recorderRef.current?.destroy();
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [projectId]);

  // Recording timer
  useEffect(() => {
    if (recState !== 'recording') return;
    const id = window.setInterval(() => {
      const running = segmentStartRef.current ? Date.now() - segmentStartRef.current : 0;
      setElapsed((bankedMsRef.current + running) / 1000);
    }, 200);
    return () => window.clearInterval(id);
  }, [recState]);

  const handleStart = async () => {
    setMicError(null);
    setSaveError(null);
    setCurrentlyPlayingId(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = s;
      setStream(s);

      const recorder = new RecordRTC(s, {
        type: 'audio',
        mimeType: 'audio/webm;codecs=opus' as any,
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000, // voice-quality, keeps files small
      });
      recorderRef.current = recorder;
      recorder.startRecording();

      bankedMsRef.current = 0;
      segmentStartRef.current = Date.now();
      setElapsed(0);
      setRecState('recording');
    } catch (err: unknown) {
      console.error('Microphone error:', err);
      setMicError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access is blocked. Allow it in your browser’s site settings, then try again.'
          : 'No microphone found, or it’s in use by another app.',
      );
      stopTracks();
    }
  };

  const handlePauseResume = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recState === 'recording') {
      recorder.pauseRecording();
      if (segmentStartRef.current) bankedMsRef.current += Date.now() - segmentStartRef.current;
      segmentStartRef.current = null;
      setElapsed(bankedMsRef.current / 1000);
      setRecState('paused');
    } else if (recState === 'paused') {
      recorder.resumeRecording();
      segmentStartRef.current = Date.now();
      setRecState('recording');
    }
  };

  const resetRecorder = () => {
    recorderRef.current?.destroy();
    recorderRef.current = null;
    stopTracks();
    segmentStartRef.current = null;
    bankedMsRef.current = 0;
    setElapsed(0);
    setRecState('idle');
  };

  const handleDiscard = () => {
    const recorder = recorderRef.current;
    if (!recorder) return resetRecorder();
    recorder.stopRecording(() => resetRecorder());
  };

  const handleSave = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    recorder.stopRecording(async () => {
      const blob = recorder.getBlob();
      resetRecorder();

      const tempId = `temp-${Date.now()}`;
      const optimisticMemo: VoiceMemo = {
        id: tempId,
        project_id: projectId,
        audio_url: URL.createObjectURL(blob),
        created_at: new Date().toISOString(),
        isOptimistic: true,
      };
      setMemos((prev) => [optimisticMemo, ...prev]);

      try {
        const filename = `memo_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
        const { url: audioUrl } = await api.storage.upload(blob, filename);
        const dbMemo = await api.voiceMemos.create(projectId, audioUrl, tempId);
        setMemos((prev) =>
          prev.map((m) => {
            if (m.id !== tempId) return m;
            URL.revokeObjectURL(m.audio_url);
            return { ...dbMemo };
          }),
        );
      } catch (err: unknown) {
        console.error('Failed to save voice memo:', err);
        setSaveError(`Couldn't save that memo: ${err instanceof Error ? err.message : 'upload failed'}.`);
        setMemos((prev) => {
          const found = prev.find((m) => m.id === tempId);
          if (found) URL.revokeObjectURL(found.audio_url);
          return prev.filter((m) => m.id !== tempId);
        });
      }
    });
  };

  const handlePlayToggle = useCallback((id: string) => {
    setCurrentlyPlayingId((prev) => (prev === id ? null : id));
  }, []);

  const handleDeleteMemo = useCallback((id: string) => {
    try {
      const deleted = readDeleted();
      deleted.add(id);
      localStorage.setItem(DELETED_KEY, JSON.stringify([...deleted]));
    } catch {
      /* storage unavailable: the server delete still runs */
    }
    setMemos((prev) => prev.filter((m) => m.id !== id));
    setCurrentlyPlayingId((prev) => (prev === id ? null : prev));
  }, []);

  const isActive = recState !== 'idle';

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent text-ink relative select-none">
      {/* Recorder */}
      <div className="p-4 border-b border-paper-darker flex-shrink-0 space-y-3">
        {micError && (
          <div role="alert" className="flex items-start gap-2 bg-paper-active border border-paper-darker text-ink p-3 rounded-xl text-xs leading-normal">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
            <span>{micError}</span>
          </div>
        )}

        {!isActive ? (
          <button
            onClick={handleStart}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-paper border border-paper-darker hover:border-terracotta transition-colors cursor-pointer text-left group"
          >
            <span className="w-11 h-11 rounded-full bg-terracotta text-paper flex items-center justify-center flex-shrink-0 transition-transform group-active:scale-95">
              <Mic className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">Record a memo</span>
              <span className="block text-xs text-ink-muted">Hum the melody or talk through an idea</span>
            </span>
          </button>
        ) : (
          <div className="rounded-2xl bg-paper border border-paper-darker p-3 space-y-3" aria-live="polite">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                {recState === 'recording' ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    <span className="text-red-500">Recording</span>
                  </>
                ) : (
                  <span className="text-ink-muted">Paused</span>
                )}
              </span>
              <span className="font-mono text-lg tabular-nums text-ink" aria-label={`Elapsed ${formatDuration(elapsed)}`}>
                {formatDuration(elapsed)}
              </span>
            </div>

            {stream && <LiveWaveform stream={stream} paused={recState === 'paused'} />}

            <div className="flex items-center justify-between gap-2">
              <Button size="sm" variant="ghost" onClick={handleDiscard} aria-label="Discard recording">
                <X className="w-4 h-4" />
                Discard
              </Button>
              <button
                onClick={handlePauseResume}
                className="w-11 h-11 rounded-full bg-paper-active text-ink hover:bg-paper-darker flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                aria-label={recState === 'recording' ? 'Pause recording' : 'Resume recording'}
                title={recState === 'recording' ? 'Pause' : 'Resume'}
              >
                {recState === 'recording' ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              <Button size="sm" onClick={handleSave} aria-label="Stop and save recording">
                <Square className="w-3.5 h-3.5 fill-current" />
                Save
              </Button>
            </div>
          </div>
        )}

        {saveError && (
          <p role="alert" className="text-xs text-red-500">{saveError}</p>
        )}
      </div>

      {/* Memo list */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-ink-muted py-8" role="status">
          <Loader2 className="w-5 h-5 animate-spin text-terracotta mb-2" />
          <span className="text-xs">Loading voice memos…</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 gap-2.5">
          {memos.length === 0 ? (
            !isActive && (
              <EmptyState icon={<Mic className="w-5 h-5" />} title="No memos yet">
                Memos stay with this song, so the melody is right next to the words.
              </EmptyState>
            )
          ) : (
            <>
              <p className="text-xs font-semibold text-ink-muted">
                {memos.length} {memos.length === 1 ? 'memo' : 'memos'}
              </p>
              {memos.map((memo, i) => (
                <VoiceMemoCard
                  key={memo.id}
                  memo={memo}
                  label={`Memo ${memos.length - i}`}
                  isPlaying={currentlyPlayingId === memo.id}
                  onPlayToggle={handlePlayToggle}
                  onDelete={handleDeleteMemo}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
