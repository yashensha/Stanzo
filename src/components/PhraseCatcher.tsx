import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CornerDownRight, Search, Sparkles } from 'lucide-react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { EmptyState } from './ui/Panel';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { api } from '../utils/apiClient';

interface Phrase {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface PhraseCatcherProps {
  onImportPhrase?: (content: string) => void;
  isProjectOpen: boolean;
}

export const PhraseCatcher: React.FC<PhraseCatcherProps> = ({
  onImportPhrase,
  isProjectOpen,
}) => {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [newPhraseText, setNewPhraseText] = useState('');
  const [deletingPhraseId, setDeletingPhraseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch phrases on mount
  useEffect(() => {
    const fetchPhrases = async () => {
      try {
        setIsLoading(true);
        const data = await api.phrases.list();
        setPhrases(data || []);
      } catch (err) {
        console.error('Error in fetchPhrases:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhrases();
  }, []);

  // Handle Add Phrase
  const handleAddPhrase = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newPhraseText.trim();
    if (!trimmed) return;

    // Generate a temporary ID for optimistic UI update
    const tempId = crypto.randomUUID();

    const newPhraseItem: Phrase = {
      id: tempId,
      user_id: 'me',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    // Prepend immediately for zero perceived latency
    setPhrases((prev) => [newPhraseItem, ...prev]);
    setNewPhraseText('');

    try {
      const data = await api.phrases.create(trimmed, tempId);
      if (data) {
        setPhrases((prev) => prev.map((p) => (p.id === tempId ? data : p)));
      }
    } catch (err) {
      console.error('Exception adding phrase:', err);
      setPhrases((prev) => prev.filter((p) => p.id !== tempId));
    }
  };

  // Handle Delete Phrase
  const handleDeletePhrase = async (id: string) => {
    const phraseToDelete = phrases.find((p) => p.id === id);
    if (!phraseToDelete) return;

    setPhrases((prev) => prev.filter((p) => p.id !== id));
    setDeletingPhraseId(null);

    try {
      await api.phrases.delete(id);
    } catch (err) {
      console.error('Exception deleting phrase:', err);
      setPhrases((prev) => [phraseToDelete, ...prev].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }
  };

  const filteredPhrases = phrases.filter((phrase) =>
    phrase.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent">
      {/* Phrase Input */}
      <div className="p-4 border-b border-paper-darker select-none flex flex-col gap-2">
        <form onSubmit={handleAddPhrase} className="flex items-center gap-2">
          <Input
            inputSize="sm"
            type="text"
            aria-label="New phrase"
            placeholder="Catch a phrase…"
            value={newPhraseText}
            onChange={(e) => setNewPhraseText(e.target.value)}
            spellCheck="false"
            className="flex-1 select-text"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newPhraseText.trim()}
            title="Add phrase"
            aria-label="Add phrase"
            className="w-8 px-0 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </form>

        {phrases.length > 0 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-light absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              inputSize="sm"
              type="search"
              aria-label="Search phrases"
              placeholder="Search phrases"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              spellCheck="false"
              className="pl-8 select-text"
            />
          </div>
        )}
      </div>

      {/* Phrases List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {isLoading ? (
          <div className="space-y-2.5 animate-pulse" role="status" aria-label="Loading phrases">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-paper-active" />
            ))}
          </div>
        ) : phrases.length === 0 ? (
          <EmptyState icon={<Sparkles className="w-5 h-5" />} title="No phrases yet">
            Catch lines and hooks here before they slip away.
          </EmptyState>
        ) : filteredPhrases.length === 0 ? (
          <p className="text-xs text-ink-muted text-center py-8">No phrases match "{searchQuery}".</p>
        ) : (
          filteredPhrases.map((phrase) => (
            <div
              key={phrase.id}
              className="bg-paper border border-paper-darker rounded-xl p-3 relative group hover:border-ink-light transition-colors"
            >
              <p className="text-sm text-ink leading-relaxed pr-16 select-text break-words whitespace-pre-wrap">
                {phrase.content}
              </p>

              {/* Action Buttons */}
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100 transition-opacity duration-150">
                {/* Import Button */}
                <Tooltip.Provider delayDuration={200}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span>
                        <button
                          onClick={() => isProjectOpen && onImportPhrase && onImportPhrase(phrase.content)}
                          disabled={!isProjectOpen}
                          className="w-7 h-7 flex items-center justify-center text-ink-muted hover:text-terracotta hover:bg-paper-active disabled:opacity-40 disabled:hover:text-ink-muted disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                          aria-label="Import to active editor"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="bg-ink text-paper text-xs px-2.5 py-1.5 rounded-lg shadow-paper-md max-w-xs z-50 select-none"
                        side="right"
                        sideOffset={6}
                      >
                        {isProjectOpen 
                          ? "Insert at cursor in active editor" 
                          : "Disabled: Open a song project first to import phrases"
                        }
                        <Tooltip.Arrow className="fill-ink" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>

                {/* Delete Trigger */}
                <button
                  onClick={() => setDeletingPhraseId(phrase.id)}
                  className="w-7 h-7 flex items-center justify-center text-ink-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-paper-active rounded-lg transition-colors cursor-pointer"
                  aria-label="Delete phrase"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Alert */}
      <AlertDialog.Root
        open={!!deletingPhraseId}
        onOpenChange={(open: boolean) => !open && setDeletingPhraseId(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="radix-overlay" />
          <AlertDialog.Content className="radix-dialog-content select-none">
            <AlertDialog.Title className="text-base font-semibold text-ink mb-2">
              Delete phrase?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-ink-muted mb-6">
              This removes the phrase permanently.
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary" size="sm">Cancel</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (deletingPhraseId) {
                      handleDeletePhrase(deletingPhraseId);
                    }
                  }}
                >
                  Delete
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
};
