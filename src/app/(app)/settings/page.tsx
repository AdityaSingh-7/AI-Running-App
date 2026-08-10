"use client";

import { useState } from "react";
import { ChevronRight, User, Award, Settings, Zap, Volume2, Target, LogOut, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const coaches = [
  { id: "coach-mo", icon: "🔥", name: "Blaze", description: "High-Energy Motivational Coach", color: "#FF5252", tagline: "Pushes your limits on every stride" },
  { id: "coach-data", icon: "◎", name: "Metric", description: "Analytical & Data-Driven Coach", color: "#38BDF8", tagline: "Focuses on heart rate zones and cadence" },
  { id: "sergeant-steel", icon: "⬆", name: "Commander", description: "Disciplined Drill Sergeant", color: "#F59E0B", tagline: "Zero excuses, maximum athletic output" },
];

const PERSONAL_BESTS = [
  { label: "5K PR", value: "24:32", sub: "Aug 2024" },
  { label: "10K PR", value: "51:14", sub: "Jul 2024" },
  { label: "Best Pace", value: "4:48/km", sub: "Interval Session" },
];

export default function ProfileSettingsPage() {
  const [selectedCoach, setSelectedCoach] = useState("coach-mo");
  const [distanceUnit, setDistanceUnit] = useState<"km" | "miles">("km");
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Goal section state
  const [goal, setGoal] = useState("");
  const [goalPlan, setGoalPlan] = useState<string | null>(null);
  const [goalLoading, setGoalLoading] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  async function handleGeneratePlan() {
    if (!goal.trim()) return;
    setGoalLoading(true);
    setGoalError(null);
    setGoalPlan(null);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to generate plan");
      }
      const data = await res.json();
      setGoalPlan(data.plan);
    } catch (err) {
      setGoalError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGoalLoading(false);
    }
  }

  return (
    <div className="w-full text-white space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-4 pt-1">
        <p className="text-xs font-black uppercase tracking-widest text-[#FF5252]">
          ATHLETE PROFILE &amp; PREFERENCES
        </p>
        <h1 className="font-black text-3xl md:text-4xl text-white tracking-tight italic mt-1 uppercase">
          PROFILE <span className="text-[#FF5252]">SETTINGS</span>
        </h1>
      </div>

      {/* Main 12-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (Profile, Bests, Preferences) */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Profile Card */}
          <div className="glass-card rounded-2xl p-6 border border-white/10 flex items-center gap-5 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 size-32 bg-[#FF5252]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="size-20 rounded-2xl bg-[#FF5252] flex items-center justify-center text-2xl font-black text-white italic shrink-0 athletic-glow-coral shadow-xl">
              YO
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-widest bg-[#FF5252]/15 text-[#FF5252] px-2.5 py-0.5 rounded-full border border-[#FF5252]/30">
                PRO ATHLETE
              </span>
              <p className="font-black text-xl text-white mt-1.5 truncate">Alex Johnson</p>
              <p className="text-xs font-semibold text-[#94A3B8]">Runner since 2024 · 48 Sessions</p>
            </div>
          </div>

          {/* Personal Bests */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award className="size-4 text-[#FF5252]" />
              <p className="text-xs font-black uppercase tracking-widest text-[#94A3B8]">
                Personal Records (PRs)
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {PERSONAL_BESTS.map((pb: typeof PERSONAL_BESTS[number]) => (
                <div key={pb.label} className="glass-card rounded-2xl p-4 border border-white/10 text-center">
                  <p className="font-black text-lg text-[#FF5252] font-mono leading-none">
                    {pb.value}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-white mt-1.5">
                    {pb.label}
                  </p>
                  <p className="text-[9px] font-semibold text-[#94A3B8] mt-0.5">{pb.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Voice Coaching Toggle */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center shrink-0">
                <Volume2 className="size-5 text-[#38BDF8]" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-white">AI Voice Coaching</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {voiceEnabled ? "Real-time audio prompts active" : "Audio muted during runs"}
                </p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={voiceEnabled}
              onClick={() => setVoiceEnabled((v) => !v)}
              className={cn(
                "relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
                voiceEnabled ? "bg-[#FF5252]" : "bg-white/10"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200",
                  voiceEnabled ? "translate-x-6" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* App Preferences */}
          <div className="glass-card rounded-2xl border border-white/10 divide-y divide-white/10 overflow-hidden">
            {/* Units */}
            <div className="flex items-center justify-between p-4.5">
              <div>
                <p className="text-sm font-extrabold text-white">Measurement Units</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {distanceUnit === "km" ? "Kilometers & Metric Pace" : "Miles & Imperial Pace"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                {(["km", "miles"] as const).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setDistanceUnit(unit)}
                    className={cn(
                      "px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                      distanceUnit === unit
                        ? "bg-[#FF5252] text-white athletic-glow-coral"
                        : "text-[#94A3B8] hover:text-white"
                    )}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between p-4.5">
              <div>
                <p className="text-sm font-extrabold text-white">Push Notifications</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">Run reminders &amp; weekly digests</p>
              </div>
              <ChevronRight className="size-5 text-[#94A3B8]" />
            </div>
          </div>

        </div>

        {/* Right Column (Coach Selection & Goal Planner) */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Preferred Coach Selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-[#FF5252]" />
                <p className="text-xs font-black uppercase tracking-widest text-[#94A3B8]">
                  Active AI Coach Persona
                </p>
              </div>
              <span className="text-xs font-bold text-[#38BDF8]">
                Voice Audio Engine Enabled
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {coaches.map((coach: typeof coaches[number]) => {
                const isSelected = selectedCoach === coach.id;
                return (
                  <button
                    key={coach.id}
                    onClick={() => setSelectedCoach(coach.id)}
                    className={cn(
                      "glass-card rounded-2xl p-4.5 flex items-center justify-between text-left transition-all border w-full",
                      isSelected
                        ? "border-[#FF5252] bg-[#FF5252]/10 athletic-glow-coral"
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="size-12 rounded-xl flex items-center justify-center text-xl shrink-0 border border-white/20"
                        style={{ backgroundColor: `${coach.color}25`, borderColor: coach.color }}
                      >
                        {coach.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-black text-white">{coach.name}</p>
                          <span
                            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
                            style={{ color: coach.color, borderColor: `${coach.color}50`, backgroundColor: `${coach.color}15` }}
                          >
                            {coach.description}
                          </span>
                        </div>
                        <p className="text-xs text-[#94A3B8] font-medium mt-1">
                          {coach.tagline}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="size-7 rounded-full bg-[#FF5252] flex items-center justify-center text-white shrink-0">
                        <Check className="size-4 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Goal & Training Plan Generator */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="size-4 text-[#FF5252]" />
              <p className="text-xs font-black uppercase tracking-widest text-[#94A3B8]">
                AI 4-Week Goal Training Plan
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Define your next athletic milestone (e.g. Sub-22 minute 5K or Half Marathon completion). The AI Coach will structure a tailored 4-week training plan for you.
              </p>

              <div className="flex gap-3">
                <Input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Sub-25 minute 5K, 10K Endurance"
                  className="h-12 flex-1 rounded-xl text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#FF5252]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGeneratePlan();
                  }}
                />
                <button
                  onClick={handleGeneratePlan}
                  disabled={goalLoading || !goal.trim()}
                  className="h-12 px-6 rounded-xl font-black text-xs uppercase tracking-wider text-white bg-[#FF5252] hover:bg-[#E03E3E] athletic-glow-coral transition-all disabled:opacity-40 shrink-0"
                >
                  {goalLoading ? "Generating..." : "GENERATE PLAN"}
                </button>
              </div>

              {goalError && (
                <p className="text-xs text-red-400 font-semibold">{goalError}</p>
              )}

              {goalPlan && !goalLoading && (
                <div className="rounded-xl border border-[#FF5252]/30 bg-[#FF5252]/5 p-5 space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-[#FF5252]">
                    🎯 4-Week Custom Plan: {goal}
                  </p>
                  <div className="prose prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap text-white/90">
                    {goalPlan}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Actions */}
          <div className="pt-2">
            <button className="w-full h-12 rounded-xl border border-white/15 bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors">
              <LogOut className="size-4 text-red-400" />
              SIGN OUT OF KADENCE.AI
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
