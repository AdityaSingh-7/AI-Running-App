import Link from "next/link";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
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
            Create account
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Start your AI-powered training journey today
          </p>
        </div>

        <form action={registerAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="name"
              className="text-xs font-bold uppercase tracking-widest text-black"
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
              className="h-10 border-[#e5e5e5] focus:border-black focus:ring-0 rounded-none text-black placeholder:text-gray-400"
            />
          </div>

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
            <Label
              htmlFor="password"
              className="text-xs font-bold uppercase tracking-widest text-black"
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
              className="h-10 border-[#e5e5e5] focus:border-black focus:ring-0 rounded-none text-black placeholder:text-gray-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="confirmPassword"
              className="text-xs font-bold uppercase tracking-widest text-black"
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
              className="h-10 border-[#e5e5e5] focus:border-black focus:ring-0 rounded-none text-black placeholder:text-gray-400"
            />
          </div>

          <button
            type="submit"
            className="w-full h-10 mt-1 bg-[#CFFF04] hover:bg-[#d9ff2e] text-black font-black text-sm tracking-widest uppercase transition-colors"
          >
            Create Account
          </button>

          <p className="text-xs text-center text-gray-400">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="text-black underline hover:no-underline">
              Terms of Service
            </Link>
            .
          </p>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?&nbsp;
          <Link
            href="/login"
            className="text-black font-bold underline hover:no-underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
