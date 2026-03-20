"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/auth/auth-context";
import { NamePrompt } from "@/components/prompts/name-prompt";
import { Skeleton } from "@/components/ui/skeleton";

const CreateEventForm = dynamic(() => import("./create-event-form"), {
  ssr: false,
  loading: () => (
    <div className="max-w-150 mx-auto px-4 pb-24 space-y-4">
      <Skeleton className="h-50 w-full rounded-2xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="h-12 w-28 rounded-xl" />
      </div>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-5 w-32 mt-2" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  ),
});

function CreateEventContent() {
  const { user } = useAuth();
  const [nameProvided, setNameProvided] = useState(false);
  const needsName = !user?.name || user.name === "User";

  if (needsName && !nameProvided) {
    return (
      <div className="max-w-100 mx-auto px-6 py-16">
        <h2 className="text-xl font-bold mb-2">Before you create an event</h2>
        <p className="text-text-secondary mb-6">We need your name so attendees know who&apos;s hosting.</p>
        <NamePrompt onComplete={() => setNameProvided(true)} />
      </div>
    );
  }

  return <CreateEventForm />;
}

export default function CreateEventPage() {
  return (
    <AuthGuard>
      <CreateEventContent />
    </AuthGuard>
  );
}
