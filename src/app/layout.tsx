/**
 * Root Layout
 *
 * Global layout wrapper for the entire app.
 * Sets up fonts, metadata, and the nautical color scheme.
 */

import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

// Serif font for headings — captain's log feel
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

// Clean sans-serif for body text
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "First Mate — AI Productivity Captain",
  description:
    "Plan your entire work and personal life in minutes. Your AI-powered first mate helps you schedule, track, and conquer your goals.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${inter.variable} font-sans antialiased bg-[#0a1628] text-[#d4c5a0]`}
      >
        {children}
      </body>
    </html>
  );
}
