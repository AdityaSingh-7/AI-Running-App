import Link from "next/link";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function signInAction(formData: FormData) {
  "use server";
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return;

  const { signIn } = await import("@/lib/auth");
  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
}

async function signInWithGitHub() {
  "use server";
  const { signIn } = await import("@/lib/auth");
  await signIn("github", { redirectTo: "/dashboard" });
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0B0E14] text-[#F8FAFC]"
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 font-black text-2xl tracking-tight italic text-white">
            <span className="flex items-center justify-center size-9 rounded-xl bg-[#FF4500] text-white font-black not-italic text-base athletic-glow-coral">
              ⚡
            </span>
            <span>KADENCE<span className="text-[#FF4500]">.AI</span></span>
          </Link>
          <p className="text-xs font-extrabold uppercase tracking-widest text-[#94A3B8] mt-2">
            Welcome back, runner
          </p>
        </div>

        <div className="rounded-2xl glass-card p-8 border border-white/10 shadow-2xl">
          <div className="mb-6">
            <h1 className="font-black text-2xl uppercase tracking-tight text-white italic">
              SIGN IN
            </h1>
            <p className="text-xs font-semibold text-[#94A3B8] mt-1">
              Enter your runner credentials to continue
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* GitHub OAuth */}
            <form action={signInWithGitHub}>
              <button
                type="submit"
                className="w-full h-12 flex items-center justify-center gap-2.5 font-extrabold text-xs uppercase tracking-wider transition-all rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white"
              >
                <GitHubIcon />
                Sign in with GitHub
              </button>
            </form>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">
                OR
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Email / Password form */}
            <form action={signInAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-black uppercase tracking-wider text-[#94A3B8]"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="runner@example.com"
                  required
                  autoComplete="email"
                  className="h-12 rounded-xl text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#FF5252]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-xs font-black uppercase tracking-wider text-[#94A3B8]"
                  >
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-extrabold text-[#FF5252] hover:underline uppercase tracking-wider"
                  >
                    Forgot?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="h-12 rounded-xl text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#FF5252]"
                />
              </div>

              <button
                type="submit"
                className="w-full h-13 font-black text-xs uppercase tracking-wider text-white transition-all mt-2 rounded-xl bg-[#FF5252] hover:bg-[#E03E3E] athletic-glow-coral active:scale-95 shadow-xl"
              >
                SIGN IN
              </button>
            </form>
          </div>

          <div className="mt-6 text-center text-xs font-semibold text-[#94A3B8]">
            Don&apos;t have an account?&nbsp;
            <Link
              href="/register"
              className="font-extrabold text-[#FF5252] hover:underline uppercase tracking-wider"
            >
              Register Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.1.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.005 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
