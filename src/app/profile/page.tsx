"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  User,
  MapPin,
  Calendar,
  Bell,
  Moon,
  LogOut,
  ChevronRight,
  Ticket,
  Users,
  Heart,
  Shield,
  HelpCircle,
  ExternalLink,
  KeyRound,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/auth/auth-context";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MenuItem = {
  icon: LucideIcon;
  label: string;
  href?: string;
  badge?: number;
  toggle?: boolean;
  value?: boolean | string;
  onChange?: () => void;
  onClick?: () => void;
  external?: boolean;
};

type MenuSection = {
  section: string;
  items: MenuItem[];
};

function ProfileContent() {
  const router = useRouter();
  const { theme, cycleTheme, resolvedTheme } = useTheme();
  const { user, signOut, profileCompleteness } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  // Get user initials
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  // Format join date
  const joinedDate = user?.id
    ? new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Unknown";

  const menuItems: MenuSection[] = [
    {
      section: "Events",
      items: [
        { icon: Ticket, label: "My Tickets", href: "/my-events" },
        { icon: Users, label: "Events I'm Hosting", href: "/my-events?tab=hosting" },
        { icon: Heart, label: "Saved Events", href: "/my-events?tab=saved" },
      ],
    },
    {
      section: "Settings",
      items: [
        { icon: User, label: "Edit Profile", href: "/profile/edit" },
        {
          icon: Bell,
          label: "Notifications",
          toggle: true,
          value: notifications,
          onChange: () => setNotifications(!notifications),
        },
        {
          icon: Moon,
          label: "Appearance",
          value: theme === "system" ? "System" : resolvedTheme === "dark" ? "Dark" : "Light",
          onClick: cycleTheme,
        },
      ],
    },
    {
      section: "Account",
      items: [
        {
          icon: KeyRound,
          label: "Change Password",
          href: "https://id.mukoko.com/settings/security",
          external: true,
        },
        {
          icon: ExternalLink,
          label: "Manage Mukoko ID",
          href: "https://id.mukoko.com/settings",
          external: true,
        },
      ],
    },
    {
      section: "Support",
      items: [
        { icon: HelpCircle, label: "Help Center", href: "/help" },
        { icon: Shield, label: "Privacy Policy", href: "/privacy" },
      ],
    },
  ];

  return (
    <div className="max-w-150 mx-auto px-6 py-8">
      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-background">
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{user?.name || "User"}</h1>
          <p className="text-text-secondary">{user?.email}</p>
          {(user?.addressLocality || user?.addressCountry) && (
            <div className="flex items-center gap-1 text-sm text-text-tertiary mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {[user?.addressLocality, user?.addressCountry].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
      </div>

      {/* Interests */}
      {user?.interests && user.interests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            Interests
          </h2>
          <div className="flex flex-wrap gap-2">
            {user.interests.map((interest) => (
              <Badge key={interest} variant="secondary">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Completeness Nudge */}
      {!profileCompleteness.complete && (() => {
        const missing: string[] = [];
        if (!profileCompleteness.name) missing.push("your name");
        if (!profileCompleteness.addressLocality) missing.push("your location");
        if (!profileCompleteness.interests) missing.push("your interests");
        const completionPercent = [profileCompleteness.name, profileCompleteness.addressLocality, profileCompleteness.interests].filter(Boolean).length / 3 * 100;
        const nudgeText = `Add ${missing.join(" and ")} for a better experience`;

        return (
          <Link href="/profile/edit" className="block mb-6">
            <div className="bg-surface border border-elevated rounded-xl p-4 flex items-center gap-4">
              <svg className="w-12 h-12 shrink-0" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${completionPercent}, 100`} className="text-primary" />
              </svg>
              <div>
                <p className="font-medium">Complete your profile</p>
                <p className="text-sm text-text-secondary">{nudgeText}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-text-tertiary shrink-0" />
            </div>
          </Link>
        );
      })()}

      {/* Menu Sections */}
      <div className="space-y-6">
        {menuItems.map((section) => (
          <div key={section.section}>
            <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">
              {section.section}
            </h2>
            <div className="bg-surface rounded-xl divide-y divide-elevated">
              {section.items.map((item) => {
                const Icon = item.icon;

                if (item.toggle) {
                  const isOn = item.value === true;
                  return (
                    <div key={item.label} className="flex items-center gap-3 px-4 py-3.5">
                      <Icon className="w-5 h-5 text-text-secondary" />
                      <span className="flex-1 font-medium">{item.label}</span>
                      <Switch
                        checked={isOn}
                        onCheckedChange={item.onChange}
                      />
                    </div>
                  );
                }

                if (item.onClick) {
                  return (
                    <Button
                      key={item.label}
                      variant="ghost"
                      onClick={item.onClick}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-elevated transition-colors rounded-none justify-start h-auto"
                    >
                      <Icon className="w-5 h-5 text-text-secondary" />
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      <span className="text-text-secondary">{item.value}</span>
                      <ChevronRight className="w-5 h-5 text-text-tertiary" />
                    </Button>
                  );
                }

                if (item.external) {
                  return (
                    <a
                      key={item.label}
                      href={item.href || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-elevated transition-colors"
                    >
                      <Icon className="w-5 h-5 text-text-secondary" />
                      <span className="flex-1 font-medium">{item.label}</span>
                      <ExternalLink className="w-4 h-4 text-text-tertiary" />
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href || "#"}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-elevated transition-colors"
                  >
                    <Icon className="w-5 h-5 text-text-secondary" />
                    <span className="flex-1 font-medium">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge variant="default">
                        {item.badge}
                      </Badge>
                    )}
                    <ChevronRight className="w-5 h-5 text-text-tertiary" />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sign Out */}
      <div className="mt-8">
        <Button
          variant="ghost"
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-surface rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </Button>
      </div>

      {/* Member Since */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center gap-1 text-sm text-text-tertiary">
          <Calendar className="w-4 h-4" />
          Member since {joinedDate}
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-elevated rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-2">Sign Out?</h3>
            <p className="text-text-secondary mb-6">
              Are you sure you want to sign out of your account?
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-surface hover:bg-foreground/10 font-medium transition-colors"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSignOut}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
