import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Clock, MoreHorizontal, Search, Feather } from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import type { Draft } from '../hooks/useDrafts';
import { HeaderNav } from './HeaderNav';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';

interface LandingPageProps {
  drafts: Draft[];
  isCloudMode: boolean;
  healthStatus: 'checking' | 'connected' | 'disconnected';
  onSelectDraft: (id: string) => void;
  onCreateDraft: () => void;
  onDeleteDraft: (id: string) => void;
  onRenameDraft: (id: string, newTitle: string) => void;
  userEmail?: string;
  onSignOut?: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function wordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function firstLine(content: string): string {
  return content.replace(/^\[.*?\]\n?/gm, '').trim().split('\n')[0] || '';
}

export const LandingPage: React.FC<LandingPageProps> = ({
  drafts,
  isCloudMode: _isCloudMode,
  healthStatus: _healthStatus,
  onSelectDraft,
  onCreateDraft,
  onDeleteDraft,
  onRenameDraft,
  userEmail,
  onSignOut,
}) => {
  const [renamingDraftId, setRenamingDraftId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const visibleDrafts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...drafts]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter((d) => !q || (d.title || '').toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
  }, [drafts, query]);

  const handleStartRename = (draft: Draft) => {
    setRenamingDraftId(draft.id);
    setRenameTitle(draft.title || 'Untitled Song');
  };

  const handleRenameSubmit = (id: string) => {
    if (renameTitle.trim() && renameTitle.trim() !== drafts.find(d => d.id === id)?.title) {
      onRenameDraft(id, renameTitle.trim());
    }
    setRenamingDraftId(null);
  };

  const handleShare = (id: string) => {
    const shareUrl = `${window.location.origin}/draft/${id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setToastMessage('Invite link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy share link:', err);
    });
  };

  return (
    <div className="w-screen h-screen bg-paper flex flex-col overflow-hidden select-none">
      <HeaderNav
        userEmail={userEmail}
        onSignOut={onSignOut}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-10 sm:py-14">

          {/* Title row */}
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-serif font-semibold text-ink leading-tight">Your songs</h1>
              <p className="text-sm text-ink-muted mt-1">
                {drafts.length === 0
                  ? 'Start your first song.'
                  : `${drafts.length} ${drafts.length === 1 ? 'song' : 'songs'}, most recent first.`}
              </p>
            </div>
            <Button id="landing-new-song" size="lg" onClick={onCreateDraft}>
              <Plus className="w-4 h-4" />
              New song
            </Button>
          </div>

          {/* Search */}
          {drafts.length >= 3 && (
            <div className="relative mb-6 max-w-md">
              <Search className="w-4 h-4 text-ink-light absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="search"
                aria-label="Search songs"
                placeholder="Search titles and lyrics"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {drafts.length === 0 ? (
            <Card className="flex flex-col items-center text-center px-6 py-16">
              <div className="w-12 h-12 rounded-2xl bg-terracotta-light text-terracotta flex items-center justify-center mb-4">
                <Feather className="w-6 h-6" />
              </div>
              <h2 className="font-serif text-xl text-ink mb-1">A blank page</h2>
              <p className="text-sm text-ink-muted mb-6 max-w-xs">
                Write a line, find the rhyme, keep what works. Your songs will gather here.
              </p>
              <Button onClick={onCreateDraft}>
                <Plus className="w-4 h-4" />
                Write a song
              </Button>
            </Card>
          ) : visibleDrafts.length === 0 ? (
            <p className="text-sm text-ink-muted py-12 text-center">No songs match "{query}".</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {!query && (
                <button
                  onClick={onCreateDraft}
                  className="group min-h-[160px] rounded-2xl border-2 border-dashed border-paper-darker text-ink-muted hover:border-terracotta hover:text-terracotta hover:bg-terracotta-light/60 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                  <span className="text-sm font-medium">New song</span>
                </button>
              )}

              {visibleDrafts.map((draft) => (
                <ContextMenu.Root key={draft.id}>
                  <ContextMenu.Trigger asChild>
                    <Card
                      id={`landing-draft-${draft.id}`}
                      interactive
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (renamingDraftId !== draft.id) {
                          onSelectDraft(draft.id);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          onSelectDraft(draft.id);
                        }
                      }}
                      className="group relative flex flex-col justify-between min-h-[160px] p-5 focus-visible:outline-2 focus-visible:outline-terracotta"
                    >
                      <div>
                        {renamingDraftId === draft.id ? (
                          <input
                            type="text"
                            value={renameTitle}
                            onChange={(e) => setRenameTitle(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') {
                                handleRenameSubmit(draft.id);
                              } else if (e.key === 'Escape') {
                                setRenamingDraftId(null);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-transparent text-base font-semibold text-ink border-b border-terracotta focus:outline-none py-0.5"
                            autoFocus
                            aria-label="Song title"
                            onBlur={() => handleRenameSubmit(draft.id)}
                          />
                        ) : (
                          <h3 className="font-serif text-lg font-semibold text-ink leading-snug line-clamp-2 pr-8 group-hover:text-terracotta transition-colors">
                            {draft.title || 'Untitled Song'}
                          </h3>
                        )}

                        {firstLine(draft.content) && (
                          <p className="text-sm text-ink-muted italic leading-relaxed line-clamp-2 mt-2">
                            {firstLine(draft.content)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-ink-light font-mono mt-4 pt-3 border-t border-paper-darker">
                        <span>{wordCount(draft.content)} words</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(draft.updatedAt)}
                        </span>
                      </div>

                      {/* Three dot dropdown button */}
                      <div className="absolute top-3 right-3 opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100 transition-opacity duration-150">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button
                              aria-label="Song actions"
                              onClick={(e) => e.stopPropagation()}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:bg-paper-active hover:text-ink transition cursor-pointer"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              className="radix-menu-content"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenu.Item
                                className="radix-menu-item"
                                onSelect={() => handleStartRename(draft)}
                              >
                                Rename
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="radix-menu-item"
                                onSelect={() => handleShare(draft.id)}
                              >
                                Share
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="radix-menu-item is-danger"
                                onSelect={() => setDeletingDraftId(draft.id)}
                              >
                                Delete
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </div>
                    </Card>
                  </ContextMenu.Trigger>

                  <ContextMenu.Portal>
                    <ContextMenu.Content className="radix-menu-content">
                      <ContextMenu.Item
                        className="radix-menu-item"
                        onSelect={() => handleStartRename(draft)}
                      >
                        Rename
                      </ContextMenu.Item>
                      <ContextMenu.Item
                        className="radix-menu-item"
                        onSelect={() => handleShare(draft.id)}
                      >
                        Share
                      </ContextMenu.Item>
                      <ContextMenu.Item
                        className="radix-menu-item is-danger"
                        onSelect={() => setDeletingDraftId(draft.id)}
                      >
                        Delete
                      </ContextMenu.Item>
                    </ContextMenu.Content>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete confirmation dialog */}
      <AlertDialog.Root open={!!deletingDraftId} onOpenChange={(open: boolean) => !open && setDeletingDraftId(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="radix-overlay" />
          <AlertDialog.Content className="radix-dialog-content">
            <AlertDialog.Title className="text-base font-semibold text-ink mb-2">Delete song?</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-ink-muted mb-6">
              This removes the song permanently and cannot be undone.
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
                    if (deletingDraftId) {
                      onDeleteDraft(deletingDraftId);
                      setDeletingDraftId(null);
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

      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 bg-ink text-paper shadow-paper-md rounded-xl px-4 py-3 flex items-center gap-2.5 z-50 text-sm font-medium animate-[radix-slide-up_150ms_ease-out]">
          <div className="w-1.5 h-1.5 rounded-full bg-terracotta"></div>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
