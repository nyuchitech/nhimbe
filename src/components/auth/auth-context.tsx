"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useStytchUser, useStytchSession, useStytch } from "@stytch/nextjs";

export type UserRole = 'user' | 'moderator' | 'admin' | 'super_admin';

export interface NhimbeUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  addressLocality?: string;
  addressCountry?: string;
  interests?: string[];
  stytchUserId: string;
  role: UserRole;
}

export interface ProfileCompleteness {
  name: boolean;
  addressLocality: boolean;
  interests: boolean;
  complete: boolean;
}

// Role permission helpers
const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  super_admin: 3,
};

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

interface AuthContextType {
  user: NhimbeUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  profileCompleteness: ProfileCompleteness;
  signIn: (returnUrl?: string) => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [nhimbeUser, setNhimbeUser] = useState<NhimbeUser | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const router = useRouter();

  const { user: stytchUser, isInitialized: userInitialized } = useStytchUser();
  const { session, isInitialized: sessionInitialized } = useStytchSession();
  const stytch = useStytch();

  const isSDKReady = userInitialized && sessionInitialized;

  // Sync with backend when Stytch session is available
  const syncWithBackend = useCallback(async () => {
    if (!stytchUser || !session) return;

    setSyncing(true);
    try {
      const tokens = stytch.session.getTokens();
      const sessionJwt = tokens?.session_jwt;
      if (!sessionJwt) {
        setSyncing(false);
        return;
      }

      const email = stytchUser.emails?.[0]?.email || "";
      const name =
        `${stytchUser.name?.first_name || ""} ${stytchUser.name?.last_name || ""}`.trim();

      const response = await fetch(`${API_URL}/api/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionJwt}`,
        },
        body: JSON.stringify({
          stytch_user_id: stytchUser.user_id,
          email,
          name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNhimbeUser(data.user);
      } else {
        const errData = await response.json().catch(() => ({})) as { error?: string; reason?: string };
        console.error("[nhimbe] auth/sync failed:", response.status, errData.reason || errData.error || "unknown");
        // Do not create fallback user — stay logged out so the UI accurately reflects auth state
        setNhimbeUser(null);
      }
    } catch (err) {
      console.error("[nhimbe] auth/sync network error:", err);
      // Do not create fallback user — stay logged out on network errors
      setNhimbeUser(null);
    } finally {
      setSyncing(false);
      setHasSynced(true);
    }
  }, [stytchUser, session, stytch]);

  // Sync when Stytch user/session become available
  useEffect(() => {
    if (isSDKReady && stytchUser && session && !hasSynced) {
      syncWithBackend();
    }
    // Clear nhimbe user if Stytch session is gone
    if (isSDKReady && !stytchUser && !session) {
      setNhimbeUser(null);
      setHasSynced(false);
    }
  }, [isSDKReady, stytchUser, session, hasSynced, syncWithBackend]);

  const signIn = useCallback(
    (returnUrl?: string) => {
      if (returnUrl && typeof window !== "undefined") {
        // Only allow relative paths to prevent open redirect attacks
        const isRelativePath = returnUrl.startsWith("/") && !returnUrl.startsWith("//");
        if (isRelativePath) {
          localStorage.setItem("auth_redirect", returnUrl);
        }
      }
      router.push("/auth/signin");
    },
    [router]
  );

  const signOut = useCallback(async () => {
    try {
      await stytch.session.revoke();
    } catch {
      // Session may already be expired
    } finally {
      setNhimbeUser(null);
      setHasSynced(false);
      router.push("/");
    }
  }, [stytch, router]);

  const refreshUser = useCallback(async () => {
    setHasSynced(false);
    await syncWithBackend();
  }, [syncWithBackend]);

  const isLoading = !isSDKReady || syncing;
  const isAuthenticated = !!stytchUser && !!session && !!nhimbeUser;

  const hasName = !!nhimbeUser?.name && nhimbeUser.name !== "" && nhimbeUser.name !== "User";
  const hasAddressLocality = !!nhimbeUser?.addressLocality;
  const hasInterests = !!nhimbeUser?.interests && nhimbeUser.interests.length > 0;

  const profileCompleteness: ProfileCompleteness = {
    name: hasName,
    addressLocality: hasAddressLocality,
    interests: hasInterests,
    complete: hasName && hasAddressLocality && hasInterests,
  };

  return (
    <AuthContext.Provider
      value={{
        user: nhimbeUser,
        isAuthenticated,
        isLoading,
        profileCompleteness,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
