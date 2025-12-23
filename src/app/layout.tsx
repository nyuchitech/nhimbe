import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { ThemeProvider } from "@/components/theme-provider";

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

// Script to prevent flash of wrong theme - runs before React hydration
const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('nhimbe-theme');
      var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.classList.add(theme);
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <ThemeProvider defaultTheme="dark">
          <AnimatedBackground enableAnimation={true} intensity={0.2} speed={0.3} />
          <Header />
          <main className="flex-1 relative z-10">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
