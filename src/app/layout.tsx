import type { Metadata } from "next";
import { JetBrains_Mono, DM_Sans, Instrument_Serif } from "next/font/google";
import { PostHogProvider } from "@/components/PostHogProvider";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://validue.com"),
  title: "Validue — Pressure-test assumptions. Get a Decision Brief.",
  description:
    "Turn a raw startup idea into testable assumptions, collect behavioral evidence from matched respondents, and get a Decision Brief with verdicts, uncomfortable truths, and next steps.",
  openGraph: {
    title: "Validue — Pressure-test assumptions. Get a Decision Brief.",
    description:
      "Turn a raw startup idea into testable assumptions, collect behavioral evidence from matched respondents, and get a Decision Brief with verdicts, uncomfortable truths, and next steps.",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://validue.com",
    siteName: "Validue",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Validue" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Validue — Pressure-test assumptions. Get a Decision Brief.",
    description:
      "Turn a raw startup idea into testable assumptions, collect behavioral evidence from matched respondents, and get a Decision Brief with verdicts, uncomfortable truths, and next steps.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${jetbrainsMono.variable} ${dmSans.variable} ${instrumentSerif.variable} antialiased`}
    >
      <head />
      <body className={`${dmSans.className} font-sans`} suppressHydrationWarning>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
