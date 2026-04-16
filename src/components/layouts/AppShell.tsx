"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ActivityBar from "@/components/layouts/ActivityBar";
import SideBar from "@/components/layouts/SideBar";
import MainArea from "@/components/layouts/MainArea";
import StatusBar from "@/components/layouts/StatusBar";

type ActivityTab = "explorer" | "search" | "source" | "run" | "extensions";

export default function CustomLayout() {
  const [activeTab, setActiveTab] = useState<ActivityTab>("explorer");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const onOpenFileRef = useRef<((fileName: string) => void) | null>(null);

  // Callback to set the onOpenFile function - memoized to prevent unnecessary re-renders
  const setOnOpenFile = useCallback((fn: ((fileName: string) => void) | null) => {
    onOpenFileRef.current = fn;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B or Cmd+B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };

    const handleToggleSidebar = () => {
      setSidebarOpen((prev) => !prev);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("toggle-sidebar", handleToggleSidebar);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("toggle-sidebar", handleToggleSidebar);
    };
  }, []);

  const handleTabChange = (tab: ActivityTab) => {
    if (tab === activeTab) {
      // Toggle sidebar if clicking the same tab
      setSidebarOpen(!sidebarOpen);
    } else {
      setActiveTab(tab);
      setSidebarOpen(true);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-zinc-950">
      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Sidebar */}
        {sidebarOpen && <SideBar activeTab={activeTab} onOpenFile={onOpenFileRef.current} />}

        {/* Main Area */}
        <MainArea onOpenFileChange={setOnOpenFile} />
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}