"use client";

import React, { useState, useEffect } from "react";
import { FileSystemProvider } from "@/context/FileSystemContext";
import { WorkspaceProvider } from "@/components/workspace-provider";
import TopNav from "@/components/top-nav";
import ActivityBar from "@/components/layouts/ActivityBar";
import SideBar from "@/components/layouts/SideBar";
import MainArea from "@/components/layouts/MainArea";
import StatusBar from "@/components/layouts/StatusBar";
import Chatbox from "@/components/Chatbox";

type ActivityTab = "explorer" | "search" | "source" | "run" | "extensions";

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<ActivityTab>("explorer");
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      <WorkspaceProvider>
        <div className="h-screen w-full flex flex-col bg-zinc-950 overflow-hidden">
          <TopNav />

          <div className="flex flex-1 overflow-hidden">
            <ActivityBar activeTab={activeTab} onTabChange={handleTabChange} />

            {sidebarOpen && <SideBar activeTab={activeTab} />}

            <div className="flex-1 flex overflow-hidden">
              <MainArea />
            </div>
          </div>

          <StatusBar />

          <Chatbox />
        </div>
      </WorkspaceProvider>
    </FileSystemProvider>
  );
}
