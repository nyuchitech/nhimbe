import type { Metadata } from "next";
import KraalDetailClient from "./kraal-detail-client";

interface KraalDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Kraal",
  description: "Where the gathering circle keeps the fire alive between events.",
};

export default async function KraalDetailPage({ params }: KraalDetailPageProps) {
  const { id } = await params;
  return <KraalDetailClient circleId={id} />;
}
