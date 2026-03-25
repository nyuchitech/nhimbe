"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, MessageCircle, Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  eventName: string;
  eventDate: string;
  eventLocation: string;
  eventUrl: string;
  className?: string;
}

export function ShareButton({
  eventName,
  eventDate,
  eventLocation,
  eventUrl,
  className,
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const shareText = `${eventName}\n${eventDate} | ${eventLocation}\n${eventUrl}`;

  function handleWhatsAppShare() {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = eventUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleWebShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventName,
          text: `${eventName} - ${eventDate} | ${eventLocation}`,
          url: eventUrl,
        });
      } catch {
        // User cancelled or share failed silently
      }
      setIsOpen(false);
    }
  }

  return (
    <div data-slot="share-button" className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] px-4 py-2.5 text-sm font-semibold bg-surface text-foreground border border-elevated hover:bg-elevated transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 z-50 w-56 rounded-lg bg-surface border border-elevated shadow-lg"
          role="menu"
        >
          <div className="p-1">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-elevated transition-colors"
              role="menuitem"
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
              Share via WhatsApp
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-elevated transition-colors"
              role="menuitem"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy link"}
            </button>

            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                type="button"
                onClick={handleWebShare}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-elevated transition-colors"
                role="menuitem"
              >
                <ExternalLink className="h-4 w-4" />
                More options...
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
