/**
 * Schema.org JSON-LD helpers for nhimbe
 * Generates structured data for SEO and rich results.
 *
 * Since the Event type already uses schema.org vocabulary,
 * most fields map directly without transformation.
 */

import type { Event, EventReview, ReviewStats } from "./api";
import { isPlace, isOnlineEvent } from "./api";

const SITE_URL = "https://nhimbe.com";

// ============================================
// Event → schema.org/Event
// ============================================

export interface EventJsonLdOptions {
  reviewStats?: ReviewStats;
  reviews?: EventReview[];
}

export function eventToJsonLd(event: Event, options?: EventJsonLdOptions) {
  const eventUrl = `${SITE_URL}/events/${event.slug || event._id}`;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    ...(event.endDate && { endDate: event.endDate }),
    eventStatus: `https://schema.org/${event.eventStatus}`,
    eventAttendanceMode: `https://schema.org/${event.eventAttendanceMode}`,
    url: eventUrl,
    location: isPlace(event.location)
      ? {
          "@type": "Place",
          name: event.location.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: event.location.address.streetAddress,
            addressLocality: event.location.address.addressLocality,
            addressCountry: event.location.address.addressCountry,
          },
        }
      : {
          "@type": "VirtualLocation",
          url: event.location.url,
        },
    organizer: {
      "@type": "Person",
      name: event.organizer.name,
      ...(event.organizer.alternateName && {
        url: `${SITE_URL}/${event.organizer.alternateName.replace("@", "")}`,
      }),
    },
    offers: buildOffers(event, eventUrl),
  };

  if (event.image) {
    jsonLd.image = event.image;
  }

  if (event.maximumAttendeeCapacity) {
    jsonLd.maximumAttendeeCapacity = event.maximumAttendeeCapacity;
  }

  if (event.keywords && event.keywords.length > 0) {
    jsonLd.keywords = event.keywords.join(", ");
  }

  // Add aggregate rating if review stats provided
  if (options?.reviewStats && options.reviewStats.totalReviews > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: options.reviewStats.averageRating,
      reviewCount: options.reviewStats.totalReviews,
      bestRating: 5,
      worstRating: 1,
    };
  }

  // Add individual reviews if provided
  if (options?.reviews && options.reviews.length > 0) {
    jsonLd.review = options.reviews.slice(0, 5).map((review) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.authorName,
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.reviewRating.ratingValue,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: review.reviewBody || undefined,
      datePublished: review.datePublished,
    }));
  }

  return jsonLd;
}

function buildOffers(event: Event, eventUrl: string) {
  if (event.offers) {
    return {
      "@type": "Offer",
      price: event.offers.price,
      priceCurrency: event.offers.priceCurrency,
      availability: event.offers.availability,
      url: event.offers.url || eventUrl,
    };
  }

  // Default free offer when no offers specified
  return {
    "@type": "Offer",
    price: 0,
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: eventUrl,
  };
}

// ============================================
// Events list → schema.org/ItemList
// ============================================

export function eventsListToJsonLd(events: Event[], listName?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName || "Events on nhimbe",
    numberOfItems: events.length,
    itemListElement: events.map((event, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Event",
        name: event.name,
        startDate: event.startDate,
        url: `${SITE_URL}/events/${event.slug || event._id}`,
        location: isOnlineEvent(event)
          ? { "@type": "VirtualLocation", url: `${SITE_URL}/events/${event.slug || event._id}` }
          : isPlace(event.location)
            ? {
                "@type": "Place",
                name: event.location.name,
                address: {
                  "@type": "PostalAddress",
                  addressLocality: event.location.address.addressLocality,
                  addressCountry: event.location.address.addressCountry,
                },
              }
            : { "@type": "VirtualLocation", url: `${SITE_URL}/events/${event.slug || event._id}` },
      },
    })),
  };
}

// ============================================
// Website → schema.org/WebSite
// ============================================

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "nhimbe",
    url: SITE_URL,
    description:
      "Community events discovery platform. Together we gather, together we grow.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ============================================
// Organization → schema.org/Organization
// ============================================

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "nhimbe",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description:
      "Community events discovery and management platform built on the Ubuntu philosophy.",
    sameAs: [],
    parentOrganization: {
      "@type": "Organization",
      name: "Nyuchi Web Services",
    },
  };
}
