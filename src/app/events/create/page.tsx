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
  X,
} from "lucide-react";
import { createEvent, getCategories, getCities, type CreateEventInput } from "@/lib/api";

// Mineral gradient themes - all will have Three.js background
const mineralThemes = [
  {
    id: "malachite",
    name: "Malachite",
    gradient: "linear-gradient(135deg, #004D40 0%, #00796B 50%, #64FFDA 100%)",
    colors: ["#004D40", "#00796B", "#64FFDA"],
  },
  {
    id: "tanzanite",
    name: "Tanzanite",
    gradient: "linear-gradient(135deg, #1A0A2E 0%, #4B0082 50%, #B388FF 100%)",
    colors: ["#1A0A2E", "#4B0082", "#B388FF"],
  },
  {
    id: "gold",
    name: "Gold",
    gradient: "linear-gradient(135deg, #5D4037 0%, #8B5A00 50%, #FFD740 100%)",
    colors: ["#5D4037", "#8B5A00", "#FFD740"],
  },
  {
    id: "tigers-eye",
    name: "Tiger's Eye",
    gradient: "linear-gradient(135deg, #4A2C00 0%, #8B4513 50%, #D4A574 100%)",
    colors: ["#4A2C00", "#8B4513", "#D4A574"],
  },
  {
    id: "obsidian",
    name: "Obsidian",
    gradient: "linear-gradient(135deg, #0A0A0A 0%, #1E1E1E 50%, #3A3A3A 100%)",
    colors: ["#0A0A0A", "#1E1E1E", "#3A3A3A"],
  },
];

export default function CreateEventPage() {
  const router = useRouter();
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [eventName, setEventName] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [selectedCity, setSelectedCity] = useState<{ city: string; country: string } | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  // Date/Time state
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("18:00");

  // Category & Tags
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Capacity & Price
  const [capacity, setCapacity] = useState<number | null>(null);
  const [priceAmount, setPriceAmount] = useState<number>(0);
  const [priceCurrency, setPriceCurrency] = useState("USD");

  // Load categories and cities
  const [categories, setCategories] = useState<string[]>([]);
  const [cities, setCities] = useState<{ city: string; country: string }[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, citiesData] = await Promise.all([getCategories(), getCities()]);
        setCategories(cats);
        setCities(citiesData);
      } catch (err) {
        console.error("Failed to load form data:", err);
      }
    }
    loadData();
  }, []);

  const randomizeTheme = () => {
    const randomIndex = Math.floor(Math.random() * mineralThemes.length);
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

    setSubmitting(true);
    setError(null);

    try {
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
        coverGradient: mineralThemes[selectedTheme].gradient,
        capacity: capacity || undefined,
        isOnline,
        host: {
          // TODO: Get from authenticated user
          name: "Event Host",
          handle: "@eventhost",
          initials: "EH",
          eventCount: 1,
        },
        price: priceAmount > 0 ? { amount: priceAmount, currency: priceCurrency, label: "Ticket" } : undefined,
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
    <div className="max-w-[600px] mx-auto px-4 pb-24">
      {/* Cover Preview with Three.js effect indicator */}
      <div
        className="relative h-[200px] rounded-2xl overflow-hidden mb-4"
        style={{ background: mineralThemes[selectedTheme].gradient }}
      >
        {/* Three.js overlay indicator */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white/80">
          ✨ Animated
        </div>
      </div>

      {/* Theme Selector - Horizontal Slider */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-surface rounded-xl p-2 flex items-center gap-3">
          {/* Theme Preview */}
          <div
            className="w-10 h-10 rounded-lg flex-shrink-0"
            style={{ background: mineralThemes[selectedTheme].gradient }}
          />

          {/* Theme Name */}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-text-tertiary">Theme</div>
            <div className="font-medium truncate">{mineralThemes[selectedTheme].name}</div>
          </div>

          {/* Slider Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedTheme((prev) => (prev > 0 ? prev - 1 : mineralThemes.length - 1))}
              className="w-8 h-8 rounded-lg bg-elevated flex items-center justify-center hover:bg-foreground/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedTheme((prev) => (prev < mineralThemes.length - 1 ? prev + 1 : 0))}
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
            {category || "Select Category"}
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
          {/* Ticket Price */}
          <button
            onClick={() => setShowPriceModal(true)}
            className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-elevated transition-colors"
          >
            <Ticket className="w-5 h-5 text-text-secondary" />
            <span className="flex-1 text-left">Ticket Price</span>
            <span className="text-text-secondary">
              {priceAmount > 0 ? `${priceCurrency} ${priceAmount}` : "Free"}
            </span>
            <Pencil className="w-4 h-4 text-text-tertiary" />
          </button>

          {/* Require Approval */}
          <div className="px-4 py-3.5 flex items-center gap-3">
            <Users className="w-5 h-5 text-text-secondary" />
            <span className="flex-1">Require Approval</span>
            <button
              role="switch"
              aria-checked={requireApproval}
              onClick={() => setRequireApproval(!requireApproval)}
              className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 ${
                requireApproval ? "bg-primary" : "bg-elevated"
              }`}
            >
              <div
                className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-md transition-transform duration-200 ${
                  requireApproval ? "translate-x-[22px]" : "translate-x-[2px]"
                }`}
              />
            </button>
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
        <div className="max-w-[600px] mx-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-primary text-background font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
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
      {showDateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-background rounded-t-2xl w-full max-w-[600px] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Date & Time</h3>
              <button onClick={() => setShowDateModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => setShowDateModal(false)}
                className="w-full py-3 bg-primary text-background rounded-xl font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-background rounded-t-2xl w-full max-w-[600px] p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Event Location</h3>
              <button onClick={() => setShowLocationModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
                <input
                  type="checkbox"
                  id="isOnline"
                  checked={isOnline}
                  onChange={(e) => setIsOnline(e.target.checked)}
                  className="w-5 h-5"
                />
                <label htmlFor="isOnline" className="flex-1">Online Event</label>
              </div>
              {!isOnline && (
                <>
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
                              ? "bg-primary text-background"
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
                onClick={() => setShowLocationModal(false)}
                className="w-full py-3 bg-primary text-background rounded-xl font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-background rounded-t-2xl w-full max-w-[600px] p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Category & Tags</h3>
              <button onClick={() => setShowCategoryModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-3 rounded-xl text-left ${
                        category === cat
                          ? "bg-primary text-background"
                          : "bg-surface hover:bg-elevated"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTag()}
                    placeholder="Add a tag..."
                    className="flex-1 px-4 py-3 bg-surface rounded-xl border-none outline-none"
                  />
                  <button onClick={addTag} className="px-4 py-3 bg-primary text-background rounded-xl">
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-surface rounded-full text-sm">
                        #{tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-full py-3 bg-primary text-background rounded-xl font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Description Modal */}
      {showDescriptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-background rounded-t-2xl w-full max-w-[600px] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Description</h3>
              <button onClick={() => setShowDescriptionModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your event..."
                rows={6}
                className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none resize-none"
              />
              <button
                onClick={() => setShowDescriptionModal(false)}
                className="w-full py-3 bg-primary text-background rounded-xl font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-background rounded-t-2xl w-full max-w-[600px] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Ticket Price</h3>
              <button onClick={() => setShowPriceModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-text-secondary mb-2">Price</label>
                  <input
                    type="number"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(Number(e.target.value))}
                    min={0}
                    className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm text-text-secondary mb-2">Currency</label>
                  <select
                    value={priceCurrency}
                    onChange={(e) => setPriceCurrency(e.target.value)}
                    className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="ZWL">ZWL</option>
                    <option value="ZAR">ZAR</option>
                    <option value="KES">KES</option>
                  </select>
                </div>
              </div>
              <p className="text-sm text-text-tertiary">Set to 0 for a free event</p>
              <button
                onClick={() => setShowPriceModal(false)}
                className="w-full py-3 bg-primary text-background rounded-xl font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Capacity Modal */}
      {showCapacityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-background rounded-t-2xl w-full max-w-[600px] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Capacity</h3>
              <button onClick={() => setShowCapacityModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Maximum Attendees</label>
                <input
                  type="number"
                  value={capacity || ""}
                  onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : null)}
                  placeholder="Leave empty for unlimited"
                  min={1}
                  className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none"
                />
              </div>
              <p className="text-sm text-text-tertiary">Leave empty for unlimited capacity</p>
              <button
                onClick={() => setShowCapacityModal(false)}
                className="w-full py-3 bg-primary text-background rounded-xl font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
