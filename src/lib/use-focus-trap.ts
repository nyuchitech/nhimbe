"use client";

import { useEffect, useRef, RefObject } from "react";

interface UseFocusTrapOptions {
  isActive: boolean;
  onEscape?: () => void;
}

export function useFocusTrap<T extends HTMLElement>(
  options: UseFocusTrapOptions
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!options.isActive || !ref.current) return;

    const element = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const firstFocusable = element.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        options.onEscape?.();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = element.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    element.addEventListener("keydown", handleKeyDown);

    return () => {
      element.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [options.isActive, options.onEscape]);

  return ref;
}
