import React, { useState, useEffect } from 'react';
import { X, Search, MousePointerClick, WifiOff, RotateCw } from 'lucide-react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Chip, EmptyState, SectionLabel } from './ui/Panel';

interface RhymeData {
  word: string;
  perfect: string[];
  slant: string[];
  perfect_bigrams: string[];
  slant_bigrams: string[];
}

interface RhymePanelProps {
  lookupWord: string | null;
  data: RhymeData | null;
  isLoading: boolean;
  error: string | null;
  onClear: () => void;
  onSearch: (word: string) => void;
}

export const RhymePanel: React.FC<RhymePanelProps> = ({
  lookupWord,
  data,
  isLoading,
  error,
  onClear,
  onSearch,
}) => {
  const [manualInput, setManualInput] = useState('');

  // Sync manual input with lookupWord when lookupWord changes
  useEffect(() => {
    if (lookupWord) {
      setManualInput(lookupWord);
    } else {
      setManualInput('');
    }
  }, [lookupWord]);

  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualInput.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  const handleClearClick = () => {
    setManualInput('');
    onClear();
  };

  const hasResults =
    data &&
    (data.perfect.length > 0 ||
      data.slant.length > 0 ||
      data.perfect_bigrams.length > 0 ||
      data.slant_bigrams.length > 0);

  const showErrorState = !isLoading && !!error;
  const showEmptyState = !isLoading && !error && data && !hasResults;

  // Single words can be searched again (double-click); phrases are display-only.
  const groups = data
    ? [
        { label: 'Perfect rhymes', items: data.perfect, searchable: true },
        { label: 'Perfect phrases', items: data.perfect_bigrams, searchable: false },
        { label: 'Slant rhymes', items: data.slant, searchable: true },
        { label: 'Slant phrases', items: data.slant_bigrams, searchable: false },
      ]
    : [];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent">
      {/* Search */}
      <form onSubmit={handleManualSearchSubmit} className="p-4 border-b border-paper-darker flex items-center gap-2 select-none flex-shrink-0">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-ink-light absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            inputSize="sm"
            type="text"
            aria-label="Search rhymes"
            placeholder="Find rhymes for…"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            spellCheck="false"
            className="pl-8 pr-8 select-text"
          />
          {lookupWord && (
            <button
              type="button"
              onClick={handleClearClick}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-ink-muted hover:text-ink rounded-md cursor-pointer"
              title="Clear current word"
              aria-label="Clear current word"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button type="submit" size="sm" disabled={isLoading || !manualInput.trim()}>
          Find
        </Button>
      </form>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6" aria-live="polite">
        {isLoading && (
          <div className="space-y-3" role="status" aria-label="Finding rhymes">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="h-3 w-24 rounded bg-paper-darker" />
                <div className="flex flex-wrap gap-1.5">
                  {[56, 72, 48, 64, 52].map((w, j) => (
                    <div key={j} className="h-7 rounded-full bg-paper-active" style={{ width: w }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {showErrorState && (
          <EmptyState icon={<WifiOff className="w-5 h-5" />} title="Couldn't load rhymes">
            <span className="block mb-4">The rhyme service didn't respond. Check your connection and try again.</span>
            {lookupWord && (
              <Button size="sm" variant="secondary" onClick={() => onSearch(lookupWord)}>
                <RotateCw className="w-3.5 h-3.5" />
                Try again
              </Button>
            )}
          </EmptyState>
        )}

        {showEmptyState && (
          <EmptyState icon={<Search className="w-5 h-5" />} title="No rhymes found">
            Try a simpler form of the word, or check the spelling.
          </EmptyState>
        )}

        {!lookupWord && !isLoading && !error && (
          <EmptyState icon={<MousePointerClick className="w-5 h-5" />} title="Pick a word">
            Double-click any word in your lyrics, or search above.
          </EmptyState>
        )}

        {data && !isLoading && !error && hasResults && (
          <>
            {lookupWord && (
              <p className="text-xs text-ink-muted select-none">
                Rhymes for <span className="text-terracotta font-semibold">{lookupWord}</span>
              </p>
            )}
            {groups.filter((g) => g.items.length > 0).map((group) => (
              <section key={group.label} className="space-y-2">
                <SectionLabel>
                  {group.label} <span className="text-ink-light font-normal">· {group.items.length}</span>
                </SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <Chip
                      key={item}
                      interactive={group.searchable}
                      onDoubleClick={group.searchable ? () => onSearch(item) : undefined}
                      title={group.searchable ? 'Double-click to find its rhymes' : undefined}
                      className="select-all"
                    >
                      {item}
                    </Chip>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
