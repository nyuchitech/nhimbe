"use client";

import { useState, useRef } from "react";
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
} from "lucide-react";

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
  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollThemes = (direction: "left" | "right") => {
    if (sliderRef.current) {
      const scrollAmount = 200;
      sliderRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const randomizeTheme = () => {
    const randomIndex = Math.floor(Math.random() * mineralThemes.length);
    setSelectedTheme(randomIndex);
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
      <button className="w-full bg-surface rounded-xl px-4 py-3.5 flex items-center gap-3 hover:bg-elevated transition-colors mb-2">
        <Clock className="w-5 h-5 text-text-secondary" />
        <div className="text-left">
          <div className="font-medium">Tuesday 23 December</div>
          <div className="text-sm text-text-tertiary">17:00 — 18:00 GMT+2</div>
        </div>
      </button>

      {/* Location Row */}
      <button className="w-full bg-surface rounded-xl px-4 py-3.5 flex items-center gap-3 hover:bg-elevated transition-colors mb-2">
        <MapPin className="w-5 h-5 text-text-secondary" />
        <div className="text-left">
          <div className="font-medium text-text-secondary">Add Event Location</div>
          <div className="text-sm text-text-tertiary">Offline location or virtual link</div>
        </div>
      </button>

      {/* Description Row */}
      <button className="w-full bg-surface rounded-xl px-4 py-3.5 flex items-center gap-3 hover:bg-elevated transition-colors mb-6">
        <AlignLeft className="w-5 h-5 text-text-secondary" />
        <span className="font-medium text-text-secondary">Add Description</span>
      </button>

      {/* Event Options */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">
          Event Options
        </h3>

        <div className="bg-surface rounded-xl divide-y divide-elevated">
          {/* Ticket Price */}
          <div className="px-4 py-3.5 flex items-center gap-3">
            <Ticket className="w-5 h-5 text-text-secondary" />
            <span className="flex-1">Ticket Price</span>
            <span className="text-text-secondary">Free</span>
            <Pencil className="w-4 h-4 text-text-tertiary" />
          </div>

          {/* Require Approval */}
          <div className="px-4 py-3.5 flex items-center gap-3">
            <Users className="w-5 h-5 text-text-secondary" />
            <span className="flex-1">Require Approval</span>
            <button
              className="w-11 h-6 rounded-full bg-elevated transition-colors relative"
              onClick={() => {}}
            >
              <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-text-tertiary transition-transform" />
            </button>
          </div>

          {/* Capacity */}
          <div className="px-4 py-3.5 flex items-center gap-3">
            <Users className="w-5 h-5 text-text-secondary" />
            <span className="flex-1">Capacity</span>
            <span className="text-text-secondary">Unlimited</span>
            <Pencil className="w-4 h-4 text-text-tertiary" />
          </div>
        </div>
      </div>

      {/* Create Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-elevated">
        <div className="max-w-[600px] mx-auto">
          <button
            onClick={() => router.push("/")}
            className="w-full py-4 rounded-xl bg-primary text-background font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Create Event
          </button>
        </div>
      </div>
    </div>
  );
}
