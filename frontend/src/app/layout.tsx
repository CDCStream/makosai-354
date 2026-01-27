import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Makos.ai - AI Worksheet Generator for Teachers",
  description: "Generate engaging and customized worksheets in seconds with Makos.ai, powered by AI. Save time and enhance student learning.",
  keywords: ["AI", "worksheet", "generator", "teachers", "education", "lesson plans", "quiz", "makos.ai"],
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
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <body
        className={`${dmSans.variable} ${fraunces.variable} antialiased bg-pattern`}
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        <AuthProvider>
        {children}
        </AuthProvider>
      </body>
    </html>
  );
}
