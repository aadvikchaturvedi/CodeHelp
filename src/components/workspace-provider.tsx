"use client";

import React, { createContext, useContext, useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useFileSystem } from "@/context/FileSystemContext";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "done" | "error";
  timestamp: number;
}

export interface FileContext {
  name: string;
  content: string;
  language: string;
}

export interface Suggestion {
  id: string;
  type: "optimize" | "fix" | "style" | "doc" | "complete";
  title: string;
  description: string;
  code?: string;
  line?: number;
}

interface WorkspaceContextValue {
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setMessageStatus: (id: string, status: ChatMessage["status"]) => void;
  clearChat: () => void;
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;
  attachedFile: FileContext | null;
  setAttachedFile: (file: FileContext | null) => void;
  sessionId: string;
  demoMode: boolean;

  suggestions: Suggestion[];
  setSuggestions: (s: Suggestion[]) => void;
  requestProactiveSuggestion: () => Promise<void>;
  isAnalyzing: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadSession(): string {
  try { return localStorage.getItem("codehelp_session") || generateSessionId(); } catch { return generateSessionId(); }
}

function loadMessages(): ChatMessage[] {
  try { return JSON.parse(localStorage.getItem("codehelp_chat") || "[]"); } catch { return []; }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedFile, setAttachedFile] = useState<FileContext | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [sessionId] = useState(loadSession);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = loadMessages();
    if (saved.length > 0) {
      setTimeout(() => setChatMessages(saved));
    }
  }, []);
  const { tabs, activeTabId } = useFileSystem();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try { localStorage.setItem("codehelp_chat", JSON.stringify(chatMessages)); } catch {}
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [chatMessages]);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: "ping" }] }),
        });
        if (res.status === 503 || res.status === 502) setDemoMode(true);
      } catch { setDemoMode(true); }
    };
    check();
  }, []);

  const requestProactiveSuggestion = useCallback(async () => {
    if (!activeTab || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeTab.content, language: activeTab.language }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestion) {
          setSuggestions((prev) => [
            {
              id: `sug-${Date.now()}`,
              type: "complete",
              title: "Proactive Suggestion",
              description: data.suggestion.slice(0, 120),
              code: data.suggestion.length > 120 ? data.suggestion : undefined,
            },
            ...prev.slice(0, 4),
          ]);
        }
      }
    } catch {}
    setIsAnalyzing(false);
  }, [activeTab, isAnalyzing]);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages((prev) => [...prev, msg]);
  }, []);

  const updateLastAssistantMessage = useCallback((content: string) => {
    setChatMessages((prev) => {
      const next = [...prev];
      const lastIdx = next.length - 1;
      if (lastIdx >= 0 && next[lastIdx].role === "assistant") {
        next[lastIdx] = { ...next[lastIdx], content };
      }
      return next;
    });
  }, []);

  const setMessageStatus = useCallback((id: string, status: ChatMessage["status"]) => {
    setChatMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
  }, []);

  const clearChat = useCallback(() => {
    setChatMessages([]);
    try { localStorage.removeItem("codehelp_chat"); } catch {}
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      chatMessages, addChatMessage, updateLastAssistantMessage, setMessageStatus, clearChat,
      isStreaming, setIsStreaming, attachedFile, setAttachedFile, sessionId, demoMode,
      suggestions, setSuggestions, requestProactiveSuggestion, isAnalyzing,
    }),
    [chatMessages, isStreaming, attachedFile, sessionId, demoMode, suggestions,
     requestProactiveSuggestion, isAnalyzing, addChatMessage, updateLastAssistantMessage,
     setMessageStatus, clearChat, setSuggestions, setIsStreaming, setAttachedFile, setDemoMode],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}
