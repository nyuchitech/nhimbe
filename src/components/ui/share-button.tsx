"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, MessageCircle, Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CopyButton } from "@/components/ui/copy-button";

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
  const shareText = `${eventName}\n${eventDate} | ${eventLocation}\n${eventUrl}`;

  function handleWhatsAppShare() {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-slot="share-button"
          variant="outline"
          className={cn(className)}
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleWhatsAppShare}>
          <MessageCircle className="h-4 w-4 text-green-600" />
          Share via WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <CopyButton
            value={eventUrl}
            label="Copy link"
            copiedLabel="Copied!"
            variant="ghost"
            size="sm"
            className="w-full justify-start font-normal"
          />
        </DropdownMenuItem>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <DropdownMenuItem onClick={handleWebShare}>
            <ExternalLink className="h-4 w-4" />
            More options...
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
