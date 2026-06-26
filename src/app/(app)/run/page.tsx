"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCustomCoach, createCustomCoach } from "@/lib/coaching-personalities";

const coaches = [
  {
    id: "coach-mo",
    emoji: "🔥",
    name: "Blaze",
    tagline: "Your hype crew in your ear",
    style: "Motivational",
    description:
      "High energy, constant encouragement, and relentless positivity. Blaze cheers you through every kilometer with motivational cues, celebrates your milestones loudly, and will not let you quit.",
  },
  {
    id: "coach-data",
    emoji: "📊",
    name: "Metric",
    tagline: "Precision-guided performance",
    style: "Analytical",
    description:
      "Data-driven coaching focused on metrics, pacing strategy, and optimal splits. Metric gives you precise pace targets, efficiency analysis, and post-run breakdowns to systematically improve.",
  },
  {
    id: "sergeant-steel",
    emoji: "⚔️",
    name: "Commander",
    tagline: "No excuses. Just results.",
    style: "Drill Sergeant",
    description:
      "Tough love, military discipline, and zero tolerance for slacking. Commander pushes you past your comfort zone, calls out when you slow down, and demands your best every single time.",
  },
];

interface RecoveryData {
  advice: string;
  intensity: "easy" | "moderate" | "hard" | "any";
  suggestedPace?: string;
  hoursAgo?: number;
  lastRunSummary?: string;
}

const intensityColors: Record<string, string> = {
  easy: "bg-green-50 border-green-200 text-green-800",
  moderate: "bg-yellow-50 border-yellow-200 text-yellow-800",
  hard: "bg-orange-50 border-orange-200 text-orange-800",
  any: "bg-gray-50 border-gray-200 text-gray-700",
};

const intensityLabels: Record<string, string> = {
  easy: "Easy Day",
  moderate: "Moderate",
  hard: "Hard — Take It Easy",
  any: "All Clear",
};

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
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-black text-black uppercase tracking-tight mb-2">
          Choose Your Coach
        </h1>
        <p className="text-gray-500">
          Pick the coaching style that matches your mood today. You can change
          this before each run.
        </p>
      </div>

      {/* Recovery advice card — shown above coach selector when recent hard run */}
      {showRecoveryCard && recovery && (
        <div
          className={cn(
            "rounded-2xl border-2 p-4 flex flex-col gap-2",
            intensityColors[recovery.intensity] ?? intensityColors.any
          )}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-black uppercase tracking-tight">
              Recovery Status
            </span>
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full border",
                recovery.intensity === "hard"
                  ? "border-orange-300 bg-orange-100 text-orange-700"
                  : recovery.intensity === "moderate"
                  ? "border-yellow-300 bg-yellow-100 text-yellow-700"
                  : "border-green-300 bg-green-100 text-green-700"
              )}
            >
              {intensityLabels[recovery.intensity]}
            </span>
          </div>
          <p className="text-sm font-medium leading-relaxed">{recovery.advice}</p>
          <div className="flex flex-wrap gap-3 text-xs opacity-80 mt-1">
            {recovery.lastRunSummary && (
              <span>Last run: {recovery.lastRunSummary}</span>
            )}
            {recovery.suggestedPace && (
              <span className="font-semibold">
                Suggested pace: {recovery.suggestedPace}/km
              </span>
            )}
          </div>
        </div>
      )}

      {/* Coach cards */}
      <div className="flex flex-col gap-4">
        {coaches.map((coach) => {
          const isSelected = selectedCoach === coach.id;
          return (
            <button
              key={coach.id}
              onClick={() => setSelectedCoach(coach.id)}
              className={cn(
                "w-full text-left rounded-2xl border-2 p-5 transition-all cursor-pointer",
                isSelected
                  ? "bg-black text-white border-black"
                  : "bg-white border-gray-200 hover:shadow-md"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl leading-none shrink-0">{coach.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className={cn("font-black text-lg uppercase tracking-tight", isSelected ? "text-white" : "text-black")}>
                      {coach.name}
                    </h3>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full border",
                        isSelected
                          ? "border-white/30 text-white/80"
                          : "border-gray-300 text-gray-600"
                      )}
                    >
                      {coach.style}
                    </span>
                    {isSelected && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#CFFF04] text-black">
                        Selected ✓
                      </span>
                    )}
                  </div>
                  <p className={cn("text-sm font-medium mb-2", isSelected ? "text-white/80" : "text-gray-600")}>
                    {coach.tagline}
                  </p>
                  <p className={cn("text-sm leading-relaxed", isSelected ? "text-white/70" : "text-gray-500")}>
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
              ? "bg-black text-white border-black"
              : "bg-white border-gray-300 hover:border-gray-400"
          )}
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl leading-none shrink-0">✨</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className={cn("font-black text-lg uppercase tracking-tight", selectedCoach === "custom" ? "text-white" : "text-black")}>
                  {customCoach ? customCoach.name : "Create Your Own"}
                </h3>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", selectedCoach === "custom" ? "border-white/30 text-white/80" : "border-gray-300 text-gray-600")}>
                  Custom
                </span>
              </div>
              <p className={cn("text-sm", selectedCoach === "custom" ? "text-white/70" : "text-gray-500")}>
                {customCoach ? "Your custom AI coach" : "Define your own coaching personality with a custom prompt"}
              </p>
            </div>
          </div>
        </button>

        {/* Custom coach form */}
        {showCustom && !customCoach && (
          <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-5 flex flex-col gap-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black block mb-1.5">
                Coach Name
              </label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Zen, Spark, Captain..."
                className="border-gray-300 focus:border-black"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black block mb-1.5">
                Coaching Style Prompt
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Describe how your coach should talk. e.g., 'Be calm and zen-like. Use mindfulness metaphors. Focus on breathing and form. Speak softly but firmly.'"
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none resize-none"
              />
            </div>
            <Button
              onClick={() => {
                if (customName.trim() && customPrompt.trim()) {
                  createCustomCoach(customName.trim(), customPrompt.trim());
                  setCustomCoach({ name: customName.trim(), prompt: customPrompt.trim() });
                  setSelectedCoach("custom");
                  setShowCustom(false);
                }
              }}
              disabled={!customName.trim() || !customPrompt.trim()}
              className="bg-[#CFFF04] text-black font-black uppercase hover:bg-[#b8e004] disabled:bg-gray-200 disabled:text-gray-400"
            >
              Create Coach
            </Button>
          </div>
        )}
      </div>

      {/* Start run button */}
      <div className="sticky bottom-6">
        <Card className="shadow-lg border border-gray-200 bg-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                {selectedCoach ? (
                  <p className="text-sm font-semibold text-black">
                    {coaches.find((c) => c.id === selectedCoach)?.emoji}{" "}
                    {coaches.find((c) => c.id === selectedCoach)?.name} is ready
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a coach to continue
                  </p>
                )}
              </div>
              <Link
                href={
                  selectedCoach
                    ? `/run/active?coach=${selectedCoach}`
                    : "#"
                }
              >
                <Button
                  disabled={!selectedCoach}
                  className="h-11 px-8 bg-[#CFFF04] text-black font-black uppercase hover:bg-[#b8e004] border-0 disabled:bg-gray-200 disabled:text-gray-400"
                >
                  Start Run →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
