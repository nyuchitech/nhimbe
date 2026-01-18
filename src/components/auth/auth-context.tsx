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

export type UserRole = 'user' | 'moderator' | 'admin' | 'super_admin';

export interface NhimbeUser {
  id: string;
  email: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  city?: string;
  country?: string;
  interests?: string[];
  onboardingCompleted: boolean;
  stytchUserId: string;
  role: UserRole;
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
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<NhimbeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // First check for user data in cookie (set by callback)
      const userCookie = getCookie("nhimbe_user");
      if (userCookie) {
        try {
          const userData = JSON.parse(userCookie);
          setUser(userData);
          // Also store in localStorage for easy access
          localStorage.setItem("nhimbe_user", userCookie);
          setIsLoading(false);
          return;
        } catch (e) {
          console.error("Failed to parse user cookie:", e);
        }
      }

      // Fallback to localStorage
      const storedUser = localStorage.getItem("nhimbe_user");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsLoading(false);
          return;
        } catch (e) {
          console.error("Failed to parse stored user:", e);
        }
      }

      // Try to validate session with backend
      const accessToken = getCookie("nhimbe_access_token") || localStorage.getItem("nhimbe_access_token");
      if (accessToken) {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          localStorage.setItem("nhimbe_user", JSON.stringify(data.user));
        } else {
          // Token invalid, clear storage
          clearAuth();
        }
      }
    } catch (error) {
      console.error("Session check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuth = () => {
    deleteCookie("nhimbe_access_token");
    deleteCookie("nhimbe_refresh_token");
    deleteCookie("nhimbe_user");
    localStorage.removeItem("nhimbe_access_token");
    localStorage.removeItem("nhimbe_refresh_token");
    localStorage.removeItem("nhimbe_user");
  };

  const signIn = useCallback((returnUrl?: string) => {
    // Use API route for OAuth flow with PKCE
    const loginUrl = new URL("/api/auth/login", window.location.origin);
    if (returnUrl) {
      loginUrl.searchParams.set("returnUrl", returnUrl);
    }
    window.location.href = loginUrl.toString();
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Call logout API to clear cookies
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});

      // Also try backend logout
      const accessToken = getCookie("nhimbe_access_token") || localStorage.getItem("nhimbe_access_token");
      if (accessToken) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        }).catch(() => {});
      }
    } finally {
      clearAuth();
      setUser(null);
      router.push("/");
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    await checkSession();
  }, []);

  const isAuthenticated = !!user?.id;
  const needsOnboarding = !!user && !user.onboardingCompleted;

  return (
    <AuthContext.Provider
      value={{
        user,
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
