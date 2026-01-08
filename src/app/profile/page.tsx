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
  const { user, signOut } = useAuth();
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
          {(user?.city || user?.country) && (
            <div className="flex items-center gap-1 text-sm text-text-tertiary mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {[user?.city, user?.country].filter(Boolean).join(", ")}
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
              <span
                key={interest}
                className="px-3 py-1.5 bg-surface rounded-xl text-sm font-medium"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

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
                      <button
                        role="switch"
                        aria-checked={isOn}
                        onClick={item.onChange}
                        className={`relative w-12.75 h-7.75 rounded-full transition-colors ${
                          isOn ? "bg-primary" : "bg-elevated"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-6.75 h-6.75 rounded-full bg-white shadow-md transition-transform duration-200 ${
                            isOn ? "translate-x-5.5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  );
                }

                if (item.onClick) {
                  return (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-elevated transition-colors"
                    >
                      <Icon className="w-5 h-5 text-text-secondary" />
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      <span className="text-text-secondary">{item.value}</span>
                      <ChevronRight className="w-5 h-5 text-text-tertiary" />
                    </button>
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
                      <span className="px-2 py-0.5 bg-primary/20 text-primary text-sm rounded-full">
                        {item.badge}
                      </span>
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
        <button
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-surface rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
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
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-surface hover:bg-foreground/10 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
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
