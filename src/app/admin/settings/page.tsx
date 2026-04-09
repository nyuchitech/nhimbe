"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Save,
  Loader2,
  Mail,
  Bell,
  Shield,
  Globe,
  Database,
  AlertTriangle,
} from "lucide-react";

interface Settings {
  siteName: string;
  supportEmail: string;
  maxEventsPerUser: number;
  maxAttendeesDefault: number;
  requireEmailVerification: boolean;
  enableRegistrations: boolean;
  enableReviews: boolean;
  enableReferrals: boolean;
  maintenanceMode: boolean;
  allowedDomains: string;
}

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [settings, setSettings] = useState<Settings>({
    siteName: "nhimbe",
    supportEmail: "support@nhimbe.com",
    maxEventsPerUser: 50,
    maxAttendeesDefault: 100,
    requireEmailVerification: true,
    enableRegistrations: true,
    enableReviews: true,
    enableReferrals: true,
    maintenanceMode: false,
    allowedDomains: "",
  });

  async function handleSave() {
    setSaving(true);
    try {
      // In a real implementation, this would call the API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Show success message
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-text-secondary">
            Configure platform settings and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>General</CardTitle>
              <CardDescription>Basic platform configuration</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                Site Name
              </label>
              <Input
                value={settings.siteName}
                onChange={(e) =>
                  setSettings({ ...settings, siteName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Support Email
              </label>
              <Input
                type="email"
                value={settings.supportEmail}
                onChange={(e) =>
                  setSettings({ ...settings, supportEmail: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <CardTitle>Events</CardTitle>
              <CardDescription>Event creation and limits</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                Max Events Per User
              </label>
              <Input
                type="number"
                value={settings.maxEventsPerUser}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxEventsPerUser: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-text-tertiary mt-1">
                Maximum number of events a user can create
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Default Max Attendees
              </label>
              <Input
                type="number"
                value={settings.maxAttendeesDefault}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxAttendeesDefault: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-text-tertiary mt-1">
                Default capacity for new events
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-accent" />
            </div>
            <div>
              <CardTitle>Features</CardTitle>
              <CardDescription>Enable or disable platform features</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Event Registrations</div>
              <div className="text-sm text-text-tertiary">
                Allow users to RSVP for events
              </div>
              <div className="text-xs text-text-tertiary mt-1">
                When disabled, new registrations will be paused across all events
              </div>
            </div>
            <Switch
              checked={settings.enableRegistrations}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enableRegistrations: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Event Reviews</div>
              <div className="text-sm text-text-tertiary">
                Allow users to leave reviews on past events
              </div>
              <div className="text-xs text-text-tertiary mt-1">
                When disabled, users will not be able to submit or view reviews
              </div>
            </div>
            <Switch
              checked={settings.enableReviews}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enableReviews: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Referral Program</div>
              <div className="text-sm text-text-tertiary">
                Enable referral tracking and leaderboards
              </div>
              <div className="text-xs text-text-tertiary mt-1">
                When disabled, referral codes and leaderboards will be hidden
              </div>
            </div>
            <Switch
              checked={settings.enableReferrals}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enableReferrals: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <CardTitle>Security</CardTitle>
              <CardDescription>Authentication and access control</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Require Email Verification</div>
              <div className="text-sm text-text-tertiary">
                Users must verify their email before accessing features
              </div>
            </div>
            <Switch
              checked={settings.requireEmailVerification}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, requireEmailVerification: checked })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Allowed Email Domains
            </label>
            <Input
              placeholder="e.g., company.com, organization.org"
              value={settings.allowedDomains}
              onChange={(e) =>
                setSettings({ ...settings, allowedDomains: e.target.value })
              }
            />
            <p className="text-xs text-text-tertiary mt-1">
              Leave empty to allow all domains. Comma-separated list.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <CardTitle className="text-red-400">Danger Zone</CardTitle>
              <CardDescription>
                Actions that affect the entire platform
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-xl border border-red-500/20">
            <div>
              <div className="font-medium">Maintenance Mode</div>
              <div className="text-sm text-text-tertiary">
                Only admins can access the site when enabled
              </div>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, maintenanceMode: checked })
              }
            />
          </div>

          <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20">
            <div className="font-medium mb-2">Clear All Data</div>
            <p className="text-sm text-text-tertiary mb-4">
              Permanently delete all events, users, and data. This action cannot
              be undone.
            </p>
            <Button
              variant="ghost"
              className="text-red-400 border border-red-500/20 hover:bg-red-500/10"
              onClick={() => { setShowClearConfirm(true); setClearConfirmText(""); }}
            >
              <AlertTriangle className="w-4 h-4" />
              Clear All Data
            </Button>
          </div>

          {/* Clear All Data confirmation modal */}
          {showClearConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              <div className="bg-elevated rounded-2xl p-6 max-w-md w-full">
                <h3 className="text-xl font-bold mb-2 text-red-400">Confirm Data Deletion</h3>
                <p className="text-text-secondary mb-4">
                  This will permanently delete <strong>all events, users, and data</strong>. This action cannot be undone.
                </p>
                <p className="text-sm text-text-tertiary mb-3">
                  Type <strong>DELETE</strong> to confirm:
                </p>
                <Input
                  type="text"
                  value={clearConfirmText}
                  onChange={(e) => setClearConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none mb-4 text-base"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-surface hover:bg-foreground/10 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={clearConfirmText !== "DELETE"}
                    className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure email templates and notifications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-text-tertiary text-center py-8">
            Email configuration is managed through Cloudflare Workers
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
