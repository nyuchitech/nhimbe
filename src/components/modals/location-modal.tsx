"use client";

import { Globe } from "lucide-react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/ui/responsive-modal";

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
  selectedCity: { addressLocality: string; addressCountry: string } | null;
  setSelectedCity: (value: { addressLocality: string; addressCountry: string } | null) => void;
  cities: { addressLocality: string; addressCountry: string }[];
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
    <ResponsiveModal open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} title="Event Location">
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
              <Label className="block text-sm text-text-secondary mb-2">Meeting Platform</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "zoom", label: "Zoom" },
                  { value: "google_meet", label: "Google Meet" },
                  { value: "teams", label: "Microsoft Teams" },
                  { value: "other", label: "Other" },
                ].map((platform) => (
                  <Button
                    key={platform.value}
                    variant="ghost"
                    onClick={() => setMeetingPlatform(platform.value as typeof meetingPlatform)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      meetingPlatform === platform.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface text-foreground hover:bg-elevated"
                    }`}
                  >
                    {platform.label}
                  </Button>
                ))}
              </div>
            </div>
            {/* Meeting URL */}
            <div>
              <Label className="block text-sm text-text-secondary mb-2">Meeting URL</Label>
              <Input
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
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
                className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none text-base"
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
              <Label className="block text-sm text-text-secondary mb-2">Search Location</Label>
              <AddressAutocomplete
                value={addressSearch}
                onChange={setAddressSearch}
                onPlaceSelect={(components) => {
                  setVenue(components.venue);
                  setAddress(components.address);
                  if (components.city && components.country) {
                    setSelectedCity({ addressLocality: components.city, addressCountry: components.country });
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
              <Label className="block text-sm text-text-secondary mb-2">Venue Name</Label>
              <Input
                type="text"
                inputMode="text"
                autoComplete="organization"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g., Rainbow Towers Hotel"
                className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none text-base"
              />
            </div>
            <div>
              <Label className="block text-sm text-text-secondary mb-2">Address</Label>
              <Input
                type="text"
                inputMode="text"
                autoComplete="street-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
                className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none text-base"
              />
            </div>
            <div>
              <Label className="block text-sm text-text-secondary mb-2">City</Label>
              <div className="grid grid-cols-2 gap-2">
                {cities.map((c) => (
                  <Button
                    key={`${c.addressLocality}-${c.addressCountry}`}
                    variant="ghost"
                    onClick={() => setSelectedCity(c)}
                    className={`px-4 py-3 rounded-xl text-left justify-start h-auto ${
                      selectedCity?.addressLocality === c.addressLocality
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface hover:bg-elevated"
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <div className="font-medium">{c.addressLocality}</div>
                      <div className="text-sm opacity-70">{c.addressCountry}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="pt-2">
          <Button
            onClick={onClose}
            className="w-full py-3 h-12 bg-primary text-primary-foreground rounded-xl font-semibold"
          >
            Done
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
