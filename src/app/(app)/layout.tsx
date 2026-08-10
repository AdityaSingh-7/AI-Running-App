"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, Play, Medal, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/history", label: "History", icon: Clock },
  { href: "/run", label: "Run", icon: Play, center: true },
  { href: "/dashboard#achievements", label: "Awards", icon: Medal, matchHref: "/dashboard" },
  { href: "/settings", label: "Profile", icon: User },
];

// ── Desktop Top Nav (hidden on mobile) ──────────────────────────────────────

function DesktopNav() {
  const pathname = usePathname();

  return (
    <header className="hidden md:block sticky top-0 z-50 w-full bg-[#0B0E14]/85 backdrop-blur-2xl border-b border-white/10">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-8">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-black text-xl tracking-tight text-white italic">
          <span className="flex items-center justify-center size-9 rounded-xl bg-[#FF4500] text-white font-black not-italic text-base athletic-glow-coral">
            ⚡
          </span>
          <span>KADENCE<span className="text-[#FF4500]">.AI</span></span>
        </Link>
        <nav className="flex items-center gap-3">
          {tabs.filter((t: typeof tabs[number]) => !t.center).map((tab: typeof tabs[number]) => {
            const isActive =
              pathname === (tab.matchHref ?? tab.href) ||
              pathname.startsWith((tab.matchHref ?? tab.href) + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all",
                  isActive
                    ? "text-white bg-[#FF5252]/15 border border-[#FF5252]/30 shadow-[0_0_15px_rgba(255,82,82,0.2)]"
                    : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon className={cn("size-4", isActive ? "text-[#FF5252]" : "text-[#94A3B8]")} />
                {tab.label}
              </Link>
            );
          })}
          <Link
            href="/run"
            className="ml-4 h-10 px-6 rounded-xl bg-[#FF5252] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-[#E03E3E] athletic-glow-coral transition-all active:scale-95 shadow-lg"
          >
            <Play className="size-4 fill-current" />
            START RUN
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ── Mobile Bottom Tab Bar (hidden on desktop) ────────────────────────────────

function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F131C]/90 backdrop-blur-2xl border-t border-white/10"
      style={{ height: "80px", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-full max-w-md mx-auto px-2">
        {tabs.map((tab: typeof tabs[number]) => {
          const isActive =
            pathname === (tab.matchHref ?? tab.href) ||
            pathname.startsWith((tab.matchHref ?? tab.href) + "/");

          if (tab.center) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center relative group"
                style={{ marginTop: "-26px" }}
              >
                <span
                  className="flex items-center justify-center rounded-2xl bg-[#FF5252] text-white athletic-glow-coral animate-pulse-ring group-active:scale-95 transition-transform"
                  style={{
                    width: "56px",
                    height: "56px",
                  }}
                >
                  <Play className="size-6 fill-white ml-0.5" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5252] mt-1">
                  RUN
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2"
            >
              <tab.icon
                className={cn(
                  "size-5 transition-colors",
                  isActive ? "text-[#FF5252]" : "text-[#94A3B8]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-extrabold uppercase tracking-wider",
                  isActive ? "text-white" : "text-[#94A3B8]"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ── Layout ───────────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0E14] text-[#F8FAFC]">
      <DesktopNav />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-[100px] md:pt-8 md:pb-12">
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}
