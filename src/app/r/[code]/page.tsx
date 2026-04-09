import { redirect, notFound } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.nhimbe.com";

interface RedirectPageProps {
  params: Promise<{ code: string }>;
}

export default async function TrackedRedirectPage({ params }: RedirectPageProps) {
  const { code } = await params;

  // The API will record the click and return the target URL via 302 redirect.
  // We use the API endpoint directly — the browser follows the redirect.
  // But for SSR, we fetch the target and redirect server-side.
  try {
    const res = await fetch(`${API_URL}/api/links/${code}`, {
      redirect: "manual", // Don't follow redirect, get the Location header
    });

    const location = res.headers.get("location");
    if (location) {
      redirect(location);
    }
  } catch {
    // API unreachable — fall through to 404
  }

  notFound();
}
