import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar",
  description: "View events on a calendar on nhimbe.",
};

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
