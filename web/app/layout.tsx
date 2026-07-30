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
  metadataBase: new URL("https://amulbot.vercel.app"),
  title: {
    default: "Amulbot — Catch Amul protein restocks",
    template: "%s | Amulbot",
  },
  description: "Know when Amul protein is available at your pincode. Get fast Telegram alerts, live stock history, and direct buy links.",
  applicationName: "Amulbot",
  keywords: ["Amul protein stock", "Amul whey restock", "Amul availability alert", "Amul Telegram alert"],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Amulbot",
    title: "Catch Amul protein restocks before they disappear.",
    description: "Pincode-level availability signals, live stock history, and fast Telegram alerts.",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Amulbot availability radar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Catch Amul protein restocks before they disappear.",
    description: "Pincode-level availability signals and fast Telegram alerts.",
    images: ["/opengraph-image.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
