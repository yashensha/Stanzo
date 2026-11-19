import React, { useState } from 'react';
import { PenLine, Sparkles, Info, ChevronLeft, Plus } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import { Sidebar } from './Sidebar';
import { Notepad } from './Notepad';
import { ProjectInfoPanel } from './ProjectInfoPanel';
import { Logo } from './Logo';
import type { Draft } from '../hooks/useDrafts';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

type MobileTab = 'write' | 'library' | 'info';

interface MobileLayoutProps {
  // App state
  activeDraft: Draft | null;
  healthStatus: 'checking' | 'connected' | 'disconnected';
  isCloudMode: boolean;
  yDoc?: Y.Doc | null;
  provider?: WebsocketProvider | null;
  // Actions
  createDraft: (title?: string) => Promise<Draft>;
  updateActiveDraft: (updates: Partial<Omit<Draft, 'id' | 'createdAt'>>) => void;
  exportAllDrafts: () => void;
  importDrafts: (jsonString: string) => boolean;
  setIsEditorFocused: (v: boolean) => void;
  syncActiveDraftWithRemote: () => void;
  onSubconsciousActiveChange: (active: boolean) => void;
  subconsciousActive: boolean;
  penName: string;
  setPenName: (name: string) => void;
  googleDefaultName: string;
  /** Back to the song list (home). */
  onGoHome?: () => void;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  activeDraft,
  healthStatus: _healthStatus,
  isCloudMode,
  yDoc,
  provider,
  createDraft,
  updateActiveDraft,
  exportAllDrafts,
  importDrafts,
  setIsEditorFocused,
  syncActiveDraftWithRemote,
  onSubconsciousActiveChange,
  subconsciousActive,
  penName,
  setPenName,
  googleDefaultName,
  onGoHome,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('write');
  const [activePanel] = useState<'settings' | 'phrases'>('phrases');

  const editorRef = React.useRef<any>(null);

  const handleImportPhrase = (content: string) => {
    if (editorRef.current && editorRef.current.insertText) {
      editorRef.current.insertText(content);
      setActiveTab('write');
    }
  };

  // When a new draft is created, switch to Write
  const handleCreateDraft = (title?: string) => {
    createDraft(title);
    setActiveTab('write');
  };

  const tabs: { id: MobileTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { id: 'write',   label: 'Write',   Icon: ({ className }) => <PenLine className={className} /> },
    { id: 'library', label: 'Phrases', Icon: ({ className }) => <Sparkles className={className} /> },
  ];

  if (activeDraft) {
    tabs.push({ id: 'info', label: 'Info', Icon: ({ className }) => <Info className={className} /> });
  }

  return (
    <div className="w-screen h-dvh flex flex-col bg-paper text-ink font-sans select-none overflow-hidden" style={{ height: '100dvh' }}>

      {/* ── Mobile Header ── */}
      <header
        className={cn(
          'min-h-14 w-full bg-paper border-b border-paper-darker flex items-center gap-2 px-2 flex-shrink-0 transition-opacity duration-500',
          subconsciousActive && 'opacity-10 pointer-events-none',
        )}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {onGoHome ? (
          <button
            type="button"
            onClick={onGoHome}
            aria-label="All songs"
            className="h-11 pl-1 pr-2 flex items-center gap-0.5 rounded-xl text-ink hover:bg-paper-active active:bg-paper-active transition-colors cursor-pointer flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-terracotta" />
            <Logo size={24} showWordmark={false} />
          </button>
        ) : (
          <span className="px-2 flex-shrink-0">
            <Logo size={24} />
          </span>
        )}

        {/* Active song title */}
        {activeDraft && (
          <span className="flex-1 min-w-0 text-base font-semibold text-ink truncate">
            {activeDraft.title || 'Untitled Song'}
          </span>
        )}
      </header>


      {/* ── Main Panel Area ── */}
      <main className="flex-1 min-h-0 w-full overflow-hidden relative">

        {/* Write Tab */}
        {activeTab === 'write' && (
          <div className={`w-full h-full flex flex-col transition-opacity duration-500 ${
            subconsciousActive ? '' : ''
          }`}>
            {activeDraft ? (
              <Notepad
                draftId={activeDraft.id}
                title={activeDraft.title}
                content={activeDraft.content}
                targetTemplate={activeDraft.targetTemplate}
                syllableTolerance={activeDraft.syllableTolerance ?? 1}
                updateActiveDraft={updateActiveDraft}
                yDoc={yDoc}
                provider={provider}
                setIsEditorFocused={setIsEditorFocused}
                syncActiveDraftWithRemote={syncActiveDraftWithRemote}
                isCloudMode={isCloudMode}
                onSubconsciousActiveChange={onSubconsciousActiveChange}
                isMobile={true}
                editorRef={editorRef}
              />
            ) : (
              <div className="flex-1 h-full bg-paper flex flex-col items-center justify-center gap-3 px-8 text-center">
                <Logo size={32} className="mb-1" />
                <p className="text-sm text-ink-muted mb-4">Start a song, or pick one up where you left off.</p>
                <Button size="lg" onClick={() => { handleCreateDraft(); }} className="w-full max-w-xs">
                  <Plus className="w-4 h-4" />
                  New song
                </Button>
                {onGoHome && (
                  <Button variant="ghost" size="lg" onClick={onGoHome} className="w-full max-w-xs">
                    All songs
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="w-full h-full">
            <Sidebar
              activePanel={activePanel}
              exportAllDrafts={exportAllDrafts}
              importDrafts={importDrafts}
              setIsSidebarOpen={() => {}}
              isCloudMode={isCloudMode}
              isMobile={true}
              penName={penName}
              setPenName={setPenName}
              googleDefaultName={googleDefaultName}
              onImportPhrase={handleImportPhrase}
              isProjectOpen={!!activeDraft}
            />
          </div>
        )}


        {/* Info Tab */}
        {activeTab === 'info' && activeDraft && (
          <div className="w-full h-full bg-paper-dark flex flex-col">
            <div className="border-b border-paper-darker px-4 h-12 flex items-center">
              <h2 className="text-lg font-semibold text-ink">Song info</h2>
            </div>
            <ProjectInfoPanel
              activeDraft={activeDraft}
              updateActiveDraft={updateActiveDraft}
            />
          </div>
        )}

      </main>

      {/* ── Bottom Navigation Bar ── */}
      <nav
        aria-label="Song sections"
        className={cn(
          'w-full bg-paper border-t border-paper-darker flex items-stretch flex-shrink-0 transition-opacity duration-500',
          subconsciousActive && 'opacity-10 pointer-events-none',
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {tabs.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex-1 h-16 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors',
                isActive ? 'text-terracotta' : 'text-ink-muted active:text-ink',
              )}
            >
              <span
                className={cn(
                  'w-14 h-8 rounded-full flex items-center justify-center transition-colors duration-200',
                  isActive && 'bg-terracotta-light',
                )}
              >
                <Icon className="w-5 h-5 stroke-[1.75]" />
              </span>
              <span className="text-[11px] font-semibold">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
