"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Calendar,
  TrendingUp,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://mukoko-nhimbe-api.nyuchi.workers.dev";

interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  totalRegistrations: number;
  activeEvents: number;
  userGrowth: number;
  eventGrowth: number;
  recentViews: number;
  viewsGrowth: number;
}

interface RecentEvent {
  id: string;
  name: string;
  date: string;
  attendeeCount: number;
  status: "upcoming" | "ongoing" | "past";
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: "open" | "pending" | "resolved";
  createdAt: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalEvents: 0,
    totalRegistrations: 0,
    activeEvents: 0,
    userGrowth: 0,
    eventGrowth: 0,
    recentViews: 0,
    viewsGrowth: 0,
  });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setStats(prev => data.stats || prev);
        setRecentEvents(data.recentEvents || []);
        setRecentUsers(data.recentUsers || []);
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      change: stats.userGrowth,
      icon: Users,
      href: "/admin/users",
    },
    {
      title: "Total Events",
      value: stats.totalEvents,
      change: stats.eventGrowth,
      icon: Calendar,
      href: "/admin/events",
    },
    {
      title: "Active Events",
      value: stats.activeEvents,
      change: null,
      icon: TrendingUp,
      href: "/admin/events?status=active",
    },
    {
      title: "Page Views (30d)",
      value: stats.recentViews,
      change: stats.viewsGrowth,
      icon: Eye,
      href: "/admin/analytics",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-text-secondary">
          Welcome to the nhimbe admin dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change && stat.change > 0;
          const isNegative = stat.change && stat.change < 0;

          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    {stat.change !== null && (
                      <div
                        className={`flex items-center gap-1 text-sm ${
                          isPositive
                            ? "text-green-400"
                            : isNegative
                            ? "text-red-400"
                            : "text-text-tertiary"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : isNegative ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : null}
                        <span>{Math.abs(stat.change)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {stat.value.toLocaleString()}
                  </div>
                  <div className="text-sm text-text-secondary">{stat.title}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Events</CardTitle>
            <Link
              href="/admin/events"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <p className="text-text-tertiary text-center py-8">
                No events found
              </p>
            ) : (
              <div className="space-y-4">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-elevated"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{event.name}</div>
                      <div className="text-sm text-text-tertiary">
                        {event.date}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-text-secondary">
                        {event.attendeeCount} RSVPs
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.status === "upcoming"
                            ? "bg-primary/20 text-primary"
                            : event.status === "ongoing"
                            ? "bg-accent/20 text-accent"
                            : "bg-elevated text-text-tertiary"
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Users</CardTitle>
            <Link
              href="/admin/users"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-text-tertiary text-center py-8">
                No users found
              </p>
            ) : (
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-elevated"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-sm font-bold text-background">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.name}</div>
                      <div className="text-sm text-text-tertiary truncate">
                        {user.email}
                      </div>
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {user.createdAt}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Support Tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Support Tickets</CardTitle>
          <Link
            href="/admin/support"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-text-secondary">All tickets resolved</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-text-tertiary border-b border-elevated">
                    <th className="pb-3 font-medium">Subject</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-elevated">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-elevated/50">
                      <td className="py-3 pr-4">
                        <span className="font-medium">{ticket.subject}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            ticket.status === "open"
                              ? "bg-red-500/20 text-red-400"
                              : ticket.status === "pending"
                              ? "bg-accent/20 text-accent"
                              : "bg-green-500/20 text-green-400"
                          }`}
                        >
                          {ticket.status === "open" && (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {ticket.status === "pending" && (
                            <Clock className="w-3 h-3" />
                          )}
                          {ticket.status === "resolved" && (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          {ticket.status}
                        </span>
                      </td>
                      <td className="py-3 text-text-tertiary text-sm">
                        {ticket.createdAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
