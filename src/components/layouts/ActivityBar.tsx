"use client";

import React from "react";
import {
  FileText,
  Search,
  GitBranch,
  Play,
  Puzzle,
  Settings,
} from "lucide-react";

type ActivityTab = "explorer" | "search" | "source" | "run" | "extensions";

type ActivityBarProps = {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
};

export default function ActivityBar({ activeTab, onTabChange }: ActivityBarProps) {
  const activities = [
    {
      id: "explorer" as ActivityTab,
      icon: FileText,
      label: "Explorer",
      tooltip: "Explorer (Ctrl+Shift+E)",
    },
    {
      id: "search" as ActivityTab,
      icon: Search,
      label: "Search",
      tooltip: "Find in files (Ctrl+Shift+F)",
    },
    {
      id: "source" as ActivityTab,
      icon: GitBranch,
      label: "Source Control",
      tooltip: "Source Control (Ctrl+Shift+G)",
    },
    {
      id: "run" as ActivityTab,
      icon: Play,
      label: "Run",
      tooltip: "Run and Debug (Ctrl+Shift+D)",
    },
    {
      id: "extensions" as ActivityTab,
      icon: Puzzle,
      label: "Extensions",
      tooltip: "Extensions (Ctrl+Shift+X)",
    },
  ];

  return (
    <aside className="w-14 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-2 gap-1 shadow-lg">
      {/* Activity Icons */}
      <div className="flex-1 flex flex-col gap-1">
        {activities.map(({ id, icon: Icon, tooltip }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            title={tooltip}
            className={`
              w-12 h-12 rounded-lg flex items-center justify-center
              transition-all duration-200 relative group
              ${
                activeTab === id
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-100"
              }
            `}
          >
            <Icon size={20} />
            
            {/* Active indicator */}
            {activeTab === id && (
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r" />
            )}

            {/* Tooltip */}
            <div className="absolute left-14 bg-zinc-800 text-zinc-100 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {tooltip}
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Settings */}
      <div className="flex flex-col gap-1 border-t border-zinc-800 pt-2">
        <button
          title="Settings (Ctrl+,)"
          className="w-12 h-12 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all duration-200 group relative"
        >
          <Settings size={20} />
          <div className="absolute left-14 bg-zinc-800 text-zinc-100 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            Settings (Ctrl+,)
          </div>
        </button>
      </div>
    </aside>
  );
}
