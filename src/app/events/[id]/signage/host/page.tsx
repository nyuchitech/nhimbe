"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, Users, UserCheck, Clock, TrendingUp } from "lucide-react";
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
import {
  OrientationToggle,
  SignageFooter,
  CoverBackground,
  CountdownTimer,
  useOrientation,
} from "../signage-layouts";

// ─── Pairing Screen (reused pattern) ────────────────────────────────────────
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
        <h1 className="text-3xl font-bold mb-2">Host Signage Display</h1>
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

// ─── Host Signage Content ────────────────────────────────────────────────────
function HostSignageContent({ session }: { session: KioskSession }) {
  const { id } = useParams<{ id: string }>();
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
    // Show recently checked-in guests (last 10)
    const attended = regs
      .filter((r) => r.checkedInAt)
      .sort((a, b) => (b.checkedInAt || "").localeCompare(a.checkedInAt || ""))
      .slice(0, 10);
    setRecentCheckins(attended);
  }, [session.eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 10s
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
        <HorizontalHostSignage event={event} stats={stats} recentCheckins={recentCheckins} />
      ) : (
        <VerticalHostSignage event={event} stats={stats} recentCheckins={recentCheckins} />
      )}
    </>
  );
}

// ─── Stats Panel ─────────────────────────────────────────────────────────────
function StatsPanel({
  stats,
  layout,
}: {
  stats: CheckinStats | null;
  layout: "row" | "column";
}) {
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

// ─── Horizontal Host Signage ─────────────────────────────────────────────────
function HorizontalHostSignage({
  event,
  stats,
  recentCheckins,
}: {
  event: Event;
  stats: CheckinStats | null;
  recentCheckins: Registration[];
}) {
  return (
    <CoverBackground event={event} className="min-h-screen flex flex-col">
      <header className="px-12 py-6 flex items-center justify-between">
        <div className="text-white">
          <h1 className="text-3xl font-bold">{event.name}</h1>
          <p className="text-white/60">{event.date.full} &middot; {event.date.time}</p>
        </div>
        <StatsPanel stats={stats} layout="row" />
      </header>

      <div className="flex-1 flex px-12 pb-6 gap-8">
        {/* Left: countdown + key info */}
        <div className="flex-1 flex flex-col justify-center">
          <CountdownTimer startDate={event.startDate} />
          <div className="mt-8 text-white/60">
            <p className="text-lg">{event.location.name}, {event.location.addressLocality}</p>
            {event.organizer && <p className="mt-1">Hosted by {event.organizer.name}</p>}
          </div>
        </div>

        {/* Right: recent check-ins */}
        <div className="w-80 bg-black/30 backdrop-blur-sm rounded-2xl p-6 overflow-y-auto max-h-[70vh]">
          <RecentCheckinsFeed checkins={recentCheckins} />
        </div>
      </div>

      <footer className="px-12 py-4"><SignageFooter /></footer>
    </CoverBackground>
  );
}

// ─── Vertical Host Signage ───────────────────────────────────────────────────
function VerticalHostSignage({
  event,
  stats,
  recentCheckins,
}: {
  event: Event;
  stats: CheckinStats | null;
  recentCheckins: Registration[];
}) {
  return (
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
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function HostSignagePage() {
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
    return (
      <PairingScreen
        onPaired={(s, token) => {
          setSession(s);
        }}
      />
    );
  }

  return <HostSignageContent session={session} />;
}
