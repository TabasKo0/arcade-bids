import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Header from "./components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARCADEBID // CockroachDB Distributed Auction Engine",
  description: "Synthwave Retro Arcade Auction Platform powered by CockroachDB with Vector AI search, Autonomous Trigger-Driven Proxy Bidding, and Point-Based Solvency.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="bg-arcade" aria-hidden="true" />
        <div className="stars" aria-hidden="true" />
        <div className="floor" aria-hidden="true" />
        <div className="crt" aria-hidden="true" />
        <Suspense fallback={<div className="h-16 bg-transparent" />}>
          <Header />
        </Suspense>
        <main className="flex-1 w-full max-w-[1240px] mx-auto px-5 sm:px-8 py-8 md:py-10 relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
