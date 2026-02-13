import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth/auth-context";
import { StytchProvider } from "@/components/auth/stytch-provider";

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
      <body className="antialiased min-h-screen flex flex-col">
        <StytchProvider>
          <AuthProvider>
            <ThemeProvider defaultTheme="system">
              <AnimatedBackground enableAnimation={true} intensity={0.2} speed={0.3} />
              <Header />
              <main className="flex-1 relative z-10">{children}</main>
              <Footer />
            </ThemeProvider>
          </AuthProvider>
        </StytchProvider>
        <Analytics />
      </body>
    </html>
  );
}
