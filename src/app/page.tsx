import { Users } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <main className="flex max-w-2xl flex-col items-center gap-8 text-center">
        {/* App Icon */}
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary">
          <Users className="h-12 w-12 text-background dark:text-foreground" />
        </div>

        {/* Wordmark */}
        <h1 className="font-serif text-5xl font-bold tracking-tight text-foreground">
          nhimbe
        </h1>

        {/* Tagline */}
        <p className="text-xl text-foreground/70">
          Together we gather, together we grow
        </p>

        {/* Description */}
        <p className="max-w-md text-lg leading-relaxed text-foreground/60">
          The gatherings and events platform within the Mukoko ecosystem.
          Discover events, connect with your community, and celebrate together.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            href="#"
            className="flex h-12 items-center justify-center rounded-[var(--radius-button)] bg-primary px-8 font-semibold text-background transition-opacity hover:opacity-90 dark:text-foreground"
          >
            Discover Events
          </a>
          <a
            href="#"
            className="flex h-12 items-center justify-center rounded-[var(--radius-button)] border-2 border-foreground/20 px-8 font-semibold text-foreground transition-colors hover:border-foreground/40"
          >
            Create Gathering
          </a>
        </div>

        {/* Parent Brand */}
        <p className="mt-8 text-sm text-foreground/40">A Mukoko Product</p>
      </main>
    </div>
  );
}
