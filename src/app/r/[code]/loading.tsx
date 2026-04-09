import { Spinner } from "@/components/ui/spinner";

export default function RedirectLoading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
      <Spinner className="w-8 h-8 text-primary" />
      <p className="text-sm text-text-secondary">Redirecting...</p>
    </div>
  );
}
