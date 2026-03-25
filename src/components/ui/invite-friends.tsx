"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";

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
  const shareUrl = referralCode ? `${eventUrl}?ref=${referralCode}` : eventUrl;

  const whatsAppMessage = referralCode
    ? `Hey! Check out ${eventName} - I think you'd enjoy it. Use my link to sign up: ${shareUrl}`
    : `Hey! Check out ${eventName} - I think you'd enjoy it: ${shareUrl}`;

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
        <Input
          readOnly
          value={shareUrl}
          className="flex-1"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <CopyButton value={shareUrl} size="icon" variant="outline" />
      </div>

      <Button
        onClick={handleWhatsAppInvite}
        className="w-full bg-green-600 text-white hover:bg-green-700"
      >
        <MessageCircle className="h-4 w-4" />
        Invite via WhatsApp
      </Button>
    </div>
  );
}
