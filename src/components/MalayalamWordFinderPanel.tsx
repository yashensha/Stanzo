import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Plus, Filter, Music, BookOpen, Check, Loader2 } from 'lucide-react';
import { Input } from './ui/Input';
import { EmptyState } from './ui/Panel';
import { analyzeMalayalamWord, isMalayalam } from '../utils/malayalamProsody';
import type { WordMeterProfile } from '../utils/malayalamProsody';
import { transliterateWord, fetchGoogleTransliteration, getTransliterationSync } from '../utils/manglishTransliterate';

interface SynItem {
  w: string;
  f: number;
  a: number;
  m: number;
  p: string;
}

interface ThesaurusHub {
  hub: string;
  meaning: string;
  syns: SynItem[];
}

interface CoreDictItem {
  w: string;
  f: number;
  s: number;
  a: number;
  m: number;
  p: string;
  d: string | null;
  r: string | null;
}

interface MalayalamWordFinderPanelProps {
  lookupWord: string | null;
  onSelectWord?: (word: string) => void;
  onClearLookup?: () => void;
}

const LOCAL_STORAGE_CUSTOM_KEY = 'malayalam_custom_synsets_v1';
const LOCAL_STORAGE_REMOVED_KEY = 'malayalam_removed_syns_v1';

export const MalayalamWordFinderPanel: React.FC<MalayalamWordFinderPanelProps> = ({
  lookupWord,
  onSelectWord,
  onClearLookup
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [thesaurus, setThesaurus] = useState<Record<string, ThesaurusHub>>({});
  const [coreDict, setCoreDict] = useState<CoreDictItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [targetSyllables, setTargetSyllables] = useState<number | 'all'>('all');
  const [targetPraasam, setTargetPraasam] = useState<'all' | 'dviteeyam' | 'anthyam'>('all');
  const [copiedWord, setCopiedWord] = useState<string | null>(null);
  const [newSynonymInput, setNewSynonymInput] = useState('');
  const [isAddingSyn, setIsAddingSyn] = useState(false);

  // User customizations from localStorage
  const [customSynsets, setCustomSynsets] = useState<Record<string, SynItem[]>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CUSTOM_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [removedSynonyms, setRemovedSynonyms] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_REMOVED_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Load datasets once on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [thesaurusRes, dictRes] = await Promise.all([
          fetch('/malayalam/song_thesaurus.json'),
          fetch('/malayalam/malayalam_core_dictionary.json')
        ]);

        if (thesaurusRes.ok) {
          const tData = await thesaurusRes.json();
          setThesaurus(tData);
        }
        if (dictRes.ok) {
          const dData = await dictRes.json();
          setCoreDict(dData);
        }
      } catch (err) {
        console.error('Failed to load Malayalam dictionaries:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Sync when editor double clicks a word
  useEffect(() => {
    if (lookupWord) {
      setSearchTerm(lookupWord);
    }
  }, [lookupWord]);

  // Handle Search Input (Auto-transliterates Manglish if typed in Latin letters)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // If user types Latin letters, transliterate to Malayalam using Google Input Tools
    if (val && !isMalayalam(val) && /[a-zA-Z]/.test(val)) {
      const cached = getTransliterationSync(val);
      setSearchTerm(cached || transliterateWord(val));
      fetchGoogleTransliteration(val).then(candidates => {
        if (candidates.length > 0) {
          setSearchTerm(candidates[0]);
        }
      });
    } else {
      setSearchTerm(val);
    }
  };

  const activeQuery = searchTerm.trim();

  // Word Prosody Profile
  const wordProfile: WordMeterProfile | null = useMemo(() => {
    if (!activeQuery) return null;
    return analyzeMalayalamWord(activeQuery);
  }, [activeQuery]);

  // Lookup word frequency in songs
  const activeWordFreq = useMemo(() => {
    if (!activeQuery || coreDict.length === 0) return null;
    const match = coreDict.find(item => item.w === activeQuery);
    return match ? { freq: match.f, songs: match.s } : null;
  }, [activeQuery, coreDict]);

  // Resolved Synonyms (combining curated thesaurus + user custom additions - user removals)
  const resolvedSynonyms: SynItem[] = useMemo(() => {
    if (!activeQuery) return [];

    let baseSyns: SynItem[] = [];
    const entry = thesaurus[activeQuery];
    if (entry && entry.syns) {
      baseSyns = [...entry.syns];
    }

    // Add user custom additions
    if (customSynsets[activeQuery]) {
      baseSyns = [...customSynsets[activeQuery], ...baseSyns];
    }

    // Filter out removed words
    const removed = new Set(removedSynonyms[activeQuery] || []);
    const filtered = baseSyns.filter(item => !removed.has(item.w));

    // Deduplicate
    const seen = new Set<string>();
    return filtered.filter(item => {
      if (seen.has(item.w)) return false;
      seen.add(item.w);
      return true;
    });
  }, [activeQuery, thesaurus, customSynsets, removedSynonyms]);

  // Praasam (Rhymes from the 19,685 song core dictionary)
  const praasamMatches: { anthyam: CoreDictItem[]; dviteeyam: CoreDictItem[] } = useMemo(() => {
    if (!wordProfile || coreDict.length === 0) {
      return { anthyam: [], dviteeyam: [] };
    }

    const anthyam: CoreDictItem[] = [];
    const dviteeyam: CoreDictItem[] = [];

    const queryRhyme = wordProfile.rhymeEnding;
    const queryDviteeyam = wordProfile.dviteeyaksharam;

    for (const item of coreDict) {
      if (item.w === activeQuery) continue;

      if (queryRhyme && item.r === queryRhyme) {
        anthyam.push(item);
      }
      if (queryDviteeyam && item.d === queryDviteeyam) {
        dviteeyam.push(item);
      }
    }

    // Sort by song frequency
    anthyam.sort((a, b) => b.f - a.f);
    dviteeyam.sort((a, b) => b.f - a.f);

    return {
      anthyam: anthyam.slice(0, 30),
      dviteeyam: dviteeyam.slice(0, 30)
    };
  }, [wordProfile, coreDict, activeQuery]);

  // Filtered Synonyms based on active meter filters
  const displaySynonyms = useMemo(() => {
    return resolvedSynonyms.filter(item => {
      if (targetSyllables !== 'all' && item.a !== targetSyllables) {
        return false;
      }
      if (targetPraasam === 'dviteeyam' && wordProfile?.dviteeyaksharam) {
        const itemProfile = analyzeMalayalamWord(item.w);
        if (itemProfile.dviteeyaksharam !== wordProfile.dviteeyaksharam) return false;
      }
      if (targetPraasam === 'anthyam' && wordProfile?.rhymeEnding) {
        const itemProfile = analyzeMalayalamWord(item.w);
        if (itemProfile.rhymeEnding !== wordProfile.rhymeEnding) return false;
      }
      return true;
    });
  }, [resolvedSynonyms, targetSyllables, targetPraasam, wordProfile]);

  // Remove word from synset
  const handleRemoveSynonym = (wordToRemove: string) => {
    if (!activeQuery) return;
    const current = removedSynonyms[activeQuery] || [];
    const updated = {
      ...removedSynonyms,
      [activeQuery]: [...current, wordToRemove]
    };
    setRemovedSynonyms(updated);
    localStorage.setItem(LOCAL_STORAGE_REMOVED_KEY, JSON.stringify(updated));
  };

  // Add custom word to synset
  const handleAddCustomSynonym = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newSynonymInput.trim();
    if (!raw || !activeQuery) return;

    let word = raw;
    if (!isMalayalam(raw)) {
      const candidates = await fetchGoogleTransliteration(raw);
      word = candidates[0] || transliterateWord(raw);
    }
    const profile = analyzeMalayalamWord(word);

    const newItem: SynItem = {
      w: word,
      f: 1,
      a: profile.aksharaCount,
      m: profile.totalMatras,
      p: profile.pattern
    };

    const current = customSynsets[activeQuery] || [];
    const updated = {
      ...customSynsets,
      [activeQuery]: [newItem, ...current]
    };
    setCustomSynsets(updated);
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_KEY, JSON.stringify(updated));

    setNewSynonymInput('');
    setIsAddingSyn(false);
  };

  const handleWordClick = (word: string) => {
    navigator.clipboard.writeText(word);
    setCopiedWord(word);
    setTimeout(() => setCopiedWord(null), 1500);
    if (onSelectWord) {
      onSelectWord(word);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent text-ink">
      {/* Search Header */}
      <div className="p-4 border-b border-paper-darker flex flex-col gap-2 select-none flex-shrink-0">
        {/* Input bar */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-ink-light absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            inputSize="sm"
            type="text"
            aria-label="Malayalam word"
            placeholder="Malayalam or Manglish (mazha, sooryan)"
            value={searchTerm}
            onChange={handleSearchChange}
            className={`pl-8 select-text ${activeQuery ? 'pr-14' : ''}`}
          />
          {activeQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                if (onClearLookup) onClearLookup();
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-2 text-[11px] text-ink-muted hover:text-ink hover:bg-paper-active rounded-md transition cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-xs text-ink-muted leading-snug">
          Double-click a word in your lyrics, or type above. Manglish works too.
        </p>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-xs text-ink-muted" role="status">
          <Loader2 className="w-5 h-5 animate-spin text-terracotta mb-2" />
          Loading the 7,145-song dictionary…
        </div>
      ) : !wordProfile ? (
        <EmptyState icon={<BookOpen className="w-5 h-5" />} title="Look up a word" className="flex-1 justify-center">
          Find song-tested alternatives that match the syllables and matras you need.
        </EmptyState>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col p-4 gap-5">
          {/* Word Meter Profile Card */}
          <div className="p-4 bg-paper border border-paper-darker rounded-xl flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-2xl font-semibold text-terracotta block">
                  {wordProfile.word}
                </span>
                <span className="text-xs text-ink-muted">
                  {thesaurus[activeQuery]?.meaning || 'Song vocabulary'}
                </span>
              </div>
              {activeWordFreq && (
                <div className="flex items-center gap-1 text-[11px] bg-terracotta-light text-terracotta px-2 py-1 rounded-full flex-shrink-0">
                  <Music className="w-3 h-3" />
                  <span>{activeWordFreq.freq}× in {activeWordFreq.songs} songs</span>
                </div>
              )}
            </div>

            {/* Syllables & Matras details */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col bg-paper-dark p-2.5 rounded-lg">
                <span className="text-[11px] text-ink-muted">അക്ഷരങ്ങൾ · Syllables</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-semibold text-ink tabular-nums">{wordProfile.aksharaCount}</span>
                  <span className="text-[11px] text-ink-muted truncate">
                    {wordProfile.syllables.join(' · ')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col bg-paper-dark p-2.5 rounded-lg">
                <span className="text-[11px] text-ink-muted">മാത്രകൾ · Matras</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-semibold text-ink tabular-nums">{wordProfile.totalMatras}</span>
                  <span className="text-[11px] text-ink-muted truncate">{wordProfile.pattern}</span>
                </div>
              </div>
            </div>

            {/* Praasam Keys */}
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              {wordProfile.dviteeyaksharam && (
                <span>ദ്വിതീയം: <strong className="text-ink">{wordProfile.dviteeyaksharam}</strong></span>
              )}
              {wordProfile.rhymeEnding && (
                <span>അന്ത്യപ്രാസം: <strong className="text-ink">{wordProfile.rhymeEnding}</strong></span>
              )}
            </div>
          </div>

          {/* Filter by Syllable Budget */}
          <div className="flex flex-col gap-2 select-none" role="group" aria-label="Syllable filter">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-muted flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Syllables
              </span>
              <span className="text-[11px] text-ink-light">
                {displaySynonyms.length} words
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {(['all', 1, 2, 3, 4, 5] as const).map(syl => (
                <button
                  key={syl}
                  onClick={() => setTargetSyllables(syl)}
                  aria-pressed={targetSyllables === syl}
                  className={`h-7 px-2.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    targetSyllables === syl
                      ? 'bg-terracotta text-white border-terracotta'
                      : 'bg-paper border-paper-darker text-ink-muted hover:text-ink hover:border-ink-light'
                  }`}
                >
                  {syl === 'all' ? 'All' : `${syl} Syl`}
                </button>
              ))}
            </div>
          </div>

          {/* Praasam Rhyme Filter */}
          <div className="flex flex-wrap items-center gap-1 text-xs select-none" role="group" aria-label="Rhyme filter">
            <span className="text-ink-muted mr-1 font-semibold">Rhyme</span>
            <button
              onClick={() => setTargetPraasam('all')}
              className={`h-7 px-2.5 rounded-full border transition-colors cursor-pointer ${
                targetPraasam === 'all'
                  ? 'bg-terracotta-light text-terracotta font-semibold border-transparent'
                  : 'bg-paper text-ink-muted border-paper-darker hover:text-ink'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTargetPraasam('dviteeyam')}
              className={`h-7 px-2.5 rounded-full border transition-colors cursor-pointer ${
                targetPraasam === 'dviteeyam'
                  ? 'bg-terracotta-light text-terracotta font-semibold border-transparent'
                  : 'bg-paper text-ink-muted border-paper-darker hover:text-ink'
              }`}
              title="Second letter rhyme (ദ്വിതീയാക്ഷരപ്രാസം)"
            >
              ദ്വിതീയാക്ഷരം
            </button>
            <button
              onClick={() => setTargetPraasam('anthyam')}
              className={`h-7 px-2.5 rounded-full border transition-colors cursor-pointer ${
                targetPraasam === 'anthyam'
                  ? 'bg-terracotta-light text-terracotta font-semibold border-transparent'
                  : 'bg-paper text-ink-muted border-paper-darker hover:text-ink'
              }`}
              title="End rhyme (അന്ത്യപ്രാസം)"
            >
              അന്ത്യപ്രാസം
            </button>
          </div>

          {/* Synonyms / Alternative Words List */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">
                Song-tested alternatives
              </h3>
              <button
                onClick={() => setIsAddingSyn(!isAddingSyn)}
                className="h-7 px-2 rounded-lg text-xs text-terracotta hover:bg-terracotta-light flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add word
              </button>
            </div>

            {/* Quick add custom word input */}
            {isAddingSyn && (
              <form onSubmit={handleAddCustomSynonym} className="flex items-center gap-1.5">
                <Input
                  inputSize="sm"
                  type="text"
                  aria-label="Custom word"
                  placeholder="Manglish or Malayalam"
                  value={newSynonymInput}
                  onChange={(e) => setNewSynonymInput(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <button
                  type="submit"
                  className="h-8 px-3 bg-terracotta hover:bg-terracotta-hover text-white rounded-xl text-xs font-medium cursor-pointer transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingSyn(false)}
                  aria-label="Cancel"
                  className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-paper-active rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            )}

            {displaySynonyms.length === 0 ? (
              <div className="p-4 border border-dashed border-paper-darker rounded-xl text-center text-xs text-ink-muted">
                No alternatives for {targetSyllables === 'all' ? 'this word' : `${targetSyllables} syllables`} yet.
                <span className="block mt-1 text-ink-light">Use "Add word" to link your own.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {displaySynonyms.map((syn) => (
                  <div
                    key={syn.w}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleWordClick(syn.w)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleWordClick(syn.w);
                      }
                    }}
                    className="px-3 py-2 bg-paper border border-paper-darker rounded-xl hover:border-terracotta transition-colors cursor-pointer flex items-center justify-between group focus-visible:outline-2 focus-visible:outline-terracotta"
                  >
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-semibold text-base text-ink group-hover:text-terracotta transition-colors">
                        {syn.w}
                      </span>
                      <span className="text-[11px] text-ink-muted whitespace-nowrap">
                        {syn.a} syl · {syn.m} matras
                      </span>
                      {syn.f > 1 && (
                        <span className="text-[11px] text-ink-light whitespace-nowrap">
                          {syn.f} songs
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {copiedWord === syn.w ? (
                        <span className="text-[11px] text-terracotta flex items-center gap-0.5 font-semibold" role="status">
                          <Check className="w-3 h-3" /> Copied
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-light opacity-0 group-hover:opacity-100 transition-opacity">
                          Use
                        </span>
                      )}

                      {/* Remove button (Dictionary yourself curation) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSynonym(syn.w);
                        }}
                        title="Remove from this cluster"
                        aria-label={`Remove ${syn.w}`}
                        className="w-6 h-6 flex items-center justify-center text-ink-light hover:text-red-600 dark:hover:text-red-400 rounded-md opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus-visible:opacity-100 transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Praasam (Rhyme) Suggestions from Song Corpus */}
          {(praasamMatches.anthyam.length > 0 || praasamMatches.dviteeyam.length > 0) && (
            <div className="flex flex-col gap-3 pt-4 border-t border-paper-darker">
              <h3 className="text-sm font-semibold text-ink">
                Rhymes from songs · പ്രാസം
              </h3>

              {praasamMatches.dviteeyam.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-ink-muted">
                    ദ്വിതീയാക്ഷരപ്രാസം ({wordProfile.dviteeyaksharam})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {praasamMatches.dviteeyam.slice(0, 10).map(item => (
                      <button
                        key={item.w}
                        onClick={() => handleWordClick(item.w)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-paper border border-paper-darker rounded-full text-sm text-ink hover:border-terracotta hover:text-terracotta transition-colors cursor-pointer"
                      >
                        {item.w} <span className="text-[11px] text-ink-muted">{item.a}s</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {praasamMatches.anthyam.length > 0 && (
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-xs font-semibold text-ink-muted">
                    അന്ത്യപ്രാസം ({wordProfile.rhymeEnding})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {praasamMatches.anthyam.slice(0, 10).map(item => (
                      <button
                        key={item.w}
                        onClick={() => handleWordClick(item.w)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-paper border border-paper-darker rounded-full text-sm text-ink hover:border-terracotta hover:text-terracotta transition-colors cursor-pointer"
                      >
                        {item.w} <span className="text-[11px] text-ink-muted">{item.a}s</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
