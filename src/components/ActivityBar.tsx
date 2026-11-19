import { Settings, PanelLeftClose, PanelLeft, Sparkles, Skull } from 'lucide-react';
import { RailButton } from './ui/RailButton';

interface ActivityBarProps {
  activePanel: 'settings' | 'phrases' | 'graveyard';
  setActivePanel: (panel: 'settings' | 'phrases' | 'graveyard') => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activePanel,
  setActivePanel,
  isSidebarOpen,
  setIsSidebarOpen,
}) => {
  const handleItemClick = (panel: 'settings' | 'phrases' | 'graveyard') => {
    if (activePanel === panel && isSidebarOpen) {
      setIsSidebarOpen(false);
    } else {
      setActivePanel(panel);
      setIsSidebarOpen(true);
    }
  };

  const navItems = [
    { id: 'phrases' as const, label: 'Phrase Catcher', icon: Sparkles },
    { id: 'graveyard' as const, label: 'Graveyard', icon: Skull },
  ];

  const isSettingsActive = activePanel === 'settings' && isSidebarOpen;

  return (
    <nav
      aria-label="Left tools"
      className="w-14 h-full bg-paper border-r border-paper-darker flex flex-col justify-between items-center py-3 flex-shrink-0 z-10 select-none"
    >
      <div className="flex flex-col items-center gap-1.5 w-full">
        <RailButton
          label={isSidebarOpen ? 'Collapse left sidebar' : 'Expand left sidebar'}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-pressed={undefined}
        >
          {isSidebarOpen ? <PanelLeftClose className="w-5 h-5 stroke-[1.5]" /> : <PanelLeft className="w-5 h-5 stroke-[1.5]" />}
        </RailButton>

        <div className="w-6 h-px bg-paper-darker my-2" aria-hidden="true" />

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <RailButton
              key={item.id}
              label={item.label}
              active={activePanel === item.id && isSidebarOpen}
              onClick={() => handleItemClick(item.id)}
            >
              <Icon className="w-5 h-5 stroke-[1.5]" />
            </RailButton>
          );
        })}
      </div>

      <RailButton
        label="Workspace settings"
        active={isSettingsActive}
        onClick={() => handleItemClick('settings')}
      >
        <Settings className="w-5 h-5 stroke-[1.5]" />
      </RailButton>
    </nav>
  );
};
