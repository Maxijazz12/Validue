import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, Instrument_Serif, Playfair_Display, Inter } from "next/font/google";
import Script from "next/script";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
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

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Validue — Targeted Idea Validation Marketplace",
  description:
    "Post startup ideas, get matched with your exact target audience, and receive quality-scored feedback. Real people. Real signal. Real validation.",
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
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${instrumentSerif.variable} ${playfairDisplay.variable} ${inter.variable} antialiased`}
    >
      <head />
      <body className={`${dmSans.className} font-sans`} suppressHydrationWarning>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
