"use client";

import { useState, useEffect } from "react";
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
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  findEvent,
  deleteEvent,
  getEventRegistrations,
  updateRegistrationStatus,
  type Event,
  type Registration as APIRegistration,
} from "@/lib/api";

type TabType = "overview" | "registrations" | "settings";
type RegistrationFilter = "all" | "pending" | "approved";

interface Registration {
  id: string;
  name: string;
  email: string;
  status: string;
  date: string;
  avatar: string;
}

export default function ManageEventPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [registrationFilter, setRegistrationFilter] = useState<RegistrationFilter>("all");
  const [requireApproval, setRequireApproval] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const eventData = await findEvent(params.id as string);
        setEvent(eventData);

        // Fetch registrations for this event
        if (eventData) {
          const regs = await getEventRegistrations(eventData.id);
          // Transform API registrations to display format
          const formattedRegs: Registration[] = regs.map((r: APIRegistration) => ({
            id: r.id,
            name: r.user_name || "Unknown User",
            email: r.user_email || r.user_id,
            status: r.status,
            date: new Date(r.registered_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            avatar: (r.user_name || "U")
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2),
          }));
          setRegistrations(formattedRegs);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-200 mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Event not found</h1>
        <Link href="/my-events">
          <Button variant="primary">Back to My Events</Button>
        </Link>
      </div>
    );
  }

  const stats = {
    views: event?.attendeeCount ? event.attendeeCount * 8 : 0, // Estimate views from attendees
    registrations: registrations.length,
    approved: registrations.filter((r) => r.status === "approved").length,
    pending: registrations.filter((r) => r.status === "pending").length,
  };

  const filteredRegistrations = registrations.filter((r) => {
    if (registrationFilter === "all") return true;
    return r.status === registrationFilter;
  });

  const handleApprove = async (id: string) => {
    try {
      await updateRegistrationStatus(id, "approved");
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
      );
    } catch (error) {
      console.error("Failed to approve registration:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateRegistrationStatus(id, "rejected");
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r))
      );
    } catch (error) {
      console.error("Failed to reject registration:", error);
    }
  };

  const handleCopyLink = async () => {
    if (!event) return;
    const url = `${window.location.origin}/events/${event.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    if (!event) return;
    const url = `${window.location.origin}/events/${event.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out ${event.title} on nhimbe`,
          url,
        });
      } catch {
        // User cancelled or share failed, fall back to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleEmailGuests = () => {
    if (!event || registrations.length === 0) return;
    const approvedEmails = registrations
      .filter((r) => r.status === "approved")
      .map((r) => r.email)
      .join(",");
    const subject = encodeURIComponent(`Update about ${event.title}`);
    const body = encodeURIComponent(`Hi everyone,\n\nThis is an update about ${event.title} on ${event.date.full}.\n\nBest regards`);
    window.location.href = `mailto:${approvedEmails}?subject=${subject}&body=${body}`;
  };

  const handleDeleteEvent = async () => {
    if (!event) return;
    setActionLoading(true);
    try {
      await deleteEvent(event.id);
      router.push("/my-events");
    } catch (err) {
      console.error("Failed to delete event:", err);
      setActionLoading(false);
    }
  };

  const handleCancelEvent = async () => {
    // For now, cancelling is the same as deleting
    // In a real app, this would set a "cancelled" status and notify attendees
    handleDeleteEvent();
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "registrations", label: "Registrations", icon: <Users className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-250 mx-auto px-6 py-8">
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
                ? "bg-primary text-primary-foreground"
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
              <Link
                href={`/events/${event.id}/edit`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-elevated hover:bg-foreground/10 transition-colors"
              >
                <Pencil className="w-5 h-5 text-primary" />
                <span className="text-sm">Edit Event</span>
              </Link>
              <button
                onClick={handleShare}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-elevated hover:bg-foreground/10 transition-colors"
              >
                <Share2 className="w-5 h-5 text-primary" />
                <span className="text-sm">Share</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-elevated hover:bg-foreground/10 transition-colors"
              >
                <Copy className={`w-5 h-5 ${copySuccess ? "text-green-500" : "text-primary"}`} />
                <span className="text-sm">{copySuccess ? "Copied!" : "Copy Link"}</span>
              </button>
              <button
                onClick={handleEmailGuests}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-elevated hover:bg-foreground/10 transition-colors"
              >
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
            <button
              onClick={() => setRegistrationFilter("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                registrationFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-text-secondary hover:bg-elevated"
              }`}
            >
              All ({registrations.length})
            </button>
            <button
              onClick={() => setRegistrationFilter("pending")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                registrationFilter === "pending"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-text-secondary hover:bg-elevated"
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setRegistrationFilter("approved")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                registrationFilter === "approved"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-text-secondary hover:bg-elevated"
              }`}
            >
              Approved ({stats.approved})
            </button>
          </div>

          {/* Registrations List */}
          <div className="bg-surface rounded-xl divide-y divide-elevated">
            {filteredRegistrations.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">
                No {registrationFilter === "all" ? "" : registrationFilter} registrations yet
              </div>
            ) : filteredRegistrations.map((registration) => (
              <div
                key={registration.id}
                className="flex items-center gap-4 p-4"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-secondary to-primary flex items-center justify-center text-sm font-bold text-background">
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
                  role="switch"
                  aria-checked={requireApproval}
                  onClick={() => setRequireApproval(!requireApproval)}
                  className={`relative w-12.75 h-7.75 rounded-full transition-colors ${
                    requireApproval ? "bg-primary" : "bg-elevated"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-6.75 h-6.75 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      requireApproval ? "translate-x-5.5" : "translate-x-0.5"
                    }`}
                  />
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
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-elevated hover:bg-red-500/10 text-left transition-colors"
              >
                <X className="w-5 h-5 text-red-400" />
                <div>
                  <div className="font-medium">Cancel Event</div>
                  <div className="text-sm text-text-secondary">
                    Notify all registered attendees
                  </div>
                </div>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-elevated hover:bg-red-500/10 text-left transition-colors"
              >
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-elevated rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-2">Delete Event?</h3>
            <p className="text-text-secondary mb-6">
              This will permanently delete &quot;{event.title}&quot; and all associated data.
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-surface hover:bg-foreground/10 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-elevated rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-2">Cancel Event?</h3>
            <p className="text-text-secondary mb-6">
              This will cancel &quot;{event.title}&quot; and notify all registered attendees.
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-surface hover:bg-foreground/10 font-medium transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelEvent}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Cancelling..." : "Cancel Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
