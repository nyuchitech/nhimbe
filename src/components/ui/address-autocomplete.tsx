"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

interface AddressComponents {
  venue: string;
  address: string;
  city: string;
  country: string;
  placeId: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (components: AddressComponents) => void;
  placeholder?: string;
  className?: string;
}

// Google Maps API key from environment variable
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

let googleMapsLoaded = false;
let googleMapsLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve) => {
    if (googleMapsLoaded) {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (googleMapsLoading) {
      return;
    }

    googleMapsLoading = true;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    window.initGoogleMaps = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };

    document.head.appendChild(script);
  });
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search for a venue or address...",
  className = "",
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  // Initialize state based on API key availability to avoid setState in effect
  const [isLoading, setIsLoading] = useState(!!GOOGLE_MAPS_API_KEY);
  const [isFocused, setIsFocused] = useState(false);
  const [apiKeyMissing] = useState(!GOOGLE_MAPS_API_KEY);

  const handlePlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();
    if (!place.address_components) return;

    let venue = place.name || "";
    let streetNumber = "";
    let route = "";
    let city = "";
    let country = "";

    for (const component of place.address_components) {
      const types = component.types;

      if (types.includes("street_number")) {
        streetNumber = component.long_name;
      }
      if (types.includes("route")) {
        route = component.long_name;
      }
      if (types.includes("locality") || types.includes("administrative_area_level_2")) {
        city = city || component.long_name;
      }
      if (types.includes("country")) {
        country = component.long_name;
      }
    }

    const address = [streetNumber, route].filter(Boolean).join(" ");

    // If the place name is the same as the address, clear venue
    if (venue === address || venue === place.formatted_address) {
      venue = "";
    }

    onPlaceSelect({
      venue: venue || route || "",
      address,
      city,
      country,
      placeId: place.place_id || "",
    });

    // Update input with formatted address
    onChange(place.formatted_address || value);
  }, [onPlaceSelect, onChange, value]);

  useEffect(() => {
    let mounted = true;

    // Skip if API key is not configured (already handled via initial state)
    if (!GOOGLE_MAPS_API_KEY) {
      return;
    }

    loadGoogleMapsScript().then(() => {
      if (!mounted || !inputRef.current) return;

      setIsLoading(false);

      // Initialize autocomplete
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ["establishment", "geocode"],
        fields: ["address_components", "formatted_address", "name", "place_id", "geometry"],
      });

      autocompleteRef.current.addListener("place_changed", handlePlaceChanged);
    }).catch(() => {
      if (mounted) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [handlePlaceChanged]);

  // If API key is missing, show a message to use manual entry
  if (apiKeyMissing) {
    return (
      <div className={`relative ${className}`}>
        <div className="p-4 bg-surface rounded-xl border border-elevated">
          <div className="flex items-center gap-3 text-text-secondary">
            <MapPin className="w-5 h-5 text-text-tertiary" />
            <div>
              <p className="text-sm font-medium">Google Places not configured</p>
              <p className="text-xs text-text-tertiary mt-0.5">
                Please enter the address manually below
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="w-full pl-12 pr-10 py-3 bg-surface rounded-xl border-none outline-none text-foreground placeholder:text-text-tertiary"
          disabled={isLoading}
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary animate-spin" />
        )}
      </div>
      {isFocused && !isLoading && (
        <p className="mt-2 text-xs text-text-tertiary">
          Start typing to search for venues and addresses
        </p>
      )}
    </div>
  );
}
