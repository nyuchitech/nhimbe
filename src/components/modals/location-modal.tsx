"use client";

import { Globe } from "lucide-react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Switch } from "@/components/ui/switch";
import { BottomSheetModal } from "./bottom-sheet-modal";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  setIsOnline: (value: boolean) => void;
  meetingPlatform: "zoom" | "google_meet" | "teams" | "other";
  setMeetingPlatform: (value: "zoom" | "google_meet" | "teams" | "other") => void;
  meetingUrl: string;
  setMeetingUrl: (value: string) => void;
  addressSearch: string;
  setAddressSearch: (value: string) => void;
  venue: string;
  setVenue: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  selectedCity: { city: string; country: string } | null;
  setSelectedCity: (value: { city: string; country: string } | null) => void;
  cities: { city: string; country: string }[];
}

export function LocationModal({
  isOpen,
  onClose,
  isOnline,
  setIsOnline,
  meetingPlatform,
  setMeetingPlatform,
  meetingUrl,
  setMeetingUrl,
  addressSearch,
  setAddressSearch,
  venue,
  setVenue,
  address,
  setAddress,
  selectedCity,
  setSelectedCity,
  cities,
}: LocationModalProps) {
  return (
    <BottomSheetModal isOpen={isOpen} onClose={onClose} title="Event Location">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
          <Globe className="w-5 h-5 text-text-secondary" />
          <span className="flex-1">Online Event</span>
          <Switch
            checked={isOnline}
            onCheckedChange={setIsOnline}
          />
        </div>
        {isOnline && (
          <>
            {/* Meeting Platform */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">Meeting Platform</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "zoom", label: "Zoom" },
                  { value: "google_meet", label: "Google Meet" },
                  { value: "teams", label: "Microsoft Teams" },
                  { value: "other", label: "Other" },
                ].map((platform) => (
                  <button
                    key={platform.value}
                    onClick={() => setMeetingPlatform(platform.value as typeof meetingPlatform)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      meetingPlatform === platform.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface text-foreground hover:bg-elevated"
                    }`}
                  >
                    {platform.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Meeting URL */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">Meeting URL</label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder={
                  meetingPlatform === "zoom"
                    ? "https://zoom.us/j/..."
                    : meetingPlatform === "google_meet"
                    ? "https://meet.google.com/..."
                    : meetingPlatform === "teams"
                    ? "https://teams.microsoft.com/..."
                    : "https://..."
                }
                className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none"
              />
              <p className="text-xs text-text-tertiary mt-2">
                Attendees will see this link after registering
              </p>
            </div>
          </>
        )}
        {!isOnline && (
          <>
            {/* Google Places Autocomplete */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">Search Location</label>
              <AddressAutocomplete
                value={addressSearch}
                onChange={setAddressSearch}
                onPlaceSelect={(components) => {
                  setVenue(components.venue);
                  setAddress(components.address);
                  if (components.city && components.country) {
                    setSelectedCity({ city: components.city, country: components.country });
                  }
                }}
                placeholder="Search for a venue or address..."
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-elevated" />
              <span className="text-xs text-text-tertiary">or enter manually</span>
              <div className="flex-1 h-px bg-elevated" />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">Venue Name</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g., Rainbow Towers Hotel"
                className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
                className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">City</label>
              <div className="grid grid-cols-2 gap-2">
                {cities.map((c) => (
                  <button
                    key={`${c.city}-${c.country}`}
                    onClick={() => setSelectedCity(c)}
                    className={`px-4 py-3 rounded-xl text-left ${
                      selectedCity?.city === c.city
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface hover:bg-elevated"
                    }`}
                  >
                    <div className="font-medium">{c.city}</div>
                    <div className="text-sm opacity-70">{c.country}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <button
          onClick={onClose}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold"
        >
          Done
        </button>
      </div>
    </BottomSheetModal>
  );
}
