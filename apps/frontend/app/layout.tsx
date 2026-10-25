import type { Metadata, Viewport } from "next";
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
  title: {
    default: "Matiks — Live 1v1 mental math",
    template: "%s | Matiks",
  },
  description:
    "Race a real opponent through ten mental math questions. Same questions, live scoring, first to finish wins.",
  applicationName: "Matiks",
  keywords: ["mental math", "math game", "1v1", "live quiz", "multiplayer"],
  openGraph: {
    title: "Matiks — Live 1v1 mental math",
    description:
      "Queue up, get matched, and out-solve your opponent in a ten-question mental math sprint.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#06090f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
