"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Zap, ShieldAlert, Volume2, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { getCustomCoach, createCustomCoach } from "@/lib/coaching-personalities";

const coaches = [
  {
    id: "coach-mo",
    icon: "🔥",
    name: "Blaze",
    tagline: "Your hype crew in your ear",
    style: "Motivational",
    color: "#FF5252",
    description:
      "High energy, constant encouragement, and relentless positivity. Blaze cheers you through every kilometer and will not let you quit.",
    sampleQuote: "“Push through this hill! Your legs are stronger than you think!”",
  },
  {
    id: "coach-data",
    icon: "◎",
    name: "Metric",
    tagline: "Precision-guided performance",
    style: "Analytical",
    color: "#38BDF8",
    description:
      "Data-driven coaching focused on splits, pacing strategy, and efficiency. Metric gives you precise targets to systematically improve.",
    sampleQuote: "“Current pace is 5:12/km. Ease up 4 seconds to maintain Zone 2.”",
  },
  {
    id: "sergeant-steel",
    icon: "⬆",
    name: "Commander",
    tagline: "No excuses. Just results.",
    style: "Drill Sergeant",
    color: "#F59E0B",
    description:
      "Tough love and zero tolerance for slacking. Commander pushes you past your comfort zone and demands your best every time.",
    sampleQuote: "“Pick up those feet! Champions don't slow down on final laps!”",
  },
];

interface RecoveryData {
  advice: string;
  intensity: "easy" | "moderate" | "hard" | "any";
  suggestedPace?: string;
  hoursAgo?: number;
  lastRunSummary?: string;
}

export default function RunSetupPage() {
  const [selectedCoach, setSelectedCoach] = useState<string | null>("coach-mo");
  const [recovery, setRecovery] = useState<RecoveryData | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [customCoach, setCustomCoach] = useState<{ name: string; prompt: string } | null>(null);

  // Load existing custom coach from localStorage
  useEffect(() => {
    const saved = getCustomCoach();
    if (saved) {
      setCustomCoach({ name: saved.displayName, prompt: saved.systemPrompt });
    }
  }, []);

  useEffect(() => {
    fetch("/api/coaching/recovery")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: RecoveryData | null) => {
        if (data) setRecovery(data);
      })
      .catch(() => null);
  }, []);

  const activeCoachObj = coaches.find((c: typeof coaches[number]) => c.id === selectedCoach);

  return (
    <div className="w-full text-white space-y-6 pb-28 md:pb-12">
      {/* Header */}
      <div className="border-b border-white/10 pb-4 pt-1">
        <p className="text-xs font-black uppercase tracking-widest text-[#FF5252]">
          SESSION PRE-FLIGHT
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tight mt-1">
          SELECT YOUR <span className="text-[#FF5252]">AI COACH</span>
        </h1>
        <p className="text-xs text-[#94A3B8] font-semibold mt-1">
          Choose an AI voice personality tailored for your run intensity today.
        </p>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (Coach Persona Cards Grid) */}
        <div className="md:col-span-7 space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-[#94A3B8]">
            Available Coach Personas
          </p>

          <div className="grid grid-cols-1 gap-4">
            {coaches.map((coach: typeof coaches[number]) => {
              const isSelected = selectedCoach === coach.id;
              return (
                <button
                  key={coach.id}
                  onClick={() => setSelectedCoach(coach.id)}
                  className={cn(
                    "w-full text-left rounded-2xl glass-card p-5 transition-all cursor-pointer relative overflow-hidden group border",
                    isSelected
                      ? "border-[#FF5252] bg-[#FF5252]/10 athletic-glow-coral shadow-2xl"
                      : "border-white/10 hover:border-white/20 hover:bg-white/5"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="size-14 rounded-2xl flex items-center justify-center shrink-0 text-2xl font-black shadow-md border"
                      style={{
                        backgroundColor: isSelected ? "#FF5252" : "rgba(255,255,255,0.05)",
                        color: "#FFFFFF",
                        borderColor: isSelected ? "#FF5252" : "rgba(255,255,255,0.1)",
                      }}
                    >
                      {coach.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-lg tracking-tight uppercase" style={{ color: isSelected ? "#FF5252" : "#FFFFFF" }}>
                            {coach.name}
                          </h3>
                          <span
                            className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border"
                            style={{
                              backgroundColor: isSelected ? "rgba(255,82,82,0.2)" : "rgba(255,255,255,0.05)",
                              color: isSelected ? "#FF5252" : "#94A3B8",
                              borderColor: isSelected ? "rgba(255,82,82,0.4)" : "rgba(255,255,255,0.1)",
                            }}
                          >
                            {coach.style}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="size-6 rounded-full bg-[#FF5252] flex items-center justify-center text-white shrink-0">
                            <Check className="size-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-extrabold uppercase tracking-wider mb-1.5 text-[#38BDF8]">
                        {coach.tagline}
                      </p>
                      <p className="text-xs leading-relaxed text-[#94A3B8] mb-2">
                        {coach.description}
                      </p>
                      <p className="text-[11px] italic text-white/70 bg-white/5 p-2 rounded-xl border border-white/5">
                        {coach.sampleQuote}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Custom coach option */}
            <button
              onClick={() => {
                if (customCoach) {
                  setSelectedCoach("custom");
                  setShowCustom(false);
                } else {
                  setShowCustom(!showCustom);
                  setSelectedCoach(null);
                }
              }}
              className={cn(
                "w-full text-left rounded-2xl glass-card border-2 border-dashed p-5 transition-all cursor-pointer",
                selectedCoach === "custom"
                  ? "border-[#FF5252] bg-[#FF5252]/10"
                  : "border-white/20 hover:border-[#FF5252]/40"
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className="size-14 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold border"
                  style={{
                    backgroundColor: selectedCoach === "custom" ? "#FF5252" : "rgba(255,255,255,0.05)",
                    color: "#FFFFFF",
                    borderColor: selectedCoach === "custom" ? "#FF5252" : "rgba(255,255,255,0.1)",
                  }}
                >
                  +
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-black text-lg tracking-tight uppercase text-white">
                      {customCoach ? customCoach.name : "Create Custom Coach"}
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#94A3B8]">
                      Custom Persona
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    {customCoach ? "Your custom AI coaching persona active" : "Define your own coach's personality and communication style"}
                  </p>
                </div>
              </div>
            </button>

            {/* Custom coach form */}
            {showCustom && !customCoach && (
              <div className="rounded-2xl glass-card border border-white/10 p-5 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-[#94A3B8] block mb-1.5">
                    Coach Name
                  </label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Zen, Tempo, Captain..."
                    className="border-white/10 bg-white/5 focus:border-[#FF5252] rounded-xl text-white placeholder:text-white/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-[#94A3B8] block mb-1.5">
                    System Persona Prompt
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe how your coach should speak during runs..."
                    rows={4}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-[#FF5252] focus:outline-none resize-none placeholder:text-white/30"
                  />
                </div>
                <button
                  onClick={() => {
                    if (customName.trim() && customPrompt.trim()) {
                      createCustomCoach(customName.trim(), customPrompt.trim());
                      setCustomCoach({ name: customName.trim(), prompt: customPrompt.trim() });
                      setSelectedCoach("custom");
                      setShowCustom(false);
                    }
                  }}
                  disabled={!customName.trim() || !customPrompt.trim()}
                  className="w-full h-12 rounded-xl font-black text-xs uppercase tracking-wider text-white bg-[#FF5252] hover:bg-[#E03E3E] transition-all disabled:opacity-40 athletic-glow-coral"
                >
                  Create Coach
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right Column (Pre-Flight Control Panel & Start CTA) */}
        <div className="md:col-span-5 space-y-6 sticky top-20">
          <p className="text-xs font-black uppercase tracking-widest text-[#94A3B8]">
            Pre-Flight Summary
          </p>

          {/* Selected Coach Box */}
          <div className="glass-card rounded-2xl p-6 border border-[#FF5252]/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 size-32 bg-[#FF5252]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3 mb-3">
              <span className="size-10 rounded-xl bg-[#FF5252] flex items-center justify-center text-xl text-white font-black athletic-glow-coral">
                {selectedCoach === "custom" ? "⚡" : activeCoachObj?.icon ?? "⚡"}
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[#FF5252]">Active Voice Coach</p>
                <p className="text-xl font-black text-white uppercase">
                  {selectedCoach === "custom"
                    ? customCoach?.name ?? "Custom Coach"
                    : activeCoachObj?.name ?? "Select Coach"}
                </p>
              </div>
            </div>
            {activeCoachObj && (
              <p className="text-xs text-[#94A3B8] italic border-t border-white/10 pt-3 mt-3">
                {activeCoachObj.sampleQuote}
              </p>
            )}
          </div>

          {/* Recovery advice card */}
          {recovery && (
            <div className="glass-card rounded-2xl p-5 border border-[#38BDF8]/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#38BDF8] flex items-center gap-1.5">
                  <Zap className="size-4" /> Recovery Status
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-[#38BDF8]/40 text-[#38BDF8] bg-[#38BDF8]/10">
                  {recovery.intensity}
                </span>
              </div>
              <p className="text-xs text-white font-medium leading-relaxed">{recovery.advice}</p>
              {recovery.suggestedPace && (
                <p className="text-xs font-extrabold text-[#FF5252] font-mono">
                  Target pace: {recovery.suggestedPace}/km
                </p>
              )}
            </div>
          )}

          {/* Pre-Run Checks */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#94A3B8]">
              System Checks
            </p>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-white">
                <Volume2 className="size-4 text-[#38BDF8]" /> Audio Voice Engine
              </span>
              <span className="text-emerald-400 font-bold">READY</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-white">
                <Sparkles className="size-4 text-[#FF5252]" /> Live GPS Tracking
              </span>
              <span className="text-emerald-400 font-bold">ACTIVE</span>
            </div>
          </div>

          {/* Desktop Start Run CTA */}
          <Link href={selectedCoach ? `/run/active?coach=${selectedCoach}` : "#"}>
            <button
              disabled={!selectedCoach}
              className="w-full h-16 rounded-2xl font-black text-lg uppercase tracking-wider text-white flex items-center justify-center gap-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#FF5252] hover:bg-[#E03E3E] athletic-glow-coral active:scale-98 shadow-2xl"
            >
              <Play className="size-6 fill-current" />
              START RUN NOW
            </button>
          </Link>

        </div>

      </div>
    </div>
  );
}
