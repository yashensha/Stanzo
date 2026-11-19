import React, { useState, useEffect } from 'react';
import { CornerDownRight, Search, Skull } from 'lucide-react';
import { Input } from './ui/Input';
import { EmptyState } from './ui/Panel';
import * as Tooltip from '@radix-ui/react-tooltip';
import { api } from '../utils/apiClient';

interface GraveyardEntry {
  id: string;
  user_id: string;
  content: string;
  project_name: string;
  created_at: string;
}

interface GraveyardProps {
  onImportPhrase?: (content: string) => void;
  isProjectOpen: boolean;
  refreshTrigger?: number; // Prop to trigger refetch when a new item is added
}

export const Graveyard: React.FC<GraveyardProps> = ({
  onImportPhrase,
  isProjectOpen,
  refreshTrigger = 0,
}) => {
  const [entries, setEntries] = useState<GraveyardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const data = await api.graveyard.list();
      setEntries(data || []);
    } catch (err) {
      console.error('Error in fetchEntries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch entries on mount or when refreshTrigger changes
  useEffect(() => {
    fetchEntries();
  }, [refreshTrigger]);

  const filteredEntries = entries.filter((entry) =>
    entry.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent">
      {/* Search Input (only once there is something to search) */}
      {entries.length > 0 && (
      <div className="p-4 border-b border-paper-darker select-none flex items-center gap-2 relative">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-ink-light absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            inputSize="sm"
            type="search"
            aria-label="Search graveyard"
            placeholder="Search graveyard"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            spellCheck="false"
            className="pl-8 select-text"
          />
        </div>
      </div>
      )}

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {isLoading ? (
          <div className="space-y-2.5 animate-pulse" role="status" aria-label="Loading graveyard">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-paper-active" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          searchQuery ? (
            <p className="text-xs text-ink-muted text-center py-8">No lines match "{searchQuery}".</p>
          ) : (
            <EmptyState icon={<Skull className="w-5 h-5" />} title="Nothing buried yet">
              Select a line in the editor and press Ctrl+G to move it here. You can bring it back later.
            </EmptyState>
          )
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-paper border border-paper-darker rounded-xl p-3 relative group hover:border-ink-light transition-colors"
            >
              <p className="text-sm text-ink leading-relaxed mb-3 pr-9 select-text break-words whitespace-pre-wrap">
                {entry.content}
              </p>

              {/* Card Footer: Project Name & Date */}
              <div className="flex items-center justify-between text-[11px] text-ink-muted select-none border-t border-paper-darker pt-2">
                <span className="truncate max-w-[150px] font-medium text-terracotta" title={entry.project_name}>
                  {entry.project_name}
                </span>
                <span>{formatDate(entry.created_at)}</span>
              </div>

              {/* Action Buttons */}
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100 transition-opacity duration-150">
                {/* Import Button */}
                <Tooltip.Provider delayDuration={200}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span>
                        <button
                          onClick={() => isProjectOpen && onImportPhrase && onImportPhrase(entry.content)}
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
                          : "Disabled: Open a song project first to import"
                        }
                        <Tooltip.Arrow className="fill-ink" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
