import React from 'react';
import { Info, PanelLeftClose, PanelLeft, BookOpen, Mic, Search, Activity, Shuffle, Languages, type LucideIcon } from 'lucide-react';
import { RailButton } from './ui/RailButton';

type RightPanelId = 'info' | 'scrapbook' | 'audio' | 'rhyme' | 'density' | 'swap' | 'malayalam';

interface RightActivityBarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  activePanel: RightPanelId;
  setActivePanel: (panel: RightPanelId) => void;
  isMalayalamMode?: boolean;
}

interface RailItem {
  id: RightPanelId;
  label: string;
  title?: string;
  icon: LucideIcon;
}

const MALAYALAM: RailItem = {
  id: 'malayalam',
  label: 'Malayalam Dictionary & Meter',
  title: 'മലയാളം നിഘണ്ടു & മീറ്റർ (Malayalam Dictionary & Meter)',
  icon: Languages,
};

export const RightActivityBar: React.FC<RightActivityBarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  activePanel,
  setActivePanel,
  isMalayalamMode = false,
}) => {
  const handleItemClick = (panel: RightPanelId) => {
    if (activePanel === panel && isSidebarOpen) {
      setIsSidebarOpen(false);
    } else {
      setActivePanel(panel);
      setIsSidebarOpen(true);
    }
  };

  // Song tools: Malayalam sits next to Info in Malayalam mode
  const songItems: RailItem[] = [
    { id: 'info', label: 'Project Info', icon: Info },
    ...(isMalayalamMode ? [MALAYALAM] : []),
    { id: 'scrapbook', label: 'Scrapbook', icon: BookOpen },
    { id: 'audio', label: 'Voice Memos', icon: Mic },
  ];

  // English writing tools: always available, whatever language the song is in
  const writingItems: RailItem[] = [
    { id: 'rhyme', label: 'Rhyme Finder', icon: Search },
    { id: 'density', label: 'Rhyme Density Scorer', icon: Activity },
    { id: 'swap', label: 'Phonetic Word Swap', icon: Shuffle },
  ];

  const renderItem = (item: RailItem) => {
    const Icon = item.icon;
    return (
      <RailButton
        key={item.id}
        side="right"
        label={item.label}
        title={item.title}
        active={isSidebarOpen && activePanel === item.id}
        onClick={() => handleItemClick(item.id)}
      >
        <Icon className="w-5 h-5 stroke-[1.5]" />
      </RailButton>
    );
  };

  return (
    <nav
      aria-label="Song tools"
      className="w-14 h-full bg-paper border-l border-paper-darker flex flex-col items-center py-3 flex-shrink-0 z-10 select-none"
    >
      <div className="flex flex-col items-center gap-1.5 w-full">
        <RailButton
          side="right"
          label={isSidebarOpen ? 'Collapse right sidebar' : 'Expand right sidebar'}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-pressed={undefined}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-5 h-5 stroke-[1.5] rotate-180" />
          ) : (
            <PanelLeft className="w-5 h-5 stroke-[1.5] rotate-180" />
          )}
        </RailButton>

        <div className="w-6 h-px bg-paper-darker my-2" aria-hidden="true" />
        {songItems.map(renderItem)}

        {writingItems.length > 0 && (
          <>
            <div className="w-6 h-px bg-paper-darker my-2" aria-hidden="true" />
            {writingItems.map(renderItem)}
          </>
        )}
      </div>
    </nav>
  );
};
