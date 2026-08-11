import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import { DeviceMirror } from "@/components/DeviceMirror";
import { ServiceWorker } from "@/components/ServiceWorker";
import { getDeviceToken } from "@/lib/identity";

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

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const deviceToken = await getDeviceToken();

  return (
    <html lang="nb">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
        <DeviceMirror deviceToken={deviceToken} />
        <ServiceWorker />
      </body>
    </html>
  );
}
