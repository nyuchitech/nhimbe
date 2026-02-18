import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="max-w-300 mx-auto px-6 py-12">
      <Skeleton className="h-10 w-36 mb-6" />
      <Skeleton className="h-14 w-full mb-8 rounded-xl" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 rounded-2xl overflow-hidden">
            <Skeleton className="h-28 w-40 shrink-0" />
            <div className="flex-1 py-2 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
