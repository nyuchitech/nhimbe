"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  Trash2,
  Calendar,
  MapPin,
  Users,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://mukoko-nhimbe-api.nyuchi.workers.dev";

interface Event {
  id: string;
  name: string;
  description: string;
  date: {
    full: string;
  };
  startDate: string;
  location: {
    name: string;
    addressLocality: string;
  };
  category: string;
  attendeeCount: number;
  maximumAttendeeCapacity?: number;
  organizer: {
    name: string;
  };
  status: "upcoming" | "ongoing" | "past" | "cancelled";
  dateCreated: string;
}

export default function EventsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Event | null>(null);

  const limit = 20;

  useEffect(() => {
    fetchEvents();
  }, [page, search, statusFilter]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      });
      if (search) {
        params.set("search", search);
      }
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const response = await fetch(`${API_URL}/api/admin/events?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        setTotalPages(Math.ceil((data.total || 0) / limit));
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(eventId: string) {
    try {
      await fetch(`${API_URL}/api/admin/events/${eventId}`, {
        method: "DELETE",
        credentials: "include",
      });
      fetchEvents();
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
    setDeleteConfirm(null);
    setActionMenuOpen(null);
  }

  function getStatusVariant(status: string): "default" | "warning" | "secondary" | "error" {
    switch (status) {
      case "upcoming":
        return "default";
      case "ongoing":
        return "warning";
      case "cancelled":
        return "error";
      case "past":
      default:
        return "secondary";
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-text-secondary">Manage all events on the platform</p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                placeholder="Search events..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-surface border border-elevated rounded-lg text-foreground min-h-11"
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="past">Past</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-text-tertiary text-center py-12">
              No events found
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-text-tertiary border-b border-elevated">
                      <th className="pb-3 font-medium">Event</th>
                      <th className="pb-3 font-medium hidden md:table-cell">
                        Date & Location
                      </th>
                      <th className="pb-3 font-medium hidden lg:table-cell">
                        Host
                      </th>
                      <th className="pb-3 font-medium">RSVPs</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-elevated">
                    {events.map((event) => (
                      <tr key={event.id} className="hover:bg-elevated/50">
                        <td className="py-3 pr-4">
                          <div className="min-w-0">
                            <div className="font-medium truncate max-w-[200px]">
                              {event.name}
                            </div>
                            <div className="text-sm text-text-tertiary">
                              {event.category}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 hidden md:table-cell">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-text-secondary text-sm">
                              <Calendar className="w-3 h-3" />
                              <span>{event.date.full}</span>
                            </div>
                            <div className="flex items-center gap-1 text-text-tertiary text-sm">
                              <MapPin className="w-3 h-3" />
                              <span>
                                {event.location.name}, {event.location.addressLocality}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 hidden lg:table-cell text-sm text-text-secondary">
                          {event.organizer.name}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1 text-text-secondary">
                            <Users className="w-4 h-4" />
                            <span>
                              {event.attendeeCount}
                              {event.maximumAttendeeCapacity && `/${event.maximumAttendeeCapacity}`}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={getStatusVariant(event.status)}>
                            {event.status}
                          </Badge>
                        </td>
                        <td className="py-3 relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setActionMenuOpen(
                                actionMenuOpen === event.id ? null : event.id
                              )
                            }
                            className="p-2 hover:bg-elevated rounded-lg h-auto min-h-0"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                          {actionMenuOpen === event.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActionMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-elevated rounded-lg shadow-lg py-1 min-w-[150px]">
                                <Link
                                  href={`/events/${event.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-elevated"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Event
                                </Link>
                                <Link
                                  href={`/events/${event.id}/manage`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-elevated"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Manage Event
                                </Link>
                                <Button
                                  variant="ghost"
                                  onClick={() => setDeleteConfirm(event)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-elevated rounded-none justify-start h-auto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete Event
                                </Button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-elevated">
                  <div className="text-sm text-text-tertiary">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      size="default"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const p = start + i;
                      if (p > totalPages) return null;
                      return (
                        <Button
                          key={p}
                          variant={p === page ? "default" : "ghost"}
                          size="default"
                          onClick={() => setPage(p)}
                          className="w-10"
                        >
                          {p}
                        </Button>
                      );
                    })}
                    <Button
                      variant="secondary"
                      size="default"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-surface rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Delete Event</h2>
                <p className="text-text-secondary text-sm">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-text-secondary mb-6">
              Are you sure you want to delete{" "}
              <span className="text-foreground font-medium">
                &quot;{deleteConfirm.name}&quot;
              </span>
              ? All registrations and data associated with this event will be
              permanently removed.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="flex-1 bg-red-500 hover:bg-red-600"
                onClick={() => handleDelete(deleteConfirm.id)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
