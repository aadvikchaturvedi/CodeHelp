"use client";

/**
 * MainArea — driven entirely by FileSystemContext.
 *
 * Manages editor tabs and passes real file content + change callbacks
 * to the Monaco editor. Handles Ctrl+S for immediate saves.
 */

import React, { useEffect } from "react";
import { useFileSystem } from "@/context/FileSystemContext";
import EditorTabs from "@/components/layouts/EditorTabs";
import Workspace from "@/components/layouts/Workspace";

// Legacy prop kept for AppShell compatibility (no-op now — context handles this)
type MainAreaProps = {
  onOpenFileChange?: (fn: (fileName: string) => void) => void;
};

export default function MainArea({ onOpenFileChange }: MainAreaProps) {
  const {
    tabs,
    activeTabId,
    closeTab,
    setActiveTab,
    handleContentChange,
    saveActiveTab,
  } = useFileSystem();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // ── Keyboard shortcut: Ctrl+S / Cmd+S ───────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveActiveTab();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveActiveTab]);

  // Provide a legacy shim so AppShell doesn't break (it passes a no-op now)
  useEffect(() => {
    onOpenFileChange?.(() => {
      // no-op: file opening is now handled via FileSystemContext.openTab
    });
  }, [onOpenFileChange]);

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
      <EditorTabs
        tabs={tabs}
        activeTabId={activeTabId ?? ""}
        onTabChange={setActiveTab}
        onTabClose={closeTab}
      />

      <Workspace
        activeTab={activeTab}
        onContentChange={(newContent) => {
          if (activeTabId) handleContentChange(activeTabId, newContent);
        }}
      />
    </div>
  );
}