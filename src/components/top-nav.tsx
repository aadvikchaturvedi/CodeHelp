"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Code2, RefreshCw, Cpu, MemoryStick, Gauge } from "lucide-react";
import { useFileSystem } from "@/context/FileSystemContext";

interface Metrics {
  cpu: { loadAvg: number[]; cores: number };
  memory: { totalMB: number; usedMB: number; usagePercent: number };
  latency: { eventLoopLagMs: number };
  timestamp: number;
}

const LATENCY_THRESHOLD_MS = 100;

export default function TopNav() {
  const { tabs, activeTabId } = useFileSystem();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsError, setMetricsError] = useState(false);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/system/metrics");
        if (!res.ok) throw new Error("Failed");
        const data: Metrics = await res.json();
        if (mounted) {
          setMetrics(data);
          setMetricsError(false);
        }
      } catch {
        if (mounted) setMetricsError(true);
      }

      if (mounted) {
        timeoutId = setTimeout(fetchMetrics, 2000);
      }
    };

    fetchMetrics();
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const handleSync = useCallback(async () => {
    if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
      try {
        const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
        const event = new CustomEvent("sync-directory", { detail: { handle: dirHandle } });
        document.dispatchEvent(event);
      } catch {
        // user cancelled
      }
    } else {
      const event = new CustomEvent("open-folder");
      document.dispatchEvent(event);
    }
  }, []);

  const latencyHealthy = metrics && metrics.latency.eventLoopLagMs < LATENCY_THRESHOLD_MS;

  return (
    <header className="h-11 bg-zinc-950 border-b border-zinc-800/50 flex items-center px-4 gap-3 shrink-0 select-none">
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="p-1 bg-amber-500/10 rounded-md">
          <Code2 size={15} className="text-amber-500" />
        </div>
        <span className="font-semibold text-zinc-100 text-sm tracking-tight">
          CodeHelp
        </span>
      </div>

      {activeTab && (
        <nav className="flex items-center gap-1.5 text-xs text-zinc-500 ml-2 min-w-0">
          {activeTab.id.split("/").map((part, i, arr) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-zinc-700 mx-0.5">/</span>}
              <span
                className={`truncate max-w-[120px] ${i === arr.length - 1 ? "text-zinc-300 font-medium" : ""}`}
              >
                {part}
              </span>
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex-1" />

      <button
        onClick={handleSync}
        title="Sync Local Directory"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-md transition-all"
      >
        <RefreshCw size={12} />
        <span className="hidden sm:inline">Sync</span>
      </button>

      <div className="flex items-center gap-3 text-xs">
        {metricsError ? (
          <span className="text-zinc-600 text-[10px]">Metrics unavailable</span>
        ) : metrics ? (
          <>
            <MetricItem
              icon={<Cpu size={12} />}
              value={`${metrics.cpu.loadAvg[0]?.toFixed(1) ?? "—"}`}
              label="CPU"
              healthy
            />
            <MetricItem
              icon={<MemoryStick size={12} />}
              value={`${metrics.memory.usagePercent.toFixed(0)}%`}
              label="MEM"
              healthy={metrics.memory.usagePercent < 85}
            />
            <MetricItem
              icon={<Gauge size={12} />}
              value={`${metrics.latency.eventLoopLagMs.toFixed(1)}ms`}
              label="LAT"
              healthy={latencyHealthy ?? true}
            />
          </>
        ) : (
          <span className="text-zinc-600 text-[10px]">Loading metrics…</span>
        )}
      </div>
    </header>
  );
}

function MetricItem({
  icon,
  value,
  label,
  healthy,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  healthy: boolean;
}) {
  return (
    <div
      className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
      title={`${label}: ${value}`}
    >
      {icon}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[11px] tabular-nums text-zinc-300">{value}</span>
        <span
          className={`w-1.5 h-1.5 rounded-full animate-pulse duration-1000 ${
            healthy ? "bg-amber-500" : "bg-red-500"
          }`}
          style={{ animationDuration: "2s" }}
        />
      </div>
    </div>
  );
}
