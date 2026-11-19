import React, { useState, useEffect } from 'react';
import { Search, Info, Shuffle, Check, AlertTriangle } from 'lucide-react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Chip, EmptyState, SectionLabel } from './ui/Panel';

interface SwapData {
  word: string;
  phonemes: string;
  results: string[];
}

const EXAMPLES = [
  { input: 'bada', hint: 'rhythmic shapes like "body", "better"' },
  { input: 'la-la', hint: 'vowel sounds like "lay down", "light up"' },
  { input: 'AA AH', hint: 'raw CMU phoneme sounds' },
];

export const PhoneticSwapPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<SwapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedWord, setCopiedWord] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedWord) return;
    const t = setTimeout(() => setCopiedWord(null), 1500);
    return () => clearTimeout(t);
  }, [copiedWord]);

  const handleSwapSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/phonetic-swap?word=${encodeURIComponent(trimmed)}`);
      if (!response.ok) {
        throw new Error('Failed to search phonetic swaps');
      }
      const resData = await response.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message || 'Error executing phonetic swap');
    } finally {
      setIsLoading(false);
    }
  };

  const copyWord = (word: string) => {
    navigator.clipboard.writeText(word).then(() => setCopiedWord(word)).catch(() => {});
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent">
      {/* Search Input */}
      <form onSubmit={handleSwapSearch} className="p-4 border-b border-paper-darker flex flex-col gap-2 select-none flex-shrink-0">
        <p className="text-xs text-ink-muted leading-relaxed">
          Turn placeholder syllables into real words that sound the same.
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-ink-light absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              inputSize="sm"
              type="text"
              aria-label="Syllable cluster"
              placeholder="e.g. bada, la-la"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              spellCheck="false"
              className="pl-8 select-text"
            />
          </div>
          <Button type="submit" size="sm" disabled={isLoading || !query.trim()}>
            Swap
          </Button>
        </div>
      </form>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite">
        {isLoading && (
          <div className="flex flex-wrap gap-1.5 animate-pulse" role="status" aria-label="Finding swaps">
            {[60, 48, 72, 56, 64, 44].map((w, i) => (
              <div key={i} className="h-7 rounded-full bg-paper-active" style={{ width: w }} />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded-xl border text-xs bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}. Try again in a moment.</span>
          </div>
        )}

        {!data && !isLoading && !error && (
          <>
            <EmptyState icon={<Shuffle className="w-5 h-5" />} title="Swap a sound">
              Type the sound shape you're humming to find words that fit it.
            </EmptyState>
            <section className="space-y-2">
              <SectionLabel>Try</SectionLabel>
              <ul className="space-y-1.5">
                {EXAMPLES.map((ex) => (
                  <li key={ex.input}>
                    <button
                      type="button"
                      onClick={() => setQuery(ex.input)}
                      className="w-full text-left rounded-xl border border-paper-darker bg-paper px-3 py-2 hover:border-terracotta transition-colors cursor-pointer"
                    >
                      <span className="font-mono text-sm text-terracotta">{ex.input}</span>
                      <span className="block text-xs text-ink-muted">{ex.hint}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {data && !isLoading && !error && (
          <div className="space-y-4 select-none">
            {data.phonemes && (
              <p className="text-xs text-ink-muted">
                Sound profile <span className="font-mono text-terracotta ml-1">{data.phonemes}</span>
              </p>
            )}

            <section className="space-y-2">
              <SectionLabel>
                Matching words <span className="text-ink-light font-normal">· {data.results.length}</span>
              </SectionLabel>

              {data.results.length === 0 ? (
                <p className="text-xs text-ink-muted py-2">No matching words found.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {data.results.map((word) => (
                    <Chip
                      key={word}
                      interactive
                      tone={copiedWord === word ? 'accent' : 'default'}
                      title="Double-click to copy"
                      onDoubleClick={() => copyWord(word)}
                      className="select-all"
                    >
                      {copiedWord === word && <Check className="w-3 h-3 mr-1" />}
                      {word}
                    </Chip>
                  ))}
                </div>
              )}
            </section>

            <p className="text-xs text-ink-muted leading-relaxed flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-ink-light mt-0.5 flex-shrink-0" />
              Double-click a word to copy it. Sorted by sound similarity and how common the word is.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
