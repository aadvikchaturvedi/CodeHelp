"use client";

/**
 * AppShell — wraps the full IDE in FileSystemProvider.
 * All child components call useFileSystem() directly —
 * no prop-drilling needed anymore.
 */

import React, { useState, useEffect } from "react";
import { FileSystemProvider } from "@/context/FileSystemContext";
import ActivityBar from "@/components/layouts/ActivityBar";
import SideBar from "@/components/layouts/SideBar";
import MainArea from "@/components/layouts/MainArea";
import StatusBar from "@/components/layouts/StatusBar";

type ActivityTab = "explorer" | "search" | "source" | "run" | "extensions";

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<ActivityTab>("explorer");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };
    const handleToggle = () => setSidebarOpen((prev) => !prev);

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("toggle-sidebar", handleToggle);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("toggle-sidebar", handleToggle);
    };
  }, []);

  const handleTabChange = (tab: ActivityTab) => {
    if (tab === activeTab) {
      setSidebarOpen((prev) => !prev);
    } else {
      setActiveTab(tab);
      setSidebarOpen(true);
    }
  };

  return (
    <FileSystemProvider>
      <div className="h-screen w-full flex flex-col bg-zinc-950 overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <ActivityBar activeTab={activeTab} onTabChange={handleTabChange} />

          {sidebarOpen && (
            <SideBar activeTab={activeTab} />
          )}

          <MainArea />
        </div>

        <StatusBar />
      </div>
    </FileSystemProvider>
  );
}