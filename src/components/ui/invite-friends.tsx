"use client";

import { useState } from "react";
import { Copy, Check, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteFriendsProps {
  eventName: string;
  eventUrl: string;
  referralCode?: string;
  className?: string;
}

export function InviteFriends({
  eventName,
  eventUrl,
  referralCode,
  className,
}: InviteFriendsProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = referralCode ? `${eventUrl}?ref=${referralCode}` : eventUrl;

  const whatsAppMessage = referralCode
    ? `Hey! Check out ${eventName} - I think you'd enjoy it. Use my link to sign up: ${shareUrl}`
    : `Hey! Check out ${eventName} - I think you'd enjoy it: ${shareUrl}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleWhatsAppInvite() {
    const url = `https://wa.me/?text=${encodeURIComponent(whatsAppMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div data-slot="invite-friends" className={cn("space-y-4", className)}>
      <h3 className="text-sm font-semibold text-foreground">
        Invite friends
      </h3>

      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={shareUrl}
          className="flex-1 rounded-[var(--radius-button)] border border-elevated bg-background px-3 py-2 text-sm text-foreground/80 focus:outline-none"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center rounded-[var(--radius-button)] px-3 py-2 text-sm font-semibold bg-surface text-foreground border border-elevated hover:bg-elevated transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={copied ? "Link copied" : "Copy invite link"}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={handleWhatsAppInvite}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] px-5 py-2.5 text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <MessageCircle className="h-4 w-4" />
        Invite via WhatsApp
      </button>
    </div>
  );
}
