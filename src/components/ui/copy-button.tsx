"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  value: string;
  label?: string;
  copiedLabel?: string;
  duration?: number;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "xs" | "sm" | "icon" | "icon-sm";
  className?: string;
}

function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  duration = 2000,
  variant = "outline",
  size = "default",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), duration);
  }

  const isIconOnly = size === "icon" || size === "icon-sm";

  return (
    <Button
      data-slot="copy-button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={className}
    >
      {copied ? (
        <>
          <Check className="size-4" />
          {!isIconOnly && <span>{copiedLabel}</span>}
        </>
      ) : (
        <>
          <Copy className="size-4" />
          {!isIconOnly && <span>{label}</span>}
        </>
      )}
    </Button>
  );
}

export { CopyButton };
export type { CopyButtonProps };
