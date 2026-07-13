"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
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
    color: "#E85D2B",
    bgColor: "#FEF0E6",
    description:
      "High energy, constant encouragement, and relentless positivity. Blaze cheers you through every kilometer and will not let you quit.",
  },
  {
    id: "coach-data",
    icon: "◎",
    name: "Metric",
    tagline: "Precision-guided performance",
    style: "Analytical",
    color: "#2E7D6F",
    bgColor: "#E8F5F0",
    description:
      "Data-driven coaching focused on splits, pacing strategy, and efficiency. Metric gives you precise targets to systematically improve.",
  },
  {
    id: "sergeant-steel",
    icon: "⬆",
    name: "Commander",
    tagline: "No excuses. Just results.",
    style: "Drill Sergeant",
    color: "#4A4A4A",
    bgColor: "#F0F0F0",
    description:
      "Tough love and zero tolerance for slacking. Commander pushes you past your comfort zone and demands your best every time.",
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
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);
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

  // Only show the recovery card when there was a recent run (not "any")
  const showRecoveryCard =
    recovery !== null && recovery.intensity !== "any";

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-32" style={{ backgroundColor: "#FAF7F4", minHeight: "100%" }}>
      {/* Header */}
      <div className="pt-2 pb-1">
        <h1 className="text-2xl font-bold text-[#2E363B] mb-1" style={{ fontFamily: "Georgia, serif" }}>
          Choose your coach
        </h1>
        <p className="text-sm text-[#6B7680]">
          Pick the coaching style that matches your mood today.
        </p>
      </div>

      {/* Recovery advice card — shown above coach selector when recent hard run */}
      {showRecoveryCard && recovery && (
        <div className="rounded-2xl border border-[#F5C5A3] p-4 flex flex-col gap-2" style={{ backgroundColor: "#FEF0E6" }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#C15F3C]">
              Recovery Status
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#F5C5A3] text-[#C15F3C]" style={{ backgroundColor: "#FDE3D0" }}>
              {recovery.intensity === "hard"
                ? "Hard — Take It Easy"
                : recovery.intensity === "moderate"
                ? "Moderate"
                : "Easy Day"}
            </span>
          </div>
          <p className="text-sm font-medium leading-relaxed text-[#2E363B]">{recovery.advice}</p>
          <div className="flex flex-wrap gap-3 text-xs text-[#6B7680] mt-1">
            {recovery.lastRunSummary && (
              <span>Last run: {recovery.lastRunSummary}</span>
            )}
            {recovery.suggestedPace && (
              <span className="font-semibold text-[#C15F3C]">
                Suggested pace: {recovery.suggestedPace}/km
              </span>
            )}
          </div>
        </div>
      )}

      {/* Coach cards */}
      <div className="flex flex-col gap-3">
        {coaches.map((coach) => {
          const isSelected = selectedCoach === coach.id;
          return (
            <button
              key={coach.id}
              onClick={() => setSelectedCoach(coach.id)}
              className={cn(
                "w-full text-left rounded-2xl border p-5 transition-all cursor-pointer",
                isSelected
                  ? "border-transparent ring-2 shadow-md"
                  : "border-[#F0EDEB] bg-white hover:shadow-md"
              )}
              style={isSelected ? {
                backgroundColor: coach.bgColor,
                boxShadow: `0 4px 14px ${coach.color}22`,
                outline: `2px solid ${coach.color}`,
                outlineOffset: "-1px",
              } : undefined}
            >
              <div className="flex items-start gap-4">
                {/* Themed icon circle */}
                <div
                  className="size-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold"
                  style={{
                    backgroundColor: isSelected ? coach.color : coach.bgColor,
                    color: isSelected ? "#FFFFFF" : coach.color,
                  }}
                >
                  {coach.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-base" style={{ color: isSelected ? coach.color : "#2E363B" }}>
                      {coach.name}
                    </h3>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: isSelected ? `${coach.color}15` : "#F5F2EF",
                        color: isSelected ? coach.color : "#6B7680",
                      }}
                    >
                      {coach.style}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: isSelected ? coach.color : "#6B7680" }}>
                    {coach.tagline}
                  </p>
                  <p className="text-sm leading-relaxed text-[#6B7680]">
                    {coach.description}
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
            "w-full text-left rounded-2xl border-2 border-dashed p-5 transition-all cursor-pointer",
            selectedCoach === "custom"
              ? "border-[#C15F3C] bg-[#FCEEE8]"
              : "border-[#D9D2CB] bg-white hover:border-[#C15F3C]/40"
          )}
        >
          <div className="flex items-start gap-4">
            <div
              className="size-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold"
              style={{
                backgroundColor: selectedCoach === "custom" ? "#C15F3C" : "#FCEEE8",
                color: selectedCoach === "custom" ? "#FFFFFF" : "#C15F3C",
              }}
            >
              +
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-bold text-base text-[#2E363B]">
                  {customCoach ? customCoach.name : "Create Your Own"}
                </h3>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#F5F2EF] text-[#6B7680]">
                  Custom
                </span>
              </div>
              <p className="text-sm text-[#6B7680]">
                {customCoach ? "Your custom AI coach" : "Define your own coaching personality with a custom prompt"}
              </p>
            </div>
          </div>
        </button>

        {/* Custom coach form */}
        {showCustom && !customCoach && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#6B7680] block mb-1.5">
                Coach Name
              </label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Zen, Spark, Captain..."
                className="border-gray-200 focus:border-[#C15F3C] rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#6B7680] block mb-1.5">
                Coaching Style Prompt
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Describe how your coach should talk. e.g., 'Be calm and zen-like. Use mindfulness metaphors. Focus on breathing and form.'"
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#C15F3C] focus:outline-none resize-none"
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
              className="w-full h-11 rounded-full font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#C15F3C" }}
            >
              Create Coach
            </button>
          </div>
        )}
      </div>

      {/* Start run button — fixed above tab bar on mobile, above content on desktop */}
      <div
        className="fixed bottom-[80px] md:bottom-0 left-0 right-0 z-40 px-4 py-4"
        style={{ backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid #EDE8E3" }}
      >
        <div className="max-w-2xl mx-auto">
          {selectedCoach ? (
            <div className="flex items-center gap-3 mb-3">
              <div
                className="size-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: coaches.find((c) => c.id === selectedCoach)?.color ?? "#C15F3C" }}
              >
                {coaches.find((c) => c.id === selectedCoach)?.icon ?? "✨"}
              </div>
              <p className="text-sm font-semibold text-[#2E363B]">
                {selectedCoach === "custom"
                  ? customCoach?.name ?? "Custom coach"
                  : coaches.find((c) => c.id === selectedCoach)?.name} is ready
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#6B7680] mb-3">Select a coach to continue</p>
          )}
          <Link href={selectedCoach ? `/run/active?coach=${selectedCoach}` : "#"}>
            <button
              disabled={!selectedCoach}
              className="w-full h-14 rounded-full font-bold text-lg text-white flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                backgroundColor: selectedCoach ? "#C15F3C" : "#A0A0A0",
                boxShadow: selectedCoach ? "0 4px 14px rgba(193,95,60,0.4)" : "none",
              }}
            >
              <Play className="size-5 fill-current" />
              Start Run →
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
