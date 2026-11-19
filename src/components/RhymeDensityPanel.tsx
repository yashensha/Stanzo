import React, { useState } from 'react';
import { Sparkles, AlertTriangle, CheckCircle, Info, Activity } from 'lucide-react';
import { Button } from './ui/Button';
import { EmptyState, SectionLabel } from './ui/Panel';
import { cn } from '../utils/cn';

interface DensityData {
  line: string;
  density: number;
  rhyming_syllables: number;
  total_syllables: number;
  status: string;
  message: string;
}

// Semantic verdict colours (kept distinct from the brand accent on purpose)
const VERDICT = {
  sweet: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900/60',
  over: 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-900/60',
  under: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900/60',
};

export const RhymeDensityPanel: React.FC = () => {
  const [lineInput, setLineInput] = useState('');
  const [data, setData] = useState<DensityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = lineInput.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/rhyme-density?line=${encodeURIComponent(trimmed)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch density score');
      }
      const resData = await response.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message || 'Error analyzing line');
    } finally {
      setIsLoading(false);
    }
  };

  const verdictKey = (status: string): keyof typeof VERDICT =>
    status.includes('sweet') ? 'sweet' : status.includes('over') ? 'over' : 'under';

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent">
      {/* Input Form */}
      <form onSubmit={handleAnalyze} className="p-4 border-b border-paper-darker flex flex-col gap-2 select-none flex-shrink-0">
        <p className="text-xs text-ink-muted leading-relaxed">
          Scores phonetic matches against syllable count. Trained on 23k hits.
        </p>
        <textarea
          rows={3}
          aria-label="Lyric line to score"
          placeholder="Paste or type a lyric line…"
          value={lineInput}
          onChange={(e) => setLineInput(e.target.value)}
          spellCheck="false"
          className="w-full bg-paper border border-paper-darker rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink-light focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/30 transition-colors select-text resize-none"
        />
        <Button type="submit" size="sm" disabled={isLoading || !lineInput.trim()} className="w-full">
          <Sparkles className="w-3.5 h-3.5" />
          {isLoading ? 'Scoring…' : 'Score line'}
        </Button>
      </form>

      {/* Results Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite">
        {isLoading && (
          <div className="space-y-3 animate-pulse" role="status" aria-label="Calculating density">
            <div className="h-16 rounded-xl bg-paper-active" />
            <div className="h-3 rounded-full bg-paper-active" />
            <div className="h-24 rounded-xl bg-paper-active" />
          </div>
        )}

        {error && !isLoading && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded-xl border text-xs bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}. Try again in a moment.</span>
          </div>
        )}

        {!data && !isLoading && !error && (
          <EmptyState icon={<Activity className="w-5 h-5" />} title="Score a line">
            See its rhyme density and whether it lands in the sweet spot.
          </EmptyState>
        )}

        {data && !isLoading && !error && (
          <div className="space-y-5 select-none animate-fadeIn">
            {/* Verdict */}
            <div className={cn('p-3 rounded-xl border flex items-start gap-2.5 text-sm leading-relaxed', VERDICT[verdictKey(data.status)])}>
              {verdictKey(data.status) === 'sweet' ? (
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <span className="italic">"{data.line}"</span>
                <span className="block mt-1 text-xs font-semibold">{data.message}</span>
              </div>
            </div>

            {/* Gauge */}
            <section className="space-y-2">
              <div className="flex justify-between items-baseline">
                <SectionLabel>Density</SectionLabel>
                <span className="text-sm font-semibold text-ink tabular-nums">{data.density.toFixed(2)}</span>
              </div>

              <div className="h-2.5 w-full rounded-full relative bg-paper-active">
                <div className="absolute left-0 top-0 bottom-0 w-[22%] rounded-l-full bg-amber-500/25" />
                <div className="absolute left-[22%] top-0 bottom-0 w-[22%] bg-emerald-500/40" />
                <div className="absolute left-[44%] top-0 bottom-0 right-0 rounded-r-full bg-red-500/20" />
                <div
                  className="absolute top-1/2 w-4 h-4 -ml-2 -translate-y-1/2 rounded-full bg-terracotta ring-2 ring-paper transition-all duration-500"
                  style={{ left: `${Math.min(100, data.density * 100)}%` }}
                  aria-hidden="true"
                />
              </div>

              <div className="flex justify-between text-[11px] text-ink-muted">
                <span>Flat</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">Sweet spot 0.22–0.44</span>
                <span>Exhausting</span>
              </div>
            </section>

            {/* Syllables */}
            <section className="space-y-2">
              <SectionLabel>Syllables</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-paper border border-paper-darker rounded-xl p-3">
                  <span className="text-2xl font-semibold text-ink block tabular-nums">{data.rhyming_syllables}</span>
                  <span className="text-xs text-ink-muted">Rhyming</span>
                </div>
                <div className="bg-paper border border-paper-darker rounded-xl p-3">
                  <span className="text-2xl font-semibold text-ink block tabular-nums">{data.total_syllables}</span>
                  <span className="text-xs text-ink-muted">Total</span>
                </div>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed flex items-start gap-1.5 pt-1">
                <Info className="w-3.5 h-3.5 text-ink-light mt-0.5 flex-shrink-0" />
                Repeated identical words and unstressed particles ("the", "a") are ignored.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
