import type { Metadata } from "next";
import KraalIndexClient from "./kraal-index-client";

export const metadata: Metadata = {
  title: "Kraal — your gathering circles",
  description: "Where the gathering circle keeps the fire alive between events.",
};

export default function KraalIndexPage() {
  return <KraalIndexClient />;
}
