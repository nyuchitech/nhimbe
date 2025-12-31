"use client";

import { QRCode, getQRCodeURL } from "@/components/ui/qr-code";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface EventQRCodeProps {
  shortCode: string;
  title: string;
}

export function EventQRCode({ shortCode, title }: EventQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const shortUrl = `nhimbe.com/e/${shortCode}`;
  const fullUrl = `https://${shortUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* QR Code */}
      <div className="bg-white p-3 rounded-lg mb-3">
        <QRCode value={fullUrl} size={140} bgColor="#FFFFFF" fgColor="#0A0A0A" />
      </div>

      {/* Short URL */}
      <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 w-full">
        <span className="text-sm text-foreground/80 flex-1 truncate">{shortUrl}</span>
        <button
          onClick={handleCopy}
          className="text-primary hover:text-primary/80 transition-colors"
          title="Copy link"
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Fallback for browsers without canvas */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getQRCodeURL(fullUrl, 140)}
          alt={`QR code for ${title}`}
          width={140}
          height={140}
          className="rounded-lg"
        />
      </noscript>
    </div>
  );
}
