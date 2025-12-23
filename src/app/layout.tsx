import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "nhimbe - Together we gather, together we grow",
  description:
    "nhimbe is the gatherings and events platform within the Mukoko ecosystem. Discover events, connect with your community, and celebrate together.",
  keywords: [
    "events",
    "gatherings",
    "community",
    "Mukoko",
    "Africa",
    "celebrations",
  ],
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
  openGraph: {
    title: "nhimbe - Together we gather, together we grow",
    description:
      "The gatherings and events platform within the Mukoko ecosystem.",
    type: "website",
    locale: "en_US",
    siteName: "nhimbe",
  },
  twitter: {
    card: "summary_large_image",
    title: "nhimbe - Together we gather, together we grow",
    description:
      "The gatherings and events platform within the Mukoko ecosystem.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
