import Link from "next/link";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function registerAction(formData: FormData) {
  "use server";

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!name || !email || !password || !confirmPassword) return;
  if (password !== confirmPassword) {
    redirect("/register?error=PasswordMismatch");
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      redirect("/register?error=UserExists");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { name, email, passwordHash: hashedPassword },
    });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("NEXT_REDIRECT") || error.message.includes("redirect"))) {
      throw error;
    }
    redirect("/register?error=ServerError");
  }

  redirect("/login?registered=true");
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = params?.error;

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
            Your athletic journey starts here
          </p>
        </div>

        <div className="rounded-2xl glass-card p-8 border border-white/10 shadow-2xl">
          <div className="mb-6">
            <h1 className="font-black text-2xl uppercase tracking-tight text-white italic">
              CREATE ACCOUNT
            </h1>
            <p className="text-xs font-semibold text-[#94A3B8] mt-1">
              Start your AI voice-coached training journey today
            </p>
          </div>

          {hasError && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
              {hasError === "PasswordMismatch"
                ? "Passwords do not match. Please try again."
                : hasError === "UserExists"
                ? "An account with this email already exists. Please Sign In."
                : "Unable to create account. Please check your database connection or try again."}
            </div>
          )}

          <form action={registerAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="name"
                className="text-xs font-black uppercase tracking-wider text-[#94A3B8]"
              >
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Alex Johnson"
                required
                autoComplete="name"
                className="h-12 rounded-xl text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#FF5252]"
              />
            </div>

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
              <Label
                htmlFor="password"
                className="text-xs font-black uppercase tracking-wider text-[#94A3B8]"
              >
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
                minLength={8}
                className="h-12 rounded-xl text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#FF5252]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-xs font-black uppercase tracking-wider text-[#94A3B8]"
              >
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="h-12 rounded-xl text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#FF5252]"
              />
            </div>

            <button
              type="submit"
              className="w-full h-13 font-black text-xs uppercase tracking-wider text-white transition-all mt-2 rounded-xl bg-[#FF5252] hover:bg-[#E03E3E] athletic-glow-coral active:scale-95 shadow-xl"
            >
              CREATE ACCOUNT
            </button>

            <p className="text-[11px] text-center text-[#94A3B8]">
              By registering, you agree to our{" "}
              <Link
                href="/terms"
                className="font-extrabold text-[#FF5252] hover:underline uppercase"
              >
                Terms
              </Link>
              .
            </p>
          </form>

          <div className="mt-6 text-center text-xs font-semibold text-[#94A3B8]">
            Already have an account?&nbsp;
            <Link
              href="/login"
              className="font-extrabold text-[#FF5252] hover:underline uppercase tracking-wider"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
