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

/**
 * Applies the remembered theme before the first paint.
 *
 * This has to be a blocking inline script, not an effect: React runs after
 * the browser has already painted, so doing it there shows everyone who
 * chose dark a white page first and then flips it - the exact flash that
 * makes theme toggles feel broken.
 *
 * Light is the default when nothing is stored, including when the operating
 * system prefers dark. That is a deliberate choice rather than an oversight:
 * the dark palette was the only one for a while and read as intimidating, so
 * someone's first visit should not start there. `prefers-color-scheme` gets
 * respected the moment they press the switch once.
 */
const THEME_SCRIPT = `try{if(localStorage.getItem('damaru-theme')==='dark'){document.documentElement.dataset.theme='dark'}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The script above sets data-theme on this element before React hydrates,
    // so the server HTML and the client disagree by design.
    <html lang="en" className={`${archivo.variable} ${jbMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
