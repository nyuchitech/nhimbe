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
}

interface AuthContextType {
  user: NhimbeUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsOnboarding: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

// OAuth configuration for Stytch Connected App
const STYTCH_OAUTH_URL = "https://api.stytch.com/v1/public/oauth2/authorize";
const CLIENT_ID = process.env.NEXT_PUBLIC_STYTCH_CLIENT_ID || "";

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
      const accessToken = localStorage.getItem("nhimbe_access_token");
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      // Validate token and get user
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem("nhimbe_user", JSON.stringify(data.user));
      } else {
        // Token invalid, clear storage
        localStorage.removeItem("nhimbe_access_token");
        localStorage.removeItem("nhimbe_refresh_token");
        localStorage.removeItem("nhimbe_user");
      }
    } catch (error) {
      console.error("Session check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = useCallback(() => {
    // Build OAuth authorization URL
    const redirectUri = typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : "https://www.nhimbe.com/auth/callback";

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "openid email profile",
      state: generateState(),
    });

    // Store state for CSRF protection
    if (typeof window !== "undefined") {
      localStorage.setItem("oauth_state", params.get("state") || "");
    }

    // Redirect to Stytch OAuth
    window.location.href = `${STYTCH_OAUTH_URL}?${params.toString()}`;
  }, []);

  const signOut = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem("nhimbe_access_token");

      // Revoke token on backend
      if (accessToken) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }).catch(() => {}); // Ignore errors
      }
    } finally {
      // Clear local storage
      localStorage.removeItem("nhimbe_access_token");
      localStorage.removeItem("nhimbe_refresh_token");
      localStorage.removeItem("nhimbe_user");
      localStorage.removeItem("oauth_state");
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

// Generate random state for CSRF protection
function generateState(): string {
  const array = new Uint8Array(32);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
