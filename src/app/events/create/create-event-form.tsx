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
} from "lucide-react";
import { createEvent, getCategories, getCities, uploadMedia, getMediaUrl, type CreateEventInput, type Category } from "@/lib/api";
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

const DEFAULT_CATEGORIES: Category[] = [
  { id: "tech", name: "Technology", group: "Technology & Innovation" },
  { id: "ai-ml", name: "AI & Machine Learning", group: "Technology & Innovation" },
  { id: "business", name: "Business", group: "Business & Economy" },
  { id: "music", name: "Music", group: "Entertainment & Media" },
  { id: "film-tv", name: "Film & TV", group: "Entertainment & Media" },
  { id: "football", name: "Football", group: "Sports" },
  { id: "fitness", name: "Fitness & Wellness", group: "Sports" },
  { id: "culture", name: "Culture & Society", group: "Culture & Society" },
  { id: "food", name: "Food & Drink", group: "Culture & Society" },
  { id: "education", name: "Education", group: "Education & Knowledge" },
  { id: "art", name: "Art", group: "Creative Arts" },
  { id: "comedy", name: "Comedy", group: "Creative Arts" },
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
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [eventName, setEventName] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const [cats, citiesData] = await Promise.all([getCategories(), getCities()]);
        if (cats.length > 0 && typeof cats[0] !== "string") {
          setCategories(cats);
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

  const handleSubmit = async () => {
    // P0-4: Validation with specific error messages
    if (!eventName.trim()) { setError("Event name is required"); return; }
    if (!eventDate) { setError("Please select a date and time for your event"); return; }
    if (endTime <= startTime) { setError("End time must be after start time"); return; }
    if (!category) { setError("Please select a category for your event"); return; }
    if (!isOnline && (!venue || !selectedCity)) { setError("Please add a location or mark as online event"); return; }
    if (isOnline && !meetingUrl.trim()) { setError("Please add a meeting URL for your online event"); return; }
    if (isOnline && meetingUrl.trim() && !isValidUrl(meetingUrl.trim())) { setError("Please enter a valid meeting URL (e.g., https://zoom.us/j/...)"); return; }
    if (capacity !== null && capacity < 1) { setError("Capacity must be at least 1 attendee"); return; }
    if (!isFree && ticketUrl.trim() && !isValidUrl(ticketUrl.trim())) { setError("Please enter a valid ticket URL"); return; }

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

      {/* Visibility Toggle */}
      <div className="flex gap-2 mb-4">
        <Button
          variant="ghost"
          className="bg-surface rounded-xl px-4 py-3"
          onClick={() => { setVisibility(visibility === "public" ? "private" : "public"); touchForm(); }}
        >
          {visibility === "public" ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          <span className="text-sm">{visibility === "public" ? "Public" : "Private"}</span>
          <ChevronDown className="w-4 h-4 text-text-tertiary" />
        </Button>
      </div>

      {/* Event Name */}
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

      {/* Date & Time */}
      <FormFieldRow icon={<Clock className="w-5 h-5" />} onClick={() => setShowDateModal(true)}>
        <div className={`font-medium ${!eventDate ? "text-text-secondary" : ""}`}>
          {formatDateForDisplay()}
        </div>
        <div className="text-sm text-text-tertiary">
          {eventDate ? `${startTime} — ${endTime} ${tzLabel}` : "Select date and time"}
        </div>
      </FormFieldRow>

      {/* Location */}
      <FormFieldRow icon={<MapPin className="w-5 h-5" />} onClick={() => setShowLocationModal(true)}>
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

      {/* Category */}
      <FormFieldRow icon={<span className="text-lg">🏷️</span>} onClick={() => setShowCategoryModal(true)}>
        <div className={`font-medium ${!category ? "text-text-secondary" : ""}`}>
          {category ? categories.find(c => c.id === category)?.name || category : "Select Category"}
        </div>
        {tags.length > 0 && (
          <div className="text-sm text-text-tertiary">
            {tags.map((t) => `#${t}`).join(" ")}
          </div>
        )}
      </FormFieldRow>

      {/* Description */}
      <FormFieldRow
        icon={<AlignLeft className="w-5 h-5" />}
        onClick={() => setShowDescriptionModal(true)}
        className="mb-6"
      >
        <span className={`font-medium ${description ? "" : "text-text-secondary"}`}>
          {description ? description.slice(0, 50) + (description.length > 50 ? "..." : "") : "Add Description"}
        </span>
      </FormFieldRow>

      <EventOptionsCard
        isFree={isFree}
        requireApproval={requireApproval}
        capacity={capacity}
        onRequireApprovalChange={(v) => { setRequireApproval(v); touchForm(); }}
        onOpenTicketing={() => setShowPriceModal(true)}
        onOpenCapacity={() => setShowCapacityModal(true)}
      />

      {/* Error Message - with scroll target and icon */}
      {error && (
        <div ref={errorRef} className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3" role="alert">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Create Button - Fixed at bottom with safe area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-background/80 backdrop-blur-lg border-t border-elevated z-40">
        <div className="max-w-150 mx-auto">
          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="w-full py-4 h-auto rounded-xl text-lg"
            size="lg"
          >
            {uploading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Uploading image...</>
            ) : submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
            ) : (
              "Create Event"
            )}
          </Button>
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
