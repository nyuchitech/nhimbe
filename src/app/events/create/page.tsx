"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Ticket,
  Globe,
  Lock,
  Rocket,
  Check,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const themes = [
  "linear-gradient(135deg, #004D40, #00796B)",
  "linear-gradient(135deg, #4B0082, #7B1FA2)",
  "linear-gradient(135deg, #5D4037, #FFD740)",
  "linear-gradient(135deg, #1a1a2e, #16213e)",
  "linear-gradient(135deg, #D4A574, #8B4513)",
  "linear-gradient(135deg, #00B0FF, #0047AB)",
  "linear-gradient(45deg, #5D4037 25%, #FFD740 25%, #FFD740 50%, #5D4037 50%, #5D4037 75%, #FFD740 75%)",
  "linear-gradient(135deg, #FF6B6B, #FFD740)",
];

export default function CreateEventPage() {
  const router = useRouter();
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [showModal, setShowModal] = useState(false);

  const handlePublish = () => {
    setShowModal(true);
  };

  return (
    <>
      <div className="max-w-[700px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl font-bold mb-3">Create an Event</h1>
          <p className="text-foreground/60">
            Bring your community together — it only takes 60 seconds
          </p>
        </div>

        {/* Form */}
        <div className="bg-surface rounded-[var(--radius-card)] p-8">
          {/* Cover Upload */}
          <div
            className="h-[220px] rounded-[var(--radius-card)] flex flex-col items-center justify-center gap-3 cursor-pointer mb-8 transition-all"
            style={{ background: themes[selectedTheme] }}
          >
            {selectedTheme === 0 && (
              <>
                <ImagePlus className="w-10 h-10 text-foreground/40" />
                <span className="text-sm text-foreground/40">
                  Click to add a cover photo
                </span>
              </>
            )}
          </div>

          {/* Event Title */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2.5">
              Event Title
            </label>
            <input
              type="text"
              className="w-full px-4 py-3.5 rounded-[var(--radius-input)] bg-background border border-elevated text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors"
              placeholder="Give your event a name"
              defaultValue="Community Tech Meetup"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2.5">
                Date
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-foreground/40" />
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3.5 rounded-[var(--radius-input)] bg-background border border-elevated text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Select date"
                  defaultValue="January 15, 2025"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2.5">
                Time
              </label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-foreground/40" />
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3.5 rounded-[var(--radius-input)] bg-background border border-elevated text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Select time"
                  defaultValue="6:00 PM"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2.5">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-foreground/40" />
              <input
                type="text"
                className="w-full pl-12 pr-4 py-3.5 rounded-[var(--radius-input)] bg-background border border-elevated text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors"
                placeholder="Add a venue or online link"
                defaultValue="Impact Hub, Harare"
              />
            </div>
          </div>

          {/* Theme Selector */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2.5">
              Theme
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {themes.map((theme, index) => (
                <button
                  key={index}
                  className={`aspect-square rounded-xl cursor-pointer transition-all hover:scale-105 ${
                    selectedTheme === index
                      ? "ring-[3px] ring-primary"
                      : "ring-0"
                  }`}
                  style={{ background: theme }}
                  onClick={() => setSelectedTheme(index)}
                />
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2.5">
              Visibility
            </label>
            <div className="flex gap-4">
              <button
                className={`flex-1 py-5 rounded-[var(--radius-button)] text-center cursor-pointer transition-all border-2 ${
                  visibility === "public"
                    ? "border-primary bg-primary/10"
                    : "border-elevated bg-background hover:border-foreground/30"
                }`}
                onClick={() => setVisibility("public")}
              >
                <Globe
                  className={`w-6 h-6 mx-auto mb-2.5 ${
                    visibility === "public"
                      ? "text-primary"
                      : "text-foreground/60"
                  }`}
                />
                <span
                  className={`text-sm font-semibold ${
                    visibility === "public"
                      ? "text-primary"
                      : "text-foreground/60"
                  }`}
                >
                  Public
                </span>
              </button>
              <button
                className={`flex-1 py-5 rounded-[var(--radius-button)] text-center cursor-pointer transition-all border-2 ${
                  visibility === "private"
                    ? "border-primary bg-primary/10"
                    : "border-elevated bg-background hover:border-foreground/30"
                }`}
                onClick={() => setVisibility("private")}
              >
                <Lock
                  className={`w-6 h-6 mx-auto mb-2.5 ${
                    visibility === "private"
                      ? "text-primary"
                      : "text-foreground/60"
                  }`}
                />
                <span
                  className={`text-sm font-semibold ${
                    visibility === "private"
                      ? "text-primary"
                      : "text-foreground/60"
                  }`}
                >
                  Private
                </span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2.5">
              Description
            </label>
            <textarea
              className="w-full px-4 py-3.5 rounded-[var(--radius-input)] bg-background border border-elevated text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors resize-none"
              rows={4}
              placeholder="Tell people what your event is about..."
              defaultValue="Join us for an evening of networking, learning, and collaboration with Harare's tech community. Whether you're a developer, designer, founder, or just tech-curious, you're welcome!"
            />
          </div>

          {/* Capacity & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div>
              <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2.5">
                Capacity
              </label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-foreground/40" />
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3.5 rounded-[var(--radius-input)] bg-background border border-elevated text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Unlimited"
                  defaultValue="50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2.5">
                Price
              </label>
              <div className="relative">
                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-foreground/40" />
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3.5 rounded-[var(--radius-input)] bg-background border border-elevated text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Free"
                  defaultValue="Free"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t border-elevated">
            <Button
              variant="secondary"
              className="flex-1 py-4"
              onClick={() => router.push("/")}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1 py-4"
              onClick={handlePublish}
            >
              <Rocket className="w-[18px] h-[18px]" />
              Publish Event
            </Button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] p-6">
          <div className="bg-surface rounded-[var(--radius-card)] p-10 text-center max-w-[420px] w-full">
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Event Published! 🎉</h2>
            <p className="text-foreground/60 mb-8 leading-relaxed">
              Your event is now live on nhimbe. Share it with your community and
              start gathering!
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="w-full py-3.5 rounded-[var(--radius-button)] bg-primary text-background font-semibold flex items-center justify-center gap-2.5"
                onClick={() => setShowModal(false)}
              >
                <Share2 className="w-[18px] h-[18px]" />
                Share via WhatsApp
              </button>
              <button
                className="w-full py-3.5 rounded-[var(--radius-button)] bg-elevated text-foreground font-semibold"
                onClick={() => setShowModal(false)}
              >
                Copy Link
              </button>
              <button
                className="w-full py-3.5 rounded-[var(--radius-button)] bg-elevated text-foreground font-semibold"
                onClick={() => {
                  setShowModal(false);
                  router.push("/");
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
