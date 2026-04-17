"use client";

/**
 * EditorTabs — driven by FileSystemContext EditorTab objects.
 *
 * Each tab shows:
 *   - File-type coloured icon
 *   - File name
 *   - Amber dot if dirty (unsaved changes)
 *   - Saving spinner / saved checkmark overlay
 *   - Close button
 */

import React from "react";
import { useFileSystem } from "@/context/FileSystemContext";
import {
  X,
  Code2,
  FileCode2,
  Palette,
  FileText,
  FileJson,
  File,
  Check,
  Loader2,
} from "lucide-react";
import type { EditorTab } from "@/lib/fs/types";

// ─── Icon by extension ────────────────────────────────────────────────────────

function TabIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase();
  const props = { size: 14, className: "shrink-0" };
  if (ext === "tsx" || ext === "ts") return <Code2 {...props} className="shrink-0 text-blue-400" />;
  if (ext === "js" || ext === "jsx" || ext === "mjs") return <FileCode2 {...props} className="shrink-0 text-yellow-400" />;
  if (ext === "css" || ext === "scss") return <Palette {...props} className="shrink-0 text-purple-400" />;
  if (ext === "md" || ext === "mdx") return <FileText {...props} className="shrink-0 text-orange-400" />;
  if (ext === "json") return <FileJson {...props} className="shrink-0 text-amber-300" />;
  return <File {...props} className="shrink-0 text-zinc-400" />;
}

// ─── Save indicator ───────────────────────────────────────────────────────────

function SaveIndicator({ tabId }: { tabId: string }) {
  const { saveStatus } = useFileSystem();
  const status = saveStatus[tabId] ?? "idle";

  if (status === "saving") {
    return <Loader2 size={12} className="shrink-0 text-amber-400 animate-spin" />;
  }
  if (status === "saved") {
    return <Check size={12} className="shrink-0 text-emerald-400" />;
  }
  if (status === "error") {
    return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Save failed" />;
  }
  return null;
}

// ─── Single tab ───────────────────────────────────────────────────────────────

interface TabProps {
  tab: EditorTab;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}

function Tab({ tab, isActive, onActivate, onClose }: TabProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => e.key === "Enter" && onActivate()}
      className={`
        group relative flex items-center gap-2 px-4 h-full border-r border-zinc-800/30
        whitespace-nowrap cursor-pointer select-none transition-all duration-150 rounded-t-sm
        ${isActive
          ? "bg-zinc-800/90 text-zinc-100 border-b-2 border-b-amber-500"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
        }
      `}
      title={tab.name}
    >
      <TabIcon name={tab.name} />

      <span className="text-sm font-medium tracking-tight max-w-[140px] truncate">
        {tab.name}
      </span>

      {/* Dirty dot */}
      {tab.isDirty && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
      )}

      {/* Save status */}
      <SaveIndicator tabId={tab.id} />

      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="
          ml-0.5 p-0.5 rounded hover:bg-zinc-700/60 transition-all duration-100
          opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-200 shrink-0
        "
        title="Close tab"
        aria-label={`Close ${tab.name}`}
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ─── EditorTabs ───────────────────────────────────────────────────────────────

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
    <div className="w-full h-10 bg-zinc-900 border-b border-zinc-800/50 flex items-stretch overflow-x-auto scrollbar-hide shrink-0">
      {tabs.length === 0 ? (
        <div className="flex-1 flex items-center px-4 text-zinc-600 text-sm">
          <span>Open a file from the Explorer</span>
        </div>
      ) : (
        tabs.map((tab) => (
          <Tab
            key={tab.id}
            tab={tab}
            isActive={activeTabId === tab.id}
            onActivate={() => onTabChange(tab.id)}
            onClose={() => onTabClose(tab.id)}
          />
        ))
      )}
    </div>
  );
}
