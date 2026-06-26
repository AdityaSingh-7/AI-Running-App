"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const coaches = [
  { id: "coach-mo", emoji: "🔥", name: "Coach Mo", description: "Motivational" },
  { id: "coach-data", emoji: "📊", name: "Coach Data", description: "Analytical" },
  { id: "sergeant-steel", emoji: "💪", name: "Sergeant Steel", description: "Drill Sergeant" },
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
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-black text-black uppercase tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-1">
          Customize your RunCoach AI experience
        </p>
      </div>

      {/* Preferred Coach */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="font-black uppercase tracking-tight text-black">Preferred Coach</CardTitle>
          <CardDescription>
            Your default coaching style for new runs
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {coaches.map((coach) => (
            <button
              key={coach.id}
              onClick={() => setSelectedCoach(coach.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all w-full",
                selectedCoach === coach.id
                  ? "border-black bg-black"
                  : "border-gray-200 hover:border-gray-400 bg-white"
              )}
            >
              <span className="text-2xl">{coach.emoji}</span>
              <div>
                <p
                  className={cn(
                    "font-semibold text-sm",
                    selectedCoach === coach.id
                      ? "text-white"
                      : "text-black"
                  )}
                >
                  {coach.name}
                </p>
                <p className={cn("text-xs", selectedCoach === coach.id ? "text-white/70" : "text-muted-foreground")}>
                  {coach.description}
                </p>
              </div>
              {selectedCoach === coach.id && (
                <span className="ml-auto text-white font-bold text-sm">✓</span>
              )}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Distance Unit */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="font-black uppercase tracking-tight text-black">Distance Unit</CardTitle>
          <CardDescription>
            Units used for distance and pace displays
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="inline-flex rounded-xl border border-gray-200 overflow-hidden">
            {(["km", "miles"] as const).map((unit) => (
              <button
                key={unit}
                onClick={() => setDistanceUnit(unit)}
                className={cn(
                  "px-6 py-2.5 text-sm font-medium transition-colors",
                  distanceUnit === unit
                    ? "bg-black text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                {unit === "km" ? "Kilometers (km)" : "Miles (mi)"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Voice Coaching */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="font-black uppercase tracking-tight text-black">Voice Coaching</CardTitle>
          <CardDescription>
            Enable or disable real-time voice cues during runs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-black">Voice Coaching</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {voiceEnabled
                  ? "Your coach will speak to you during runs"
                  : "Voice feedback is disabled"}
              </p>
            </div>
            {/* Toggle */}
            <button
              role="switch"
              aria-checked={voiceEnabled}
              onClick={() => setVoiceEnabled((v) => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
                voiceEnabled ? "bg-black" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
                  voiceEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Running Goal */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="font-black uppercase tracking-tight text-black">Running Goal</CardTitle>
          <CardDescription>
            Set a goal and get an AI-generated 4-week training plan tailored to your recent runs
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Sub-25 minute 5K, Run a half marathon"
              className="flex-1 border-gray-200 focus-visible:ring-black"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGeneratePlan();
              }}
            />
            <Button
              onClick={handleGeneratePlan}
              disabled={goalLoading || !goal.trim()}
              className="h-10 px-5 bg-[#CFFF04] text-black font-black uppercase hover:bg-[#b8e004] border-0 disabled:bg-gray-200 disabled:text-gray-400 shrink-0"
            >
              {goalLoading ? "Generating..." : "Generate Plan"}
            </Button>
          </div>

          {goalError && (
            <p className="text-sm text-red-600">{goalError}</p>
          )}

          {goalLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
              Building your 4-week plan...
            </div>
          )}

          {goalPlan && !goalLoading && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-black uppercase tracking-tight text-gray-400 mb-3">
                4-Week Plan for: {goal}
              </p>
              <div className="prose prose-sm max-w-none text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                {goalPlan}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Save */}
      <div className="flex justify-end">
        <Button className="h-10 px-6 bg-black text-white font-black uppercase hover:bg-gray-800 border-0">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
