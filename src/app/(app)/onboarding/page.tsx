"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Coach data (mirrors /run/page.tsx) ───────────────────────────────────────

const coaches = [
  {
    id: "coach-mo",
    emoji: "🔥",
    name: "Coach Mo",
    tagline: "Your hype crew in your ear",
    style: "Motivational",
    description:
      "High energy, constant encouragement, and relentless positivity. Coach Mo cheers you through every kilometer.",
  },
  {
    id: "coach-data",
    emoji: "📊",
    name: "Coach Data",
    tagline: "Precision-guided performance",
    style: "Analytical",
    description:
      "Data-driven coaching focused on metrics, pacing strategy, and optimal splits for systematic improvement.",
  },
  {
    id: "sergeant-steel",
    emoji: "💪",
    name: "Sergeant Steel",
    tagline: "No excuses. Just results.",
    style: "Drill Sergeant",
    description:
      "Tough love, military discipline, and zero tolerance for slacking. Sergeant Steel pushes you past your limits.",
  },
];

// ─── Goal options ─────────────────────────────────────────────────────────────

const GOAL_OPTIONS = [
  { id: "get-fit", label: "Get Fit" },
  { id: "5k", label: "Run a 5K" },
  { id: "pace", label: "Improve My Pace" },
  { id: "race", label: "Train for a Race" },
];

const TOTAL_STEPS = 4;

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "rounded-full transition-all",
            i === current
              ? "w-6 h-2 bg-[#CFFF04]"
              : i < current
              ? "w-2 h-2 bg-foreground/40"
              : "w-2 h-2 bg-foreground/15"
          )}
        />
      ))}
    </div>
  );
}

// ─── Step 1: Goal ─────────────────────────────────────────────────────────────

function StepGoal({
  goal,
  customGoal,
  onGoal,
  onCustomGoal,
}: {
  goal: string;
  customGoal: string;
  onGoal: (id: string) => void;
  onCustomGoal: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#CFFF04] mb-3">
          Step 1 of 4
        </p>
        <h1 className="text-4xl sm:text-5xl font-black text-foreground uppercase tracking-tight leading-none mb-3">
          WHAT&apos;S YOUR GOAL?
        </h1>
        <p className="text-muted-foreground">
          Pick the goal that drives you. You can change this anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GOAL_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onGoal(opt.id)}
            className={cn(
              "w-full text-left rounded-2xl border-2 px-5 py-4 text-lg font-black uppercase tracking-tight transition-all",
              goal === opt.id
                ? "bg-[#CFFF04] text-black border-[#CFFF04]"
                : "bg-background text-foreground border-border hover:border-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom goal */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Or enter your own
        </p>
        <input
          type="text"
          value={customGoal}
          onChange={(e) => {
            onCustomGoal(e.target.value);
            if (e.target.value.trim()) onGoal("custom");
          }}
          placeholder="e.g. Run my first marathon"
          className={cn(
            "w-full rounded-xl border-2 bg-background text-foreground px-4 py-3 text-sm font-medium placeholder:text-muted-foreground/50 outline-none transition-all",
            goal === "custom"
              ? "border-[#CFFF04]"
              : "border-border focus:border-foreground"
          )}
        />
      </div>
    </div>
  );
}

// ─── Step 2: Coach ────────────────────────────────────────────────────────────

function StepCoach({
  selectedCoach,
  onCoach,
}: {
  selectedCoach: string;
  onCoach: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#CFFF04] mb-3">
          Step 2 of 4
        </p>
        <h1 className="text-4xl sm:text-5xl font-black text-foreground uppercase tracking-tight leading-none mb-3">
          PICK YOUR COACH
        </h1>
        <p className="text-muted-foreground">
          Your default coach for every run. Switch it up before any session.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {coaches.map((coach) => {
          const isSelected = selectedCoach === coach.id;
          return (
            <button
              key={coach.id}
              onClick={() => onCoach(coach.id)}
              className={cn(
                "w-full text-left rounded-2xl border-2 p-5 transition-all",
                isSelected
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-foreground border-border hover:border-foreground"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl leading-none shrink-0">
                  {coach.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3
                      className={cn(
                        "font-black text-lg uppercase tracking-tight",
                        isSelected ? "text-background" : "text-foreground"
                      )}
                    >
                      {coach.name}
                    </h3>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full border",
                        isSelected
                          ? "border-background/30 text-background/80"
                          : "border-border text-muted-foreground"
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
                  <p
                    className={cn(
                      "text-sm font-medium mb-1",
                      isSelected ? "text-background/80" : "text-muted-foreground"
                    )}
                  >
                    {coach.tagline}
                  </p>
                  <p
                    className={cn(
                      "text-sm leading-relaxed",
                      isSelected ? "text-background/70" : "text-muted-foreground"
                    )}
                  >
                    {coach.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Voice ────────────────────────────────────────────────────────────

function StepVoice({
  voiceEnabled,
  onVoice,
}: {
  voiceEnabled: boolean;
  onVoice: (v: boolean) => void;
}) {
  const [tested, setTested] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);

  function playTest() {
    if (!("speechSynthesis" in window)) return;
    setPlaying(true);
    const utt = new SpeechSynthesisUtterance(
      "Let's go! You've got this. Time to run!"
    );
    utt.rate = 1.05;
    utt.pitch = 1.1;
    utt.onend = () => {
      setPlaying(false);
      setTested(true);
    };
    utt.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(utt);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#CFFF04] mb-3">
          Step 3 of 4
        </p>
        <h1 className="text-4xl sm:text-5xl font-black text-foreground uppercase tracking-tight leading-none mb-3">
          TEST YOUR VOICE
        </h1>
        <p className="text-muted-foreground">
          RunCoach talks to you while you run. Make sure you can hear it.
        </p>
      </div>

      {/* Play test */}
      <div className="rounded-2xl border-2 border-border bg-background p-6 flex flex-col items-center gap-4 text-center">
        <div className="size-20 rounded-full bg-[#CFFF04] flex items-center justify-center text-4xl">
          {playing ? "🔊" : tested ? "✅" : "🎙️"}
        </div>
        <div>
          <p className="font-black text-foreground uppercase tracking-tight text-lg">
            {playing
              ? "Listen up..."
              : tested
              ? "Sounding good!"
              : "Tap to hear a sample"}
          </p>
          {tested && (
            <p className="text-sm text-muted-foreground mt-1">
              Your coach will sound like this during your run.
            </p>
          )}
        </div>
        <button
          onClick={playTest}
          disabled={playing}
          className="px-8 py-3 rounded-xl bg-foreground text-background font-black uppercase tracking-tight text-sm disabled:opacity-50 transition-opacity"
        >
          {playing ? "Playing..." : tested ? "Play Again" : "Play Sample"}
        </button>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-border px-5 py-4">
        <div>
          <p className="font-black text-foreground uppercase tracking-tight">
            Voice Coaching
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Get real-time audio cues while you run
          </p>
        </div>
        <button
          onClick={() => onVoice(!voiceEnabled)}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            voiceEnabled ? "bg-[#CFFF04]" : "bg-muted"
          )}
          role="switch"
          aria-checked={voiceEnabled}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-6 w-6 rounded-full bg-black shadow-sm ring-0 transition-transform",
              voiceEnabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Ready ────────────────────────────────────────────────────────────

function StepReady({
  goal,
  customGoal,
  selectedCoach,
  voiceEnabled,
}: {
  goal: string;
  customGoal: string;
  selectedCoach: string;
  voiceEnabled: boolean;
}) {
  const coach = coaches.find((c) => c.id === selectedCoach);
  const goalLabel =
    goal === "custom"
      ? customGoal || "Custom goal"
      : GOAL_OPTIONS.find((g) => g.id === goal)?.label ?? "—";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#CFFF04] mb-3">
          Step 4 of 4
        </p>
        <h1 className="text-4xl sm:text-5xl font-black text-foreground uppercase tracking-tight leading-none mb-3">
          READY TO RUN
        </h1>
        <p className="text-muted-foreground">Here&apos;s what we set up for you.</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border-2 border-border bg-background px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">
              Your Goal
            </p>
            <p className="font-black text-foreground text-lg uppercase tracking-tight">
              {goalLabel}
            </p>
          </div>
          <span className="text-2xl">🎯</span>
        </div>

        <div className="rounded-2xl border-2 border-border bg-background px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">
              Your Coach
            </p>
            <p className="font-black text-foreground text-lg uppercase tracking-tight">
              {coach ? `${coach.emoji} ${coach.name}` : "—"}
            </p>
            {coach && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {coach.tagline}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border-2 border-border bg-background px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">
              Voice Coaching
            </p>
            <p className="font-black text-foreground text-lg uppercase tracking-tight">
              {voiceEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <span className="text-2xl">{voiceEnabled ? "🔊" : "🔇"}</span>
        </div>
      </div>

      <div className="rounded-2xl bg-[#CFFF04] px-5 py-4">
        <p className="font-black text-black uppercase tracking-tight">
          You&apos;re all set!
        </p>
        <p className="text-sm text-black/70 mt-1">
          Hit the button below to start your first run. Your coach is ready.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);

  // Step 1: goal
  const [goal, setGoal] = React.useState("");
  const [customGoal, setCustomGoal] = React.useState("");

  // Step 2: coach
  const [selectedCoach, setSelectedCoach] = React.useState("");

  // Step 3: voice
  const [voiceEnabled, setVoiceEnabled] = React.useState(true);

  function canContinue() {
    if (step === 0) return !!goal;
    if (step === 1) return !!selectedCoach;
    return true;
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      // Persist preferences
      localStorage.setItem("onboarding_complete", "true");
      localStorage.setItem(
        "onboarding_goal",
        goal === "custom" ? customGoal : goal
      );
      localStorage.setItem("onboarding_coach", selectedCoach);
      localStorage.setItem(
        "onboarding_voice",
        voiceEnabled ? "true" : "false"
      );
      router.push(
        selectedCoach ? `/run/active?coach=${selectedCoach}` : "/run"
      );
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4 max-w-2xl mx-auto w-full">
        <span className="font-black text-foreground text-lg tracking-tight uppercase">
          RUNCOACH
        </span>
        <button
          onClick={() => {
            localStorage.setItem("onboarding_complete", "skipped");
            router.push("/dashboard");
          }}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Progress dots */}
      <div className="px-6 max-w-2xl mx-auto w-full mb-8">
        <StepDots current={step} />
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 max-w-2xl mx-auto w-full pb-8">
        {step === 0 && (
          <StepGoal
            goal={goal}
            customGoal={customGoal}
            onGoal={setGoal}
            onCustomGoal={setCustomGoal}
          />
        )}
        {step === 1 && (
          <StepCoach selectedCoach={selectedCoach} onCoach={setSelectedCoach} />
        )}
        {step === 2 && (
          <StepVoice voiceEnabled={voiceEnabled} onVoice={setVoiceEnabled} />
        )}
        {step === 3 && (
          <StepReady
            goal={goal}
            customGoal={customGoal}
            selectedCoach={selectedCoach}
            voiceEnabled={voiceEnabled}
          />
        )}
      </div>

      {/* Bottom nav */}
      <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="h-14 px-6 rounded-xl border-2 border-border font-black uppercase text-sm text-foreground hover:border-foreground transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canContinue()}
            className={cn(
              "flex-1 h-14 rounded-xl font-black uppercase tracking-tight text-lg transition-all",
              canContinue()
                ? "bg-[#CFFF04] text-black hover:bg-[#b8e004]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {step === TOTAL_STEPS - 1 ? "START YOUR FIRST RUN →" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}
