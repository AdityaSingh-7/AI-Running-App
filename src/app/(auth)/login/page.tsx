import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="text-black font-black tracking-widest text-lg uppercase">
            RunCoach
          </span>
        </Link>
      </div>

      <div className="bg-white border border-[#e5e5e5] p-8">
        <div className="mb-6">
          <h1 className="text-black font-black uppercase text-xl tracking-tight">
            Welcome back
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Sign in to your account to continue
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* GitHub OAuth */}
          <form action={signInWithGitHub}>
            <button
              type="submit"
              className="w-full h-10 flex items-center justify-center gap-2 border border-[#e5e5e5] hover:border-black text-black font-bold text-sm tracking-wide transition-colors bg-white"
            >
              <GitHubIcon />
              Sign in with GitHub
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e5e5e5]" />
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-[#e5e5e5]" />
          </div>

          {/* Email / Password form */}
          <form action={signInAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-widest text-black"
              >
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="h-10 border-[#e5e5e5] focus:border-black focus:ring-0 rounded-none text-black placeholder:text-gray-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-widest text-black"
                >
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-black underline hover:no-underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="h-10 border-[#e5e5e5] focus:border-black focus:ring-0 rounded-none text-black placeholder:text-gray-400"
              />
            </div>

            <button
              type="submit"
              className="w-full h-10 bg-black hover:bg-[#1a1a1a] text-white font-black text-sm tracking-widest uppercase transition-colors mt-1"
            >
              Sign In
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?&nbsp;
          <Link
            href="/register"
            className="text-black font-bold underline hover:no-underline"
          >
            Create one
          </Link>
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
