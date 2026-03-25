import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description: "Search for events, venues, and categories on nhimbe.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
