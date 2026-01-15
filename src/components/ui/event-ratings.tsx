"use client";

import { useState } from "react";
import { Star, MessageSquare, ThumbsUp, User } from "lucide-react";

interface Review {
  id: string;
  userName: string;
  userInitials: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
}

interface EventRatingsProps {
  eventId: string;
  averageRating?: number;
  totalReviews?: number;
  ratingDistribution?: { [key: number]: number }; // 1-5 star counts
  reviews?: Review[];
  isPastEvent?: boolean;
  userCanReview?: boolean;
  className?: string;
}

// Default mock data
const defaultReviews: Review[] = [
  {
    id: "1",
    userName: "Sarah M.",
    userInitials: "SM",
    rating: 5,
    comment: "Amazing event! Great networking opportunities and the speaker was fantastic. Would definitely attend again.",
    date: "2 days ago",
    helpful: 8,
  },
  {
    id: "2",
    userName: "John K.",
    userInitials: "JK",
    rating: 4,
    comment: "Well organized event. Venue was nice but could have used better seating arrangements.",
    date: "3 days ago",
    helpful: 3,
  },
  {
    id: "3",
    userName: "Lisa T.",
    userInitials: "LT",
    rating: 5,
    comment: "Loved it! The host was welcoming and made everyone feel included. True Ubuntu spirit.",
    date: "1 week ago",
    helpful: 12,
  },
];

const defaultDistribution = { 5: 45, 4: 28, 3: 12, 2: 8, 1: 3 };

export function EventRatings({
  eventId,
  averageRating = 4.3,
  totalReviews = 96,
  ratingDistribution = defaultDistribution,
  reviews = defaultReviews,
  isPastEvent = true,
  userCanReview = false,
  className = "",
}: EventRatingsProps) {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [helpfulClicked, setHelpfulClicked] = useState<Set<string>>(new Set());

  const totalRatings = Object.values(ratingDistribution).reduce((a, b) => a + b, 0);

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "w-3 h-3",
      md: "w-4 h-4",
      lg: "w-6 h-6",
    };

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? "text-accent fill-accent"
                : star <= rating + 0.5
                ? "text-accent fill-accent/50"
                : "text-text-tertiary"
            }`}
          />
        ))}
      </div>
    );
  };

  const handleHelpful = (reviewId: string) => {
    setHelpfulClicked((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

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
          {renderStars(averageRating, "lg")}
          <div className="text-sm text-text-secondary mt-1">
            {totalReviews} reviews
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((stars) => {
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
                {renderStars(review.rating, "sm")}
              </div>
            </div>
            <p className="text-sm text-text-secondary mb-3">{review.comment}</p>
            <button
              onClick={() => handleHelpful(review.id)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                helpfulClicked.has(review.id)
                  ? "text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
              <span>
                Helpful ({review.helpful + (helpfulClicked.has(review.id) ? 1 : 0)})
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Show More / Write Review */}
      <div className="mt-4 flex items-center justify-between">
        {reviews.length > 3 && (
          <button
            onClick={() => setShowAllReviews(!showAllReviews)}
            className="text-sm text-primary font-medium hover:underline"
          >
            {showAllReviews ? "Show less" : `View all ${reviews.length} reviews`}
          </button>
        )}
        {userCanReview && isPastEvent && (
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
            <Star className="w-4 h-4" />
            Write a Review
          </button>
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
