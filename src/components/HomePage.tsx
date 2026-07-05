"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Code2,
  FolderOpen,
  Zap,
  Shield,
  GitBranch,
  FileCode2,
  Cpu,
  ArrowRight,
  Layout,
  MousePointer2,
} from "lucide-react";

// ─── Utility Components ───────────────────────────────────────────────────────

/**
 * Animated counter for performance metrics
 */
function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const duration = 2000;
          const step = (end / duration) * 16;
          const timer = setInterval(() => {
            start += step;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return (
    <span ref={ref} className="font-mono tabular-nums tracking-tighter shadow-sm text-zinc-100">
      {count.toLocaleString()}
      <span className="text-amber-500 ml-1">{suffix}</span>
    </span>
  );
}

/**
 * Centered Premium Feature card
 */
function FeatureCard({
  icon: Icon,
  title,
  desc,
  badge,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <div className="group relative h-full">
      <div className="absolute -inset-0.5 rounded-[2.5rem] bg-gradient-to-b from-amber-500/20 to-transparent blur opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <div className="relative h-full bg-[#0d0d0f] border border-zinc-900 group-hover:border-zinc-800 rounded-[2.5rem] p-16 transition-all duration-500 flex flex-col items-center text-center">
        {badge && (
          <span className="absolute top-10 right-10 text-[9px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            {badge}
          </span>
        )}
        <div className="p-6 rounded-3xl bg-zinc-900 text-amber-500 mb-10 group-hover:scale-110 group-hover:shadow-[0_0_32px_rgba(245,158,11,0.2)] transition-all duration-500">
          <Icon size={28} />
        </div>
        <h3 className="text-zinc-100 font-bold text-xl mb-5 tracking-tight">
          {title}
        </h3>
        <p className="text-zinc-500 text-[15px] leading-relaxed group-hover:text-zinc-400 transition-colors max-w-[280px]">
          {desc}
        </p>
      </div>
    </div>
  );
}

/**
 * Centered Code Window Mockup
 */
function CodeWindow() {
  return (
    <div className="relative w-full max-w-5xl mx-auto rounded-[3rem] overflow-hidden border border-zinc-900 bg-[#050505] shadow-[0_64px_128px_-16px_rgba(0,0,0,1)]">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/[0.03] to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-3 px-12 py-7 bg-zinc-950/50 border-b border-zinc-900">
            <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-900 border border-zinc-800" />
                <div className="w-3 h-3 rounded-full bg-zinc-900 border border-zinc-800" />
                <div className="w-3 h-3 rounded-full bg-zinc-900 border border-zinc-800" />
            </div>
            <span className="ml-8 text-[11px] text-zinc-600 font-mono tracking-[0.3em] font-bold uppercase">editor.tsx</span>
        </div>
        
        <div className="p-16 font-mono text-[14px] leading-[1.8] text-left overflow-x-auto selection:bg-amber-500/30">
            <pre className="text-zinc-500">
              <span className="text-zinc-700">01  </span><span className="text-zinc-600">{"// CodeHelp — real disk I/O"}</span>{"\n"}
              <span className="text-zinc-700">02  </span><span className="text-amber-500">import</span> <span className="text-zinc-100">{"{ useFileSystem }"}</span> <span className="text-amber-500">from</span> <span className="text-zinc-400">{"\"@/context/FileSystem\""}</span>;{"\n"}
              <span className="text-zinc-700">03  </span>{"\n"}
              <span className="text-zinc-700">04  </span><span className="text-amber-500">async function</span> <span className="text-zinc-100">openProject</span>() {"{"}{"\n"}
              <span className="text-zinc-700">05  </span>  <span className="text-amber-500">const</span> <span className="text-zinc-100">{"{ openFolder, tree }"}</span> = <span className="text-zinc-100">useFileSystem</span>();{"\n"}
              <span className="text-zinc-700">06  </span>  <span className="text-amber-500">await</span> <span className="text-zinc-100">openFolder</span>(); <span className="text-zinc-600">{"// Native OS Picker"}</span>{"\n"}
              <span className="text-zinc-700">07  </span>  {"\n"}
              <span className="text-zinc-700">08  </span>  <span className="text-zinc-600">{"// Directly saved to your hard drive"}</span>{"\n"}
              <span className="text-zinc-700">09  </span>  <span className="text-zinc-100">console.log</span>(<span className="text-zinc-400">{"\"Project loaded:\""}</span>, <span className="text-zinc-100">tree</span>[<span className="text-amber-500">0</span>].<span className="text-zinc-100">name</span>); {"\n"}
              <span className="text-zinc-700">10  </span>{"}"}
            </pre>
        </div>
    </div>
  );
}

// ─── Main Sections ────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between pt-20 px-20 py-20 transition-all duration-700 ${
        scrolled
          ? "bg-[#09090b]/80 backdrop-blur-3xl border-b border-zinc-900 py-8"
          : "bg-transparent"
      }`}
    >
      <div className="flex items-center gap-20 pt-20 pl-20">
        <Link href="/" className="flex items-center gap-4 group">
            <div className="p-2 bg-amber-500 rounded-xl group-hover:rotate-12 transition-transform duration-500 shadow-xl shadow-amber-500/20">
              <Code2 size={24} className="text-black" />
            </div>
            <span className="font-bold text-zinc-100 tracking-[-0.04em] text-[20px]">
              CodeHelp
            </span>
        </Link>

        <div className="hidden lg:flex items-center gap-10 text-[11px] font-black tracking-[0.2em] uppercase text-zinc-500">
            {["Platform", "Security", "Docs"].map((item) => (
            <a
                key={item}
                href="#"
                className="hover:text-amber-500 transition-colors duration-200"
            >
                {item}
            </a>
            ))}
        </div>
      </div>

      <div className="flex items-center gap-8">
        <Link
          href="/editor"
          className="
            flex items-center gap-3 px-12 py-4 rounded-full text-[12px] font-black uppercase tracking-[0.2em]
            bg-amber-500 hover:bg-amber-400 text-black transition-all duration-500
            shadow-2xl shadow-amber-500/20 active:scale-95
          "
        >
          Open Editor
          <ArrowRight size={14} />
        </Link>
      </div>
    </nav>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100vh] flex flex-col justify-center items-center text-center px-8 pt-64 pb-48 overflow-hidden">
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #f59e0b 1px, transparent 0)`,
            backgroundSize: "64px 64px",
          }}
        />
        
        {/* Ambient background bloom */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1200px] h-[1000px] bg-amber-500/[0.04] blur-[200px] rounded-full pointer-events-none" />

        <div className="relative z-10 w-full max-w-[1400px] flex flex-col items-center">
            <div className="inline-flex items-center gap-4 px-8 py-3 rounded-full bg-zinc-900 text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] mb-16 cursor-default border border-zinc-800/50">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_12px_#f59e0b]" />
              Now in Private Preview
            </div>

            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[7rem] font-black tracking-[-0.05em] leading-[1] mb-16 max-w-5xl italic">
              Edit real files <br /> 
              <span className="text-zinc-800 not-italic">in the browser.</span>
            </h1>

            <p className="text-zinc-500 text-lg md:text-xl max-w-2xl leading-relaxed mb-32 font-medium">
              High-performance browser-to-disk architecture. Zero latency. Absolute privacy. No setup required.
            </p>

            <div className="flex items-center gap-10 flex-wrap justify-center mb-64 p-20">
              <Link
                  href="/editor"
                  className="
                  flex items-center gap-4 rounded-[2.5rem] font-black text-[15px] uppercase tracking-[0.25em]
                  bg-amber-500 text-black hover:bg-amber-400
                  shadow-2xl shadow-amber-500/20 transition-all duration-500
                  active:scale-[0.97]
                  "
              >
                  Launch Engine
              </Link>
              <a
                  href="#"
                  className="
                  flex items-center gap-4 px-16 py-7 rounded-[2.5rem] font-black text-[15px] uppercase tracking-[0.25em]
                  bg-zinc-900 text-zinc-400 border border-zinc-800
                  hover:text-zinc-100 transition-all duration-500 active:scale-[0.97]
                  "
              >
                  Star on GitHub
              </a>
            </div>

            <div className="w-full transform transition-transform duration-1000">
                <CodeWindow />
            </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section className="border-y border-zinc-900 bg-zinc-950/20 py-48 px-24">
        <div className="w-full max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-32">
          {[
            { label: "Performance", end: 12000, suffix: " IOPS" },
            { label: "Supported", end: 85, suffix: " LANGUAGES" },
            { label: "Latency", end: 0.8, suffix: " MS" },
            { label: "Privacy", end: 100, suffix: "% LOCAL" },
          ].map(({ label, end, suffix }) => (
            <div key={label} className="flex flex-col items-center space-y-4 group">
              <span className="text-4xl font-black text-zinc-100 group-hover:text-amber-500 transition-colors duration-500">
                {end === 0.8 ? "0.8" : <Counter end={end} />}
                <span className="text-zinc-800 text-xs ml-3 tracking-[0.2em] font-black">{suffix}</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.5em] text-zinc-600 font-black">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section className="py-96 px-24 bg-[#09090b] relative">
        <div className="w-full max-w-[1400px] mx-auto">
          <div className="text-center mb-64">
            <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-12 leading-[1.1]">
              Pure Engineering. <br />
              <span className="text-zinc-800">Advanced Privacy.</span>
            </h2>
            <p className="text-zinc-600 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Industrial stability meets browser simplicity. We&apos;ve rebuilt the IDE core to give you the speed of local tools with a web interface.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
            <FeatureCard
              icon={FolderOpen}
              title="Disk Handles"
              desc="Direct, recursive permission to open and edit entire local repositories instantly."
              badge="NATIVE"
            />
            <FeatureCard
              icon={Zap}
              title="Stateless Setup"
              desc="No accounts, no deployments, no environment configuration. Just launch and code."
            />
            <FeatureCard
              icon={FileCode2}
              title="Powerful Core"
              desc="Equipped with Monaco, the identical core that powers VS Code. Full IntelliSense."
              badge="MONACO"
            />
            <FeatureCard
              icon={Shield}
              title="Air-Gapped"
              desc="Your source code never leaves your thread. Zero network calls for file operations."
            />
            <FeatureCard
              icon={Cpu}
              title="OS File Ops"
              desc="Create, rename, or delete files directly on your disk through our OS-bridged tree."
            />
            <FeatureCard
              icon={GitBranch}
              title="Local Logic"
              desc="All processing happens in your browser's V8 engine. Infinite scale, zero latency."
            />
          </div>
        </div>
      </section>

      {/* ── STEPS ────────────────────────────────────────────────────────── */}
      <section className="py-96 px-24 border-t border-zinc-900 bg-zinc-950/20">
        <div className="w-full max-w-[1400px] mx-auto">
          <div className="text-center mb-64">
            <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-12 leading-[1.1]">
              Simple Steps. <br />
              <span className="text-zinc-800 tabular-nums">High Performance.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-24 text-center">
            {[
              {
                step: "01",
                title: "Grant Permission",
                desc: "Choose your project folder. The OS picker manages secure, local-only access.",
                icon: MousePointer2,
              },
              {
                step: "02",
                title: "Edit Realtime",
                desc: "The browser initializes a virtual project. Keystrokes sync to disk in 800ms.",
                icon: FileCode2,
              },
              {
                step: "03",
                title: "Code Shared",
                desc: "Your files stay on your machine. Perfect for use with local terminals and CLI tools.",
                icon: Layout,
              },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="relative group text-center flex flex-col items-center">
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 text-[180px] font-black text-amber-500/[0.02] select-none pointer-events-none group-hover:text-amber-500/[0.04] transition-colors duration-700 text-center">
                  {step}
                </div>
                
                <div className="relative pt-20 flex flex-col items-center">
                    <div className="inline-flex p-6 bg-zinc-900 rounded-3xl mb-12 text-amber-500 ring-1 ring-zinc-800 shadow-xl shadow-amber-500/5">
                      <Icon size={32} />
                    </div>
                    <h3 className="text-zinc-100 font-bold text-xl mb-6 tracking-[0.1em] uppercase">{title}</h3>
                    <p className="text-zinc-600 text-[17px] leading-relaxed max-w-[280px]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-96 px-24 relative overflow-hidden border-t border-zinc-900">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/[0.03] to-transparent pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-[1400px] mx-auto text-center flex flex-col items-center">
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-16 leading-[0.9] uppercase">
            Start Building <br />
            <span className="text-amber-500 italic">With CodeHelp.</span>
          </h2>
          <p className="text-zinc-500 text-xl md:text-2xl mb-32 max-w-xl font-medium leading-relaxed">
            Unleash the speed of local disk development within the simplicity of your web browser.
          </p>

          <div className="flex justify-center items-center gap-16 mb-48 flex-wrap">
            {[
              "100% Client-side",
              "Private Core",
              "Zero Servers",
            ].map((point) => (
              <div
                key={point}
                className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.5em] text-zinc-700"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500" />
                {point}
              </div>
            ))}
          </div>

          <Link
            href="/editor"
            className="
              inline-flex items-center gap-6 px-20 py-8 rounded-[2.5rem] font-black text-[16px] uppercase tracking-[0.4em]
              bg-amber-500 text-black hover:bg-amber-400
              shadow-2xl shadow-amber-500/20
              transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]
            "
          >
            Launch Core Engine
            <ArrowRight size={28} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 bg-[#050505] px-24 py-48 text-center md:text-left">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-32">
            <div className="flex flex-col items-center md:items-start gap-12">
                <Link href="/" className="flex items-center gap-4">
                    <div className="p-2 bg-amber-500 rounded-lg shadow-lg shadow-amber-500/20">
                        <Code2 size={24} className="text-black" />
                    </div>
                    <span className="font-bold text-2xl text-zinc-100 tracking-[-0.04em]">
                        CodeHelp
                    </span>
                </Link>
                <p className="text-zinc-600 text-base max-w-[300px] leading-relaxed font-medium">
                    Redefining the browser editor with high-performance, local-first architecture.
                </p>
            </div>
            
            <div className="grid grid-cols-2 gap-32 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">
                <div className="flex flex-col gap-10 items-center md:items-start">
                    <span className="text-zinc-100 mb-2">Platform</span>
                    <a href="#" className="hover:text-amber-500 transition-colors">Engine</a>
                    <a href="#" className="hover:text-amber-500 transition-colors">Safety</a>
                    <a href="#" className="hover:text-amber-500 transition-colors">Storage</a>
                </div>
                <div className="flex flex-col gap-10 items-center md:items-start">
                    <span className="text-zinc-100 mb-2">Connect</span>
                    <a href="#" className="hover:text-amber-500 transition-colors">GitHub</a>
                    <a href="#" className="hover:text-amber-500 transition-colors">X / Twitter</a>
                    <a href="#" className="hover:text-amber-500 transition-colors">Docs</a>
                </div>
            </div>
            
            <div className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.6em] space-y-8 flex flex-col items-center md:items-end">
                <p>© 2026 CodeHelp Studio</p>
                <div className="w-12 h-px bg-zinc-900" />
                <p className="font-medium text-zinc-800 normal-case tracking-normal">Direct-to-Disk implementation</p>
            </div>
        </div>
      </footer>
    </div>
  );
}