import os from "os";
import { performance } from "perf_hooks";

export interface SystemMetrics {
  cpu: {
    loadAvg: number[];
    cores: number;
  };
  memory: {
    totalMB: number;
    freeMB: number;
    usedMB: number;
    usagePercent: number;
  };
  latency: {
    eventLoopLagMs: number;
    uptimeSec: number;
  };
  timestamp: number;
}

let lastMetrics: SystemMetrics | null = null;
let lastMeasureTime = 0;
const CACHE_TTL_MS = 1000;

function measureEventLoopLag(): Promise<number> {
  return new Promise((resolve) => {
    const start = performance.now();
    setImmediate(() => {
      resolve(Math.round((performance.now() - start) * 100) / 100);
    });
  });
}

function formatMB(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

export async function collectMetrics(): Promise<SystemMetrics> {
  const now = Date.now();
  if (lastMetrics && now - lastMeasureTime < CACHE_TTL_MS) {
    return lastMetrics;
  }

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const eventLoopLag = await measureEventLoopLag();

  lastMetrics = {
    cpu: {
      loadAvg: os.loadavg(),
      cores: os.cpus().length,
    },
    memory: {
      totalMB: formatMB(totalMem),
      freeMB: formatMB(freeMem),
      usedMB: formatMB(totalMem - freeMem),
      usagePercent:
        Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10,
    },
    latency: {
      eventLoopLagMs: eventLoopLag > 0 ? eventLoopLag : 0.01,
      uptimeSec: Math.round(process.uptime()),
    },
    timestamp: now,
  };

  lastMeasureTime = now;
  return lastMetrics;
}
