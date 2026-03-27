import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const notoSerif = Noto_Serif({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth/auth-context";
import { StytchProvider } from "@/components/auth/stytch-provider";
import { ErrorBoundary } from "@/components/error/error-boundary";
import { WidgetErrorBoundary } from "@/components/error/widget-error-boundary";
import { LiveRegionProvider } from "@/components/ui/live-region";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";

export const metadata: Metadata = {
  metadataBase: new URL("https://nhimbe.com"),
  title: {
    default: "nhimbe - Together we gather, together we grow",
    template: "%s | nhimbe",
  },
  description:
    "Discover events and gatherings across Africa. nhimbe connects communities through cultural celebrations, tech meetups, music festivals, and more. A Mukoko product.",
  keywords: [
    "events",
    "gatherings",
    "community",
    "Mukoko",
    "Africa",
    "Zimbabwe",
    "Harare",
    "South Africa",
    "Kenya",
    "Nigeria",
    "Ghana",
    "tech events",
    "cultural events",
    "music festivals",
    "networking",
    "celebrations",
    "Ubuntu",
  ],
  authors: [{ name: "Mukoko", url: "https://mukoko.com" }],
  creator: "Mukoko (Nyuchi Web Services)",
  publisher: "nhimbe",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/nhimbe-icon-light.png",
    apple: "/nhimbe-icon-light.png",
    shortcut: "/nhimbe-icon-light.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "nhimbe - Together we gather, together we grow",
    description:
      "Discover events and gatherings across Africa. Connect with your community and celebrate together.",
    type: "website",
    locale: "en_US",
    url: "https://nhimbe.com",
    siteName: "nhimbe",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "nhimbe - African Events Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "nhimbe - Together we gather, together we grow",
    description:
      "Discover events and gatherings across Africa. A Mukoko product.",
    site: "@nhimbe_app",
    creator: "@mukoko_app",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://nhimbe.com",
  },
  category: "events",
};

// Script to prevent flash of wrong theme - runs before React hydration
const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('nhimbe-theme');
      var theme;
      if (stored === 'light' || stored === 'dark') {
        theme = stored;
      } else {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.classList.add(theme);
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

// Error boundary fallbacks intentionally use plain <a> tags instead of <Link>
// because Next.js router may have crashed — these must work without React Router.
/* eslint-disable @next/next/no-html-link-for-pages */
function DegradedShell() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">nhimbe</h1>
      <p className="text-text-secondary mb-6">Something went wrong loading the app. Please refresh the page.</p>
      <a href="/" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold">
        Refresh
      </a>
    </div>
  );
}

function MinimalNav() {
  return (
    <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-elevated/50">
      <div className="max-w-300 mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-xl font-bold text-primary">nhimbe</a>
        <nav className="flex items-center gap-4 text-sm text-text-secondary">
          <a href="/events">Events</a>
          <a href="/search">Search</a>
        </nav>
      </div>
    </header>
  );
}
/* eslint-enable @next/next/no-html-link-for-pages */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <script
          id="nhimbe-theme-script"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className={`${plusJakarta.variable} ${notoSerif.variable} antialiased min-h-screen flex flex-col`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-semibold"
        >
          Skip to main content
        </a>
        <ErrorBoundary fallback={<DegradedShell />}>
          <StytchProvider>
            <AuthProvider>
              <ThemeProvider defaultTheme="system">
                <LiveRegionProvider>
                  <AnimatedBackground enableAnimation={true} intensity={0.2} speed={0.3} />
                  <WidgetErrorBoundary fallback={<MinimalNav />} name="Header">
                    <Header />
                  </WidgetErrorBoundary>
                  <main id="main-content" className="flex-1 relative z-10">{children}</main>
                  <WidgetErrorBoundary fallback={null} name="Footer">
                    <Footer />
                  </WidgetErrorBoundary>
                </LiveRegionProvider>
              </ThemeProvider>
            </AuthProvider>
          </StytchProvider>
        </ErrorBoundary>
        <Analytics />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
