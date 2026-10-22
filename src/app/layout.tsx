import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import { ServiceWorker } from "@/components/ServiceWorker";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrappApp",
  description: "Ta trappa – registrer turen og se hvem som går mest.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "TrappApp",
    statusBarStyle: "default",
  },
};

/**
 * Uten denne står en forespørsel i kø mot en treg database til Vercels
 * maksgrense på 300 sekunder, og siden ser ut til å henge. Tjue sekunder er
 * rikelig – normale forespørsler bruker under to – og gjør at brukeren får
 * en feil å prøve på nytt fra i stedet for en fane som spinner.
 */
export const maxDuration = 20;

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nb">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
