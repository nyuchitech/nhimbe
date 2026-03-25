"use client";

import * as React from "react";
import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
  description?: string;
  className?: string;
}

function ShareDialog({
  open,
  onOpenChange,
  url,
  title = "Share",
  description,
  className,
}: ShareDialogProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const channels = [
    {
      name: "WhatsApp",
      icon: "💬",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      name: "X",
      icon: "𝕏",
      href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      name: "Email",
      icon: "✉️",
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div data-slot="share-dialog-channels" className="flex gap-4 py-4">
          {channels.map((channel) => (
            <a
              key={channel.name}
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-lg p-3 text-sm transition-colors hover:bg-foreground/5"
            >
              <span className="text-2xl">{channel.icon}</span>
              <span className="text-xs text-foreground/60">{channel.name}</span>
            </a>
          ))}
        </div>
        <div data-slot="share-dialog-link" className="flex items-center gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/40" />
            <Input
              value={url}
              readOnly
              className="pl-9 text-sm"
            />
          </div>
          <CopyButton value={url} variant="default" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ShareDialog };
export type { ShareDialogProps };
