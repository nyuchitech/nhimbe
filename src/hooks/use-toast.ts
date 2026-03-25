"use client";

import { toast } from "sonner";

/**
 * Thin wrapper around sonner's toast for Mukoko-consistent notifications.
 * Usage: const { toast } = useToast(); toast.success("Done!");
 */
function useToast() {
  return { toast };
}

export { useToast };
