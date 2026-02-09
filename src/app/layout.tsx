/**
 * Root Layout
 *
 * Global layout wrapper for the entire app.
 * Sets up fonts, metadata, and the minimalist theme.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Clean sans-serif for everything
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "First Mate",
  description:
    "Plan your entire work and personal life in minutes. AI-powered productivity.",
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
        className={`${inter.variable} font-sans antialiased bg-white text-gray-900`}
      >
        {children}
      </body>
    </html>
  );
}
