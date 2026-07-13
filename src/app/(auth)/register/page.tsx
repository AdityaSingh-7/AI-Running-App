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
  if (password !== confirmPassword) return;

  const hashedPassword = await bcrypt.hash(password, 12);

  const { prisma } = await import("@/lib/prisma");
  await prisma.user.create({
    data: { name, email, passwordHash: hashedPassword },
  });

  redirect("/login");
}

export default function RegisterPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "#FDF8F4" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="font-bold text-xl" style={{ color: "#2E363B" }}>
              RunCoach
            </span>
          </Link>
          <p className="text-sm mt-1" style={{ color: "#6B7680" }}>
            Your journey starts here
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
            border: "1px solid #F0EDEB",
          }}
        >
          <div className="mb-6">
            <h1 className="font-bold text-xl" style={{ color: "#2E363B" }}>
              Create account
            </h1>
            <p className="text-sm mt-1" style={{ color: "#6B7680" }}>
              Start your AI-powered training journey today
            </p>
          </div>

          <form action={registerAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="name"
                className="text-xs font-semibold"
                style={{ color: "#2E363B" }}
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
                className="h-11 rounded-xl text-sm"
                style={{
                  border: "1.5px solid #F0EDEB",
                  background: "#F5F2EF",
                  color: "#2E363B",
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold"
                style={{ color: "#2E363B" }}
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
                className="h-11 rounded-xl text-sm"
                style={{
                  border: "1.5px solid #F0EDEB",
                  background: "#F5F2EF",
                  color: "#2E363B",
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-semibold"
                style={{ color: "#2E363B" }}
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
                className="h-11 rounded-xl text-sm"
                style={{
                  border: "1.5px solid #F0EDEB",
                  background: "#F5F2EF",
                  color: "#2E363B",
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-xs font-semibold"
                style={{ color: "#2E363B" }}
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
                className="h-11 rounded-xl text-sm"
                style={{
                  border: "1.5px solid #F0EDEB",
                  background: "#F5F2EF",
                  color: "#2E363B",
                }}
              />
            </div>

            <button
              type="submit"
              className="w-full h-12 font-semibold text-white text-sm transition-colors mt-1 rounded-full"
              style={{ background: "#C15F3C" }}
            >
              Create Account
            </button>

            <p className="text-xs text-center" style={{ color: "#6B7680" }}>
              By creating an account you agree to our{" "}
              <Link
                href="/terms"
                className="font-medium hover:underline"
                style={{ color: "#C15F3C" }}
              >
                Terms of Service
              </Link>
              .
            </p>
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: "#6B7680" }}>
            Already have an account?&nbsp;
            <Link
              href="/login"
              className="font-semibold hover:underline"
              style={{ color: "#C15F3C" }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
