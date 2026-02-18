"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex items-center justify-center bg-[#0A0A0A] text-[#F5F5F4]">
        <div className="text-center px-6 max-w-md">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-[#A8A8A3] mb-6">
            We hit an unexpected error. Please try again.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#64FFDA] text-[#0A0A0A] rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
