"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
          className="rounded-full transition-all"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            backgroundColor:
              i === current
                ? "#C15F3C"
                : i < current
                ? "#2E363B"
                : "#D1D5DB",
          }}
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
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#C15F3C" }}>
          Step 1 of 4
        </p>
        <h1 className="text-3xl font-bold text-[#2E363B] leading-tight mb-2" style={{ fontFamily: "Georgia, serif" }}>
          What&apos;s your goal?
        </h1>
        <p className="text-sm text-[#6B7680]">
          Pick the goal that drives you. You can change this anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GOAL_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onGoal(opt.id)}
            className={cn(
              "w-full text-left rounded-2xl border-2 px-5 py-4 text-base font-semibold transition-all",
              goal === opt.id
                ? "border-[#C15F3C] text-[#C15F3C] bg-[#FEF0E6]"
                : "border-gray-200 text-[#2E363B] bg-white hover:border-[#C15F3C]/40"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom goal */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7680] mb-2">
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
            "w-full rounded-xl border-2 bg-white text-[#2E363B] px-4 py-3 text-sm font-medium placeholder:text-[#6B7680]/50 outline-none transition-all",
            goal === "custom"
              ? "border-[#C15F3C]"
              : "border-gray-200 focus:border-[#C15F3C]/60"
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
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#C15F3C" }}>
          Step 2 of 4
        </p>
        <h1 className="text-3xl font-bold text-[#2E363B] leading-tight mb-2" style={{ fontFamily: "Georgia, serif" }}>
          Pick your coach
        </h1>
        <p className="text-sm text-[#6B7680]">
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
                "w-full text-left rounded-2xl border p-5 transition-all bg-white shadow-sm",
                isSelected
                  ? "border-[#C15F3C] ring-1 ring-[#C15F3C]"
                  : "border-gray-200 hover:border-[#C15F3C]/40"
              )}
              style={isSelected ? { borderLeftWidth: 4, borderLeftColor: "#C15F3C" } : {}}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl leading-none shrink-0 mt-0.5">
                  {coach.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-base text-[#2E363B]">
                      {coach.name}
                    </h3>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200 text-[#6B7680]">
                      {coach.style}
                    </span>
                    {isSelected && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#C15F3C" }}>
                        Selected ✓
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[#6B7680] mb-1">
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
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#C15F3C" }}>
          Step 3 of 4
        </p>
        <h1 className="text-3xl font-bold text-[#2E363B] leading-tight mb-2" style={{ fontFamily: "Georgia, serif" }}>
          Test your voice
        </h1>
        <p className="text-sm text-[#6B7680]">
          RunCoach talks to you while you run. Make sure you can hear it.
        </p>
      </div>

      {/* Play test */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex flex-col items-center gap-4 text-center">
        <div
          className="size-20 rounded-full flex items-center justify-center text-4xl"
          style={{ backgroundColor: "#FEF0E6" }}
        >
          {playing ? "🔊" : tested ? "✅" : "🎙️"}
        </div>
        <div>
          <p className="font-bold text-[#2E363B] text-lg">
            {playing
              ? "Listen up..."
              : tested
              ? "Sounding good!"
              : "Tap to hear a sample"}
          </p>
          {tested && (
            <p className="text-sm text-[#6B7680] mt-1">
              Your coach will sound like this during your run.
            </p>
          )}
        </div>
        <button
          onClick={playTest}
          disabled={playing}
          className="px-8 py-2.5 rounded-full font-semibold text-sm text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "#C15F3C" }}
        >
          {playing ? "Playing..." : tested ? "Play Again" : "Play Sample"}
        </button>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4">
        <div>
          <p className="font-semibold text-[#2E363B] text-sm">Voice Coaching</p>
          <p className="text-xs text-[#6B7680] mt-0.5">
            Get real-time audio cues while you run
          </p>
        </div>
        <button
          onClick={() => onVoice(!voiceEnabled)}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
          style={{ backgroundColor: voiceEnabled ? "#C15F3C" : "#D1D5DB" }}
          role="switch"
          aria-checked={voiceEnabled}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform",
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
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#C15F3C" }}>
          Step 4 of 4
        </p>
        <h1 className="text-3xl font-bold text-[#2E363B] leading-tight mb-2" style={{ fontFamily: "Georgia, serif" }}>
          Ready to run
        </h1>
        <p className="text-sm text-[#6B7680]">Here&apos;s what we set up for you.</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7680] mb-1">
              Your Goal
            </p>
            <p className="font-bold text-[#2E363B] text-base">
              {goalLabel}
            </p>
          </div>
          <span className="text-2xl">🎯</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7680] mb-1">
              Your Coach
            </p>
            <p className="font-bold text-[#2E363B] text-base">
              {coach ? `${coach.emoji} ${coach.name}` : "—"}
            </p>
            {coach && (
              <p className="text-xs text-[#6B7680] mt-0.5">
                {coach.tagline}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7680] mb-1">
              Voice Coaching
            </p>
            <p className="font-bold text-[#2E363B] text-base">
              {voiceEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <span className="text-2xl">{voiceEnabled ? "🔊" : "🔇"}</span>
        </div>
      </div>

      <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: "#FEF0E6", border: "1px solid #F5C5A3" }}>
        <p className="font-bold text-[#C15F3C] text-sm">
          You&apos;re all set!
        </p>
        <p className="text-sm text-[#2E363B]/70 mt-1">
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF7F4" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4 max-w-2xl mx-auto w-full">
        <span className="font-bold text-[#2E363B] text-lg" style={{ fontFamily: "Georgia, serif" }}>
          RunCoach
        </span>
        <button
          onClick={() => {
            localStorage.setItem("onboarding_complete", "skipped");
            router.push("/dashboard");
          }}
          className="text-sm font-medium text-[#6B7680] hover:text-[#2E363B] transition-colors"
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
      <div
        className="sticky bottom-0 px-6 py-4"
        style={{ backgroundColor: "rgba(250,247,244,0.97)", backdropFilter: "blur(8px)", borderTop: "1px solid #EDE8E3" }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="h-14 px-6 rounded-full border font-semibold text-sm text-[#2E363B] transition-colors hover:border-[#2E363B]"
              style={{ borderWidth: 1.5, borderColor: "#D1D5DB" }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canContinue()}
            className="flex-1 h-14 rounded-full font-bold text-base text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#C15F3C" }}
          >
            {step === TOTAL_STEPS - 1 ? "Start your first run" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
