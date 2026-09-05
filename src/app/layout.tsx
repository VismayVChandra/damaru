import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

// Self-hosted at build time via next/font, so page loads never make a
// runtime request to Google Fonts.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
});
const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jbmono",
});

export const metadata: Metadata = {
  title: "Damaru — problems worth building",
  description:
    "Tell it what you can do and what you care about. It hands you a problem statement nobody else has been given.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${jbMono.variable}`}>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
