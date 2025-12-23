import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEventById } from "@/lib/data";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = getEventById(id);

  if (!event) {
    notFound();
  }

  const coverStyle = event.coverImage
    ? {
        background: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5)), url('${event.coverImage}') center/cover`,
      }
    : { background: event.coverGradient || "linear-gradient(135deg, #004D40, #00796B)" };

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-10">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-foreground/60 text-sm hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-[18px] h-[18px]" />
        Back to events
      </Link>

      {/* Cover Image */}
      <div
        className="h-[400px] rounded-[var(--radius-card)] relative mb-8"
        style={coverStyle}
      >
        <div className="absolute top-6 left-6 flex gap-3">
          {/* Date Badge */}
          <div className="bg-black/70 backdrop-blur-sm px-3.5 py-2.5 rounded-xl text-center">
            <div className="text-2xl font-extrabold text-primary leading-none">
              {event.date.day}
            </div>
            <div className="text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">
              {event.date.month}
            </div>
          </div>

          {/* Category Badge */}
          <div className="bg-secondary text-background px-3 py-1.5 rounded-full text-[11px] font-bold uppercase self-start">
            {event.category}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12">
        {/* Main Content */}
        <div>
          <h1 className="font-serif text-4xl font-bold leading-tight mb-6">
            {event.title}
          </h1>

          {/* Host Row */}
          <div className="flex items-center gap-3.5 py-4 border-b border-elevated mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center font-bold text-background">
              {event.host.initials}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">{event.host.name}</h4>
              <p className="text-sm text-foreground/60">
                {event.host.handle} · {event.host.eventCount} past events
              </p>
            </div>
            <Button variant="secondary">Follow</Button>
          </div>

          {/* Date Row */}
          <div className="flex items-start gap-4 py-4 border-b border-elevated">
            <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-primary shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">{event.date.full}</h4>
              <p className="text-sm text-foreground/60">{event.date.time}</p>
            </div>
            <button className="text-primary text-sm font-semibold hover:underline">
              Add to Calendar
            </button>
          </div>

          {/* Location Row */}
          <div className="flex items-start gap-4 py-4 border-b border-elevated">
            <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-primary shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">{event.location.name}</h4>
              <p className="text-sm text-foreground/60">{event.location.address}</p>
            </div>
            <button className="text-primary text-sm font-semibold hover:underline">
              Get Directions
            </button>
          </div>

          {/* Description */}
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4">About This Event</h3>
            {event.description.split("\n\n").map((paragraph, index) => (
              <p
                key={index}
                className="text-[15px] leading-relaxed text-foreground/60 mb-4"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-[100px] self-start space-y-6">
          {/* Ticket Card */}
          <div className="bg-surface rounded-[var(--radius-card)] p-6">
            <h3 className="text-sm text-foreground/60 mb-2">
              {event.price?.label || "Free Event"}
            </h3>
            <div className="text-[32px] font-extrabold text-primary mb-5">
              {event.price ? (
                <>
                  ${event.price.amount}{" "}
                  <span className="text-sm font-medium text-foreground/60">
                    {event.price.currency}
                  </span>
                </>
              ) : (
                "Free"
              )}
            </div>
            <Button variant="primary" className="w-full py-4 text-base">
              {event.price ? "Get Tickets" : "RSVP Now"}
            </Button>
          </div>

          {/* Friends Card */}
          {event.friends && event.friends.length > 0 && (
            <div className="bg-surface rounded-[var(--radius-card)] p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <Users className="w-[18px] h-[18px] text-primary" />
                <h4 className="font-semibold text-sm">
                  {event.friends.length} friend{event.friends.length > 1 ? "s" : ""} going
                </h4>
              </div>
              <div className="flex gap-4">
                {event.friends.map((friend, index) => (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-[52px] h-[52px] rounded-full bg-gradient-to-br ${friend.gradient} border-2 border-primary`}
                    />
                    <span className="text-xs text-foreground/60">{friend.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
