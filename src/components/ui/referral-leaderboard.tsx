"use client";

import { Trophy, Users, Share2, Crown, Medal, Award } from "lucide-react";

interface Referrer {
  id: string;
  name: string;
  initials: string;
  referrals: number;
  rank: number;
}

interface ReferralLeaderboardProps {
  eventId?: string;
  referrers?: Referrer[];
  totalReferrals?: number;
  userReferralCode?: string;
  userReferrals?: number;
  className?: string;
}

// Default mock data
const defaultReferrers: Referrer[] = [
  { id: "1", name: "Sarah M.", initials: "SM", referrals: 12, rank: 1 },
  { id: "2", name: "John K.", initials: "JK", referrals: 8, rank: 2 },
  { id: "3", name: "Lisa T.", initials: "LT", referrals: 6, rank: 3 },
  { id: "4", name: "Mike R.", initials: "MR", referrals: 4, rank: 4 },
  { id: "5", name: "Anna P.", initials: "AP", referrals: 3, rank: 5 },
];

const rankIcons = {
  1: { icon: Crown, color: "text-accent", bg: "bg-accent/20" },
  2: { icon: Medal, color: "text-gray-300", bg: "bg-gray-300/20" },
  3: { icon: Award, color: "text-amber-600", bg: "bg-amber-600/20" },
};

export function ReferralLeaderboard({
  eventId,
  referrers = defaultReferrers,
  totalReferrals = 33,
  userReferralCode,
  userReferrals = 0,
  className = "",
}: ReferralLeaderboardProps) {
  const handleCopyReferralLink = () => {
    const link = `${window.location.origin}/events/${eventId}?ref=${userReferralCode}`;
    navigator.clipboard.writeText(link);
  };

  return (
    <div className={`bg-surface rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          <h3 className="font-bold text-lg">Community Builders</h3>
        </div>
        <div className="flex items-center gap-1 text-sm text-text-secondary">
          <Users className="w-4 h-4" />
          <span>{totalReferrals} referrals</span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-2 mb-6">
        {referrers.slice(0, 5).map((referrer) => {
          const rankStyle = rankIcons[referrer.rank as keyof typeof rankIcons];
          const RankIcon = rankStyle?.icon;

          return (
            <div
              key={referrer.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                referrer.rank <= 3 ? "bg-elevated" : "hover:bg-elevated"
              }`}
            >
              {/* Rank */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  rankStyle ? rankStyle.bg : "bg-surface"
                }`}
              >
                {RankIcon ? (
                  <RankIcon className={`w-4 h-4 ${rankStyle.color}`} />
                ) : (
                  <span className="text-sm font-bold text-text-tertiary">
                    {referrer.rank}
                  </span>
                )}
              </div>

              {/* Avatar & Name */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-sm font-bold text-background">
                {referrer.initials}
              </div>
              <div className="flex-1">
                <div className="font-medium">{referrer.name}</div>
                <div className="text-xs text-text-tertiary">
                  {referrer.referrals} friend{referrer.referrals !== 1 ? "s" : ""} invited
                </div>
              </div>

              {/* Badge for top 3 */}
              {referrer.rank === 1 && (
                <span className="px-2 py-1 bg-accent/20 text-accent text-xs font-semibold rounded-full">
                  Top Builder
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* User's Referral Section */}
      {userReferralCode && (
        <div className="border-t border-elevated pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-secondary">Your referrals</span>
            <span className="font-bold">{userReferrals}</span>
          </div>
          <button
            onClick={handleCopyReferralLink}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Share2 className="w-4 h-4" />
            Share Your Link
          </button>
          <p className="text-xs text-text-tertiary text-center mt-2">
            Help build the community! Share with friends and climb the leaderboard.
          </p>
        </div>
      )}

      {/* Philosophy Note */}
      <div className="mt-4 p-3 bg-elevated rounded-xl">
        <p className="text-xs text-text-secondary text-center">
          <span className="text-primary font-medium">Open data</span> - We believe in transparency.
          See who&apos;s helping grow the community.
        </p>
      </div>
    </div>
  );
}

// Compact version for event cards
export function ReferralBadge({
  referrals,
  className = "",
}: {
  referrals: number;
  className?: string;
}) {
  if (referrals === 0) return null;

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 bg-secondary/20 text-secondary rounded-full ${className}`}
    >
      <Share2 className="w-3 h-3" />
      <span className="text-xs font-medium">{referrals} referrals</span>
    </div>
  );
}
