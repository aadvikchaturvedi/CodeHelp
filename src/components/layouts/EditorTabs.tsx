"use client";

import React from "react";
import { X, Code2, FileCode2, Palette, FileText, FileJson } from "lucide-react";

type EditorTab = {
  id: string;
  name: string;
  isDirty?: boolean;
};

type EditorTabsProps = {
  tabs: EditorTab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
};

export default function EditorTabs({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
}: EditorTabsProps) {
  return (
    <div className="w-full h-12 bg-zinc-900 border-b border-zinc-800/50 flex items-center overflow-x-auto scrollbar-hide px-1">
      {tabs.length === 0 ? (
        <div className="flex-1 flex items-center px-4 text-zinc-500 text-sm">
          <p className="font-medium">No open files</p>
        </div>
      ) : (
        tabs.map((tab) => (
          <div
            key={tab.id}
            className={`
              group relative flex items-center gap-3 px-5 h-10 border-r border-zinc-800/30
              whitespace-nowrap transition-all duration-200 cursor-pointer rounded-t-md
              ${
                activeTabId === tab.id
                  ? "bg-zinc-800/80 text-zinc-100 border-b-2 border-b-amber-500 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              }
            `}
            onClick={() => onTabChange(tab.id)}
          >
            {/* File Icon */}
            {tab.name.split(".").pop() === "tsx" && <Code2 size={16} className="shrink-0" />}
            {tab.name.split(".").pop() === "css" && <Palette size={16} className="shrink-0" />}
            {tab.name.split(".").pop() === "md" && <FileText size={16} className="shrink-0" />}
            {tab.name.split(".").pop() === "json" && <FileJson size={16} className="shrink-0" />}

            {/* File Name */}
            <span className="text-sm font-medium tracking-tight">{tab.name}</span>

            {/* Dirty Indicator */}
            {tab.isDirty && (
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            )}

            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="ml-auto p-1 hover:bg-zinc-700/60 rounded-md transition-all duration-150 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300"
              title="Close tab"
            >
              <X size={16} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
