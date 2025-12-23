"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Eye,
  Share2,
  Settings,
  Check,
  X,
  Clock,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  TrendingUp,
  Calendar,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEventById } from "@/lib/data";

type TabType = "overview" | "registrations" | "settings";

// Mock registration data
const mockRegistrations = [
  { id: "1", name: "Sarah Moyo", email: "sarah@example.com", status: "pending", date: "Dec 20, 2024", avatar: "SM" },
  { id: "2", name: "Tendai Chirwa", email: "tendai@example.com", status: "approved", date: "Dec 19, 2024", avatar: "TC" },
  { id: "3", name: "James Mutasa", email: "james@example.com", status: "approved", date: "Dec 18, 2024", avatar: "JM" },
  { id: "4", name: "Linda Ncube", email: "linda@example.com", status: "pending", date: "Dec 18, 2024", avatar: "LN" },
  { id: "5", name: "Peter Zhou", email: "peter@example.com", status: "rejected", date: "Dec 17, 2024", avatar: "PZ" },
];

export default function ManageEventPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [registrations, setRegistrations] = useState(mockRegistrations);

  const event = getEventById(params.id as string);

  if (!event) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Event not found</h1>
        <Link href="/my-events">
          <Button variant="primary">Back to My Events</Button>
        </Link>
      </div>
    );
  }

  const stats = {
    views: 1234,
    registrations: registrations.length,
    approved: registrations.filter((r) => r.status === "approved").length,
    pending: registrations.filter((r) => r.status === "pending").length,
  };

  const handleApprove = (id: string) => {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
    );
  };

  const handleReject = (id: string) => {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r))
    );
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "registrations", label: "Registrations", icon: <Users className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/my-events"
          className="w-10 h-10 rounded-full bg-surface flex items-center justify-center hover:bg-elevated transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{event.title}</h1>
          <p className="text-sm text-text-secondary">
            {event.date.full} · {event.location.city}
          </p>
        </div>
        <Link href={`/events/${event.id}`}>
          <Button variant="secondary" className="gap-2">
            <ExternalLink className="w-4 h-4" />
            View Event
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-background"
                : "text-text-secondary hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === "registrations" && stats.pending > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-accent text-background">
                {stats.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface rounded-xl p-4">
              <div className="flex items-center gap-2 text-text-secondary mb-2">
                <Eye className="w-4 h-4" />
                <span className="text-sm">Views</span>
              </div>
              <div className="text-2xl font-bold">{stats.views.toLocaleString()}</div>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <div className="flex items-center gap-2 text-text-secondary mb-2">
                <Users className="w-4 h-4" />
                <span className="text-sm">Registrations</span>
              </div>
              <div className="text-2xl font-bold">{stats.registrations}</div>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <div className="flex items-center gap-2 text-text-secondary mb-2">
                <Check className="w-4 h-4" />
                <span className="text-sm">Approved</span>
              </div>
              <div className="text-2xl font-bold text-primary">{stats.approved}</div>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <div className="flex items-center gap-2 text-text-secondary mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Pending</span>
              </div>
              <div className="text-2xl font-bold text-accent">{stats.pending}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-surface rounded-xl p-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-elevated hover:bg-foreground/10 transition-colors">
                <Pencil className="w-5 h-5 text-primary" />
                <span className="text-sm">Edit Event</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-elevated hover:bg-foreground/10 transition-colors">
                <Share2 className="w-5 h-5 text-primary" />
                <span className="text-sm">Share</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-elevated hover:bg-foreground/10 transition-colors">
                <Copy className="w-5 h-5 text-primary" />
                <span className="text-sm">Copy Link</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-elevated hover:bg-foreground/10 transition-colors">
                <Mail className="w-5 h-5 text-primary" />
                <span className="text-sm">Email Guests</span>
              </button>
            </div>
          </div>

          {/* Event Details Summary */}
          <div className="bg-surface rounded-xl p-6">
            <h3 className="font-semibold mb-4">Event Details</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-text-secondary" />
                <div>
                  <div className="font-medium">{event.date.full}</div>
                  <div className="text-sm text-text-secondary">{event.date.time}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-text-secondary" />
                <div>
                  <div className="font-medium">{event.location.venue}</div>
                  <div className="text-sm text-text-secondary">
                    {event.location.city}, {event.location.country}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registrations Tab */}
      {activeTab === "registrations" && (
        <div className="space-y-4">
          {/* Filter Pills */}
          <div className="flex gap-2 mb-4">
            <button className="px-4 py-2 rounded-full bg-primary text-background text-sm font-medium">
              All ({registrations.length})
            </button>
            <button className="px-4 py-2 rounded-full bg-surface text-text-secondary text-sm font-medium hover:bg-elevated">
              Pending ({stats.pending})
            </button>
            <button className="px-4 py-2 rounded-full bg-surface text-text-secondary text-sm font-medium hover:bg-elevated">
              Approved ({stats.approved})
            </button>
          </div>

          {/* Registrations List */}
          <div className="bg-surface rounded-xl divide-y divide-elevated">
            {registrations.map((registration) => (
              <div
                key={registration.id}
                className="flex items-center gap-4 p-4"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-sm font-bold text-background">
                  {registration.avatar}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{registration.name}</div>
                  <div className="text-sm text-text-secondary truncate">
                    {registration.email}
                  </div>
                </div>

                {/* Status */}
                <div className="hidden sm:block">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      registration.status === "approved"
                        ? "bg-primary/20 text-primary"
                        : registration.status === "pending"
                        ? "bg-accent/20 text-accent"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {registration.status}
                  </span>
                </div>

                {/* Date */}
                <div className="hidden md:block text-sm text-text-tertiary">
                  {registration.date}
                </div>

                {/* Actions */}
                {registration.status === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(registration.id)}
                      className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 transition-colors"
                      title="Approve"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReject(registration.id)}
                      className="w-9 h-9 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                      title="Reject"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button className="w-9 h-9 rounded-full bg-surface flex items-center justify-center hover:bg-elevated transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-text-secondary" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Event Settings */}
          <div className="bg-surface rounded-xl p-6">
            <h3 className="font-semibold mb-4">Event Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-elevated">
                <div>
                  <div className="font-medium">Require Approval</div>
                  <div className="text-sm text-text-secondary">
                    Manually approve each registration
                  </div>
                </div>
                <button
                  className="relative w-[51px] h-[31px] rounded-full bg-primary transition-colors"
                >
                  <div className="absolute top-[2px] translate-x-[22px] w-[27px] h-[27px] rounded-full bg-white shadow-md" />
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-elevated">
                <div>
                  <div className="font-medium">Visibility</div>
                  <div className="text-sm text-text-secondary">
                    Who can see this event
                  </div>
                </div>
                <span className="text-text-secondary">Public</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">Capacity</div>
                  <div className="text-sm text-text-secondary">
                    Maximum number of attendees
                  </div>
                </div>
                <span className="text-text-secondary">{event.capacity || "Unlimited"}</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-surface rounded-xl p-6 border border-red-500/30">
            <h3 className="font-semibold text-red-400 mb-4">Danger Zone</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-4 rounded-xl bg-elevated hover:bg-red-500/10 text-left transition-colors">
                <X className="w-5 h-5 text-red-400" />
                <div>
                  <div className="font-medium">Cancel Event</div>
                  <div className="text-sm text-text-secondary">
                    Notify all registered attendees
                  </div>
                </div>
              </button>
              <button className="w-full flex items-center gap-3 p-4 rounded-xl bg-elevated hover:bg-red-500/10 text-left transition-colors">
                <Trash2 className="w-5 h-5 text-red-400" />
                <div>
                  <div className="font-medium text-red-400">Delete Event</div>
                  <div className="text-sm text-text-secondary">
                    Permanently remove this event
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
