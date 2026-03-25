import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Events",
  description: "Your events and registrations on nhimbe.",
};

export default function MyEventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
