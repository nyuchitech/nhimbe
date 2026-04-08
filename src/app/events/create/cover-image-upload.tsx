"use client";

import { Trash2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoverImageUploadProps {
  coverImage: string | null;
  gradient: string;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}

export function CoverImageUpload({
  coverImage,
  gradient,
  onImageUpload,
  onRemoveImage,
}: CoverImageUploadProps) {
  return (
    <div
      data-slot="cover-image-upload"
      className="relative h-40 sm:h-50 rounded-2xl overflow-hidden mb-4 group"
      style={{
        background: coverImage
          ? `url(${coverImage}) center/cover`
          : gradient,
      }}
    >
      <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />

      {/* Always visible on mobile (active state), hover on desktop */}
      <div className="absolute inset-0 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-black/30 sm:bg-transparent sm:group-hover:bg-black/30">
        {coverImage ? (
          <Button
            variant="destructive"
            onClick={onRemoveImage}
            className="backdrop-blur-sm"
          >
            <Trash2 className="w-4 h-4" />
            Remove Image
          </Button>
        ) : (
          <label className="flex items-center gap-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white px-4 py-2 rounded-xl backdrop-blur-sm cursor-pointer transition-colors">
            <ImagePlus className="w-4 h-4" />
            Upload Cover Image
            <input
              type="file"
              accept="image/*"
              onChange={onImageUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white/80">
        {coverImage ? "Custom Image" : "Animated Theme"}
      </div>
    </div>
  );
}
