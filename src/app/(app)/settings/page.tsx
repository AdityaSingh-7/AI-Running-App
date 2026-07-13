"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const coaches = [
  { id: "coach-mo", icon: "🔥", name: "Blaze", description: "Motivational", color: "#E85D2B", bgColor: "#FEF0E6" },
  { id: "coach-data", icon: "◎", name: "Metric", description: "Analytical", color: "#2E7D6F", bgColor: "#E8F5F0" },
  { id: "sergeant-steel", icon: "⬆", name: "Commander", description: "Drill Sergeant", color: "#4A4A4A", bgColor: "#F0F0F0" },
];

const PERSONAL_BESTS = [
  { label: "5K", value: "24:32" },
  { label: "10K", value: "51:14" },
  { label: "Best Pace", value: "4:48/km" },
];

export default function SettingsPage() {
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
    <div className="flex flex-col gap-6 max-w-xl pb-12" style={{ backgroundColor: "#FAF7F4", minHeight: "100%" }}>

      {/* Profile header */}
      <div className="flex flex-col items-center pt-4 pb-2 gap-3">
        <div
          className="size-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-sm"
          style={{ backgroundColor: "#C15F3C" }}
        >
          YO
        </div>
        <div className="text-center">
          <p className="font-bold text-[#2E363B] text-lg">Your Profile</p>
          <p className="text-xs text-[#6B7680] mt-0.5">Member since 2023</p>
        </div>
      </div>

      {/* Personal Bests */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7680] mb-3">
          Personal Bests
        </p>
        <div className="grid grid-cols-3 gap-3">
          {PERSONAL_BESTS.map((pb) => (
            <div key={pb.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="font-bold text-sm" style={{ color: "#C15F3C" }}>
                {pb.value}
              </p>
              <p className="text-xs uppercase tracking-wide mt-1" style={{ color: "#6B7680" }}>
                {pb.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Settings list */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7680] mb-3">
          Settings
        </p>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Units row */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-[#2E363B]">Units</p>
              <p className="text-xs text-[#6B7680] mt-0.5">{distanceUnit === "km" ? "Kilometers" : "Miles"}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-full border border-gray-200 overflow-hidden">
                {(["km", "miles"] as const).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setDistanceUnit(unit)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium transition-colors",
                      distanceUnit === unit
                        ? "text-white"
                        : "bg-white text-[#6B7680]"
                    )}
                    style={distanceUnit === unit ? { backgroundColor: "#C15F3C" } : {}}
                  >
                    {unit}
                  </button>
                ))}
              </div>
              <ChevronRight className="size-4 text-[#6B7680]" />
            </div>
          </div>

          {/* Notifications row */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-[#2E363B]">Notifications</p>
              <p className="text-xs text-[#6B7680] mt-0.5">Run reminders &amp; milestones</p>
            </div>
            <ChevronRight className="size-4 text-[#6B7680]" />
          </div>

          {/* Connected Apps row */}
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-medium text-[#2E363B]">Connected Apps</p>
              <p className="text-xs text-[#6B7680] mt-0.5">Sync with health &amp; fitness apps</p>
            </div>
            <ChevronRight className="size-4 text-[#6B7680]" />
          </div>
        </div>
      </div>

      {/* Voice Coaching toggle */}
      <div className="bg-white rounded-2xl shadow-sm px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#2E363B]">Voice Coaching</p>
          <p className="text-xs text-[#6B7680] mt-0.5">
            {voiceEnabled ? "Your coach speaks during runs" : "Voice feedback is disabled"}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={voiceEnabled}
          onClick={() => setVoiceEnabled((v) => !v)}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
          style={{ backgroundColor: voiceEnabled ? "#C15F3C" : "#D1D5DB" }}
        >
          <span
            className={cn(
              "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
              voiceEnabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {/* Preferred Coach */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7680] mb-3">
          Preferred Coach
        </p>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {coaches.map((coach, i) => (
            <button
              key={coach.id}
              onClick={() => setSelectedCoach(coach.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-left transition-colors w-full",
                i < coaches.length - 1 ? "border-b border-gray-100" : "",
                selectedCoach === coach.id ? "" : "bg-white hover:bg-gray-50"
              )}
              style={selectedCoach === coach.id ? { backgroundColor: coach.bgColor } : {}}
            >
              <div
                className="size-9 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{
                  backgroundColor: selectedCoach === coach.id ? coach.color : coach.bgColor,
                  color: selectedCoach === coach.id ? "#FFFFFF" : coach.color,
                }}
              >
                {coach.icon}
              </div>
              <div className="flex-1">
                <p className={cn("text-sm font-medium", selectedCoach === coach.id ? "" : "text-[#2E363B]")} style={selectedCoach === coach.id ? { color: coach.color } : {}}>
                  {coach.name}
                </p>
                <p className="text-xs text-[#6B7680]">{coach.description}</p>
              </div>
              {selectedCoach === coach.id && (
                <span className="text-xs font-bold" style={{ color: coach.color }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Running Goal */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7680] mb-3">
          Running Goal
        </p>
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-4">
          <p className="text-xs text-[#6B7680] leading-relaxed">
            Set a goal and get an AI-generated 4-week training plan tailored to your recent runs.
          </p>
          <div className="flex gap-2">
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Sub-25 minute 5K, Run a half marathon"
              className="flex-1 border-gray-200 rounded-xl text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGeneratePlan();
              }}
            />
            <button
              onClick={handleGeneratePlan}
              disabled={goalLoading || !goal.trim()}
              className="h-10 px-4 rounded-full font-semibold text-sm text-white shrink-0 transition-all disabled:opacity-40"
              style={{ backgroundColor: "#C15F3C" }}
            >
              {goalLoading ? "..." : "Generate"}
            </button>
          </div>

          {goalError && (
            <p className="text-sm text-red-600">{goalError}</p>
          )}

          {goalLoading && (
            <div className="flex items-center gap-2 text-sm text-[#6B7680]">
              <span className="inline-block w-4 h-4 border-2 border-gray-300 rounded-full animate-spin" style={{ borderTopColor: "#C15F3C" }} />
              Building your 4-week plan...
            </div>
          )}

          {goalPlan && !goalLoading && (
            <div className="rounded-xl border border-gray-100 p-4" style={{ backgroundColor: "#FAF7F4" }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7680] mb-3">
                4-Week Plan for: {goal}
              </p>
              <div className="prose prose-sm max-w-none text-[#2E363B] text-sm leading-relaxed whitespace-pre-wrap">
                {goalPlan}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sign Out */}
      <div className="pt-2">
        <button
          className="w-full h-12 rounded-full font-semibold text-sm border transition-colors"
          style={{ borderWidth: 1.5, borderColor: "#2E363B", color: "#2E363B", backgroundColor: "transparent" }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
