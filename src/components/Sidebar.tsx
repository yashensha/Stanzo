import React from 'react';
import { FileDown, FileUp, ChevronLeft } from 'lucide-react';
import { PhraseCatcher } from './PhraseCatcher';
import { Graveyard } from './Graveyard';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface SidebarProps {
  activePanel: 'settings' | 'phrases' | 'graveyard';
  exportAllDrafts: () => void;
  importDrafts: (jsonString: string) => boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isCloudMode: boolean;
  isMobile?: boolean;
  penName?: string;
  setPenName?: (name: string) => void;
  googleDefaultName?: string;
  onImportPhrase?: (content: string) => void;
  isProjectOpen: boolean;
  refreshGraveyardCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePanel,
  exportAllDrafts,
  importDrafts,
  setIsSidebarOpen,
  isMobile = false,
  penName,
  setPenName,
  googleDefaultName,
  onImportPhrase,
  isProjectOpen,
  refreshGraveyardCount = 0,
}) => {
  const [localPenName, setLocalPenName] = React.useState(penName || '');

  React.useEffect(() => {
    if (penName !== undefined) {
      setLocalPenName(penName);
    }
  }, [penName]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDrafts(content);
      if (success) {
        alert('Drafts imported successfully!');
      } else {
        alert('Failed to import drafts. Make sure the file format is correct.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  const getHeaderLabel = () => {
    switch (activePanel) {
      case 'settings':
        return 'Settings';
      case 'graveyard':
        return 'Graveyard';
      case 'phrases':
      default:
        return 'Phrase Catcher';
    }
  };

  return (
    <div className={`${isMobile ? 'w-full' : 'w-72'} h-full bg-paper-dark border-r border-paper-darker flex flex-col flex-shrink-0 z-10`}>
      {/* Sidebar Header */}
      <div className="h-14 px-4 border-b border-paper-darker flex items-center justify-between select-none">
        <h2 className="font-serif font-semibold text-ink text-lg">
          {getHeaderLabel()}
        </h2>
        {!isMobile && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-paper-active rounded-lg cursor-pointer transition-colors"
            title="Collapse panel"
            aria-label="Collapse panel"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Settings Panel */}
      {activePanel === 'settings' && (
        <div className="flex-1 p-4 flex flex-col justify-between select-none bg-transparent">
          <div className="space-y-4">
            {penName !== undefined && setPenName && (
              <div className="border-b border-paper-darker pb-4">
                <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2">Pen Name</h4>
                <p className="text-[11px] text-ink-muted leading-relaxed mb-2">
                  Configure your display name for real-time collaboration. Defaults to your Google account name.
                </p>
                <div className="flex flex-col gap-2">
                  <Input
                    type="text"
                    aria-label="Pen name"
                    placeholder={googleDefaultName || 'Enter your pen name...'}
                    value={localPenName}
                    onChange={(e) => setLocalPenName(e.target.value)}
                    spellCheck="false"
                    className="select-text h-8 text-xs"
                  />
                  <Button size="sm" onClick={() => setPenName(localPenName)} className="w-full">
                    Save
                  </Button>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2">Backups</h4>
              <p className="text-[11px] text-ink-muted leading-relaxed mb-3">
                Export or import your songwriting workspace. All files remain strictly local in your browser.
              </p>
              
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportAllDrafts}
                  className="w-full"
                  aria-label="Backup all drafts library to JSON"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Back up library (JSON)
                </Button>

                <label
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const fileInput = document.getElementById('restore-file-input');
                      if (fileInput) fileInput.click();
                    }
                  }}
                  className="w-full h-8 flex items-center justify-center gap-1.5 bg-paper-dark border border-paper-darker hover:bg-paper-active text-ink text-xs font-medium rounded-xl transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-terracotta"
                  aria-label="Restore library from JSON backup"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  Restore library
                  <input
                    id="restore-file-input"
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-paper-darker pt-4">
              <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2">About Stanza</h4>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Stanza is designed around the pop math principles of Swedish hitmakers and emotional lyric design.
              </p>
            </div>
          </div>
          
          <div className="text-[10px] text-ink-light text-center">
            Songwriter's Workspace v2.5.0
          </div>
        </div>
      )}

      {/* Phrase Catcher Panel */}
      {activePanel === 'phrases' && (
        <PhraseCatcher
          onImportPhrase={onImportPhrase}
          isProjectOpen={isProjectOpen}
        />
      )}

      {/* Graveyard Panel */}
      {activePanel === 'graveyard' && (
        <Graveyard
          onImportPhrase={onImportPhrase}
          isProjectOpen={isProjectOpen}
          refreshTrigger={refreshGraveyardCount}
        />
      )}
    </div>
  );
};
