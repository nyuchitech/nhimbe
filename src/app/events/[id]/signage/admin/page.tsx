"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  BarChart3,
  Activity,
  Shield,
} from "lucide-react";
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

// ─── Pairing Screen ─────────────────────────────────────────────────────────
function PairingScreen({ onPaired }: { onPaired: (session: KioskSession, token: string) => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const requestCode = useCallback(async () => {
    try {
      setError(null);
      const result = await requestKioskPairing("signage-admin");
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
          localStorage.setItem("nhimbe_signage_admin_token", status.sessionToken);
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
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Admin Signage Display</h1>
        <p className="text-white/60 mb-10">Enter this code in your admin dashboard to pair this screen</p>

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

// ─── Admin Signage Content ───────────────────────────────────────────────────
function AdminSignageContent({ session }: { session: KioskSession }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const { orientation, setOrientation } = useOrientation();

  const loadData = useCallback(async () => {
    const [eventData, checkinStats, regs] = await Promise.all([
      getEventById(session.eventId),
      getCheckinStats(session.eventId).catch(() => null),
      getEventRegistrations(session.eventId).catch(() => []),
    ]);
    if (eventData) setEvent(eventData.event);
    if (checkinStats) setStats(checkinStats);
    setRegistrations(regs);
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

  // Compute analytics
  const total = registrations.filter((r) => r.status !== "cancelled").length;
  const attended = registrations.filter((r) => r.checkedInAt).length;
  const cancelled = registrations.filter((r) => r.status === "cancelled").length;
  const pending = total - attended;
  const recentRegistrations = registrations
    .filter((r) => r.status !== "cancelled")
    .sort((a, b) => (b.registeredAt || "").localeCompare(a.registeredAt || ""))
    .slice(0, 8);
  const recentCheckins = registrations
    .filter((r) => r.checkedInAt)
    .sort((a, b) => (b.checkedInAt || "").localeCompare(a.checkedInAt || ""))
    .slice(0, 8);

  return (
    <>
      <OrientationToggle orientation={orientation} onChange={setOrientation} />
      {orientation === "horizontal" ? (
        <HorizontalAdminSignage
          event={event}
          stats={stats}
          total={total}
          attended={attended}
          cancelled={cancelled}
          pending={pending}
          recentRegistrations={recentRegistrations}
          recentCheckins={recentCheckins}
        />
      ) : (
        <VerticalAdminSignage
          event={event}
          stats={stats}
          total={total}
          attended={attended}
          cancelled={cancelled}
          pending={pending}
          recentRegistrations={recentRegistrations}
          recentCheckins={recentCheckins}
        />
      )}
    </>
  );
}

interface AdminSignageProps {
  event: Event;
  stats: CheckinStats | null;
  total: number;
  attended: number;
  cancelled: number;
  pending: number;
  recentRegistrations: Registration[];
  recentCheckins: Registration[];
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-white/50 mt-1">{label}</div>
    </div>
  );
}

// ─── Horizontal Admin Signage ────────────────────────────────────────────────
function HorizontalAdminSignage({
  event, stats, total, attended, cancelled, pending,
  recentRegistrations, recentCheckins,
}: AdminSignageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col text-white">
      {/* Header */}
      <header className="px-10 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <p className="text-sm text-white/50">{event.date.full} &middot; {event.location.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/40">
          <Activity className="w-4 h-4 text-green-400 animate-pulse" />
          Live Dashboard
        </div>
      </header>

      <div className="flex-1 flex p-6 gap-6">
        {/* Left column: metrics grid */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Metrics row */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard icon={Users} label="Registered" value={total} color="text-white" />
            <MetricCard icon={UserCheck} label="Checked In" value={attended} color="text-green-400" />
            <MetricCard icon={Clock} label="Pending" value={pending} color="text-yellow-400" />
            <MetricCard icon={BarChart3} label="Cancelled" value={cancelled} color="text-red-400" />
          </div>

          {/* Check-in rate bar */}
          {stats && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-white/60">Check-in Progress</span>
                <span className="text-2xl font-bold text-primary">{stats.rate}%</span>
              </div>
              <Progress value={stats.rate} className="h-4 rounded-full" />
              <div className="flex justify-between mt-2 text-xs text-white/40">
                <span>{stats.attended} of {stats.total}</span>
                <span>{stats.remaining} remaining</span>
              </div>
            </div>
          )}

          {/* Countdown */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5">
            <div className="text-sm text-white/50 mb-3">Event Countdown</div>
            <CountdownTimer startDate={event.startDate} />
          </div>

          {/* Capacity */}
          {event.maximumAttendeeCapacity && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Capacity</span>
                <span className="text-white/40">{total}/{event.maximumAttendeeCapacity}</span>
              </div>
              <Progress value={(total / event.maximumAttendeeCapacity) * 100} className="h-3 rounded-full" />
              <div className="text-xs text-white/40 mt-2">
                {event.maximumAttendeeCapacity - total > 0
                  ? `${event.maximumAttendeeCapacity - total} spots left`
                  : "Full capacity"}
              </div>
            </div>
          )}
        </div>

        {/* Right column: feeds */}
        <div className="w-80 flex flex-col gap-4">
          <div className="flex-1 bg-white/5 backdrop-blur-sm rounded-xl p-5 overflow-y-auto">
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">Recent Check-ins</h3>
            {recentCheckins.length > 0 ? (
              <div className="space-y-2">
                {recentCheckins.map((reg) => (
                  <div key={reg.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs font-bold">
                      {(reg.userName || "G")[0]}
                    </div>
                    <span className="text-sm truncate">{reg.userName || "Guest"}</span>
                    <UserCheck className="w-3 h-3 text-green-400 ml-auto shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-sm">No check-ins yet</p>
            )}
          </div>

          <div className="flex-1 bg-white/5 backdrop-blur-sm rounded-xl p-5 overflow-y-auto">
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">Recent Registrations</h3>
            {recentRegistrations.length > 0 ? (
              <div className="space-y-2">
                {recentRegistrations.map((reg) => (
                  <div key={reg.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {(reg.userName || "G")[0]}
                    </div>
                    <span className="text-sm truncate">{reg.userName || "Guest"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-sm">No registrations yet</p>
            )}
          </div>
        </div>
      </div>

      <footer className="px-10 py-3 border-t border-white/10"><SignageFooter /></footer>
    </div>
  );
}

// ─── Vertical Admin Signage ──────────────────────────────────────────────────
function VerticalAdminSignage({
  event, stats, total, attended, cancelled, pending,
  recentCheckins, recentRegistrations,
}: AdminSignageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex flex-col text-white">
      {/* Header */}
      <header className="px-6 py-5 text-center border-b border-white/10">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-xs text-white/40">Live Dashboard</span>
        </div>
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <p className="text-sm text-white/50 mt-1">{event.date.full}</p>
      </header>

      <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard icon={Users} label="Registered" value={total} color="text-white" />
          <MetricCard icon={UserCheck} label="Checked In" value={attended} color="text-green-400" />
          <MetricCard icon={Clock} label="Pending" value={pending} color="text-yellow-400" />
          <MetricCard icon={BarChart3} label="Cancelled" value={cancelled} color="text-red-400" />
        </div>

        {/* Check-in rate */}
        {stats && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Check-in Rate</span>
              <span className="text-xl font-bold text-primary">{stats.rate}%</span>
            </div>
            <Progress value={stats.rate} className="h-3 rounded-full" />
          </div>
        )}

        {/* Countdown */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 flex justify-center">
          <CountdownTimer startDate={event.startDate} />
        </div>

        {/* Recent check-ins */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4">
          <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">Recent Check-ins</h3>
          {recentCheckins.length > 0 ? (
            <div className="space-y-2">
              {recentCheckins.slice(0, 5).map((reg) => (
                <div key={reg.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs font-bold">
                    {(reg.userName || "G")[0]}
                  </div>
                  <span className="text-sm truncate flex-1">{reg.userName || "Guest"}</span>
                  <UserCheck className="w-3 h-3 text-green-400 shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm text-center">No check-ins yet</p>
          )}
        </div>

        {/* Recent registrations */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4">
          <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">Recent Registrations</h3>
          {recentRegistrations.length > 0 ? (
            <div className="space-y-2">
              {recentRegistrations.slice(0, 5).map((reg) => (
                <div key={reg.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {(reg.userName || "G")[0]}
                  </div>
                  <span className="text-sm truncate flex-1">{reg.userName || "Guest"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm text-center">No registrations yet</p>
          )}
        </div>
      </div>

      <footer className="px-6 py-3 text-center border-t border-white/10"><SignageFooter /></footer>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminSignagePage() {
  const [session, setSession] = useState<KioskSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkExisting() {
      const token = localStorage.getItem("nhimbe_signage_admin_token");
      if (token) {
        try {
          const { session: existing } = await getKioskSession(token);
          setSession(existing);
        } catch {
          localStorage.removeItem("nhimbe_signage_admin_token");
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

  return <AdminSignageContent session={session} />;
}
