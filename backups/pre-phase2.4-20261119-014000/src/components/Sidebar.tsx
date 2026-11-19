import React, { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  BookOpen,
  FileEdit,
  MessageSquare,
  Flame,
  Shield,
  LogOut,
  LogIn,
  Bot,
  Menu,
  X,
} from 'lucide-react';
import { User, UserProgress } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  progress: UserProgress;
  totalLessons: number;
  completedLessonsCount?: number;
  onLogOut: () => void;
  onSignInClick: () => void;
  onOpenAiTutor?: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  progress,
  totalLessons,
  completedLessonsCount,
  onLogOut,
  onSignInClick,
  onOpenAiTutor,
}: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const effectiveCompleted = completedLessonsCount ?? progress.completedLessonIds.length;
  const completionPercent =
    totalLessons > 0
      ? Math.min(100, Math.round((effectiveCompleted / totalLessons) * 100))
      : 0;

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'tracks', name: 'Curriculum', icon: Layers },
    { id: 'player', name: 'Lesson Player', icon: BookOpen },
    { id: 'scratchpad', name: 'Scratchpad', icon: FileEdit },
    { id: 'forum', name: 'Community', icon: MessageSquare },
  ];

  const handleSelectNav = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const handleOpenTutor = () => {
    setMobileMenuOpen(false);
    if (onOpenAiTutor) onOpenAiTutor();
  };

  const renderSidebarBody = () => (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none">
      {/* Brand Header */}
      <div
        onClick={() => handleSelectNav(user ? 'dashboard' : 'landing')}
        className="px-4 py-4 border-b border-slate-800/80 flex items-center gap-2.5 cursor-pointer hover:bg-slate-900/40 transition-colors"
      >
        <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0">
          <Shield className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h1 className="font-sans font-semibold tracking-tight text-sm text-slate-100 truncate">
            CyberFoundations
          </h1>
          <p className="text-[11px] text-slate-400 truncate">Security Academy</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => handleSelectNav(item.id)}
              className={`w-full min-h-[44px] md:min-h-[38px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800/90 text-slate-100'
                  : 'text-slate-400 hover:bg-slate-900/70 hover:text-slate-200'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? 'text-sky-400' : 'text-slate-500'
                }`}
              />
              <span className="truncate">{item.name}</span>
            </button>
          );
        })}

        {onOpenAiTutor && (
          <div className="pt-3 mt-3 border-t border-slate-800/80">
            <button
              id="sidebar-ai-tutor-trigger"
              onClick={handleOpenTutor}
              className="w-full min-h-[44px] md:min-h-[38px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium text-sky-300 bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/25 transition-colors whitespace-nowrap"
            >
              <Bot className="h-4 w-4 shrink-0 text-sky-400" />
              <span>AI Tutor</span>
            </button>
          </div>
        )}
      </nav>

      {/* Clean User Summary Footer */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-900/30">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-100 truncate">
                  {user.username}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{user.rank}</p>
              </div>
              <button
                onClick={onLogOut}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors shrink-0"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] tabular-nums text-slate-400">
                <span>{progress.xp.toLocaleString()} XP</span>
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <Flame className="h-3.5 w-3.5" />
                  {progress.streak}d
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] tabular-nums text-slate-500">
                <span>Progress</span>
                <span className="text-slate-300 font-medium">{completionPercent}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Sign in to save lesson progress, XP, and practical lab completions.
            </p>
            <button
              onClick={onSignInClick}
              className="w-full min-h-[44px] md:min-h-[36px] px-3 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
            <button
              onClick={() => handleSelectNav('landing')}
              className="w-full min-h-[36px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs rounded-lg transition-colors whitespace-nowrap"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Compact Sidebar (220px) */}
      <aside
        id="sidebar-navigation"
        className="hidden md:flex md:w-[220px] flex-col border-r border-slate-800/80 bg-slate-950 shrink-0"
      >
        {renderSidebarBody()}
      </aside>

      {/* Mobile Compact Header Bar (<= 56px, well under 15% viewport height) */}
      <header className="md:hidden h-14 px-4 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between gap-3 shrink-0 sticky top-0 z-30">
        <button
          type="button"
          onClick={() => handleSelectNav(user ? 'dashboard' : 'landing')}
          className="flex items-center gap-2 min-w-0"
        >
          <div className="h-7 w-7 rounded-md bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm text-slate-100 truncate">
            CyberFoundations
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {user && (
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {progress.xp.toLocaleString()} XP
            </span>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile Slide-Out Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm"
          />
          <div className="relative w-72 max-w-[85vw] h-full border-r border-slate-800 bg-slate-950 flex flex-col z-10">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-3 right-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
            {renderSidebarBody()}
          </div>
        </div>
      )}
    </>
  );
}
