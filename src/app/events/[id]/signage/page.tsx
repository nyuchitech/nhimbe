"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Users, UserCheck, Clock, TrendingUp, RotateCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  getEventById,
  getCheckinStats,
  getEventRegistrations,
  requestKioskPairing,
  getKioskPairingStatus,
  getKioskSession,
  type Event,
  type CheckinStats,
  type Registration,
  type KioskSession,
} from "@/lib/api";

type Orientation = "horizontal" | "vertical";

function useOrientation(): { orientation: Orientation; setOrientation: (o: Orientation) => void } {
  const [orientation, setOrientation] = useState<Orientation>(() => {
    if (typeof window === "undefined") return "horizontal";
    return window.innerHeight > window.innerWidth ? "vertical" : "horizontal";
  });
  return { orientation, setOrientation };
}

function OrientationToggle({
  orientation,
  onChange,
}: {
  orientation: Orientation;
  onChange: (o: Orientation) => void;
}) {
  return (
    <button
      onClick={() => onChange(orientation === "horizontal" ? "vertical" : "horizontal")}
      className="fixed top-4 right-4 z-40 bg-black/40 hover:bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors"
      title={`Switch to ${orientation === "horizontal" ? "vertical" : "horizontal"} layout`}
    >
      <RotateCcw className="w-4 h-4" />
    </button>
  );
}

function SignageFooter() {
  return (
    <div className="text-xs text-white/40">
      Powered by <span className="text-white/60 font-semibold">nhimbe</span> &middot; A Mukoko Product
    </div>
  );
}

// ─── Cover Background ────────────────────────────────────────────────────────
function CoverBackground({
  event,
  children,
  className = "",
}: {
  event: Event;
  children: React.ReactNode;
  className?: string;
}) {
  const bgStyle = event.image
    ? { backgroundImage: `url(${event.image})`, backgroundSize: "cover", backgroundPosition: "center" }
    : event.coverGradient
      ? { background: event.coverGradient }
      : { background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" };

  return (
    <div className={`relative ${className}`} style={bgStyle}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ─── Countdown Timer ─────────────────────────────────────────────────────────
function CountdownTimer({ startDate }: { startDate: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const target = new Date(startDate).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return <div className="text-2xl font-bold text-green-400">Happening Now</div>;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const units = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Mins", value: minutes },
    { label: "Secs", value: seconds },
  ];

  return (
    <div className="flex gap-4">
      {units.map((unit) => (
        <div key={unit.label} className="text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[72px]">
            <div className="text-3xl font-bold text-white font-mono">
              {unit.value.toString().padStart(2, "0")}
            </div>
          </div>
          <div className="text-xs text-white/60 mt-1">{unit.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Pairing Screen ─────────────────────────────────────────────────────────
function PairingScreen({ onPaired }: { onPaired: (session: KioskSession, token: string) => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const requestCode = useCallback(async () => {
    try {
      setError(null);
      const result = await requestKioskPairing("signage-host");
      setCode(result.code);
      setExpiresAt(Date.now() + result.expiresIn * 1000);
    } catch {
      setError("Failed to generate pairing code.");
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
  useEffect(() => { requestCode(); }, [requestCode]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) { clearInterval(interval); setCode(null); requestCode(); }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, requestCode]);

  useEffect(() => {
    if (!code) return;
    const interval = setInterval(async () => {
      try {
        const status = await getKioskPairingStatus(code);
        if (status.status === "confirmed" && status.sessionToken) {
          clearInterval(interval);
          const { session } = await getKioskSession(status.sessionToken);
          localStorage.setItem("nhimbe_signage_host_token", status.sessionToken);
          onPaired(session, status.sessionToken);
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [code, onPaired]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-lg text-white">
        <div className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-white/10 flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Event Signage Display</h1>
        <p className="text-white/60 mb-10">Enter this code in your event dashboard to pair this screen</p>

        {error ? (
          <p className="text-red-400">{error}</p>
        ) : code ? (
          <>
            <div className="flex justify-center gap-3 mb-6">
              {code.split("").map((char, i) => (
                <div key={i} className="w-16 h-20 bg-white/10 rounded-xl flex items-center justify-center text-3xl font-mono font-bold border-2 border-white/20">
                  {char}
                </div>
              ))}
            </div>
            <p className="text-sm text-white/40">
              Expires in {minutes}:{seconds.toString().padStart(2, "0")}
            </p>
          </>
        ) : (
          <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
        )}
      </div>
      <footer className="absolute bottom-6"><SignageFooter /></footer>
    </div>
  );
}

// ─── Stats Panel ─────────────────────────────────────────────────────────────
function StatsPanel({ stats, layout }: { stats: CheckinStats | null; layout: "row" | "column" }) {
  if (!stats) return null;

  const statItems = [
    { icon: Users, label: "Total", value: stats.total, color: "text-white" },
    { icon: UserCheck, label: "Checked In", value: stats.attended, color: "text-green-400" },
    { icon: Clock, label: "Remaining", value: stats.remaining, color: "text-yellow-400" },
  ];

  return (
    <div className={`flex ${layout === "column" ? "flex-col gap-4" : "gap-8"}`}>
      {statItems.map((item) => (
        <div key={item.label} className="text-center">
          <item.icon className={`w-6 h-6 mx-auto mb-1 ${item.color}`} />
          <div className={`text-3xl font-bold ${item.color}`}>{item.value}</div>
          <div className="text-xs text-white/50">{item.label}</div>
        </div>
      ))}
      <div className="text-center">
        <div className="text-3xl font-bold text-primary">{stats.rate}%</div>
        <Progress value={stats.rate} className="w-24 h-2 mt-2 mx-auto" />
        <div className="text-xs text-white/50 mt-1">Check-in Rate</div>
      </div>
    </div>
  );
}

// ─── Recent Check-ins Feed ───────────────────────────────────────────────────
function RecentCheckinsFeed({ checkins }: { checkins: Registration[] }) {
  if (checkins.length === 0) {
    return (
      <div className="text-center text-white/40 py-8">
        <p>No check-ins yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">Recent Check-ins</h3>
      {checkins.map((reg) => (
        <div key={reg.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-bold">
            {(reg.userName || "G")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-medium truncate">{reg.userName || "Guest"}</div>
          </div>
          <UserCheck className="w-4 h-4 text-green-400 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Host Signage Content ────────────────────────────────────────────────────
function HostSignageContent({ session }: { session: KioskSession }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<Registration[]>([]);
  const { orientation, setOrientation } = useOrientation();

  const loadData = useCallback(async () => {
    const [eventData, checkinStats, regs] = await Promise.all([
      getEventById(session.eventId),
      getCheckinStats(session.eventId).catch(() => null),
      getEventRegistrations(session.eventId).catch(() => []),
    ]);
    if (eventData) setEvent(eventData.event);
    if (checkinStats) setStats(checkinStats);
    const attended = regs
      .filter((r) => r.checkedInAt)
      .sort((a, b) => (b.checkedInAt || "").localeCompare(a.checkedInAt || ""))
      .slice(0, 10);
    setRecentCheckins(attended);
  }, [session.eventId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (!event) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white/50 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <OrientationToggle orientation={orientation} onChange={setOrientation} />
      {orientation === "horizontal" ? (
        <CoverBackground event={event} className="min-h-screen flex flex-col">
          <header className="px-12 py-6 flex items-center justify-between">
            <div className="text-white">
              <h1 className="text-3xl font-bold">{event.name}</h1>
              <p className="text-white/60">{event.date.full} &middot; {event.date.time}</p>
            </div>
            <StatsPanel stats={stats} layout="row" />
          </header>
          <div className="flex-1 flex px-12 pb-6 gap-8">
            <div className="flex-1 flex flex-col justify-center">
              <CountdownTimer startDate={event.startDate} />
              <div className="mt-8 text-white/60">
                <p className="text-lg">{event.location.name}, {event.location.addressLocality}</p>
                {event.organizer && <p className="mt-1">Hosted by {event.organizer.name}</p>}
              </div>
            </div>
            <div className="w-80 bg-black/30 backdrop-blur-sm rounded-2xl p-6 overflow-y-auto max-h-[70vh]">
              <RecentCheckinsFeed checkins={recentCheckins} />
            </div>
          </div>
          <footer className="px-12 py-4"><SignageFooter /></footer>
        </CoverBackground>
      ) : (
        <CoverBackground event={event} className="min-h-screen flex flex-col">
          <header className="px-8 py-6 text-center text-white">
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <p className="text-white/60 mt-1">{event.date.full} &middot; {event.date.time}</p>
            <p className="text-white/40 text-sm">{event.location.name}, {event.location.addressLocality}</p>
          </header>
          <div className="px-8 py-4 flex justify-center">
            <StatsPanel stats={stats} layout="row" />
          </div>
          <div className="px-8 py-4 flex justify-center">
            <CountdownTimer startDate={event.startDate} />
          </div>
          <div className="flex-1 px-8 pb-6 overflow-y-auto">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 max-h-[50vh] overflow-y-auto">
              <RecentCheckinsFeed checkins={recentCheckins} />
            </div>
          </div>
          <footer className="px-8 py-4 text-center"><SignageFooter /></footer>
        </CoverBackground>
      )}
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function EventSignagePage() {
  const [session, setSession] = useState<KioskSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkExisting() {
      const token = localStorage.getItem("nhimbe_signage_host_token");
      if (token) {
        try {
          const { session: existing } = await getKioskSession(token);
          setSession(existing);
        } catch {
          localStorage.removeItem("nhimbe_signage_host_token");
        }
      }
      setChecking(false);
    }
    checkExisting();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white/50 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <PairingScreen onPaired={(s) => setSession(s)} />;
  }

  return <HostSignageContent session={session} />;
}
