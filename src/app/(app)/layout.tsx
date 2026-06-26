"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, History, Settings, Play } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/run", label: "New Run", icon: Play },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm transition-colors",
        isActive
          ? "font-bold text-foreground underline underline-offset-4 decoration-2"
          : "font-medium text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function AppNavbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center shrink-0">
          <span className="font-black text-foreground text-lg tracking-tight uppercase">
            RUNCOACH
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* User avatar */}
          <Avatar>
            <AvatarFallback className="bg-black text-white text-xs font-semibold">
              U
            </AvatarFallback>
          </Avatar>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-muted transition-colors">
              <Menu className="size-5" />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 pt-10">
              <SheetHeader className="mb-4">
                <SheetTitle className="font-black text-foreground uppercase tracking-tight">
                  RUNCOACH
                </SheetTitle>
              </SheetHeader>
              <Separator className="mb-4" />
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <NavLink key={link.href} {...link} />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
