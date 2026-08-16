import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppProviders } from "@/app/providers";
import "./globals.css";

const geistSans = localFont({
  src: "../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: { default: "ProactiveMate", template: "%s · ProactiveMate" },
  description: "A calm AI planner for ranking tasks, protecting focus, and rescuing busy days.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
