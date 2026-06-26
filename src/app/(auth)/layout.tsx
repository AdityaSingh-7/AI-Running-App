import type React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] px-4 py-12">
      {children}
    </div>
  );
}
