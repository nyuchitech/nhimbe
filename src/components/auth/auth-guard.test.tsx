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
    };
  });

  it('shows loading spinner while checking auth state', () => {
    mockAuthState = {
      isAuthenticated: false,
      isLoading: true,
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

  it('shows protected content for authenticated users', () => {
    mockAuthState = {
      isAuthenticated: true,
      isLoading: false,
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

  it('does not render children when not authenticated', () => {
    mockAuthState = {
      isAuthenticated: false,
      isLoading: false,
    };

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
