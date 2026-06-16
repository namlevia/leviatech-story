import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeviaTech Story - AI Novel Creator",
  description: "Create amazing stories with AI",
};

import { ToastProvider } from "@/components/ui/Toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      suppressHydrationWarning
    >
      <body 
        className="min-h-screen w-full flex flex-col text-foreground selection:bg-brand-primary/30"
        suppressHydrationWarning
      >
        <ToastProvider>
          <div className="flex flex-col flex-1 w-full min-h-screen">
            <Sidebar />
            <main className="flex-1 w-full min-w-0 flex flex-col relative overflow-y-auto overflow-x-hidden">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
