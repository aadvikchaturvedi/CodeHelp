"use client";

/**
 * StatusBar — live info from FileSystemContext.
 *
 * Shows: branch, problems, encoding, EOL, file language, cursor position,
 * and the current save status of the active file.
 */

import React from "react";
import { useFileSystem } from "@/context/FileSystemContext";
import { AlertCircle, Check, GitBranch, Loader2, Save, Zap } from "lucide-react";

export default function StatusBar() {
  const { tabs, activeTabId, saveStatus, saveActiveTab, hasFolder, rootName } = useFileSystem();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const status = activeTabId ? (saveStatus[activeTabId] ?? "idle") : "idle";

  const languageDisplay = activeTab?.language
    ? activeTab.language.charAt(0).toUpperCase() + activeTab.language.slice(1)
    : "Plain Text";

  return (
    <footer className="w-full h-6 bg-zinc-950 border-t border-zinc-800/60 flex items-center px-3 text-[11px] text-zinc-500 gap-5 select-none shrink-0">
      {/* Left */}
      <div className="flex items-center gap-4">
        {/* Branch */}
        <button className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
          <GitBranch size={12} />
          <span>main</span>
        </button>

        {/* Workspace name */}
        {hasFolder && rootName && (
          <span className="text-zinc-600 truncate max-w-[120px]">{rootName}</span>
        )}

        {/* Problems */}
        <button className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
          <AlertCircle size={12} />
          <span>0</span>
        </button>
      </div>

      {/* Right */}
      <div className="ml-auto flex items-center gap-4">
        {/* Save status */}
        {activeTab && (
          <button
            onClick={saveActiveTab}
            title="Save file (Ctrl+S)"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
          >
            {status === "saving" && (
              <>
                <Loader2 size={12} className="animate-spin text-amber-400" />
                <span className="text-amber-400">Saving…</span>
              </>
            )}
            {status === "saved" && (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400">Saved</span>
              </>
            )}
            {status === "error" && (
              <>
                <AlertCircle size={12} className="text-red-400" />
                <span className="text-red-400">Save failed</span>
              </>
            )}
            {status === "idle" && activeTab?.isDirty && (
              <>
                <Save size={12} className="text-zinc-500" />
                <span>Unsaved</span>
              </>
            )}
          </button>
        )}

        <span>UTF-8</span>
        <span>LF</span>

        <span className="font-medium text-zinc-400">{languageDisplay}</span>

        <button className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
          <Zap size={12} />
          <span>Ln 1, Col 1</span>
        </button>
      </div>
    </footer>
  );
}
