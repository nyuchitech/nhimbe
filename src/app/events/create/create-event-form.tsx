"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  MapPin,
  Users,
  Ticket,
  Globe,
  Lock,
  ChevronDown,
  Shuffle,
  AlignLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Loader2,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { createEvent, getCategories, getCities, uploadMedia, getMediaUrl, type CreateEventInput, type Category } from "@/lib/api";
import { mineralThemes, mineralThemeIds, getThemeColors } from "@/lib/themes";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/components/auth/auth-context";
import { DateTimeModal } from "@/components/modals/date-time-modal";
import { LocationModal } from "@/components/modals/location-modal";
import { CategoryModal } from "@/components/modals/category-modal";
import { DescriptionModal } from "@/components/modals/description-modal";
import { TicketingModal } from "@/components/modals/ticketing-modal";
import { CapacityModal } from "@/components/modals/capacity-modal";

// Default categories if API returns none (matching Mukoko's 32 interest categories)
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

// Default cities if API returns none
const DEFAULT_CITIES = [
  { city: "Harare", country: "Zimbabwe" },
  { city: "Bulawayo", country: "Zimbabwe" },
  { city: "Cape Town", country: "South Africa" },
  { city: "Johannesburg", country: "South Africa" },
  { city: "Nairobi", country: "Kenya" },
  { city: "Lagos", country: "Nigeria" },
];

// Mineral gradient themes derived from shared theme constants
const mineralThemeList = mineralThemeIds.map((id) => {
  const theme = mineralThemes[id];
  return {
    id,
    name: theme.name,
    gradient: theme.gradient,
    colors: getThemeColors(id),
  };
});

export default function CreateEventForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [eventName, setEventName] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cover image state
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

  // Location state
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<{ city: string; country: string } | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingPlatform, setMeetingPlatform] = useState<"zoom" | "google_meet" | "teams" | "other">("zoom");

  // Date/Time state
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

  // Load categories and cities
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<{ city: string; country: string }[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, citiesData] = await Promise.all([getCategories(), getCities()]);
        // Use defaults if API returns empty or returns old string format
        if (cats.length > 0 && typeof cats[0] !== "string") {
          setCategories(cats);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }
        setCities(citiesData.length > 0 ? citiesData : DEFAULT_CITIES);
      } catch (err) {
        console.error("Failed to load form data:", err);
        // Fallback to defaults on error
        setCategories(DEFAULT_CATEGORIES);
        setCities(DEFAULT_CITIES);
      }
    }
    loadData();
  }, []);

  const randomizeTheme = () => {
    const randomIndex = Math.floor(Math.random() * mineralThemeList.length);
    setSelectedTheme(randomIndex);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Handle cover image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }
      setCoverImageFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCoverImage = () => {
    setCoverImage(null);
    setCoverImageFile(null);
  };

  const formatDateForDisplay = () => {
    if (!eventDate) return "Select Date & Time";
    const date = new Date(eventDate);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!eventName.trim()) {
      setError("Event name is required");
      return;
    }
    if (!eventDate) {
      setError("Event date is required");
      return;
    }
    if (!category) {
      setError("Please select a category");
      return;
    }
    if (!isOnline && (!venue || !selectedCity)) {
      setError("Please add a location or mark as online event");
      return;
    }
    if (isOnline && !meetingUrl.trim()) {
      setError("Please add a meeting URL for online events");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Upload cover image to R2 if provided
      let uploadedCoverImageUrl: string | undefined;
      if (coverImageFile) {
        setUploading(true);
        try {
          const uploadResult = await uploadMedia(coverImageFile);
          uploadedCoverImageUrl = getMediaUrl(uploadResult.key);
        } catch (uploadErr) {
          setError(uploadErr instanceof Error ? uploadErr.message : "Failed to upload cover image");
          setSubmitting(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      const dateObj = new Date(eventDate);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      const eventData: CreateEventInput = {
        title: eventName.trim(),
        description: description.trim() || "No description provided.",
        date: {
          day: dateObj.getDate().toString(),
          month: months[dateObj.getMonth()],
          full: dateObj.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          time: `${startTime} — ${endTime} GMT+2`,
          iso: new Date(`${eventDate}T${startTime}:00+02:00`).toISOString(),
        },
        location: isOnline
          ? { venue: "Online Event", address: "", city: "Online", country: "" }
          : {
              venue: venue.trim(),
              address: address.trim(),
              city: selectedCity?.city || "",
              country: selectedCity?.country || "",
            },
        category,
        tags,
        coverImage: uploadedCoverImageUrl,
        coverGradient: uploadedCoverImageUrl ? undefined : mineralThemeList[selectedTheme].gradient,
        capacity: capacity || undefined,
        isOnline,
        meetingUrl: isOnline ? meetingUrl.trim() : undefined,
        meetingPlatform: isOnline ? meetingPlatform : undefined,
        host: {
          name: user?.name || "Event Host",
          handle: `@${user?.name?.toLowerCase().replace(/\s+/g, '') || 'host'}`,
          initials: user?.name
            ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
            : "EH",
          eventCount: 1,
        },
        isFree,
        ticketUrl: !isFree && ticketUrl.trim() ? ticketUrl.trim() : undefined,
      };

      const result = await createEvent(eventData);
      router.push(`/events/${result.event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-150 mx-auto px-4 pb-24">
      {/* Cover Preview with Image Upload */}
      <div
        className="relative h-50 rounded-2xl overflow-hidden mb-4 group"
        style={{
          background: coverImage
            ? `url(${coverImage}) center/cover`
            : mineralThemeList[selectedTheme].gradient,
        }}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />

        {/* Image upload controls */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          {coverImage ? (
            <button
              onClick={removeCoverImage}
              className="flex items-center gap-2 bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-xl backdrop-blur-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Remove Image
            </button>
          ) : (
            <label className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl backdrop-blur-sm cursor-pointer transition-colors">
              <ImagePlus className="w-4 h-4" />
              Upload Cover Image
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Status badge */}
        <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white/80">
          {coverImage ? "Custom Image" : "Animated Theme"}
        </div>
      </div>

      {/* Theme Selector - Horizontal Slider */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-surface rounded-xl p-2 flex items-center gap-3">
          {/* Theme Preview */}
          <div
            className="w-10 h-10 rounded-lg shrink-0"
            style={{ background: mineralThemeList[selectedTheme].gradient }}
          />

          {/* Theme Name */}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-text-tertiary">Theme</div>
            <div className="font-medium truncate">{mineralThemeList[selectedTheme].name}</div>
          </div>

          {/* Slider Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedTheme((prev) => (prev > 0 ? prev - 1 : mineralThemeList.length - 1))}
              className="w-8 h-8 rounded-lg bg-elevated flex items-center justify-center hover:bg-foreground/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedTheme((prev) => (prev < mineralThemeList.length - 1 ? prev + 1 : 0))}
              className="w-8 h-8 rounded-lg bg-elevated flex items-center justify-center hover:bg-foreground/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Randomize Button */}
        <button
          onClick={randomizeTheme}
          className="w-12 h-14 rounded-xl bg-surface flex items-center justify-center hover:bg-elevated transition-colors"
          title="Randomize theme"
        >
          <Shuffle className="w-5 h-5 text-text-secondary" />
        </button>
      </div>

      {/* Calendar & Visibility Row */}
      <div className="flex gap-2 mb-4">
        <button className="flex-1 bg-surface rounded-xl px-4 py-3 flex items-center gap-2 hover:bg-elevated transition-colors">
          <span className="text-lg">📅</span>
          <span className="text-sm">Personal Calendar</span>
          <ChevronDown className="w-4 h-4 text-text-tertiary ml-auto" />
        </button>
        <button
          onClick={() => setVisibility(visibility === "public" ? "private" : "public")}
          className="bg-surface rounded-xl px-4 py-3 flex items-center gap-2 hover:bg-elevated transition-colors"
        >
          {visibility === "public" ? (
            <>
              <Globe className="w-4 h-4 text-text-secondary" />
              <span className="text-sm">Public</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-text-secondary" />
              <span className="text-sm">Private</span>
            </>
          )}
          <ChevronDown className="w-4 h-4 text-text-tertiary" />
        </button>
      </div>

      {/* Event Name */}
      <input
        type="text"
        value={eventName}
        onChange={(e) => setEventName(e.target.value)}
        placeholder="Event Name"
        className="w-full text-2xl font-semibold bg-transparent border-none outline-none placeholder:text-text-tertiary mb-4"
      />

      {/* Date & Time Row */}
      <button
        onClick={() => setShowDateModal(true)}
        className="w-full bg-surface rounded-xl px-4 py-3.5 flex items-center gap-3 hover:bg-elevated transition-colors mb-2"
      >
        <Clock className="w-5 h-5 text-text-secondary" />
        <div className="text-left flex-1">
          <div className={`font-medium ${!eventDate ? "text-text-secondary" : ""}`}>
            {formatDateForDisplay()}
          </div>
          <div className="text-sm text-text-tertiary">
            {eventDate ? `${startTime} — ${endTime} GMT+2` : "Select date and time"}
          </div>
        </div>
      </button>

      {/* Location Row */}
      <button
        onClick={() => setShowLocationModal(true)}
        className="w-full bg-surface rounded-xl px-4 py-3.5 flex items-center gap-3 hover:bg-elevated transition-colors mb-2"
      >
        <MapPin className="w-5 h-5 text-text-secondary" />
        <div className="text-left flex-1">
          {venue || isOnline ? (
            <>
              <div className="font-medium">{isOnline ? "Online Event" : venue}</div>
              <div className="text-sm text-text-tertiary">
                {isOnline ? "Virtual event" : selectedCity ? `${selectedCity.city}, ${selectedCity.country}` : address}
              </div>
            </>
          ) : (
            <>
              <div className="font-medium text-text-secondary">Add Event Location</div>
              <div className="text-sm text-text-tertiary">Offline location or virtual link</div>
            </>
          )}
        </div>
      </button>

      {/* Category Row */}
      <button
        onClick={() => setShowCategoryModal(true)}
        className="w-full bg-surface rounded-xl px-4 py-3.5 flex items-center gap-3 hover:bg-elevated transition-colors mb-2"
      >
        <span className="text-lg">🏷️</span>
        <div className="text-left flex-1">
          <div className={`font-medium ${!category ? "text-text-secondary" : ""}`}>
            {category ? categories.find(c => c.id === category)?.name || category : "Select Category"}
          </div>
          {tags.length > 0 && (
            <div className="text-sm text-text-tertiary">
              {tags.map((t) => `#${t}`).join(" ")}
            </div>
          )}
        </div>
      </button>

      {/* Description Row */}
      <button
        onClick={() => setShowDescriptionModal(true)}
        className="w-full bg-surface rounded-xl px-4 py-3.5 flex items-center gap-3 hover:bg-elevated transition-colors mb-6"
      >
        <AlignLeft className="w-5 h-5 text-text-secondary" />
        <span className={`font-medium ${description ? "" : "text-text-secondary"}`}>
          {description ? description.slice(0, 50) + (description.length > 50 ? "..." : "") : "Add Description"}
        </span>
      </button>

      {/* Event Options */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">
          Event Options
        </h3>

        <div className="bg-surface rounded-xl divide-y divide-elevated">
          {/* Ticketing */}
          <button
            onClick={() => setShowPriceModal(true)}
            className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-elevated transition-colors"
          >
            <Ticket className="w-5 h-5 text-text-secondary" />
            <span className="flex-1 text-left">Ticketing</span>
            <span className="text-text-secondary">
              {isFree ? "Free Event" : "Paid (External)"}
            </span>
            <Pencil className="w-4 h-4 text-text-tertiary" />
          </button>

          {/* Require Approval */}
          <div className="px-4 py-3.5 flex items-center gap-3">
            <Users className="w-5 h-5 text-text-secondary" />
            <span className="flex-1">Require Approval</span>
            <Switch
              checked={requireApproval}
              onCheckedChange={setRequireApproval}
            />
          </div>

          {/* Capacity */}
          <button
            onClick={() => setShowCapacityModal(true)}
            className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-elevated transition-colors"
          >
            <Users className="w-5 h-5 text-text-secondary" />
            <span className="flex-1 text-left">Capacity</span>
            <span className="text-text-secondary">{capacity || "Unlimited"}</span>
            <Pencil className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Create Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-elevated">
        <div className="max-w-150 mx-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading image...
              </>
            ) : submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Event"
            )}
          </button>
        </div>
      </div>

      {/* Date Modal */}
      <DateTimeModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        eventDate={eventDate}
        setEventDate={setEventDate}
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
      />

      {/* Location Modal */}
      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        isOnline={isOnline}
        setIsOnline={setIsOnline}
        meetingPlatform={meetingPlatform}
        setMeetingPlatform={setMeetingPlatform}
        meetingUrl={meetingUrl}
        setMeetingUrl={setMeetingUrl}
        addressSearch={addressSearch}
        setAddressSearch={setAddressSearch}
        venue={venue}
        setVenue={setVenue}
        address={address}
        setAddress={setAddress}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        cities={cities}
      />

      {/* Category Modal */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categories}
        category={category}
        setCategory={setCategory}
        tags={tags}
        tagInput={tagInput}
        setTagInput={setTagInput}
        addTag={addTag}
        removeTag={removeTag}
      />

      {/* Description Modal */}
      <DescriptionModal
        isOpen={showDescriptionModal}
        onClose={() => setShowDescriptionModal(false)}
        description={description}
        setDescription={setDescription}
        eventName={eventName}
        category={category}
        isOnline={isOnline}
      />

      {/* Ticketing Modal */}
      <TicketingModal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        isFree={isFree}
        setIsFree={setIsFree}
        ticketUrl={ticketUrl}
        setTicketUrl={setTicketUrl}
      />

      {/* Capacity Modal */}
      <CapacityModal
        isOpen={showCapacityModal}
        onClose={() => setShowCapacityModal(false)}
        capacity={capacity}
        setCapacity={setCapacity}
      />
    </div>
  );
}
