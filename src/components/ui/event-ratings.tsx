"use client";

import { useState, useEffect } from "react";
import { Star, MessageSquare, ThumbsUp, Loader2 } from "lucide-react";
import { Rating } from "@/components/ui/rating";
import { Button } from "@/components/ui/button";
import { getEventReviews, markReviewHelpful, type EventReview as ApiReview, type ReviewStats } from "@/lib/api";

interface Review {
  id: string;
  userName: string;
  userInitials: string;
  rating: number;
  reviewBody: string;
  date: string;
  helpful: number;
}

interface EventRatingsProps {
  eventId: string;
  isPastEvent?: boolean;
  userCanReview?: boolean;
  currentUserId?: string;
  className?: string;
}

// Helper to format date
function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? "s" : ""} ago`;
}

export function EventRatings({
  eventId,
  isPastEvent = true,
  userCanReview = false,
  currentUserId,
  className = "",
}: EventRatingsProps) {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const data = await getEventReviews(eventId);
        // Transform API data to component format
        const transformedReviews: Review[] = data.reviews.map((r) => ({
          id: r.id,
          userName: r.userName,
          userInitials: r.userInitials,
          rating: r.rating,
          reviewBody: r.reviewBody || "",
          date: formatRelativeDate(r.dateCreated),
          helpful: r.helpfulCount,
        }));
        setReviews(transformedReviews);
        setStats(data.stats);
      } catch (error) {
        console.error("Failed to fetch event reviews:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, [eventId]);

  const averageRating = stats?.averageRating ?? 0;
  const totalReviews = stats?.totalReviews ?? 0;
  const ratingDistribution = stats?.distribution ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [helpfulClicked, setHelpfulClicked] = useState<Set<string>>(new Set());

  const totalRatings = Object.values(ratingDistribution).reduce((a, b) => a + b, 0);

  const ratingSize = (size: "sm" | "md" | "lg" = "md") =>
    size === "sm" ? "sm" as const : size === "lg" ? "lg" as const : "default" as const;

  const handleHelpful = async (reviewId: string) => {
    if (helpfulClicked.has(reviewId)) return;

    // Optimistic update
    setHelpfulClicked((prev) => new Set([...prev, reviewId]));

    // Call API if user is logged in
    if (currentUserId) {
      try {
        await markReviewHelpful(reviewId, currentUserId);
      } catch (error) {
        // Revert on failure
        setHelpfulClicked((prev) => {
          const newSet = new Set(prev);
          newSet.delete(reviewId);
          return newSet;
        });
      }
    }
  };

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  if (loading) {
    return (
      <div className={`bg-surface rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Community Feedback</h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Don't render if there are no reviews and user can't write one
  if (reviews.length === 0 && !userCanReview) {
    return null;
  }

  // Show empty state with option to write review
  if (reviews.length === 0) {
    return (
      <div className={`bg-surface rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Community Feedback</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-text-secondary mb-4">No reviews yet. Be the first to share your experience!</p>
          {userCanReview && isPastEvent && (
            <Button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity mx-auto">
              <Star className="w-4 h-4" />
              Write a Review
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg">Community Feedback</h3>
        {isPastEvent && (
          <span className="ml-auto px-2 py-1 bg-elevated text-text-secondary text-xs rounded-full">
            Past Event
          </span>
        )}
      </div>

      {/* Summary Section */}
      <div className="flex gap-6 mb-6">
        {/* Average Rating */}
        <div className="text-center">
          <div className="text-4xl font-bold mb-1">{averageRating.toFixed(1)}</div>
          <Rating value={averageRating} readOnly size="lg" />
          <div className="text-sm text-text-secondary mt-1">
            {totalReviews} reviews
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 space-y-1">
          {([5, 4, 3, 2, 1] as const).map((stars) => {
            const count = ratingDistribution[stars] || 0;
            const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;

            return (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-xs text-text-secondary w-3">{stars}</span>
                <Star className="w-3 h-3 text-accent fill-accent" />
                <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-text-tertiary w-8">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {displayedReviews.map((review) => (
          <div key={review.id} className="p-4 bg-elevated rounded-xl">
            <div className="flex items-start gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-sm font-bold text-background shrink-0">
                {review.userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{review.userName}</span>
                  <span className="text-xs text-text-tertiary">{review.date}</span>
                </div>
                <Rating value={review.rating} readOnly size="sm" />
              </div>
            </div>
            <p className="text-sm text-text-secondary mb-3">{review.reviewBody}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleHelpful(review.id)}
              className={`flex items-center gap-1 text-xs transition-colors p-0 h-auto min-h-0 ${
                helpfulClicked.has(review.id)
                  ? "text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
              <span>
                Helpful ({review.helpful + (helpfulClicked.has(review.id) ? 1 : 0)})
              </span>
            </Button>
          </div>
        ))}
      </div>

      {/* Show More / Write Review */}
      <div className="mt-4 flex items-center justify-between">
        {reviews.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllReviews(!showAllReviews)}
            className="text-sm text-primary font-medium hover:underline p-0 h-auto min-h-0"
          >
            {showAllReviews ? "Show less" : `View all ${reviews.length} reviews`}
          </Button>
        )}
        {userCanReview && isPastEvent && (
          <Button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
            <Star className="w-4 h-4" />
            Write a Review
          </Button>
        )}
      </div>

      {/* Open Data Note */}
      <div className="mt-4 p-3 bg-background rounded-xl">
        <p className="text-xs text-text-tertiary text-center">
          <span className="text-primary font-medium">Transparent feedback</span> - Real reviews from
          real attendees help you choose great events.
        </p>
      </div>
    </div>
  );
}

// Compact rating display for event cards
export function EventRatingBadge({
  rating,
  reviewCount,
  className = "",
}: {
  rating: number;
  reviewCount: number;
  className?: string;
}) {
  if (rating === 0 || reviewCount === 0) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Star className="w-3.5 h-3.5 text-accent fill-accent" />
      <span className="text-sm font-medium">{rating.toFixed(1)}</span>
      <span className="text-xs text-text-tertiary">({reviewCount})</span>
    </div>
  );
}
