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
  Calendar,
  MapPin,
  Loader2,
  MessageSquare,
  BarChart3,
  QrCode,
  UserPlus,
  Send,
  Bell,
  MessageCircle,
  ChevronRight,
  Video,
  Download,
  Filter,
  Search,
  Globe,
  TrendingUp,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  findEvent,
  deleteEvent,
  getEventRegistrations,
  updateRegistrationStatus,
  type Event,
  type Registration as APIRegistration,
} from "@/lib/api";

interface Registration {
  id: string;
  name: string;
  email: string;
  status: string;
  date: string;
  avatar: string;
  checkedIn?: boolean;
}

interface EventStats {
  views: number;
  registrations: number;
  approved: number;
  pending: number;
  checkedIn: number;
  viewsToday: number;
  viewsWeek: number;
  viewsMonth: number;
}

// Simulated page views data for the chart
const generateViewsData = () => {
  const data = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      shortDate: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      views: Math.floor(Math.random() * 15) + 1,
    });
  }
  return data;
};

export default function ManageEventPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [registrationFilter, setRegistrationFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [guestSearch, setGuestSearch] = useState("");
  const [requireApproval, setRequireApproval] = useState(true);
  const [waitlistEnabled, setWaitlistEnabled] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [blastMessage, setBlastMessage] = useState("");
  const [viewsData] = useState(generateViewsData);

  useEffect(() => {
    async function fetchData() {
      try {
        const eventData = await findEvent(params.id as string);
        setEvent(eventData);

        if (eventData) {
          const regs = await getEventRegistrations(eventData.id);
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
            checkedIn: r.status === "attended",
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

  const stats: EventStats = {
    views: event?.attendeeCount ? event.attendeeCount * 8 : 0,
    registrations: registrations.length,
    approved: registrations.filter((r) => r.status === "approved" || r.status === "registered").length,
    pending: registrations.filter((r) => r.status === "pending").length,
    checkedIn: registrations.filter((r) => r.checkedIn).length,
    viewsToday: viewsData[viewsData.length - 1]?.views || 0,
    viewsWeek: viewsData.reduce((sum, d) => sum + d.views, 0),
    viewsMonth: viewsData.reduce((sum, d) => sum + d.views, 0) * 4,
  };

  const filteredRegistrations = registrations.filter((r) => {
    const matchesFilter = registrationFilter === "all" || r.status === registrationFilter;
    const matchesSearch = !guestSearch ||
      r.name.toLowerCase().includes(guestSearch.toLowerCase()) ||
      r.email.toLowerCase().includes(guestSearch.toLowerCase());
    return matchesFilter && matchesSearch;
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

  const handleCheckIn = (id: string) => {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, checkedIn: !r.checkedIn } : r))
    );
  };

  const handleCopyLink = async () => {
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
    const url = `${window.location.origin}/events/${event.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out ${event.title} on nhimbe`,
          url,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleEmailGuests = () => {
    if (registrations.length === 0) return;
    const approvedEmails = registrations
      .filter((r) => r.status === "approved" || r.status === "registered")
      .map((r) => r.email)
      .join(",");
    const subject = encodeURIComponent(`Update about ${event.title}`);
    const body = encodeURIComponent(`Hi everyone,\n\nThis is an update about ${event.title} on ${event.date.full}.\n\nBest regards`);
    window.location.href = `mailto:${approvedEmails}?subject=${subject}&body=${body}`;
  };

  const handleDeleteEvent = async () => {
    setActionLoading(true);
    try {
      await deleteEvent(event.id);
      router.push("/my-events");
    } catch (err) {
      console.error("Failed to delete event:", err);
      setActionLoading(false);
    }
  };

  const handleSendBlast = () => {
    if (!blastMessage.trim()) return;
    handleEmailGuests();
    setBlastMessage("");
  };

  const capacity = event.capacity || 100;
  const capacityUsed = stats.approved;
  const capacityPercentage = (capacityUsed / capacity) * 100;

  return (
    <div className="max-w-280 mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6">
        <Link
          href="/my-events"
          className="w-10 h-10 rounded-full bg-surface flex items-center justify-center hover:bg-elevated transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Personal</span>
            <ChevronRight className="w-3 h-3 text-text-tertiary" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold truncate">{event.title}</h1>
        </div>
        <Link href={`/events/${event.id}`} className="shrink-0">
          <Button variant="secondary" className="gap-2 hidden sm:flex">
            <ExternalLink className="w-4 h-4" />
            View Event
          </Button>
          <button className="sm:hidden w-10 h-10 rounded-full bg-surface flex items-center justify-center hover:bg-elevated transition-colors">
            <ExternalLink className="w-4 h-4" />
          </button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="guests" badge={
            stats.pending > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-accent text-background">
                {stats.pending}
              </span>
            ) : undefined
          }>Guests</TabsTrigger>
          <TabsTrigger value="registration">Registration</TabsTrigger>
          <TabsTrigger value="blasts">Blasts</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="more">More</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions Row */}
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" className="gap-2" onClick={() => {}}>
              <UserPlus className="w-4 h-4" />
              Invite Guests
            </Button>
            <Button variant="secondary" className="gap-2" onClick={() => {}}>
              <MessageSquare className="w-4 h-4" />
              Send a Blast
            </Button>
            <Button variant="secondary" className="gap-2" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
              Share Event
            </Button>
          </div>

          {/* Event Preview Card */}
          <Card className="overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* Cover Image */}
              <div
                className="w-full md:w-64 h-48 md:h-auto shrink-0"
                style={{
                  background: event.coverImage
                    ? `url(${event.coverImage}) center/cover`
                    : event.coverGradient || "linear-gradient(135deg, #64FFDA 0%, #B388FF 100%)",
                }}
              />
              {/* Event Info */}
              <div className="flex-1 p-6">
                <h2 className="text-xl font-bold mb-3">{event.title}</h2>

                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-elevated rounded text-sm">
                    <span className="font-semibold">{event.date.month.toUpperCase().slice(0, 3)}</span>
                    <span className="font-bold text-lg">{event.date.day}</span>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">{event.date.full.split(",")[0]}</div>
                    <div className="text-text-secondary">{event.date.time}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
                  {event.isOnline ? (
                    <>
                      <Video className="w-4 h-4" />
                      <span>{event.meetingPlatform === "google_meet" ? "Google Meet" : event.meetingPlatform === "zoom" ? "Zoom" : "Online"}</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      <span>{event.location.venue || event.location.city}</span>
                    </>
                  )}
                </div>

                {/* Host Info */}
                <div className="border-t border-elevated pt-4">
                  <div className="text-xs text-text-tertiary mb-1">Hosted By</div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-xs font-bold text-background">
                      {event.host.initials}
                    </div>
                    <span className="font-medium">{event.host.name}</span>
                  </div>
                </div>

                {/* Event Link */}
                <div className="mt-4 flex items-center gap-2 p-3 bg-elevated rounded-lg">
                  <Globe className="w-4 h-4 text-text-tertiary" />
                  <span className="flex-1 text-sm text-text-secondary truncate">
                    {window.location.origin}/e/{event.shortCode}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    {copySuccess ? "COPIED" : "COPY"}
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Share Event Section */}
          <Card>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="text-sm font-medium">Share Event</span>
              <div className="flex gap-3">
                {[
                  { name: "Facebook", icon: "f", color: "#1877F2" },
                  { name: "X", icon: "𝕏", color: "#000" },
                  { name: "LinkedIn", icon: "in", color: "#0A66C2" },
                  { name: "WhatsApp", icon: "✆", color: "#25D366" },
                ].map((platform) => (
                  <button
                    key={platform.name}
                    onClick={handleShare}
                    className="w-10 h-10 rounded-full bg-elevated hover:bg-surface-hover flex items-center justify-center transition-colors"
                    title={platform.name}
                  >
                    <span className="text-sm font-bold">{platform.icon}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* When & Where */}
          <Card>
            <CardHeader>
              <CardTitle>When & Where</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-1 px-3 py-2 bg-elevated rounded-lg text-center min-w-[60px]">
                  <div>
                    <div className="text-xs text-text-secondary">{event.date.month.toUpperCase().slice(0, 3)}</div>
                    <div className="text-2xl font-bold">{event.date.day}</div>
                  </div>
                </div>
                <div>
                  <div className="font-medium">{event.date.full}</div>
                  <div className="text-sm text-text-secondary">{event.date.time}</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-[60px] h-[60px] bg-elevated rounded-lg flex items-center justify-center">
                  {event.isOnline ? (
                    <Video className="w-6 h-6 text-text-secondary" />
                  ) : (
                    <MapPin className="w-6 h-6 text-text-secondary" />
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    {event.isOnline
                      ? (event.meetingPlatform === "google_meet" ? "Google Meet" : event.meetingPlatform || "Online Event")
                      : event.location.venue
                    }
                  </div>
                  <div className="text-sm text-text-secondary">
                    {event.isOnline
                      ? "Virtual event - link sent upon registration"
                      : `${event.location.address || event.location.city}, ${event.location.country}`
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guests Tab */}
        <TabsContent value="guests" className="space-y-6">
          {/* At a Glance */}
          <Card>
            <CardHeader>
              <CardTitle>At a Glance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold">{stats.approved} <span className="text-lg font-normal text-text-secondary">Going</span></div>
                <div className="text-text-secondary">cap <span className="font-bold text-foreground">{capacity}</span></div>
              </div>
              <Progress value={capacityUsed} max={capacity} variant="primary" />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" className="gap-2">
              <UserPlus className="w-4 h-4" />
              Invite Guests
            </Button>
            <Button variant="secondary" className="gap-2">
              <QrCode className="w-4 h-4" />
              Check In Guests
            </Button>
            <Button variant="secondary" className="gap-2">
              <Users className="w-4 h-4" />
              Guests Shown
            </Button>
          </div>

          {/* Guest List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Guest List</CardTitle>
              <div className="flex gap-2">
                <button className="w-9 h-9 rounded-lg bg-elevated flex items-center justify-center hover:bg-surface transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
                <button className="w-9 h-9 rounded-lg bg-elevated flex items-center justify-center hover:bg-surface transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Search guests..."
                    icon={<Search className="w-4 h-4" />}
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {(["all", "pending", "approved", "rejected"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setRegistrationFilter(filter)}
                      className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        registrationFilter === filter
                          ? "bg-primary text-primary-foreground"
                          : "bg-elevated text-text-secondary hover:bg-surface"
                      }`}
                    >
                      {filter === "all" ? `All (${registrations.length})` :
                       filter === "pending" ? `Pending (${stats.pending})` :
                       filter === "approved" ? `Approved (${stats.approved})` :
                       `Rejected (${registrations.filter(r => r.status === "rejected").length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guest List */}
              <div className="divide-y divide-elevated">
                {filteredRegistrations.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-elevated rounded-full flex items-center justify-center">
                      <Users className="w-8 h-8 text-text-tertiary" />
                    </div>
                    <h3 className="text-lg font-medium text-text-secondary mb-1">No Guests Yet</h3>
                    <p className="text-sm text-text-tertiary">Share the event or invite people to get started!</p>
                  </div>
                ) : filteredRegistrations.map((registration) => (
                  <div key={registration.id} className="flex items-center gap-3 py-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-sm font-bold text-background shrink-0">
                      {registration.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{registration.name}</div>
                      <div className="text-sm text-text-secondary truncate">{registration.email}</div>
                    </div>
                    <div className="hidden sm:block">
                      <Badge variant={
                        registration.status === "approved" || registration.status === "registered" ? "success" :
                        registration.status === "pending" ? "warning" : "error"
                      }>
                        {registration.status}
                      </Badge>
                    </div>
                    <div className="hidden md:block text-sm text-text-tertiary">
                      {registration.date}
                    </div>
                    {registration.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(registration.id)}
                          className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(registration.id)}
                          className="w-9 h-9 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCheckIn(registration.id)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                          registration.checkedIn
                            ? "bg-primary text-primary-foreground"
                            : "bg-elevated hover:bg-surface"
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Registration Tab */}
        <TabsContent value="registration" className="space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="font-medium">Registration</div>
                  <div className="text-sm text-green-400">Open</div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <div className="font-medium">Event Capacity</div>
                  <div className="text-sm text-text-secondary">{capacity} · Waitlist {waitlistEnabled ? "On" : "Off"}</div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="font-medium">Group Registration</div>
                  <div className="text-sm text-text-secondary">Off</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Tickets Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tickets</CardTitle>
              <Button variant="secondary" className="gap-2">
                <Ticket className="w-4 h-4" />
                New Ticket Type
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Free Ticket */}
              <div className="flex items-center justify-between p-4 bg-elevated rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="font-medium">Standard</div>
                  <Badge variant="success">Free</Badge>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <Users className="w-4 h-4" />
                  <span>{stats.approved}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registration Email */}
          <Card>
            <CardHeader>
              <CardTitle>Registration Email</CardTitle>
              <CardDescription>
                Upon registration, we send guests a confirmation email that includes a calendar invite.
                You can add a custom message to the email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="gap-2">
                <Mail className="w-4 h-4" />
                Customize Email
              </Button>
            </CardContent>
          </Card>

          {/* Registration Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Registration Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-elevated">
                <div>
                  <div className="font-medium">Require Approval</div>
                  <div className="text-sm text-text-secondary">Manually approve each registration</div>
                </div>
                <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-elevated">
                <div>
                  <div className="font-medium">Enable Waitlist</div>
                  <div className="text-sm text-text-secondary">Allow signups when event is full</div>
                </div>
                <Switch checked={waitlistEnabled} onCheckedChange={setWaitlistEnabled} />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">Capacity</div>
                  <div className="text-sm text-text-secondary">Maximum number of attendees</div>
                </div>
                <span className="text-text-secondary">{capacity}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blasts Tab */}
        <TabsContent value="blasts" className="space-y-6">
          {/* Send Blast Input */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-background" />
              </div>
              <Input
                className="flex-1"
                placeholder="Send a blast to your guests..."
                value={blastMessage}
                onChange={(e) => setBlastMessage(e.target.value)}
              />
            </div>
          </Card>

          {/* Send Blasts Feature */}
          <Card className="border-2 border-dashed border-elevated">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-green-400" />
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Send Blasts</h3>
              <p className="text-text-secondary max-w-sm mx-auto">
                Share updates with your guests via email, SMS, and push notifications.
              </p>
            </CardContent>
          </Card>

          {/* System Messages */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">System Messages</h3>

            <Card>
              <CardContent className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-text-secondary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Event Reminders</h4>
                  <p className="text-sm text-text-secondary mb-3">
                    Reminders are sent automatically via email, SMS, and push notification.
                  </p>
                  <Button variant="secondary" size="default">Manage Reminders</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-text-secondary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Post-Event Feedback</h4>
                  <p className="text-sm text-text-secondary mb-3">
                    Schedule a feedback email to guests after the event ends.
                  </p>
                  <Button variant="secondary" size="default">Configure Feedback</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          {/* Page Views */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Page Views</CardTitle>
                <CardDescription>See recent page views of the event page.</CardDescription>
              </div>
              <Button variant="secondary" size="default">Past 7 Days</Button>
            </CardHeader>
            <CardContent>
              {/* Simple Chart */}
              <div className="h-48 flex items-end gap-2">
                {viewsData.map((day, i) => {
                  const maxViews = Math.max(...viewsData.map(d => d.views));
                  const height = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col justify-end h-32">
                        <div
                          className="w-full bg-primary rounded-t transition-all"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-tertiary">{day.shortDate}</span>
                    </div>
                  );
                })}
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-elevated">
                <div>
                  <div className="text-sm text-text-secondary mb-1">24 hours</div>
                  <div className="text-2xl font-bold">{stats.viewsToday}</div>
                </div>
                <div>
                  <div className="text-sm text-text-secondary mb-1">7 days</div>
                  <div className="text-2xl font-bold">{stats.viewsWeek}</div>
                </div>
                <div>
                  <div className="text-sm text-text-secondary mb-1">30 days</div>
                  <div className="text-2xl font-bold">{stats.viewsMonth}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary">Start sharing your link and you&apos;ll see traffic here.</p>
            </CardContent>
          </Card>

          {/* Cities */}
          <Card>
            <CardHeader>
              <CardTitle>Cities</CardTitle>
            </CardHeader>
            <CardContent>
              {event.location.city ? (
                <div className="flex items-center justify-between">
                  <span>{event.location.city}, {event.location.country}</span>
                  <span className="font-medium">100%</span>
                </div>
              ) : (
                <p className="text-text-secondary">No location data yet.</p>
              )}
            </CardContent>
          </Card>

          {/* UTM Sources */}
          <Card>
            <CardHeader>
              <CardTitle>UTM Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary text-sm">
                Set up a tracking link by adding <code className="bg-elevated px-1 py-0.5 rounded">?utm_source=your-link-name</code> to your URL.
              </p>
            </CardContent>
          </Card>

          {/* Registration Referrals */}
          <Card>
            <CardHeader>
              <CardTitle>Registration Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary">Track where your registrations are coming from.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* More Tab (Settings) */}
        <TabsContent value="more" className="space-y-6">
          {/* Clone Event */}
          <Card>
            <CardHeader>
              <CardTitle>Clone Event</CardTitle>
              <CardDescription>
                Create a new event with the same information as this one.
                Everything except the guest list and event blasts will be copied over.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="gap-2">
                <Copy className="w-4 h-4" />
                Clone Event
              </Button>
            </CardContent>
          </Card>

          {/* Event Page / Custom URL */}
          <Card>
            <CardHeader>
              <CardTitle>Event Page</CardTitle>
              <CardDescription>
                When you choose a new URL, the current one will no longer work.
                Do not change your URL if you have already shared the event.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">Public URL</label>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-2.5 bg-surface rounded-lg text-text-secondary text-sm">
                    nhimbe.com/e/
                  </div>
                  <Input
                    defaultValue={event.shortCode}
                    className="flex-1"
                    placeholder="your-custom-url"
                  />
                  <Button variant="secondary">Update</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Embed Event */}
          <Card>
            <CardHeader>
              <CardTitle>Embed Event</CardTitle>
              <CardDescription>
                Have your own site? Embed the event to let visitors know about it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Embed Options */}
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary text-left">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium">Embed as Button</div>
                  </div>
                  <Check className="w-5 h-5 text-primary" />
                </button>
                <button className="w-full flex items-center gap-3 p-4 rounded-xl bg-elevated hover:bg-surface text-left transition-colors">
                  <ExternalLink className="w-5 h-5 text-text-secondary" />
                  <div className="flex-1">
                    <div className="font-medium">Embed Event Page</div>
                  </div>
                </button>
              </div>

              {/* Code Snippet */}
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Paste the following HTML code snippet to your page:
                </label>
                <div className="bg-[#1a1a2e] rounded-xl p-4 font-mono text-sm overflow-x-auto">
                  <div className="text-blue-400">
                    &lt;<span className="text-pink-400">a</span>
                  </div>
                  <div className="pl-4 text-green-400">
                    href=&quot;{typeof window !== "undefined" ? window.location.origin : ""}/events/{event.id}&quot;
                  </div>
                  <div className="pl-4 text-green-400">
                    class=&quot;nhimbe-checkout-button&quot;
                  </div>
                  <div className="pl-4 text-green-400">
                    data-nhimbe-action=&quot;checkout&quot;
                  </div>
                  <div className="pl-4 text-green-400">
                    data-nhimbe-event-id=&quot;{event.id}&quot;
                  </div>
                  <div className="text-blue-400">&gt;</div>
                  <div className="pl-4 text-white">Register for Event</div>
                  <div className="text-blue-400">
                    &lt;/<span className="text-pink-400">a</span>&gt;
                  </div>
                  <div className="mt-2 text-blue-400">
                    &lt;<span className="text-pink-400">script</span>{" "}
                    <span className="text-green-400">id</span>=&quot;nhimbe-checkout&quot;{" "}
                    <span className="text-green-400">src</span>=&quot;{typeof window !== "undefined" ? window.location.origin : ""}/embed.js&quot;&gt;
                  </div>
                  <div className="text-blue-400">
                    &lt;/<span className="text-pink-400">script</span>&gt;
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  This gives you the following button. Click it to see it in action!
                </label>
                <div className="p-8 bg-elevated rounded-xl border-2 border-dashed border-surface flex items-center justify-center">
                  <button className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors">
                    Register for Event
                  </button>
                </div>
              </div>

              <p className="text-sm text-text-secondary">
                If you want to use your own styling for the button, simply remove the{" "}
                <code className="bg-elevated px-1 py-0.5 rounded">nhimbe-checkout-button</code>{" "}
                class from the snippet above.
              </p>
            </CardContent>
          </Card>

          {/* Registration Referrals */}
          <Card>
            <CardHeader>
              <CardTitle>Registration Referrals</CardTitle>
              <CardDescription>
                Each guest has a unique referral link to invite friends.
                <Link href="#" className="text-primary ml-1 hover:underline">Learn More</Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-elevated rounded-full flex items-center justify-center">
                  <Share2 className="w-8 h-8 text-text-tertiary" />
                </div>
                <h4 className="font-medium text-text-secondary mb-1">No Referrals</h4>
                <p className="text-sm text-text-tertiary">
                  Referrals will start showing up here once guests start inviting their friends.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Event Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>Event Feedback</CardTitle>
              <CardDescription>
                See how much your guests enjoyed the event.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-elevated rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-text-tertiary" />
                </div>
                <h4 className="font-medium text-text-secondary mb-1">No Post-Event Email Scheduled</h4>
                <p className="text-sm text-text-tertiary mb-4">
                  To collect feedback, schedule a post-event thank you email. We will take care of the rest!
                </p>
                <Button variant="secondary" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Schedule Feedback Email
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Event Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Event Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link
                href={`/events/${event.id}/edit`}
                className="flex items-center gap-3 p-4 rounded-xl bg-elevated hover:bg-surface transition-colors"
              >
                <Pencil className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">Edit Event</div>
                  <div className="text-sm text-text-secondary">Update event details</div>
                </div>
                <ChevronRight className="w-5 h-5 text-text-tertiary" />
              </Link>

              <button
                onClick={handleShare}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-elevated hover:bg-surface transition-colors text-left"
              >
                <Share2 className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">Share Event</div>
                  <div className="text-sm text-text-secondary">Get your event link</div>
                </div>
                <ChevronRight className="w-5 h-5 text-text-tertiary" />
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-elevated hover:bg-surface transition-colors text-left"
              >
                <Copy className={`w-5 h-5 ${copySuccess ? "text-green-500" : "text-primary"}`} />
                <div className="flex-1">
                  <div className="font-medium">{copySuccess ? "Link Copied!" : "Copy Link"}</div>
                  <div className="text-sm text-text-secondary">Copy event URL to clipboard</div>
                </div>
                <ChevronRight className="w-5 h-5 text-text-tertiary" />
              </button>

              <button
                onClick={handleEmailGuests}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-elevated hover:bg-surface transition-colors text-left"
              >
                <Mail className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">Email Guests</div>
                  <div className="text-sm text-text-secondary">Send email to all approved guests</div>
                </div>
                <ChevronRight className="w-5 h-5 text-text-tertiary" />
              </button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                onClick={handleDeleteEvent}
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
