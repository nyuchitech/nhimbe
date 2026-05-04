"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, MessageCircle, Send, Users, Flame, Archive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/auth-context";
import {
  createCirclePost,
  getCircle,
  getCircleMembers,
  getCirclePosts,
  joinCircle,
  togglePostReaction,
  type KraalMember,
  type KraalPostWithAuthor,
} from "@/lib/supabase/api";
import type { CircleRow } from "@/lib/supabase/types";
import { t } from "@/lib/i18n";

interface KraalDetailClientProps {
  circleId: string;
}

function authorLabel(p: KraalPostWithAuthor["author"] | KraalMember["person"]): string {
  if (!p) return "Member";
  return p.display_name || [p.given_name, p.family_name].filter(Boolean).join(" ") || "Member";
}

function authorInitial(label: string): string {
  return label.trim().slice(0, 1).toUpperCase() || "•";
}

export default function KraalDetailClient({ circleId }: KraalDetailClientProps) {
  const { user, isAuthenticated } = useAuth();
  const personId = (user as { person_id?: string } | null)?.person_id ?? null;

  const [loading, setLoading] = useState(true);
  const [circle, setCircle] = useState<CircleRow | null>(null);
  const [posts, setPosts] = useState<KraalPostWithAuthor[]>([]);
  const [members, setMembers] = useState<KraalMember[]>([]);
  const [archived, setArchived] = useState<KraalPostWithAuthor[]>([]);
  const [composer, setComposer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"stream" | "members" | "archive">("stream");

  const isMember = personId
    ? members.some((m) => m.person_id === personId)
    : false;

  // Fetch the circle, posts and members once per circleId. Setting state
  // happens only inside the promise resolution, never synchronously in the
  // effect body — required by the React 19 `set-state-in-effect` rule.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCircle(circleId),
      getCirclePosts(circleId, 30, false),
      getCircleMembers(circleId, 100),
    ])
      .then(([c, p, m]) => {
        if (cancelled) return;
        setCircle(c);
        setPosts(p);
        setMembers(m);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load this kraal");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [circleId]);

  const loadArchive = useCallback(async () => {
    if (archived.length > 0) return;
    try {
      const a = await getCirclePosts(circleId, 30, true);
      setArchived(a);
    } catch {
      // Silent — archive is best-effort.
    }
  }, [archived.length, circleId]);

  // Lazy-load the archive on tab change. We invoke from the tab handler
  // rather than a useEffect-on-tab so we don't trigger setState in an
  // effect body when nothing has actually changed.
  const onTabChange = (next: "stream" | "members" | "archive") => {
    setTab(next);
    if (next === "archive") void loadArchive();
  };

  const handlePost = async () => {
    if (!personId || !composer.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const newPost = await createCirclePost({
        circleId,
        authorId: personId,
        text: composer.trim(),
      });
      // Optimistic — backfill author from current user
      const me = members.find((m) => m.person_id === personId)?.person ?? {
        id: personId,
        display_name: user?.name ?? null,
        given_name: null,
        family_name: null,
        image: null,
      };
      setPosts((prev) => [{ ...newPost, author: me }, ...prev]);
      setComposer("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!personId) return;
    setSubmitting(true);
    setError(null);
    try {
      await joinCircle({ circleId, personId });
      // Refetch members so the join button flips to compose mode.
      const m = await getCircleMembers(circleId, 100);
      setMembers(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join kraal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (postId: string) => {
    if (!personId) return;
    try {
      const result = await togglePostReaction({ postId, personId });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, like_count: (p.like_count ?? 0) + (result === "added" ? 1 : -1) }
            : p,
        ),
      );
    } catch {
      // Silent — toggle is best-effort.
    }
  };

  return (
    <div className="max-w-300 mx-auto px-6 py-6">
      <Link
        href="/kraal"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        All kraals
      </Link>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-(--radius-card)" />
      ) : !circle ? (
        <Card className="border-0 bg-surface">
          <CardContent className="p-8 text-center">
            <p className="text-text-secondary">This kraal isn&apos;t available, or you don&apos;t have access to it.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Savanna hero */}
          <header className="relative overflow-hidden rounded-(--radius-card) p-8 md:p-10 mb-6">
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                backgroundImage:
                  "radial-gradient(700px 350px at 0% 100%, color-mix(in srgb, var(--heritage-savanna) 50%, transparent) 0%, transparent 60%), radial-gradient(600px 300px at 100% 0%, color-mix(in srgb, var(--heritage-baobab) 40%, transparent) 0%, transparent 60%), var(--surface)",
              }}
            />
            <div className="flex items-start gap-5">
              <div
                className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center text-primary-foreground font-bold text-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, var(--heritage-savanna), var(--heritage-baobab))",
                }}
                aria-hidden
              >
                {authorInitial(circle.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-1">
                  {circle.name}
                </h1>
                <p className="text-text-secondary mb-3">
                  {circle.description || circle.circle_purpose}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-text-tertiary">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-4 h-4" aria-hidden />
                    {circle.member_count ?? members.length} members
                  </span>
                  {circle.linked_event_id && (
                    <span className="inline-flex items-center gap-1.5">
                      <Flame className="w-4 h-4" aria-hidden />
                      Event kraal
                    </span>
                  )}
                </div>
              </div>

              {isAuthenticated && !isMember && (
                <Button
                  onClick={handleJoin}
                  disabled={submitting}
                  className="rounded-full"
                >
                  {t("kraal.join")}
                </Button>
              )}
            </div>
          </header>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400" role="alert">
              {error}
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => onTabChange(v as "stream" | "members" | "archive")}>
            <TabsList className="mb-4">
              <TabsTrigger value="stream">{t("kraal.tabs.stream")}</TabsTrigger>
              <TabsTrigger value="members">{t("kraal.tabs.members")}</TabsTrigger>
              <TabsTrigger value="archive">{t("kraal.tabs.archive")}</TabsTrigger>
            </TabsList>

            <TabsContent value="stream">
              {isAuthenticated && isMember && (
                <Card className="border-0 bg-surface mb-4">
                  <CardContent className="p-4">
                    <textarea
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      placeholder={t("kraal.compose.placeholder")}
                      rows={3}
                      className="w-full bg-transparent border-none outline-none resize-none placeholder:text-text-tertiary text-sm"
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        onClick={handlePost}
                        disabled={!composer.trim() || submitting}
                        className="rounded-full"
                      >
                        <Send className="w-4 h-4" aria-hidden />
                        Post
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {posts.length === 0 ? (
                <Card className="border-0 bg-surface">
                  <CardContent className="p-8 text-center text-text-secondary text-sm">
                    {t("kraal.empty")}
                  </CardContent>
                </Card>
              ) : (
                <ul className="space-y-3">
                  {posts.map((post) => (
                    <li key={post.id}>
                      <Card className="border-0 bg-surface">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-2">
                            <div
                              className="w-9 h-9 rounded-full bg-elevated flex items-center justify-center text-sm font-semibold shrink-0"
                              aria-hidden
                            >
                              {authorInitial(authorLabel(post.author))}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold">
                                {authorLabel(post.author)}
                              </div>
                              <div className="text-xs text-text-tertiary">
                                {post.created_at && new Date(post.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          {post.text && (
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap mb-3">
                              {post.text}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-text-secondary">
                            <button
                              type="button"
                              onClick={() => handleReaction(post.id)}
                              disabled={!isAuthenticated}
                              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
                            >
                              <Heart className="w-4 h-4" aria-hidden />
                              {post.like_count ?? 0}
                            </button>
                            <span className="inline-flex items-center gap-1.5">
                              <MessageCircle className="w-4 h-4" aria-hidden />
                              {post.comment_count ?? 0}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="members">
              {members.length === 0 ? (
                <Card className="border-0 bg-surface">
                  <CardContent className="p-8 text-center text-text-secondary text-sm">
                    No members yet.
                  </CardContent>
                </Card>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {members.map((m) => (
                    <li key={m.person_id}>
                      <Card className="border-0 bg-surface">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center font-semibold shrink-0" aria-hidden>
                            {authorInitial(authorLabel(m.person))}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">
                              {authorLabel(m.person)}
                            </div>
                            <div className="text-xs text-text-tertiary uppercase tracking-wider">
                              {m.role}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="archive">
              {archived.length === 0 ? (
                <Card className="border-0 bg-surface">
                  <CardContent className="p-8 text-center text-text-secondary text-sm">
                    <Archive className="w-8 h-8 mx-auto mb-2 text-text-tertiary" aria-hidden />
                    Nothing archived yet.
                  </CardContent>
                </Card>
              ) : (
                <ul className="space-y-3">
                  {archived.map((post) => (
                    <li key={post.id}>
                      <Card className="border-0 bg-surface opacity-80">
                        <CardContent className="p-4">
                          <div className="text-xs text-text-tertiary mb-2">
                            {authorLabel(post.author)} ·{" "}
                            {post.created_at && new Date(post.created_at).toLocaleDateString()}
                          </div>
                          {post.text && (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {post.text}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
