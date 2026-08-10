import type { Metadata, Viewport } from "next";
import type React from "react";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PWARegister } from "@/components/PWARegister";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "KADENCE AI — Athletic Telemetry & Real-Time Voice Coach",
  description: "Precision running telemetry & AI-powered real-time voice coaching",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KADENCE",
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
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable} font-sans h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-sans">
        <ThemeProvider>
          <PWARegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
