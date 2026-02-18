import { Skeleton } from "@/components/ui/skeleton";

export default function CreateEventLoading() {
  return (
    <div className="max-w-300 mx-auto px-6 py-12">
      <Skeleton className="h-10 w-56 mb-8" />
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex gap-4 pt-4">
          <Skeleton className="h-12 w-32 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
