import type React from "react";
import Link from "next/link";
import { MapPin, Mic, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#FDF8F4" }}>
      {/* Nav */}
      <header
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: "#FDF8F4", borderBottom: "1px solid #F0EDEB" }}
      >
        <span className="font-bold text-[#2E363B] text-base">
          RunCoach
        </span>
        <Link
          href="/login"
          className="text-[#6B7680] hover:text-[#2E363B] text-sm font-medium transition-colors"
        >
          Sign In
        </Link>
      </header>

      {/* Hero */}
      <section
        className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center"
        style={{ background: "#FDF8F4" }}
      >
        <span
          className="text-xs font-semibold mb-5 px-3 py-1 rounded-full"
          style={{ background: "#FCEEE8", color: "#9B4628" }}
        >
          AI-Powered Coaching
        </span>

        <h1
          className="font-black leading-none tracking-tight mb-5"
          style={{
            fontSize: "clamp(3rem, 10vw, 7rem)",
            color: "#2E363B",
          }}
        >
          Run<br />
          <span style={{ color: "#C15F3C" }}>Smarter.</span>
        </h1>

        <p className="text-[#6B7680] text-lg max-w-sm mx-auto mb-10 leading-relaxed">
          AI-powered coaching that adapts to every stride. Track, improve, and love every run.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-center w-full max-w-xs">
          <Link
            href="/register"
            className="w-full inline-flex items-center justify-center font-semibold text-white transition-colors"
            style={{
              background: "#C15F3C",
              height: "52px",
              borderRadius: "999px",
              fontSize: "15px",
            }}
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center font-semibold transition-colors"
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #F0EDEB",
              height: "52px",
              borderRadius: "999px",
              fontSize: "15px",
              color: "#2E363B",
            }}
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      <div
        className="px-6 py-6 flex flex-col sm:flex-row items-center justify-center gap-10"
        style={{ background: "#FFFFFF", borderTop: "1px solid #F0EDEB" }}
      >
        {[
          { value: "10K+", label: "Runs Logged" },
          { value: "4.9", label: "App Rating" },
          { value: "100%", label: "Adaptive" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div
              className="font-black text-3xl"
              style={{ color: "#C15F3C" }}
            >
              {stat.value}
            </div>
            <div
              className="text-xs font-medium mt-0.5"
              style={{ color: "#6B7680" }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Features */}
      <section className="py-20 px-6" style={{ background: "#FDF8F4" }}>
        <div className="max-w-3xl mx-auto">
          <h2
            className="font-black text-3xl leading-tight mb-2"
            style={{ color: "#2E363B" }}
          >
            Built for every runner.
          </h2>
          <p className="text-[#6B7680] mb-12 text-base">
            Everything you need to train smarter, not just harder.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FeatureCard
              icon={<MapPin className="size-5" strokeWidth={1.5} />}
              title="GPS Tracking"
              description="Precise route tracking with live maps. Every step of your run plotted in real time."
            />
            <FeatureCard
              icon={<Mic className="size-5" strokeWidth={1.5} />}
              title="Voice Coaching"
              description="Real-time audio cues from your AI coach. Pace reminders and form tips exactly when you need them."
            />
            <FeatureCard
              icon={<BarChart3 className="size-5" strokeWidth={1.5} />}
              title="Analytics"
              description="Deep performance insights after every run. Track pace trends and personal records over time."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-20 px-6 text-center"
        style={{ background: "#FFFFFF", borderTop: "1px solid #F0EDEB" }}
      >
        <h2
          className="font-black text-2xl mb-3"
          style={{ color: "#2E363B" }}
        >
          Ready to train smarter?
        </h2>
        <p className="text-[#6B7680] mb-8 max-w-sm mx-auto text-sm leading-relaxed">
          Join runners already training with AI coaching.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center font-semibold text-white transition-colors"
          style={{
            background: "#C15F3C",
            height: "52px",
            borderRadius: "999px",
            paddingLeft: "36px",
            paddingRight: "36px",
            fontSize: "15px",
          }}
        >
          Start for Free
        </Link>
      </section>

      <footer
        className="py-5 px-6 text-center text-xs"
        style={{
          background: "#FDF8F4",
          borderTop: "1px solid #F0EDEB",
          color: "#6B7680",
        }}
      >
        © {new Date().getFullYear()} RunCoach. Built for runners, by runners.
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="p-6 flex flex-col gap-4 rounded-2xl"
      style={{
        background: "#FFFFFF",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        border: "1px solid #F0EDEB",
      }}
    >
      <div
        className="size-10 rounded-xl flex items-center justify-center"
        style={{ background: "#FCEEE8", color: "#C15F3C" }}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-sm mb-1" style={{ color: "#2E363B" }}>
          {title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "#6B7680" }}>
          {description}
        </p>
      </div>
    </div>
  );
}
