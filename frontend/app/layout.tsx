import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppProviders } from "@/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ProactiveMate", template: "%s · ProactiveMate" },
  description: "A calm AI planner for ranking tasks, protecting focus, and rescuing busy days.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
