import type React from "react";
import Link from "next/link";
import { MapPin, Mic, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Nav */}
      <header className="bg-black px-6 py-4 flex items-center justify-between">
        <span className="text-white font-black tracking-widest text-sm uppercase">
          RunCoach
        </span>
        <Link
          href="/login"
          className="text-white/70 hover:text-white text-sm font-medium tracking-wide transition-colors"
        >
          Sign In
        </Link>
      </header>

      {/* Hero — pure black */}
      <section className="bg-black flex-1 flex flex-col items-center justify-center px-6 py-28 text-center">
        <p className="text-[#CFFF04] text-xs font-bold tracking-[0.3em] uppercase mb-6">
          AI-Powered Coaching
        </p>

        <h1 className="text-white font-black uppercase leading-none tracking-tight mb-6"
            style={{ fontSize: "clamp(3.5rem, 10vw, 8rem)" }}>
          RUN<br />SMARTER.
        </h1>

        <p className="text-gray-400 text-lg max-w-md mx-auto mb-10 leading-relaxed">
          AI-powered coaching that adapts to every stride.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center h-12 px-10 bg-[#CFFF04] hover:bg-[#d9ff2e] text-black font-black text-sm tracking-widest uppercase transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-12 px-10 border border-white/30 hover:border-white text-white font-bold text-sm tracking-widest uppercase transition-colors"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      <div className="bg-[#CFFF04] px-6 py-5 flex flex-col sm:flex-row items-center justify-center gap-10">
        {[
          { value: "10K+", label: "Runs Logged" },
          { value: "4.9", label: "App Rating" },
          { value: "100%", label: "Adaptive" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-black font-black text-3xl tracking-tight font-mono">
              {stat.value}
            </div>
            <div className="text-black/60 text-xs font-bold tracking-widest uppercase mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Features — white section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <h2 className="text-black font-black uppercase text-4xl tracking-tight leading-tight mb-3">
              Built for<br />every runner.
            </h2>
            <div className="w-12 h-1 bg-black" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#e5e5e5]">
            <FeatureCard
              icon={<MapPin className="size-6" strokeWidth={1.5} />}
              title="GPS Tracking"
              description="Precise route tracking with live maps. Every step of your run plotted in real time."
            />
            <FeatureCard
              icon={<Mic className="size-6" strokeWidth={1.5} />}
              title="Voice Coaching"
              description="Real-time audio cues from your AI coach. Pace reminders and form tips exactly when you need them."
            />
            <FeatureCard
              icon={<BarChart3 className="size-6" strokeWidth={1.5} />}
              title="Analytics"
              description="Deep performance insights after every run. Track pace trends and personal records over time."
            />
          </div>
        </div>
      </section>

      {/* CTA Banner — black */}
      <section className="py-20 px-6 bg-black text-center">
        <h2 className="text-white font-black uppercase text-3xl tracking-tight mb-4">
          Ready to train smarter?
        </h2>
        <p className="text-gray-400 mb-10 max-w-sm mx-auto text-sm leading-relaxed">
          Join runners already training with AI coaching.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center h-12 px-10 bg-[#CFFF04] hover:bg-[#d9ff2e] text-black font-black text-sm tracking-widest uppercase transition-colors"
        >
          Start for Free
        </Link>
      </section>

      <footer className="py-6 px-6 bg-black border-t border-white/10 text-center text-gray-600 text-xs tracking-widest uppercase">
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
    <div className="bg-white p-8 flex flex-col gap-5">
      <div className="text-black">{icon}</div>
      <div>
        <h3 className="text-black font-black uppercase text-sm tracking-widest mb-2">
          {title}
        </h3>
        <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
