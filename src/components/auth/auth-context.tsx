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
  _id: string;
  email: string;
  name: string;
  alternateName?: string;
  image?: string;
  address?: {
    addressLocality?: string;
    addressCountry?: string;
  };
  interests?: string[];
  onboardingCompleted: boolean;
  stytchUserId: string;
  role: UserRole;
  mukokoOrgMemberId?: string;
  authProvider?: "email" | "mukoko_id";
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
  needsOnboarding: boolean;
  signIn: (returnUrl?: string) => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

<<<<<<< Updated upstream
=======
// Helper to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  if (match) {
    try {
      return decodeURIComponent(match[2]);
    } catch {
      return match[2];
    }
  }
  return null;
}

// Helper to delete cookie
function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  // Delete with and without domain to cover both cases
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${name}=; path=/; domain=.nhimbe.com; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

>>>>>>> Stashed changes
export function AuthProvider({ children }: { children: ReactNode }) {
  const [nhimbeUser, setNhimbeUser] = useState<NhimbeUser | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const router = useRouter();

<<<<<<< Updated upstream
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
        // Fallback: create user from Stytch data
        setNhimbeUser({
          id: stytchUser.user_id,
          email,
          name: name || "User",
          onboardingCompleted: false,
          stytchUserId: stytchUser.user_id,
          role: "user",
        });
=======
  const checkSession = useCallback(async () => {
    try {
      // Check for user data in cookie (set by callback route)
      const userCookie = getCookie("nhimbe_user");
      if (userCookie) {
        try {
          const userData = JSON.parse(userCookie);
          setUser(userData);
          setIsLoading(false);
          return;
        } catch (e) {
          console.error("Failed to parse user cookie:", e);
        }
      }

      // Try to validate session with backend using httpOnly session cookie
      // The session JWT is in an httpOnly cookie, so we use credentials: include
      // and let the backend read it from the cookie header
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Session invalid, clear local state
        clearAuth();
>>>>>>> Stashed changes
      }
    } catch {
      // Fallback on network error
      const email = stytchUser.emails?.[0]?.email || "";
      const name =
        `${stytchUser.name?.first_name || ""} ${stytchUser.name?.last_name || ""}`.trim();
      setNhimbeUser({
        id: stytchUser.user_id,
        email,
        name: name || "User",
        onboardingCompleted: false,
        stytchUserId: stytchUser.user_id,
        role: "user",
      });
    } finally {
      setSyncing(false);
      setHasSynced(true);
    }
<<<<<<< Updated upstream
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
        localStorage.setItem("auth_redirect", returnUrl);
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
=======
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const clearAuth = () => {
    deleteCookie("nhimbe_session");
    deleteCookie("nhimbe_session_token");
    deleteCookie("nhimbe_user");
    // Clean up legacy cookies
    deleteCookie("nhimbe_access_token");
    deleteCookie("nhimbe_refresh_token");
    localStorage.removeItem("nhimbe_user");
    localStorage.removeItem("nhimbe_access_token");
    localStorage.removeItem("nhimbe_refresh_token");
  };

  const signIn = useCallback((returnUrl?: string) => {
    // Navigate to sign-in page with email form
    const signinUrl = new URL("/auth/signin", window.location.origin);
    if (returnUrl) {
      signinUrl.searchParams.set("redirect", returnUrl);
    }
    router.push(signinUrl.toString());
  }, [router]);

  const signOut = useCallback(async () => {
    try {
      // Call logout API to clear httpOnly cookies server-side
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});

      // Also notify backend
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
>>>>>>> Stashed changes
    } finally {
      setNhimbeUser(null);
      setHasSynced(false);
      router.push("/");
    }
  }, [stytch, router]);

  const refreshUser = useCallback(async () => {
<<<<<<< Updated upstream
    setHasSynced(false);
    await syncWithBackend();
  }, [syncWithBackend]);

  const isLoading = !isSDKReady || syncing;
  const isAuthenticated = !!stytchUser && !!session && !!nhimbeUser;
  const needsOnboarding = !!nhimbeUser && !nhimbeUser.onboardingCompleted;
=======
    setIsLoading(true);
    await checkSession();
  }, [checkSession]);

  const isAuthenticated = !!user?._id;
  const needsOnboarding = !!user && !user.onboardingCompleted;
>>>>>>> Stashed changes

  return (
    <AuthContext.Provider
      value={{
        user: nhimbeUser,
        isAuthenticated,
        isLoading,
        needsOnboarding,
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
