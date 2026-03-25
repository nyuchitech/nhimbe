"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle,
  MessageSquare,
  Send,
  X,
  User,
  Mail,
  Calendar,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://mukoko-nhimbe-api.nyuchi.workers.dev";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: "open" | "pending" | "resolved";
  priority: "low" | "medium" | "high";
  category: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

interface TicketMessage {
  id: string;
  content: string;
  sender: "user" | "admin";
  senderName: string;
  createdAt: string;
}

export default function SupportPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const limit = 20;

  useEffect(() => {
    fetchTickets();
  }, [page, search, statusFilter]);

  async function fetchTickets() {
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

      const response = await fetch(`${API_URL}/api/admin/support?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
        setTotalPages(Math.ceil((data.total || 0) / limit));
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(
    ticketId: string,
    newStatus: "open" | "pending" | "resolved"
  ) {
    try {
      await fetch(`${API_URL}/api/admin/support/${ticketId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error) {
      console.error("Failed to update ticket status:", error);
    }
  }

  async function handleSendReply() {
    if (!selectedTicket || !replyText.trim()) return;

    setSending(true);
    try {
      await fetch(`${API_URL}/api/admin/support/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: replyText }),
      });

      // Add message locally
      const newMessage: TicketMessage = {
        id: Date.now().toString(),
        content: replyText,
        sender: "admin",
        senderName: "Support Team",
        createdAt: new Date().toISOString(),
      };
      setSelectedTicket({
        ...selectedTicket,
        messages: [...selectedTicket.messages, newMessage],
        status: "pending",
      });
      setReplyText("");
      fetchTickets();
    } catch (error) {
      console.error("Failed to send reply:", error);
    } finally {
      setSending(false);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "open":
        return <AlertCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "resolved":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "open":
        return "bg-red-500/20 text-red-400";
      case "pending":
        return "bg-accent/20 text-accent";
      case "resolved":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-elevated text-text-tertiary";
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "high":
        return "text-red-400";
      case "medium":
        return "text-accent";
      case "low":
        return "text-text-tertiary";
      default:
        return "text-text-tertiary";
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-text-secondary">Manage support tickets and inquiries</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {tickets.filter((t) => t.status === "open").length}
              </div>
              <div className="text-sm text-text-tertiary">Open</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {tickets.filter((t) => t.status === "pending").length}
              </div>
              <div className="text-sm text-text-tertiary">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {tickets.filter((t) => t.status === "resolved").length}
              </div>
              <div className="text-sm text-text-tertiary">Resolved</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                placeholder="Search tickets..."
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
              className="px-4 py-2 bg-surface border border-elevated rounded-lg text-foreground"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-text-secondary">No tickets found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="p-4 rounded-xl bg-elevated hover:bg-elevated/80 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              ticket.status
                            )}`}
                          >
                            {getStatusIcon(ticket.status)}
                            {ticket.status}
                          </span>
                          <span
                            className={`text-xs font-medium ${getPriorityColor(
                              ticket.priority
                            )}`}
                          >
                            {ticket.priority} priority
                          </span>
                        </div>
                        <h3 className="font-medium truncate">{ticket.subject}</h3>
                        <p className="text-sm text-text-tertiary truncate mt-1">
                          {ticket.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm text-text-secondary">
                          {ticket.user.name}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {formatDate(ticket.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedTicket(null)}
          />
          <div className="relative bg-surface rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-elevated">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        selectedTicket.status
                      )}`}
                    >
                      {getStatusIcon(selectedTicket.status)}
                      {selectedTicket.status}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      #{selectedTicket.id.slice(0, 8)}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">{selectedTicket.subject}</h2>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 hover:bg-elevated rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-4 mt-4 p-3 bg-elevated rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-sm font-bold text-background">
                  {selectedTicket.user.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-text-tertiary" />
                    <span className="font-medium">
                      {selectedTicket.user.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-tertiary">
                    <Mail className="w-3 h-3" />
                    <span>{selectedTicket.user.email}</span>
                  </div>
                </div>
                <div className="text-right text-sm text-text-tertiary">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(selectedTicket.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Initial description */}
              <div className="p-4 bg-elevated rounded-xl">
                <p className="text-text-secondary whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Thread */}
              {selectedTicket.messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-xl ${
                    message.sender === "admin"
                      ? "bg-primary/10 ml-8"
                      : "bg-elevated mr-8"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">
                      {message.senderName}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {formatDate(message.createdAt)}
                    </span>
                  </div>
                  <p className="text-text-secondary whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>

            {/* Reply Section */}
            <div className="p-6 border-t border-elevated">
              <div className="flex gap-3 mb-4">
                <Button
                  variant={
                    selectedTicket.status === "open" ? "default" : "secondary"
                  }
                  size="default"
                  onClick={() => handleStatusChange(selectedTicket.id, "open")}
                >
                  Open
                </Button>
                <Button
                  variant={
                    selectedTicket.status === "pending" ? "default" : "secondary"
                  }
                  size="default"
                  onClick={() =>
                    handleStatusChange(selectedTicket.id, "pending")
                  }
                >
                  Pending
                </Button>
                <Button
                  variant={
                    selectedTicket.status === "resolved" ? "default" : "secondary"
                  }
                  size="default"
                  onClick={() =>
                    handleStatusChange(selectedTicket.id, "resolved")
                  }
                >
                  Resolved
                </Button>
              </div>

              <div className="flex gap-3">
                <Textarea
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 min-h-[80px]"
                />
                <Button
                  variant="default"
                  disabled={!replyText.trim() || sending}
                  onClick={handleSendReply}
                  className="self-end"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
