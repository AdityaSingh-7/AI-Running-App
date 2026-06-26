import type { Metadata, Viewport } from "next";
import type React from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PWARegister } from "@/components/PWARegister";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "RunCoach AI",
  description: "AI-powered running coach with real-time voice feedback",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RunCoach",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <PWARegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
