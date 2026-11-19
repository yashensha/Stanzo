import React, { useState, useEffect, useRef } from 'react';
import RecordRTC from 'recordrtc';
import { api } from '../utils/apiClient';
import { VoiceMemoCard } from './VoiceMemoCard';
import { EmptyState } from './ui/Panel';
import { Loader2, Mic, Square, AlertCircle } from 'lucide-react';

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

export const VoiceMemosPanel: React.FC<VoiceMemosPanelProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<RecordRTC | null>(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  // Fetch memos on mount or when projectId changes
  useEffect(() => {
    if (!projectId) return;

    let isMounted = true;
    setLoading(true);
    setMemos([]);

    const fetchMemos = async () => {
      try {
        const data = await api.voiceMemos.list(projectId);
        if (isMounted) {
          const deleted = new Set(JSON.parse(localStorage.getItem('lyrical_deleted_memos') || '[]'));
          const filtered = (data || []).filter((m: any) => !deleted.has(m.id));
          setMemos(filtered);
        }
      } catch (err) {
        console.error('Error fetching voice memos:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMemos();

    return () => {
      isMounted = false;
      // Stop recording if panel unmounts
      if (recorderRef.current) {
        recorderRef.current.destroy();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [projectId]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission('granted');

      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm;codecs=opus' as any,
        recorderType: RecordRTC.StereoAudioRecorder, // safe default for browsers
        numberOfAudioChannels: 1,
        desiredSampRate: 16000, // 16kHz is ideal for voice memos to minimize size
      });

      recorderRef.current = recorder;
      recorder.startRecording();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone access denied or error:', err);
      setMicPermission('denied');
    }
  };

  const handleStopRecording = () => {
    const recorder = recorderRef.current;
    const stream = streamRef.current;

    if (!recorder) return;

    recorder.stopRecording(async () => {
      setIsRecording(false);
      
      const blob = recorder.getBlob();
      
      // Stop media tracks
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Generate object URL for optimistic card rendering
      const objectUrl = URL.createObjectURL(blob);
      const tempId = `temp-${Date.now()}`;
      
      const optimisticMemo: VoiceMemo = {
        id: tempId,
        project_id: projectId,
        audio_url: objectUrl,
        created_at: new Date().toISOString(),
        isOptimistic: true,
      };

      // Add to memos immediately
      setMemos((prev) => [optimisticMemo, ...prev]);

      // Upload to Cloudflare R2 & Database in the background
      try {
        const uniqueFilename = `memo_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
        const { url: audioUrl } = await api.storage.upload(blob, uniqueFilename);

        // Save to D1 database
        const dbMemo = await api.voiceMemos.create(projectId, audioUrl, tempId);

        // Replace optimistic memo with actual database record, revoking the object URL safely
        setMemos((prev) =>
          prev.map((m) => {
            if (m.id === tempId) {
              if (m.audio_url.startsWith('blob:')) {
                URL.revokeObjectURL(m.audio_url);
              }
              return { ...dbMemo };
            }
            return m;
          })
        );
      } catch (err: any) {
        console.error('Failed to save voice memo:', err);
        alert('Failed to save voice memo: ' + (err.message || String(err)));
        // Remove optimistic memo from list on error and revoke URL
        setMemos((prev) => {
          const found = prev.find((m) => m.id === tempId);
          if (found && found.audio_url.startsWith('blob:')) {
            URL.revokeObjectURL(found.audio_url);
          }
          return prev.filter((m) => m.id !== tempId);
        });
      }
    });
  };

  const handlePlayToggle = (id: string) => {
    setCurrentlyPlayingId((prev) => (prev === id ? null : id));
  };

  const handleDeleteMemo = (id: string) => {
    try {
      const existing = JSON.parse(localStorage.getItem('lyrical_deleted_memos') || '[]');
      if (!existing.includes(id)) {
        existing.push(id);
        localStorage.setItem('lyrical_deleted_memos', JSON.stringify(existing));
      }
    } catch {}

    setMemos((prev) => prev.filter((m) => m.id !== id));
    if (currentlyPlayingId === id) {
      setCurrentlyPlayingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent text-ink relative select-none">
      {/* Recording Control Card */}
      <div className="px-4 py-6 border-b border-paper-darker flex flex-col items-center gap-3 flex-shrink-0">
        {micPermission === 'denied' && (
          <div role="alert" className="w-full flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200 p-3 rounded-xl text-xs leading-normal mb-1">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Microphone permission denied. Please enable mic access in your browser settings to record.</span>
          </div>
        )}

        <div className="relative flex flex-col items-center">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 border-4 active:scale-95 ${
              isRecording
                ? 'bg-red-600 border-red-600/25 text-white'
                : 'bg-terracotta border-terracotta-light text-paper hover:bg-terracotta-hover'
            } cursor-pointer`}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
            aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {isRecording ? (
              <Square className="w-6 h-6 fill-current stroke-[1.5]" />
            ) : (
              <Mic className="w-7 h-7 stroke-[1.5]" />
            )}
          </button>

          {isRecording && (
            <span className="absolute -bottom-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </div>

        <span className="text-xs font-medium text-ink-muted" aria-live="polite">
          {isRecording ? 'Recording… tap to stop' : 'Tap to record a memo'}
        </span>
      </div>

      {/* Scrollable list of voice memos */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-ink-muted py-8" role="status">
          <Loader2 className="w-5 h-5 animate-spin text-terracotta mb-2" />
          <span className="text-xs">Loading voice memos…</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 gap-2.5">
          {memos.length === 0 ? (
            <EmptyState icon={<Mic className="w-5 h-5" />} title="No memos yet">
              Hum the melody or talk through an idea. Memos stay with this song.
            </EmptyState>
          ) : (
            memos.map((memo) => (
              <VoiceMemoCard
                key={memo.id}
                memo={memo}
                isPlaying={currentlyPlayingId === memo.id}
                onPlayToggle={() => handlePlayToggle(memo.id)}
                onDelete={handleDeleteMemo}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
