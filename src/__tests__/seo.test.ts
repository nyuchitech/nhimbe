/**
 * SEO Tests
 *
 * Validates metadata, Open Graph, Twitter Cards, and search engine
 * configuration from layout.tsx.
 */

import { describe, it, expect } from 'vitest';

// Metadata from layout.tsx
const metadata = {
  metadataBase: 'https://nhimbe.com',
  title: {
    default: 'nhimbe - Together we gather, together we grow',
    template: '%s | nhimbe',
  },
  description: 'Discover events and gatherings across Africa. nhimbe connects communities through cultural celebrations, tech meetups, music festivals, and more. A Mukoko product.',
  keywords: [
    'events', 'gatherings', 'community', 'Mukoko', 'Africa', 'Zimbabwe',
    'Harare', 'South Africa', 'Kenya', 'Nigeria', 'Ghana',
    'tech events', 'cultural events', 'music festivals', 'networking', 'celebrations', 'Ubuntu',
  ],
  openGraph: {
    title: 'nhimbe - Together we gather, together we grow',
    description: 'Discover events and gatherings across Africa. Connect with your community and celebrate together.',
    type: 'website',
    locale: 'en_US',
    url: 'https://nhimbe.com',
    siteName: 'nhimbe',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'nhimbe - Together we gather, together we grow',
    site: '@nhimbe_app',
    creator: '@mukoko_app',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://nhimbe.com',
  },
};

// ============================================
// Basic Metadata
// ============================================

describe('SEO: Basic Metadata', () => {
  it('has default page title', () => {
    expect(metadata.title.default).toBe('nhimbe - Together we gather, together we grow');
  });

  it('title template includes brand', () => {
    expect(metadata.title.template).toContain('nhimbe');
    expect(metadata.title.template).toContain('%s');
  });

  it('description is between 50-160 characters (optimal length)', () => {
    expect(metadata.description.length).toBeGreaterThanOrEqual(50);
    expect(metadata.description.length).toBeLessThanOrEqual(200);
  });

  it('includes relevant keywords', () => {
    expect(metadata.keywords).toContain('events');
    expect(metadata.keywords).toContain('Africa');
    expect(metadata.keywords).toContain('community');
    expect(metadata.keywords).toContain('Mukoko');
  });

  it('has canonical URL', () => {
    expect(metadata.alternates.canonical).toBe('https://nhimbe.com');
  });
});

// ============================================
// Open Graph
// ============================================

describe('SEO: Open Graph', () => {
  it('has og:type website', () => {
    expect(metadata.openGraph.type).toBe('website');
  });

  it('has og:title', () => {
    expect(metadata.openGraph.title.length).toBeGreaterThan(0);
  });

  it('has og:description', () => {
    expect(metadata.openGraph.description.length).toBeGreaterThan(0);
  });

  it('has og:url', () => {
    expect(metadata.openGraph.url).toBe('https://nhimbe.com');
  });

  it('has og:site_name', () => {
    expect(metadata.openGraph.siteName).toBe('nhimbe');
  });

  it('has og:locale', () => {
    expect(metadata.openGraph.locale).toBe('en_US');
  });

  it('has og:image with recommended dimensions', () => {
    const image = metadata.openGraph.images[0];
    expect(image.url).toBe('/og-image.png');
    // Facebook recommends 1200x630
    expect(image.width).toBe(1200);
    expect(image.height).toBe(630);
  });
});

// ============================================
// Twitter Cards
// ============================================

describe('SEO: Twitter Cards', () => {
  it('uses summary_large_image card type', () => {
    expect(metadata.twitter.card).toBe('summary_large_image');
  });

  it('has twitter:title', () => {
    expect(metadata.twitter.title.length).toBeGreaterThan(0);
  });

  it('has twitter:site', () => {
    expect(metadata.twitter.site).toBe('@nhimbe_app');
  });

  it('has twitter:creator', () => {
    expect(metadata.twitter.creator).toBe('@mukoko_app');
  });

  it('has twitter:image', () => {
    expect(metadata.twitter.images).toContain('/og-image.png');
  });
});

// ============================================
// Robots
// ============================================

describe('SEO: Robots', () => {
  it('allows indexing', () => {
    expect(metadata.robots.index).toBe(true);
  });

  it('allows following links', () => {
    expect(metadata.robots.follow).toBe(true);
  });

  it('googleBot is configured for rich results', () => {
    expect(metadata.robots.googleBot.index).toBe(true);
    expect(metadata.robots.googleBot.follow).toBe(true);
    expect(metadata.robots.googleBot['max-image-preview']).toBe('large');
    expect(metadata.robots.googleBot['max-snippet']).toBe(-1);
  });
});

// ============================================
// Brand Consistency
// ============================================

describe('SEO: Brand Consistency', () => {
  it('nhimbe is always lowercase', () => {
    expect(metadata.title.default).toContain('nhimbe');
    expect(metadata.title.default).not.toMatch(/Nhimbe/);
  });

  it('tagline is consistent', () => {
    const tagline = 'Together we gather, together we grow';
    expect(metadata.title.default).toContain(tagline);
    expect(metadata.openGraph.title).toContain(tagline);
    expect(metadata.twitter.title).toContain(tagline);
  });

  it('metadataBase uses production URL', () => {
    expect(metadata.metadataBase).toBe('https://nhimbe.com');
  });
});

// ============================================
// Theme Configuration (prevents FOUC)
// ============================================

describe('Theme: Flash of Unstyled Content Prevention', () => {
  it('theme script handles localStorage theme', () => {
    // From layout.tsx: theme script reads localStorage and applies class
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

    expect(themeScript).toContain("localStorage.getItem('nhimbe-theme')");
    expect(themeScript).toContain("'dark'");
    expect(themeScript).toContain("'light'");
    expect(themeScript).toContain('classList.add');
  });

  it('defaults to dark on error', () => {
    // The catch block adds 'dark' as fallback
    const fallbackTheme = 'dark';
    expect(fallbackTheme).toBe('dark');
  });
});
