import type React from "react";
import Link from "next/link";
import {
  MapPin,
  Mic,
  Activity,
  Flame,
  Zap,
  ArrowRight,
  ShieldCheck,
  Radio,
  Trophy,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#06080D] text-[#F8FAFC] overflow-x-hidden selection:bg-[#FF4500] selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#FF4500]/15 via-[#00F2FE]/5 to-transparent rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-[#FF4500]/10 rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-[#00F2FE]/10 rounded-full blur-[160px]" />
      </div>

      {/* Header Navigation */}
      <header className="relative z-20 px-6 py-5 border-b border-white/10 backdrop-blur-xl bg-[#06080D]/80 sticky top-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-black text-2xl tracking-tight italic text-white group"
          >
            <span className="flex items-center justify-center size-9 rounded-xl bg-[#FF4500] text-white font-black not-italic text-base athletic-glow-coral group-hover:scale-105 transition-transform">
              ⚡
            </span>
            <span>
              KADENCE<span className="text-[#FF4500]">.AI</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-extrabold uppercase tracking-widest text-[#94A3B8]">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#coaches" className="hover:text-white transition-colors">
              AI Coaches
            </a>
            <a href="#telemetry" className="hover:text-white transition-colors">
              Telemetry
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-[#FF4500] hover:bg-[#E03E3E] athletic-glow-coral transition-all active:scale-95 shadow-xl"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 px-6 max-w-7xl mx-auto w-full text-center lg:text-left grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Copy */}
        <div className="lg:col-span-7 space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/30 text-[#FF4500] text-xs font-extrabold uppercase tracking-widest">
            <span className="size-2 rounded-full bg-[#FF4500] animate-ping" />
            <span>Real-Time Voice AI & Precision Telemetry</span>
          </div>

          <h1 className="font-black text-5xl sm:text-6xl xl:text-7xl leading-[0.95] tracking-tight text-white uppercase italic">
            RUN FASTER. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4500] via-[#FF6B35] to-[#00F2FE]">
              COACH SMARTER.
            </span>
          </h1>

          <p className="text-[#94A3B8] text-lg sm:text-xl font-medium max-w-2xl leading-relaxed">
            Bi-directional voice AI coaching that analyzes stride cadence, heart rate, and GPS telemetry in real-time. Experience custom audio feedback exactly when your body needs it.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 h-14 rounded-2xl bg-[#FF4500] hover:bg-[#E03E3E] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 athletic-glow-coral transition-all active:scale-95 shadow-2xl"
            >
              Start Free Training <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              Explore Live Demo
            </Link>
          </div>

          {/* Social Proof Pills */}
          <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[#94A3B8] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#00F2FE]" />
              <span>100% Free Trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-[#FF4500]" />
              <span>Zero-Latency Audio</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-400" />
              <span>Personal Record AI</span>
            </div>
          </div>
        </div>

        {/* Right Preview Card Mockup */}
        <div className="lg:col-span-5 relative">
          <div className="glass-card rounded-3xl p-6 border border-white/15 shadow-2xl relative z-10 overflow-hidden">
            {/* Header Badge */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="size-3 rounded-full bg-[#00F2FE] animate-pulse" />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#00F2FE] telemetry-mono">
                    LIVE SESSION ACTIVE
                  </p>
                  <p className="text-xs font-bold text-white">5.2 KM Interval Pace</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-[#FF4500]/20 text-[#FF4500] px-2.5 py-1 rounded-lg border border-[#FF4500]/40">
                COACH MARCUS
              </span>
            </div>

            {/* Main Stats Display */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#94A3B8]">
                  Current Pace
                </p>
                <p className="text-3xl font-black text-[#FF4500] telemetry-mono mt-1">
                  4:18 <span className="text-xs text-[#94A3B8] font-sans">/KM</span>
                </p>
              </div>
              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#94A3B8]">
                  Cadence
                </p>
                <p className="text-3xl font-black text-[#00F2FE] telemetry-mono mt-1">
                  178 <span className="text-xs text-[#94A3B8] font-sans">SPM</span>
                </p>
              </div>
            </div>

            {/* Audio Waveform Animation Card */}
            <div className="glass-card rounded-2xl p-4 border border-[#FF4500]/30 bg-[#FF4500]/5 mb-4 flex items-center gap-4">
              <div className="size-11 rounded-xl bg-[#FF4500] flex items-center justify-center shrink-0 athletic-glow-coral">
                <Mic className="size-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#FF4500]">
                  AI Voice Feedback
                </p>
                <p className="text-xs text-white font-extrabold truncate mt-0.5">
                  &ldquo;Pace is perfect. Maintain this stride for 400m.&rdquo;
                </p>
                {/* Audio Wave Bars */}
                <div className="flex items-center gap-1 mt-2 h-4">
                  {[40, 80, 50, 100, 70, 90, 60, 100, 40, 75, 55, 95, 30].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#FF4500] rounded-full animate-pulse"
                      style={{ height: `${h}%`, animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Mini Telemetry Curve */}
            <div className="h-16 w-full relative pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 50">
                <path
                  d="M 0 40 Q 50 15, 100 30 T 200 10 T 300 25"
                  fill="none"
                  stroke="url(#heroGrad)"
                  strokeWidth="3"
                />
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FF4500" />
                    <stop offset="100%" stopColor="#00F2FE" />
                  </linearGradient>
                </defs>
                <circle cx="300" cy="25" r="4" fill="#00F2FE" className="animate-ping" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Telemetry Strip */}
      <section className="relative z-10 py-10 border-y border-white/10 bg-[#0E121B]/60">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="font-black text-3xl md:text-4xl text-[#FF4500] telemetry-mono">
              100K+
            </p>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#94A3B8] mt-1">
              Kilometers Logged
            </p>
          </div>
          <div>
            <p className="font-black text-3xl md:text-4xl text-[#00F2FE] telemetry-mono">
              &lt; 200ms
            </p>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#94A3B8] mt-1">
              Audio Response Time
            </p>
          </div>
          <div>
            <p className="font-black text-3xl md:text-4xl text-white telemetry-mono">
              4
            </p>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#94A3B8] mt-1">
              AI Voice Personalities
            </p>
          </div>
          <div>
            <p className="font-black text-3xl md:text-4xl text-emerald-400 telemetry-mono">
              99.8%
            </p>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#94A3B8] mt-1">
              GPS Precision
            </p>
          </div>
        </div>
      </section>

      {/* AI Coach Personalities Showcase */}
      <section id="coaches" className="relative z-10 py-24 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-black uppercase tracking-widest text-[#00F2FE] bg-[#00F2FE]/10 px-3.5 py-1.5 rounded-full border border-[#00F2FE]/30">
            ADAPTIVE INTELLIGENCE
          </span>
          <h2 className="font-black text-4xl md:text-5xl uppercase tracking-tight text-white italic">
            CHOOSE YOUR <span className="text-[#FF4500]">AI COACH</span>
          </h2>
          <p className="text-[#94A3B8] text-base leading-relaxed">
            Every runner responds to different motivation styles. Switch personalities anytime during training.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <CoachCard
            emoji="🔥"
            name="Coach Marcus"
            role="Motivational Beast"
            desc="Pushes you past pain thresholds with high-energy verbal encouragement and aggressive milestone pacing."
            tag="High Intensity"
            color="border-[#FF4500]/40"
          />
          <CoachCard
            emoji="⚡"
            name="Coach Elena"
            role="Tactical Strategist"
            desc="Analyzes split times, elevation profiles, and heart rate zones to structure flawless race strategies."
            tag="Precision"
            color="border-[#00F2FE]/40"
          />
          <CoachCard
            emoji="🧘"
            name="Coach Kai"
            role="Zen Pacer"
            desc="Focuses on rhythmic breathwork, cadence consistency, and low-stress endurance building."
            tag="Endurance"
            color="border-emerald-500/40"
          />
          <CoachCard
            emoji="🏆"
            name="Coach Sarah"
            role="Performance Specialist"
            desc="Data-driven elite coach dedicated to breaking personal records and optimizing race-day readiness."
            tag="Elite PR"
            color="border-amber-400/40"
          />
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="relative z-10 py-24 px-6 bg-[#090C14] border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-black uppercase tracking-widest text-[#FF4500] bg-[#FF4500]/10 px-3.5 py-1.5 rounded-full border border-[#FF4500]/30">
              NEXT-LEVEL FEATURES
            </span>
            <h2 className="font-black text-4xl md:text-5xl uppercase tracking-tight text-white italic">
              ENGINEERED FOR <span className="text-[#00F2FE]">PEAK PERFORMANCE</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureBox
              icon={<MapPin className="size-6 text-[#FF4500]" />}
              title="GPS & Elevation Telemetry"
              description="High-frequency location tracking with split-second pace calculations and real-time altitude gain monitoring."
            />
            <FeatureBox
              icon={<Mic className="size-6 text-[#00F2FE]" />}
              title="Bi-Directional Voice AI"
              description="Speak directly to your coach during runs to request pace adjustments, route directions, or form advice."
            />
            <FeatureBox
              icon={<Activity className="size-6 text-[#FF4500]" />}
              title="Race Predictor & Analytics"
              description="Machine learning algorithms that predict your 5K, 10K, and Marathon finishing times based on training history."
            />
            <FeatureBox
              icon={<Flame className="size-6 text-amber-400" />}
              title="Streak & Award Gamification"
              description="Earn trophies, unlock consistency badges, and maintain your streak to stay committed every week."
            />
            <FeatureBox
              icon={<Zap className="size-6 text-emerald-400" />}
              title="Post-Run AI Recovery"
              description="Instant audio analysis summarizing total effort, muscle load, and personalized rest recommendations."
            />
            <FeatureBox
              icon={<Radio className="size-6 text-[#00F2FE]" />}
              title="PWA Offline Capabilities"
              description="Installable progressive web application with continuous offline GPS recording and background synchronization."
            />
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="relative z-10 py-24 px-6 text-center max-w-5xl mx-auto w-full">
        <div className="glass-card rounded-3xl p-12 border border-[#FF4500]/40 relative overflow-hidden athletic-glow-coral">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF4500]/20 rounded-full blur-3xl pointer-events-none" />

          <h2 className="font-black text-4xl sm:text-5xl uppercase tracking-tight text-white italic mb-4">
            READY TO UNLOCK YOUR <span className="text-[#FF4500]">FULL POTENTIAL?</span>
          </h2>
          <p className="text-[#94A3B8] text-base max-w-xl mx-auto mb-8 font-medium">
            Join thousands of runners training with real-time AI voice coaching. Setup takes less than 60 seconds.
          </p>

          <Link
            href="/register"
            className="inline-flex items-center justify-center px-10 h-15 rounded-2xl bg-[#FF4500] hover:bg-[#E03E3E] text-white font-black text-base uppercase tracking-wider athletic-glow-coral transition-all active:scale-95 shadow-2xl"
          >
            Create Your Account Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-white/10 text-center text-xs font-semibold text-[#94A3B8] bg-[#06080D]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#FF4500]" />
            <span className="font-black text-white italic">KADENCE.AI</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-white transition-colors">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CoachCard({
  emoji,
  name,
  role,
  desc,
  tag,
  color,
}: {
  emoji: string;
  name: string;
  role: string;
  desc: string;
  tag: string;
  color: string;
}) {
  return (
    <div className={`glass-card glass-card-hover rounded-2xl p-6 border ${color} flex flex-col justify-between`}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl">{emoji}</span>
          <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 text-white px-2.5 py-0.5 rounded-full">
            {tag}
          </span>
        </div>
        <h3 className="font-black text-lg text-white uppercase italic">{name}</h3>
        <p className="text-xs font-bold text-[#FF4500] mt-0.5 uppercase tracking-wider">
          {role}
        </p>
        <p className="text-xs text-[#94A3B8] font-medium leading-relaxed mt-3">
          {desc}
        </p>
      </div>
    </div>
  );
}

function FeatureBox({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3 hover:border-white/20 transition-all">
      <div className="size-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
        {icon}
      </div>
      <h3 className="font-black text-base text-white uppercase italic">{title}</h3>
      <p className="text-xs text-[#94A3B8] font-medium leading-relaxed">
        {description}
      </p>
    </div>
  );
}

