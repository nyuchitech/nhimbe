"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown } from "lucide-react";

export interface CityOption {
  value: string;
  label: string;
}

interface CityDropdownProps {
  /** The currently selected value */
  value: string;
  /** Callback when a city is selected */
  onChange: (value: string) => void;
  /** List of city options to display */
  cities: CityOption[];
  /** Optional "all" option shown at the top of the dropdown */
  allOption?: CityOption;
  /** Display label override — if not provided, uses value or allOption label */
  displayLabel?: string;
  /** Additional CSS classes for the outer wrapper */
  className?: string;
  /** Visual variant: "subtle" for home page style, "filled" for events page style */
  variant?: "subtle" | "filled";
}

export function CityDropdown({
  value,
  onChange,
  cities,
  allOption,
  displayLabel,
  className = "",
  variant = "subtle",
}: CityDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const label =
    displayLabel ?? (allOption && value === allOption.value ? allOption.label : value);

  const isSubtle = variant === "subtle";

  return (
    <div className={`relative ${isSubtle ? "inline-block" : ""} ${className}`} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={
          isSubtle
            ? "flex items-center gap-1.5 text-text-secondary hover:text-foreground transition-colors"
            : "flex items-center gap-2 px-4 py-2.5 bg-surface rounded-xl text-sm font-medium hover:bg-elevated transition-colors"
        }
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select city"
      >
        <MapPin
          className={`w-4 h-4 ${isSubtle ? "text-primary" : "text-text-secondary"}`}
        />
        <span className={isSubtle ? "font-medium" : ""}>{label}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            open ? "rotate-180" : ""
          } ${isSubtle ? "" : "text-text-tertiary"}`}
        />
      </button>

      {open && (
        <div
          className={`absolute top-full left-0 mt-2 rounded-xl shadow-xl border z-50 py-2 ${
            isSubtle
              ? "bg-surface border-elevated min-w-50"
              : "bg-elevated border-surface w-56 shadow-lg max-h-64 overflow-y-auto"
          }`}
          role="listbox"
          aria-label="City options"
        >
          {allOption && (
            <button
              key={allOption.value}
              role="option"
              aria-selected={value === allOption.value}
              onClick={() => {
                onChange(allOption.value);
                setOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                isSubtle ? "hover:bg-elevated" : "hover:bg-surface"
              } ${
                value === allOption.value
                  ? isSubtle
                    ? "text-primary font-semibold"
                    : "text-primary font-medium"
                  : "text-foreground"
              }`}
            >
              {allOption.label}
            </button>
          )}
          {cities.map((city) => (
            <button
              key={city.value}
              role="option"
              aria-selected={value === city.value}
              onClick={() => {
                onChange(city.value);
                setOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                isSubtle ? "hover:bg-elevated" : "hover:bg-surface"
              } ${
                value === city.value
                  ? isSubtle
                    ? "text-primary font-semibold"
                    : "text-primary font-medium"
                  : "text-foreground"
              }`}
            >
              {city.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
