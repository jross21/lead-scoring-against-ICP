import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeadFit — ICP Lead Scoring Engine",
  description:
    "Score inbound leads against your Ideal Customer Profile in seconds. Upload a CRM export, get tiered fit scores, pipeline analytics, and upstream sourcing recommendations — powered by Claude.",
  keywords: [
    "RevOps",
    "GTM engineering",
    "lead scoring",
    "ICP",
    "sales operations",
    "pipeline",
  ],
  openGraph: {
    title: "LeadFit — ICP Lead Scoring Engine",
    description:
      "Tiered ICP fit scoring with pipeline analytics and sourcing recommendations.",
    type: "website",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
