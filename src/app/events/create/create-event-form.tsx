"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  MapPin,
  Globe,
  Lock,
  ChevronDown,
  AlignLeft,
  Loader2,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import { createEvent, getCategories, getCities, uploadMedia, getMediaUrl, type CreateEventInput, type Category } from "@/lib/api";
import { getInterestCategories } from "@/lib/supabase/api";
import { mineralThemes, mineralThemeIds, getThemeColors } from "@/lib/themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/auth-context";
import { DateTimeModal } from "@/components/modals/date-time-modal";
import { LocationModal } from "@/components/modals/location-modal";
import { CategoryModal } from "@/components/modals/category-modal";
import { DescriptionModal } from "@/components/modals/description-modal";
import { TicketingModal } from "@/components/modals/ticketing-modal";
import { CapacityModal } from "@/components/modals/capacity-modal";
import { CoverImageUpload } from "./cover-image-upload";
import { ThemeSelector } from "./theme-selector";
import { EventOptionsCard } from "./event-options-card";
import { FormFieldRow } from "./form-field-row";
import { WizardStepIndicator } from "./wizard-step-indicator";
import { HostModePicker } from "./host-mode-picker";

type WizardStep = 1 | 2 | 3;
const STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: "About" },
  { id: 2, label: "When & where" },
  { id: 3, label: "Hosting" },
];

// Broad pan-African event categories. The live data source is
// `engagement.interest_category` in the platform DB (40 canonical rows
// seeded). This list is the offline fallback if Supabase is unreachable.
const DEFAULT_CATEGORIES: Category[] = [
  // Technology & Innovation
  { id: "technology", name: "Technology", group: "Technology & Innovation" },
  { id: "ai-ml", name: "AI & Machine Learning", group: "Technology & Innovation" },
  { id: "startups", name: "Startups & Founders", group: "Technology & Innovation" },
  // Business & Economy
  { id: "business", name: "Business", group: "Business & Economy" },
  { id: "finance", name: "Finance & Investment", group: "Business & Economy" },
  { id: "trade", name: "Trade & Commerce", group: "Business & Economy" },
  { id: "agriculture", name: "Agriculture", group: "Business & Economy" },
  // Culture & Society
  { id: "culture", name: "Culture & Heritage", group: "Culture & Society" },
  { id: "food", name: "Food & Drink", group: "Culture & Society" },
  { id: "fashion", name: "Fashion & Style", group: "Culture & Society" },
  { id: "language", name: "Language", group: "Culture & Society" },
  // Faith & Community
  { id: "faith", name: "Faith & Spirituality", group: "Faith & Community" },
  { id: "community", name: "Community Service", group: "Faith & Community" },
  { id: "family", name: "Family & Parenting", group: "Faith & Community" },
  { id: "ubuntu", name: "Ubuntu Gatherings", group: "Faith & Community" },
  // Education & Knowledge
  { id: "education", name: "Education", group: "Education & Knowledge" },
  { id: "research", name: "Research & Academia", group: "Education & Knowledge" },
  { id: "language-learning", name: "Language Learning", group: "Education & Knowledge" },
  // Entertainment & Media
  { id: "music", name: "Music", group: "Entertainment & Media" },
  { id: "film-tv", name: "Film & TV", group: "Entertainment & Media" },
  { id: "comedy", name: "Comedy", group: "Entertainment & Media" },
  { id: "theatre", name: "Theatre & Performance", group: "Entertainment & Media" },
  { id: "gaming", name: "Gaming & Esports", group: "Entertainment & Media" },
  // Creative Arts
  { id: "art", name: "Art & Design", group: "Creative Arts" },
  { id: "photography", name: "Photography", group: "Creative Arts" },
  { id: "writing", name: "Writing & Books", group: "Creative Arts" },
  { id: "dance", name: "Dance", group: "Creative Arts" },
  // Sports & Wellness
  { id: "football", name: "Football", group: "Sports & Wellness" },
  { id: "fitness", name: "Fitness", group: "Sports & Wellness" },
  { id: "outdoors", name: "Outdoors & Hiking", group: "Sports & Wellness" },
  { id: "wellness", name: "Wellness & Mindfulness", group: "Sports & Wellness" },
  // Governance & Civic
  { id: "governance", name: "Governance & Civic", group: "Governance & Civic" },
  { id: "policy", name: "Policy & Advocacy", group: "Governance & Civic" },
  { id: "human-rights", name: "Human Rights", group: "Governance & Civic" },
  // Environment & Sustainability
  { id: "environment", name: "Environment & Climate", group: "Environment & Sustainability" },
  { id: "wildlife", name: "Wildlife & Conservation", group: "Environment & Sustainability" },
  // Health
  { id: "health", name: "Health & Medicine", group: "Health" },
  { id: "mental-health", name: "Mental Health", group: "Health" },
  // Networking
  { id: "networking", name: "Networking & Mixers", group: "Networking" },
  { id: "diaspora", name: "Diaspora Meetups", group: "Networking" },
];

const DEFAULT_CITIES = [
  { addressLocality: "Harare", addressCountry: "Zimbabwe" },
  { addressLocality: "Bulawayo", addressCountry: "Zimbabwe" },
  { addressLocality: "Cape Town", addressCountry: "South Africa" },
  { addressLocality: "Johannesburg", addressCountry: "South Africa" },
  { addressLocality: "Nairobi", addressCountry: "Kenya" },
  { addressLocality: "Lagos", addressCountry: "Nigeria" },
];

const mineralThemeList = mineralThemeIds.map((id) => {
  const theme = mineralThemes[id];
  return { id, name: theme.name, gradient: theme.gradient, colors: getThemeColors(id) };
});

// Get the browser's timezone offset as ±HH:MM
function getBrowserTimezoneOffset(): string {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

function getBrowserTimezoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

// Basic URL validation
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export default function CreateEventForm() {
  const router = useRouter();
  const { user } = useAuth();
  const errorRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [eventName, setEventName] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hosting (step 3)
  const [hostMode, setHostMode] = useState<"person" | "organization">("person");
  const [hostOrganizationId, setHostOrganizationId] = useState<string | null>(null);

  // Cover image
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

  // Form state
  const [description, setDescription] = useState("");
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);

  // Location
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<{ addressLocality: string; addressCountry: string } | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingPlatform, setMeetingPlatform] = useState<"zoom" | "google_meet" | "teams" | "other">("zoom");

  // Date/Time
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("18:00");

  // Category & Tags
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Capacity & Ticketing
  const [capacity, setCapacity] = useState<number | null>(null);
  const [isFree, setIsFree] = useState(true);
  const [ticketUrl, setTicketUrl] = useState("");

  // Data from API
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<{ addressLocality: string; addressCountry: string }[]>([]);

  // Track if form has been touched for unsaved changes warning
  const [formTouched, setFormTouched] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // Prefer the platform DB's broad 40-category catalog (engagement.interest_category).
        // Fall back to the worker `getCategories()` and finally the static list.
        const [supabaseCats, workerCats, citiesData] = await Promise.all([
          getInterestCategories(),
          getCategories(),
          getCities(),
        ]);
        if (supabaseCats.length > 0) {
          setCategories(
            supabaseCats.map((c) => ({
              id: c.slug || c.id,
              name: c.name,
              group: c.group_name || "Categories",
            })),
          );
        } else if (workerCats.length > 0 && typeof workerCats[0] !== "string") {
          setCategories(workerCats);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }
        setCities(citiesData.length > 0 ? citiesData : DEFAULT_CITIES);
      } catch {
        setCategories(DEFAULT_CATEGORIES);
        setCities(DEFAULT_CITIES);
      }
    }
    loadData();
  }, []);

  // Unsaved changes warning
  useEffect(() => {
    if (!formTouched) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formTouched]);

  // Mark form as touched when any field changes
  const touchForm = useCallback(() => {
    if (!formTouched) setFormTouched(true);
  }, [formTouched]);

  // Scroll to error when it changes
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput("");
      touchForm();
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    touchForm();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setCoverImage(e.target?.result as string);
      reader.readAsDataURL(file);
      touchForm();
    }
  };

  const removeCoverImage = () => {
    setCoverImage(null);
    setCoverImageFile(null);
  };

  const tzOffset = getBrowserTimezoneOffset();
  const tzName = getBrowserTimezoneName();
  const tzLabel = tzName.replace(/_/g, " ").split("/").pop() || `GMT${tzOffset}`;

  const formatDateForDisplay = () => {
    if (!eventDate) return "Select Date & Time";
    const date = new Date(eventDate);
    return date.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
  };

  const validateStep = useCallback(
    (target: WizardStep): string | null => {
      if (target >= 1) {
        if (!eventName.trim()) return "Event name is required";
        if (!category) return "Please select a category for your event";
      }
      if (target >= 2) {
        if (!eventDate) return "Please select a date and time for your event";
        if (endTime <= startTime) return "End time must be after start time";
        if (!isOnline && (!venue || !selectedCity)) return "Please add a location or mark as online event";
        if (isOnline && !meetingUrl.trim()) return "Please add a meeting URL for your online event";
        if (isOnline && meetingUrl.trim() && !isValidUrl(meetingUrl.trim())) return "Please enter a valid meeting URL (e.g., https://zoom.us/j/...)";
      }
      if (target >= 3) {
        if (capacity !== null && capacity < 1) return "Capacity must be at least 1 attendee";
        if (!isFree && ticketUrl.trim() && !isValidUrl(ticketUrl.trim())) return "Please enter a valid ticket URL";
        if (hostMode === "organization" && !hostOrganizationId) return "Pick which organisation is hosting, or switch back to a personal host";
      }
      return null;
    },
    [eventName, category, eventDate, endTime, startTime, isOnline, venue, selectedCity, meetingUrl, capacity, isFree, ticketUrl, hostMode, hostOrganizationId],
  );

  const goNext = () => {
    const v = validateStep(step);
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setStep(((step as number) + 1) as WizardStep);
  };

  const goBack = () => {
    setError(null);
    if (step === 1) {
      router.back();
    } else {
      setStep(((step as number) - 1) as WizardStep);
    }
  };

  const handleSubmit = async () => {
    const v = validateStep(3);
    if (v) {
      setError(v);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let uploadedCoverImageUrl: string | undefined;
      if (coverImageFile) {
        setUploading(true);
        try {
          const uploadResult = await uploadMedia(coverImageFile);
          uploadedCoverImageUrl = getMediaUrl(uploadResult.key);
        } catch (uploadErr) {
          setError(uploadErr instanceof Error ? uploadErr.message : "Failed to upload cover image. Please try again.");
          setSubmitting(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      const dateObj = new Date(eventDate);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      // P0-5: Use browser timezone instead of hardcoded GMT+2
      const isoStart = new Date(`${eventDate}T${startTime}:00${tzOffset}`).toISOString();

      const eventData: CreateEventInput = {
        name: eventName.trim(),
        description: description.trim() || "No description provided.",
        startDate: isoStart,
        date: {
          day: dateObj.getDate().toString(),
          month: months[dateObj.getMonth()],
          full: dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
          time: `${startTime} — ${endTime} ${tzLabel}`,
        },
        location: isOnline
          ? { name: "Online Event", streetAddress: "", addressLocality: "Online", addressCountry: "" }
          : { name: venue.trim(), streetAddress: address.trim(), addressLocality: selectedCity?.addressLocality || "", addressCountry: selectedCity?.addressCountry || "" },
        category,
        keywords: tags,
        image: uploadedCoverImageUrl,
        coverGradient: uploadedCoverImageUrl ? undefined : mineralThemeList[selectedTheme].gradient,
        maximumAttendeeCapacity: capacity || undefined,
        eventAttendanceMode: isOnline ? "OnlineEventAttendanceMode" : "OfflineEventAttendanceMode",
        meetingUrl: isOnline ? meetingUrl.trim() : undefined,
        meetingPlatform: isOnline ? meetingPlatform : undefined,
        organizer: {
          name: user?.name || "Event Host",
          identifier: `@${user?.name?.toLowerCase().replace(/\s+/g, "") || "host"}`,
          initials: user?.name
            ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
            : "EH",
          eventCount: 1,
        },
        offers: !isFree && ticketUrl.trim() ? { url: ticketUrl.trim() } : undefined,
      };

      const result = await createEvent(eventData);
      setFormTouched(false);
      router.push(`/events/${result.event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-150 mx-auto px-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      <WizardStepIndicator currentStep={step} steps={STEPS} />

      {step === 1 && (
        <section aria-label="About your event" data-slot="wizard-step-1">
          <CoverImageUpload
            coverImage={coverImage}
            gradient={mineralThemeList[selectedTheme].gradient}
            onImageUpload={handleImageUpload}
            onRemoveImage={removeCoverImage}
          />

          <ThemeSelector
            themes={mineralThemeList}
            selectedIndex={selectedTheme}
            onSelect={(i) => { setSelectedTheme(i); touchForm(); }}
          />

          <p className="text-sm text-text-secondary mb-3">
            What are we gathering for? Give it a name, pick a category, and add the story.
          </p>

          <Input
            type="text"
            inputMode="text"
            autoCapitalize="words"
            enterKeyHint="next"
            value={eventName}
            onChange={(e) => { setEventName(e.target.value); touchForm(); }}
            placeholder="Event Name"
            className="w-full text-2xl font-semibold bg-transparent border-none shadow-none outline-none placeholder:text-text-tertiary mb-4 h-auto px-0 focus-visible:ring-0"
          />

          <FormFieldRow icon={<span className="text-lg" aria-hidden>🏷️</span>} onClick={() => setShowCategoryModal(true)}>
            <div className={`font-medium ${!category ? "text-text-secondary" : ""}`}>
              {category ? categories.find((c) => c.id === category)?.name || category : "Select Category"}
            </div>
            {tags.length > 0 && (
              <div className="text-sm text-text-tertiary">
                {tags.map((t) => `#${t}`).join(" ")}
              </div>
            )}
          </FormFieldRow>

          <FormFieldRow icon={<AlignLeft className="w-5 h-5" />} onClick={() => setShowDescriptionModal(true)} className="mb-2">
            <span className={`font-medium ${description ? "" : "text-text-secondary"}`}>
              {description ? description.slice(0, 60) + (description.length > 60 ? "…" : "") : "Add Description"}
            </span>
          </FormFieldRow>
        </section>
      )}

      {step === 2 && (
        <section aria-label="When and where" data-slot="wizard-step-2">
          <p className="text-sm text-text-secondary mb-3">
            Pick a moment and a place. Online and in-person are both welcome.
          </p>

          <FormFieldRow icon={<Clock className="w-5 h-5" />} onClick={() => setShowDateModal(true)}>
            <div className={`font-medium ${!eventDate ? "text-text-secondary" : ""}`}>
              {formatDateForDisplay()}
            </div>
            <div className="text-sm text-text-tertiary">
              {eventDate ? `${startTime} — ${endTime} ${tzLabel}` : "Select date and time"}
            </div>
          </FormFieldRow>

          <FormFieldRow icon={<MapPin className="w-5 h-5" />} onClick={() => setShowLocationModal(true)} className="mb-2">
            {venue || isOnline ? (
              <>
                <div className="font-medium">{isOnline ? "Online Event" : venue}</div>
                <div className="text-sm text-text-tertiary">
                  {isOnline ? "Virtual event" : selectedCity ? `${selectedCity.addressLocality}, ${selectedCity.addressCountry}` : address}
                </div>
              </>
            ) : (
              <>
                <div className="font-medium text-text-secondary">Add Event Location</div>
                <div className="text-sm text-text-tertiary">Offline location or virtual link</div>
              </>
            )}
          </FormFieldRow>
        </section>
      )}

      {step === 3 && (
        <section aria-label="Hosting" data-slot="wizard-step-3">
          <p className="text-sm text-text-secondary mb-3">
            Tell people who&apos;s holding this gathering and how it&apos;s being run.
          </p>

          <HostModePicker
            hostMode={hostMode}
            organizationId={hostOrganizationId}
            onChange={(mode, orgId) => { setHostMode(mode); setHostOrganizationId(orgId); touchForm(); }}
          />

          <div className="flex gap-2 mb-4">
            <Button
              variant="ghost"
              className="bg-surface rounded-xl px-4 py-3"
              onClick={() => { setVisibility(visibility === "public" ? "private" : "public"); touchForm(); }}
            >
              {visibility === "public" ? <Globe className="w-4 h-4" aria-hidden /> : <Lock className="w-4 h-4" aria-hidden />}
              <span className="text-sm">{visibility === "public" ? "Public" : "Private"}</span>
              <ChevronDown className="w-4 h-4 text-text-tertiary" aria-hidden />
            </Button>
          </div>

          <EventOptionsCard
            isFree={isFree}
            requireApproval={requireApproval}
            capacity={capacity}
            onRequireApprovalChange={(v) => { setRequireApproval(v); touchForm(); }}
            onOpenTicketing={() => setShowPriceModal(true)}
            onOpenCapacity={() => setShowCapacityModal(true)}
          />
        </section>
      )}

      {error && (
        <div ref={errorRef} className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3" role="alert">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" aria-hidden />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Sticky wizard navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-background/80 backdrop-blur-lg border-t border-elevated z-40">
        <div className="max-w-150 mx-auto flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={submitting || uploading}
            className="rounded-xl"
            aria-label={step === 1 ? "Cancel and go back" : `Back to step ${step - 1}`}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
            Back
          </Button>

          {step < 3 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={submitting || uploading}
              className="flex-1 py-4 h-auto rounded-xl text-base"
              size="lg"
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || uploading}
              className="flex-1 py-4 h-auto rounded-xl text-base"
              size="lg"
            >
              {uploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" aria-hidden /> Uploading image…</>
              ) : submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" aria-hidden /> Publishing…</>
              ) : (
                "Publish nhimbe"
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Modals */}
      <DateTimeModal isOpen={showDateModal} onClose={() => { setShowDateModal(false); touchForm(); }} eventDate={eventDate} setEventDate={setEventDate} startTime={startTime} setStartTime={setStartTime} endTime={endTime} setEndTime={setEndTime} />
      <LocationModal isOpen={showLocationModal} onClose={() => { setShowLocationModal(false); touchForm(); }} isOnline={isOnline} setIsOnline={setIsOnline} meetingPlatform={meetingPlatform} setMeetingPlatform={setMeetingPlatform} meetingUrl={meetingUrl} setMeetingUrl={setMeetingUrl} addressSearch={addressSearch} setAddressSearch={setAddressSearch} venue={venue} setVenue={setVenue} address={address} setAddress={setAddress} selectedCity={selectedCity} setSelectedCity={setSelectedCity} cities={cities} />
      <CategoryModal isOpen={showCategoryModal} onClose={() => { setShowCategoryModal(false); touchForm(); }} categories={categories} category={category} setCategory={setCategory} tags={tags} tagInput={tagInput} setTagInput={setTagInput} addTag={addTag} removeTag={removeTag} />
      <DescriptionModal isOpen={showDescriptionModal} onClose={() => { setShowDescriptionModal(false); touchForm(); }} description={description} setDescription={setDescription} eventName={eventName} category={category} isOnline={isOnline} />
      <TicketingModal isOpen={showPriceModal} onClose={() => { setShowPriceModal(false); touchForm(); }} isFree={isFree} setIsFree={setIsFree} ticketUrl={ticketUrl} setTicketUrl={setTicketUrl} />
      <CapacityModal isOpen={showCapacityModal} onClose={() => { setShowCapacityModal(false); touchForm(); }} capacity={capacity} setCapacity={setCapacity} />
    </div>
  );
}
