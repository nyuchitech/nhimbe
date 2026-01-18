import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from './auth-guard';

// Mock the auth context
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Create a mutable auth state for testing
let mockAuthState = {
  isAuthenticated: false,
  isLoading: true,
  needsOnboarding: false,
};

vi.mock('./auth-context', () => ({
  useAuth: () => mockAuthState,
}));

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      isAuthenticated: false,
      isLoading: true,
      needsOnboarding: false,
    };
  });

  it('shows loading spinner while checking auth state', () => {
    mockAuthState = {
      isAuthenticated: false,
      isLoading: true,
      needsOnboarding: false,
    };

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Should show loader, not content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    // Loader should be present (Loader2 component renders an SVG with animate-spin class)
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('redirects unauthenticated users to sign in page', async () => {
    mockAuthState = {
      isAuthenticated: false,
      isLoading: false,
      needsOnboarding: false,
    };

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Should redirect to sign in
    expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    // Should not show content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects users who need onboarding to onboarding page when requireOnboarding=true', async () => {
    mockAuthState = {
      isAuthenticated: true,
      isLoading: false,
      needsOnboarding: true,
    };

    render(
      <AuthGuard requireOnboarding={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Should redirect to onboarding
    expect(mockPush).toHaveBeenCalledWith('/onboarding');
    // Should not show content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('allows users who need onboarding when requireOnboarding=false', () => {
    mockAuthState = {
      isAuthenticated: true,
      isLoading: false,
      needsOnboarding: true,
    };

    render(
      <AuthGuard requireOnboarding={false}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Should NOT redirect
    expect(mockPush).not.toHaveBeenCalled();
    // Should show content
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows protected content for fully authenticated users', () => {
    mockAuthState = {
      isAuthenticated: true,
      isLoading: false,
      needsOnboarding: false,
    };

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Should NOT redirect
    expect(mockPush).not.toHaveBeenCalled();
    // Should show content
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('defaults requireOnboarding to true', async () => {
    mockAuthState = {
      isAuthenticated: true,
      isLoading: false,
      needsOnboarding: true,
    };

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Should redirect to onboarding (default requireOnboarding=true)
    expect(mockPush).toHaveBeenCalledWith('/onboarding');
  });

  // Edge case: This test exposes a bug in the current implementation
  it('should redirect unauthenticated users to sign in even if needsOnboarding is true', async () => {
    // This state can happen if:
    // - User object exists but has no id (malformed data)
    // - needsOnboarding is computed as: !!user && !user.onboardingCompleted
    // - isAuthenticated is computed as: !!user?.id
    mockAuthState = {
      isAuthenticated: false,
      isLoading: false,
      needsOnboarding: true, // User exists but no id, hasn't completed onboarding
    };

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // BUG: Current behavior redirects to /onboarding instead of /auth/signin
    // An unauthenticated user should ALWAYS go to sign in, not onboarding
    // The current condition `!isAuthenticated && !needsOnboarding` is flawed

    // This test currently FAILS because it redirects to /onboarding
    expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    expect(mockPush).not.toHaveBeenCalledWith('/onboarding');
  });
});
