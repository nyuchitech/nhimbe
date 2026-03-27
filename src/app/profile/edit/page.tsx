"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStytch } from "@stytch/nextjs";
import { useAuth } from "@/components/auth/auth-context";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCities, getCategories, updateProfile, type Category } from "@/lib/api";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Check,
} from "lucide-react";
import Link from "next/link";

function ProfileEditContent() {
  const router = useRouter();
  const stytch = useStytch();
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  const [cities, setCities] = useState<{ addressLocality: string; addressCountry: string }[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Pre-populate from user
  useEffect(() => {
    if (user && !dataLoaded) {
      setName(user.name || "");
      setCity(user.addressLocality || "");
      setCountry(user.addressCountry || "");
      setInterests(user.interests || []);
      setDataLoaded(true);
    }
  }, [user, dataLoaded]);

  // Load cities and categories
  useEffect(() => {
    Promise.all([getCities(), getCategories()])
      .then(([citiesData, categoriesData]) => {
        setCities(citiesData);
        setCategories(categoriesData);
      })
      .catch(console.error);
  }, []);

  const selectCity = useCallback((c: string, co: string) => {
    setCity(c);
    setCountry(co);
  }, []);

  const toggleInterest = useCallback((categoryId: string) => {
    setInterests((prev) =>
      prev.includes(categoryId)
        ? prev.filter((i) => i !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const tokens = stytch.session.getTokens();
      const sessionJwt = tokens?.session_jwt;
      if (!sessionJwt) {
        throw new Error("No session found. Please sign in again.");
      }

      // Only send fields that changed
      const changedFields: Record<string, string | string[]> = {};
      if (name !== (user?.name || "")) changedFields.name = name;
      if (city !== (user?.addressLocality || "")) changedFields.addressLocality = city;
      if (country !== (user?.addressCountry || "")) changedFields.addressCountry = country;
      if (JSON.stringify(interests) !== JSON.stringify(user?.interests || [])) {
        changedFields.interests = interests;
      }

      if (Object.keys(changedFields).length === 0) {
        router.push("/profile");
        return;
      }

      await updateProfile(sessionJwt, changedFields);
      await refreshUser();
      router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  // Group categories by group
  const categoryGroups = categories.reduce<Record<string, Category[]>>((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {});

  return (
    <div className="max-w-150 mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/profile"
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface transition-colors"
          aria-label="Back to profile"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
      </div>

      {/* Name */}
      <div className="bg-surface rounded-xl p-4 mb-6">
        <Label htmlFor="name" className="block text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">
          Name
        </Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What should we call you?"
          className="w-full px-4 py-3 bg-elevated rounded-xl border border-elevated focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
        />
        <p className="text-sm text-text-tertiary mt-2">
          This is how you&apos;ll appear to other attendees and hosts.
        </p>
      </div>

      {/* City */}
      <div className="bg-surface rounded-xl p-4 mb-6">
        <Label className="block text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">
          Location
        </Label>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {cities.map((loc) => {
            const isSelected = city === loc.addressLocality && country === loc.addressCountry;
            return (
              <Button
                key={`${loc.addressLocality}-${loc.addressCountry}`}
                variant="ghost"
                onClick={() => selectCity(loc.addressLocality, loc.addressCountry)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors h-auto ${
                  isSelected
                    ? "bg-primary/20 border border-primary"
                    : "bg-elevated border border-elevated hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-text-secondary" />
                  <div className="text-left">
                    <div className="font-medium">{loc.addressLocality}</div>
                    <div className="text-sm text-text-secondary">{loc.addressCountry}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-5 h-5 text-primary" />}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Interests */}
      <div className="bg-surface rounded-xl p-4 mb-6">
        <Label className="block text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">
          Interests
        </Label>
        <p className="text-sm text-text-secondary mb-4">
          Select categories that interest you to personalize your experience.
        </p>
        {Object.entries(categoryGroups).map(([group, cats]) => (
          <div key={group} className="mb-4 last:mb-0">
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">{group}</p>
            <div className="flex flex-wrap gap-2">
              {cats.map((category) => (
                <Button
                  key={category.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleInterest(category.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    interests.includes(category.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-elevated border border-elevated hover:border-primary/50"
                  }`}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.push("/profile")} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}

export default function ProfileEditPage() {
  return (
    <AuthGuard>
      <ProfileEditContent />
    </AuthGuard>
  );
}
