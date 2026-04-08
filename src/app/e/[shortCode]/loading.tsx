import { Spinner } from "@/components/ui/spinner";

export default function ShortCodeLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Spinner className="size-8 text-primary" />
      <p className="text-sm text-text-secondary">Opening event...</p>
    </div>
  );
}
