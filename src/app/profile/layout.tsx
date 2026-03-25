import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your nhimbe profile and settings.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
