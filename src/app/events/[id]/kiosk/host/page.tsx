"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Search,
  ArrowLeft,
  Loader2,
  Users,
  UserCheck,
  Clock,
  RefreshCw,
  ChevronRight,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FilterBar } from "@/components/ui/filter-bar";
import { AuthGuard } from "@/components/auth/auth-guard";
import {
  getEventById,
  getEventRegistrations,
  checkinRegistration,
  getCheckinStats,
  type Event,
  type Registration,
  type CheckinStats,
} from "@/lib/api";

function HostKioskContent() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("unchecked");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const [lastCheckin, setLastCheckin] = useState<{ name: string; time: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [eventData, regs, checkinStats] = await Promise.all([
        getEventById(id),
        getEventRegistrations(id),
        getCheckinStats(id),
      ]);
      if (eventData) setEvent(eventData.event);
      setRegistrations(regs);
      setStats(checkinStats);
    } catch {
      // Silently handle
    }
  }, [id]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [regs, checkinStats] = await Promise.all([
          getEventRegistrations(id),
          getCheckinStats(id),
        ]);
        setRegistrations(regs);
        setStats(checkinStats);
      } catch {
        // Ignore
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCheckin = useCallback(
    async (registration: Registration) => {
      if (checking) return;
      setChecking(registration.id);
      try {
        await checkinRegistration(id, registration.id);
        setLastCheckin({
          name: registration.userName || "Guest",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
        // Update local state
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === registration.id
              ? { ...r, status: "attended", checkedInAt: new Date().toISOString() }
              : r
          )
        );
        // Refresh stats
        const checkinStats = await getCheckinStats(id);
        setStats(checkinStats);
      } catch {
        // Error handled silently — the button state resets
      } finally {
        setChecking(null);
      }
    },
    [id, checking]
  );

  // Filter and search
  const filtered = registrations
    .filter((r) => {
      if (r.status === "cancelled") return false;
      if (filter === "unchecked") return !r.checkedInAt;
      if (filter === "checked") return !!r.checkedInAt;
      return true; // "all"
    })
    .filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.userName?.toLowerCase().includes(q) ||
        r.userEmail?.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });

  const uncheckedCount = registrations.filter((r) => !r.checkedInAt && r.status !== "cancelled").length;
  const checkedCount = registrations.filter((r) => !!r.checkedInAt).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Event not found</h1>
          <Button asChild variant="secondary">
            <Link href="/events">Back to events</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-elevated px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/events/${id}/manage`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{event.name}</h1>
            <p className="text-sm text-text-secondary">Host Check-In Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/events/${id}/kiosk`} className="gap-2">
              <Monitor className="w-4 h-4" />
              Guest Kiosk
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Stats sidebar */}
        <aside className="lg:w-80 border-b lg:border-b-0 lg:border-r border-elevated p-6 space-y-6">
          {/* Live stats */}
          {stats && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">Check-in Progress</span>
                  <span className="text-2xl font-bold text-primary">{stats.rate}%</span>
                </div>
                <Progress value={stats.rate} className="h-3" />
                <div className="flex justify-between mt-2 text-xs text-text-tertiary">
                  <span>{stats.attended} checked in</span>
                  <span>{stats.remaining} remaining</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface rounded-xl p-3 text-center">
                  <Users className="w-5 h-5 mx-auto mb-1 text-text-tertiary" />
                  <div className="text-xl font-bold">{stats.total}</div>
                  <div className="text-xs text-text-tertiary">Total</div>
                </div>
                <div className="bg-surface rounded-xl p-3 text-center">
                  <UserCheck className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <div className="text-xl font-bold text-primary">{stats.attended}</div>
                  <div className="text-xs text-text-tertiary">In</div>
                </div>
                <div className="bg-surface rounded-xl p-3 text-center">
                  <Clock className="w-5 h-5 mx-auto mb-1 text-text-tertiary" />
                  <div className="text-xl font-bold">{stats.remaining}</div>
                  <div className="text-xs text-text-tertiary">Pending</div>
                </div>
              </div>
            </>
          )}

          {/* Last check-in */}
          {lastCheckin && (
            <div className="bg-primary/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-xs text-text-secondary">Last check-in</span>
              </div>
              <div className="font-semibold">{lastCheckin.name}</div>
              <div className="text-xs text-text-tertiary">{lastCheckin.time}</div>
            </div>
          )}

          {/* Quick link to guest-facing kiosk */}
          <Link
            href={`/events/${id}/kiosk`}
            className="flex items-center justify-between p-4 bg-surface rounded-xl hover:bg-elevated transition-colors"
          >
            <div>
              <div className="font-medium text-sm">Open Guest Kiosk</div>
              <div className="text-xs text-text-tertiary">
                Self-service check-in for attendees
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-tertiary" />
          </Link>
        </aside>

        {/* Guest list */}
        <main className="flex-1 p-6">
          {/* Search and filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search guests..."
                className="pl-10"
                autoFocus
              />
            </div>
            <FilterBar
              options={[
                { id: "unchecked", label: `Not checked in (${uncheckedCount})` },
                { id: "checked", label: `Checked in (${checkedCount})` },
              ]}
              selected={[filter]}
              onChange={(sel) => setFilter(sel.length > 0 ? sel[0] : "all")}
              mode="single"
              showAll
            />
          </div>

          {/* Guest list */}
          <div className="space-y-1">
            {filtered.length > 0 ? (
              filtered.map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        reg.checkedInAt
                          ? "bg-primary text-primary-foreground"
                          : "bg-elevated text-text-tertiary"
                      }`}
                    >
                      {(reg.userName || "G")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {reg.userName || "Guest"}
                      </div>
                      {reg.userEmail && (
                        <div className="text-xs text-text-tertiary truncate">
                          {reg.userEmail}
                        </div>
                      )}
                    </div>
                  </div>

                  {reg.checkedInAt ? (
                    <Badge variant="success" className="shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Checked in
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleCheckin(reg)}
                      disabled={!!checking}
                      className="shrink-0"
                    >
                      {checking === reg.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Check In"
                      )}
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-text-secondary">
                <Users className="w-10 h-10 mx-auto mb-3 text-text-tertiary" />
                <p className="font-medium">
                  {search ? "No matching guests" : "No guests in this view"}
                </p>
                <p className="text-sm text-text-tertiary mt-1">
                  {search
                    ? "Try a different search term"
                    : filter === "unchecked"
                      ? "Everyone has been checked in!"
                      : "No guests to display"}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function HostKioskPage() {
  return (
    <AuthGuard>
      <HostKioskContent />
    </AuthGuard>
  );
}
