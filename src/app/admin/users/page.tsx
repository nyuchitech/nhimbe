"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Mail,
  Ban,
  Eye,
  Calendar,
  MapPin,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://mukoko-nhimbe-api.nyuchi.workers.dev";

interface User {
  _id: string;
  email: string;
  name: string;
  alternateName?: string;
  image?: string;
  address?: {
    addressLocality?: string;
    addressCountry?: string;
  };
  eventsAttended: number;
  eventsHosted: number;
  dateCreated: string;
  status: "active" | "suspended" | "pending";
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      });
      if (search) {
        params.set("search", search);
      }

      const response = await fetch(`${API_URL}/api/admin/users?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalPages(Math.ceil((data.total || 0) / limit));
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleAction(userId: string, action: "suspend" | "activate") {
    try {
      await fetch(`${API_URL}/api/admin/users/${userId}/${action}`, {
        method: "POST",
        credentials: "include",
      });
      fetchUsers();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    }
    setActionMenuOpen(null);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-text-secondary">Manage user accounts</p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-text-tertiary text-center py-12">
              No users found
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-text-tertiary border-b border-elevated">
                      <th className="pb-3 font-medium">User</th>
                      <th className="pb-3 font-medium hidden md:table-cell">
                        Location
                      </th>
                      <th className="pb-3 font-medium hidden lg:table-cell">
                        Activity
                      </th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Joined</th>
                      <th className="pb-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-elevated">
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-elevated/50">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-sm font-bold text-background shrink-0">
                              {user.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {user.name}
                              </div>
                              <div className="text-sm text-text-tertiary truncate">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 hidden md:table-cell">
                          {user.address?.addressLocality || user.address?.addressCountry ? (
                            <div className="flex items-center gap-1 text-text-secondary">
                              <MapPin className="w-3 h-3" />
                              <span className="text-sm">
                                {[user.address?.addressLocality, user.address?.addressCountry]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-text-tertiary text-sm">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 hidden lg:table-cell">
                          <div className="flex items-center gap-4 text-sm text-text-secondary">
                            <span>{user.eventsHosted} hosted</span>
                            <span>{user.eventsAttended} attended</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              user.status === "active"
                                ? "bg-green-500/20 text-green-400"
                                : user.status === "suspended"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-accent/20 text-accent"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-sm text-text-tertiary">
                          {formatDate(user.dateCreated)}
                        </td>
                        <td className="py-3 relative">
                          <button
                            onClick={() =>
                              setActionMenuOpen(
                                actionMenuOpen === user._id ? null : user._id
                              )
                            }
                            className="p-2 hover:bg-elevated rounded-lg"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {actionMenuOpen === user._id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActionMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-elevated rounded-lg shadow-lg py-1 min-w-[150px]">
                                <button
                                  onClick={() => setSelectedUser(user)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-elevated"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                                <button
                                  onClick={() =>
                                    (window.location.href = `mailto:${user.email}`)
                                  }
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-elevated"
                                >
                                  <Mail className="w-4 h-4" />
                                  Send Email
                                </button>
                                {user.status === "active" ? (
                                  <button
                                    onClick={() =>
                                      handleAction(user._id, "suspend")
                                    }
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-elevated"
                                  >
                                    <Ban className="w-4 h-4" />
                                    Suspend User
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleAction(user._id, "activate")
                                    }
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-400 hover:bg-elevated"
                                  >
                                    <Ban className="w-4 h-4" />
                                    Activate User
                                  </button>
                                )}
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="default"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
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

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedUser(null)}
          />
          <div className="relative bg-surface rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-2xl font-bold text-background">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedUser.name}</h2>
                  {selectedUser.alternateName && (
                    <p className="text-text-secondary">@{selectedUser.alternateName}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-elevated rounded-lg"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-elevated rounded-xl">
                  <div className="text-2xl font-bold">
                    {selectedUser.eventsHosted}
                  </div>
                  <div className="text-sm text-text-tertiary">Events Hosted</div>
                </div>
                <div className="p-4 bg-elevated rounded-xl">
                  <div className="text-2xl font-bold">
                    {selectedUser.eventsAttended}
                  </div>
                  <div className="text-sm text-text-tertiary">
                    Events Attended
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-text-secondary">
                  <Mail className="w-4 h-4" />
                  <span>{selectedUser.email}</span>
                </div>
                {(selectedUser.address?.addressLocality || selectedUser.address?.addressCountry) && (
                  <div className="flex items-center gap-3 text-text-secondary">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {[selectedUser.address?.addressLocality, selectedUser.address?.addressCountry]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-text-secondary">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {formatDate(selectedUser.dateCreated)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() =>
                    (window.location.href = `mailto:${selectedUser.email}`)
                  }
                >
                  <Mail className="w-4 h-4" />
                  Email User
                </Button>
                {selectedUser.status === "active" ? (
                  <Button
                    variant="ghost"
                    className="text-red-400"
                    onClick={() => {
                      handleAction(selectedUser._id, "suspend");
                      setSelectedUser(null);
                    }}
                  >
                    <Ban className="w-4 h-4" />
                    Suspend
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="text-green-400"
                    onClick={() => {
                      handleAction(selectedUser._id, "activate");
                      setSelectedUser(null);
                    }}
                  >
                    Activate
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
