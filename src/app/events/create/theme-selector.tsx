"use client";

import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ThemeItem {
  id: string;
  name: string;
  gradient: string;
}

interface ThemeSelectorProps {
  themes: ThemeItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function ThemeSelector({ themes, selectedIndex, onSelect }: ThemeSelectorProps) {
  const current = themes[selectedIndex];

  const prev = () => onSelect(selectedIndex > 0 ? selectedIndex - 1 : themes.length - 1);
  const next = () => onSelect(selectedIndex < themes.length - 1 ? selectedIndex + 1 : 0);
  const randomize = () => onSelect(Math.floor(Math.random() * themes.length));

  return (
    <div data-slot="theme-selector" className="flex items-center gap-2 mb-4">
      <div className="flex-1 bg-surface rounded-xl p-2 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg shrink-0"
          style={{ background: current.gradient }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-text-tertiary">Theme</div>
          <div className="font-medium truncate">{current.name}</div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={prev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={next}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={randomize}
        className="w-12 h-14 rounded-xl bg-surface"
        title="Randomize theme"
      >
        <Shuffle className="w-5 h-5 text-text-secondary" />
      </Button>
    </div>
  );
}
