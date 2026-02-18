"use client";

import dynamic from "next/dynamic";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Skeleton } from "@/components/ui/skeleton";

const CreateEventForm = dynamic(() => import("./create-event-form"), {
  ssr: false,
  loading: () => (
    <div className="max-w-150 mx-auto px-4 pb-24 space-y-4">
      {/* Cover preview skeleton */}
      <Skeleton className="h-50 w-full rounded-2xl" />
      {/* Theme selector skeleton */}
      <Skeleton className="h-14 w-full rounded-xl" />
      {/* Calendar & visibility row skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="h-12 w-28 rounded-xl" />
      </div>
      {/* Event name skeleton */}
      <Skeleton className="h-10 w-64" />
      {/* Form rows skeleton */}
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      {/* Event options skeleton */}
      <Skeleton className="h-5 w-32 mt-2" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  ),
});

// Wrap with AuthGuard to require authentication
export default function CreateEventPage() {
  return (
    <AuthGuard>
      <CreateEventForm />
    </AuthGuard>
  );
}
