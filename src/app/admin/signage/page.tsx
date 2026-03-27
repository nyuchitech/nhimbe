"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Users,
  Calendar,
  TrendingUp,
  BarChart3,
  Activity,
  Shield,
  Globe,
  Clock,
  UserCheck,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  getEvents,
  getCommunityStats,
  requestKioskPairing,
  getKioskPairingStatus,
  getKioskSession,
  type Event,
  type CommunityStats,
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
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 4v6h6M23 20v-6h-6" />
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
      </svg>
    </button>
  );
}

function SignageFooter() {
  return (
    <div className="text-xs text-white/30">
      Powered by <span className="text-white/50 font-semibold">nhimbe</span> &middot; A Mukoko Product
    </div>
  );
}

// ─── Pairing Screen ─────────────────────────────────────────────────────────
function PairingScreen({ onPaired }: { onPaired: (session: KioskSession) => void }) {
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
          localStorage.setItem("nhimbe_signage_admin_token", status.sessionToken);
          onPaired(session);
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
        <p className="text-white/60 mb-10">Enter this code in the admin dashboard to pair this display</p>

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

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {subtitle && <div className="text-xs text-white/40 mt-1">{subtitle}</div>}
    </div>
  );
}

// ─── Admin Dashboard Content ─────────────────────────────────────────────────
function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { orientation, setOrientation } = useOrientation();

  const loadData = useCallback(async () => {
    try {
      const [eventsData, statsData] = await Promise.all([
        getEvents({ limit: 20 }),
        getCommunityStats().catch(() => null),
      ]);
      setEvents(eventsData.events);
      if (statsData) setStats(statsData);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white/50 animate-spin" />
      </div>
    );
  }

  // Compute analytics from events
  const totalAttendees = events.reduce((sum, e) => sum + e.attendeeCount, 0);
  const uniqueHosts = new Set(events.map((e) => e.organizer?.name)).size;
  const uniqueCities = new Set(events.map((e) => e.location.addressLocality)).size;
  const categories = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {});
  const topCategories = Object.entries(categories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  // Upcoming vs past
  const now = new Date().toISOString();
  const upcoming = events.filter((e) => e.startDate >= now);
  const recent = events.filter((e) => e.startDate < now).slice(0, 5);

  return (
    <>
      <OrientationToggle orientation={orientation} onChange={setOrientation} />
      {orientation === "horizontal" ? (
        <HorizontalAdmin
          events={events}
          stats={stats}
          totalAttendees={totalAttendees}
          uniqueHosts={uniqueHosts}
          uniqueCities={uniqueCities}
          topCategories={topCategories}
          upcoming={upcoming}
          recent={recent}
        />
      ) : (
        <VerticalAdmin
          events={events}
          stats={stats}
          totalAttendees={totalAttendees}
          uniqueHosts={uniqueHosts}
          uniqueCities={uniqueCities}
          topCategories={topCategories}
          upcoming={upcoming}
          recent={recent}
        />
      )}
    </>
  );
}

interface AdminLayoutProps {
  events: Event[];
  stats: CommunityStats | null;
  totalAttendees: number;
  uniqueHosts: number;
  uniqueCities: number;
  topCategories: [string, number][];
  upcoming: Event[];
  recent: Event[];
}

// ─── Horizontal Admin ────────────────────────────────────────────────────────
function HorizontalAdmin({
  events, stats, totalAttendees, uniqueHosts, uniqueCities,
  topCategories, upcoming, recent,
}: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col text-white">
      <header className="px-10 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">nhimbe Admin</h1>
            <p className="text-xs text-white/40">Platform Analytics Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/40">
          <Activity className="w-4 h-4 text-green-400 animate-pulse" />
          Live
        </div>
      </header>

      <div className="flex-1 flex p-6 gap-6">
        {/* Left: Metrics + category breakdown */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Top metrics row */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard icon={Calendar} label="Total Events" value={stats?.totalEvents ?? events.length} color="text-white" />
            <MetricCard icon={Users} label="Total Attendees" value={stats?.totalAttendees ?? totalAttendees} color="text-primary" />
            <MetricCard icon={UserCheck} label="Active Hosts" value={stats?.activeHosts ?? uniqueHosts} color="text-green-400" />
            <MetricCard icon={Globe} label="Cities" value={uniqueCities} color="text-blue-400" />
          </div>

          {/* Category breakdown */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5">
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-4">Events by Category</h3>
            <div className="space-y-3">
              {topCategories.map(([cat, count]) => {
                const pct = events.length > 0 ? Math.round((count / events.length) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{cat}</span>
                      <span className="text-white/50">{count} events ({pct}%)</span>
                    </div>
                    <Progress value={pct} className="h-2 rounded-full" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trending from stats */}
          {stats && stats.trendingCategories.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5">
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Trending Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.trendingCategories.map((cat) => (
                  <Badge key={cat.category} variant="secondary" className="bg-white/10 text-white/80 border-none">
                    {cat.category}
                    <span className="ml-1 text-green-400">+{cat.change}%</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Peak time */}
          {stats?.peakTime && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 flex items-center gap-4">
              <Clock className="w-6 h-6 text-yellow-400" />
              <div>
                <div className="text-xs text-white/40">Peak Activity Time</div>
                <div className="text-lg font-semibold">{stats.peakTime}</div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Event feeds */}
        <div className="w-80 flex flex-col gap-4">
          <div className="flex-1 bg-white/5 backdrop-blur-sm rounded-xl p-5 overflow-y-auto">
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">
              Upcoming Events ({upcoming.length})
            </h3>
            <div className="space-y-3">
              {upcoming.slice(0, 8).map((event) => (
                <div key={event.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {event.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{event.name}</div>
                    <div className="text-xs text-white/40">{event.date.full}</div>
                  </div>
                  <div className="text-xs text-white/50 shrink-0">{event.attendeeCount}</div>
                </div>
              ))}
              {upcoming.length === 0 && (
                <p className="text-white/30 text-sm text-center py-4">No upcoming events</p>
              )}
            </div>
          </div>

          {recent.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 overflow-y-auto max-h-[30vh]">
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">Recent Events</h3>
              <div className="space-y-2">
                {recent.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
                    <div className="text-sm truncate flex-1">{event.name}</div>
                    <Badge variant="secondary" className="bg-white/10 text-white/60 border-none text-xs shrink-0">
                      {event.attendeeCount}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="px-10 py-3 border-t border-white/10"><SignageFooter /></footer>
    </div>
  );
}

// ─── Vertical Admin ──────────────────────────────────────────────────────────
function VerticalAdmin({
  events, stats, totalAttendees, uniqueHosts, uniqueCities,
  topCategories, upcoming,
}: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex flex-col text-white">
      <header className="px-6 py-5 text-center border-b border-white/10">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-primary" />
          <Activity className="w-3 h-3 text-green-400 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold">nhimbe Admin</h1>
        <p className="text-xs text-white/40 mt-1">Platform Analytics</p>
      </header>

      <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard icon={Calendar} label="Events" value={stats?.totalEvents ?? events.length} color="text-white" />
          <MetricCard icon={Users} label="Attendees" value={stats?.totalAttendees ?? totalAttendees} color="text-primary" />
          <MetricCard icon={UserCheck} label="Hosts" value={stats?.activeHosts ?? uniqueHosts} color="text-green-400" />
          <MetricCard icon={Globe} label="Cities" value={uniqueCities} color="text-blue-400" />
        </div>

        {/* Category breakdown */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4">
          <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">Top Categories</h3>
          <div className="space-y-2">
            {topCategories.slice(0, 4).map(([cat, count]) => {
              const pct = events.length > 0 ? Math.round((count / events.length) * 100) : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{cat}</span>
                    <span className="text-white/50">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2 rounded-full" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Trending */}
        {stats && stats.trendingCategories.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4">
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Trending</h3>
            <div className="flex flex-wrap gap-2">
              {stats.trendingCategories.slice(0, 4).map((cat) => (
                <Badge key={cat.category} variant="secondary" className="bg-white/10 text-white/80 border-none text-xs">
                  {cat.category} <span className="text-green-400">+{cat.change}%</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming events */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 flex-1 overflow-y-auto">
          <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">
            Upcoming ({upcoming.length})
          </h3>
          <div className="space-y-2">
            {upcoming.slice(0, 6).map((event) => (
              <div key={event.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {event.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{event.name}</div>
                  <div className="text-xs text-white/40">{event.date.full}</div>
                </div>
              </div>
            ))}
          </div>
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
    return <PairingScreen onPaired={setSession} />;
  }

  return <AdminDashboard />;
}
