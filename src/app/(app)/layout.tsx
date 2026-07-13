"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, Play, Medal, User, Menu, X } from "lucide-react";
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
    <header className="hidden md:block sticky top-0 z-50 w-full bg-white/95 backdrop-blur border-b border-[#F0EDEB]">
      <div className="max-w-4xl mx-auto flex h-14 items-center justify-between px-6">
        <Link href="/dashboard" className="font-bold text-lg text-[#2E363B]">
          RunCoach
        </Link>
        <nav className="flex items-center gap-1">
          {tabs.filter(t => !t.center).map((tab) => {
            const isActive =
              pathname === (tab.matchHref ?? tab.href) ||
              pathname.startsWith((tab.matchHref ?? tab.href) + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "text-[#C15F3C] bg-[#FCEEE8]"
                    : "text-[#6B7680] hover:text-[#2E363B] hover:bg-[#F5F2EF]"
                )}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </Link>
            );
          })}
          <Link
            href="/run"
            className="ml-2 h-9 px-5 rounded-full bg-[#C15F3C] text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-[#9B4628] transition-colors"
          >
            <Play className="size-3.5 fill-current" />
            Run
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#F0EDEB]"
      style={{ height: "80px", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-full max-w-md mx-auto px-2">
        {tabs.map((tab) => {
          const isActive =
            pathname === (tab.matchHref ?? tab.href) ||
            pathname.startsWith((tab.matchHref ?? tab.href) + "/");

          if (tab.center) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center relative"
                style={{ marginTop: "-24px" }}
              >
                <span
                  className="flex items-center justify-center rounded-full bg-[#C15F3C] text-white"
                  style={{
                    width: "52px",
                    height: "52px",
                    boxShadow: "0 4px 14px rgba(193,95,60,0.4)",
                  }}
                >
                  <Play className="size-5 fill-white" />
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
                  "size-5",
                  isActive ? "text-[#C15F3C]" : "text-[#6B7680]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  isActive ? "text-[#C15F3C]" : "text-[#6B7680]"
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FDF8F4" }}>
      <DesktopNav />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-6 pb-6 md:pb-8 md:pt-8 pb-[100px] md:pb-8">
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}
