import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth, NhimbeUser } from './auth-context';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Test component that uses the auth context
function TestConsumer() {
  const { user, isAuthenticated, isLoading, needsOnboarding, signIn, signOut } = useAuth();
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="needs-onboarding">{needsOnboarding ? 'yes' : 'no'}</div>
      <div data-testid="user-name">{user?.name || 'no-user'}</div>
      <button onClick={() => signIn('/dashboard')}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

describe('AuthContext', () => {
  let mockLocalStorage: Record<string, string | null>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage = {};

    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(),
      },
      configurable: true,
    });

    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });

    // Mock fetch
    global.fetch = vi.fn();
  });

  it('finishes loading when no session data exists', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // When no session data exists, loading completes quickly
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('no');
  });

  it('loads user from cookie', async () => {
    const mockUser: NhimbeUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      onboardingCompleted: true,
      stytchUserId: 'stytch-123',
    };

    // Set cookie with user data
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: `nhimbe_user=${encodeURIComponent(JSON.stringify(mockUser))}`,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('yes');
    expect(screen.getByTestId('user-name').textContent).toBe('Test User');
    expect(screen.getByTestId('needs-onboarding').textContent).toBe('no');
  });

  it('loads user from localStorage when no cookie', async () => {
    const mockUser: NhimbeUser = {
      id: 'user-456',
      email: 'local@example.com',
      name: 'Local User',
      onboardingCompleted: false,
      stytchUserId: 'stytch-456',
    };

    mockLocalStorage['nhimbe_user'] = JSON.stringify(mockUser);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('yes');
    expect(screen.getByTestId('user-name').textContent).toBe('Local User');
    expect(screen.getByTestId('needs-onboarding').textContent).toBe('yes');
  });

  it('validates session with backend when token exists but no user data', async () => {
    const mockUser: NhimbeUser = {
      id: 'user-789',
      email: 'backend@example.com',
      name: 'Backend User',
      onboardingCompleted: true,
      stytchUserId: 'stytch-789',
    };

    // Set access token in cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'nhimbe_access_token=valid-token',
    });

    // Mock successful backend response
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/me'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer valid-token' },
      })
    );
    expect(screen.getByTestId('authenticated').textContent).toBe('yes');
  });

  it('clears auth when backend validation fails', async () => {
    // Set access token in localStorage
    mockLocalStorage['nhimbe_access_token'] = 'invalid-token';

    // Mock failed backend response
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('no');
  });

  it('computes isAuthenticated correctly', async () => {
    // User with id should be authenticated
    const authenticatedUser: NhimbeUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test',
      onboardingCompleted: true,
      stytchUserId: 'stytch-123',
    };

    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: `nhimbe_user=${encodeURIComponent(JSON.stringify(authenticatedUser))}`,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('yes');
    });
  });

  it('computes needsOnboarding correctly', async () => {
    // User who hasn't completed onboarding
    const newUser: NhimbeUser = {
      id: 'user-123',
      email: 'new@example.com',
      name: 'New User',
      onboardingCompleted: false,
      stytchUserId: 'stytch-123',
    };

    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: `nhimbe_user=${encodeURIComponent(JSON.stringify(newUser))}`,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('needs-onboarding').textContent).toBe('yes');
    });
  });

  it('signIn redirects to login URL with return path', async () => {
    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, origin: 'http://localhost:3000', href: '' },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    const signInButton = screen.getByText('Sign In');
    await act(async () => {
      signInButton.click();
    });

    expect(window.location.href).toContain('/api/auth/login');
    expect(window.location.href).toContain('returnUrl=%2Fdashboard');

    // Restore
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('signOut clears auth and redirects to home', async () => {
    const mockUser: NhimbeUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test',
      onboardingCompleted: true,
      stytchUserId: 'stytch-123',
    };

    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: `nhimbe_user=${encodeURIComponent(JSON.stringify(mockUser))}; nhimbe_access_token=test-token`,
    });

    // Mock logout API calls
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('yes');
    });

    const signOutButton = screen.getByText('Sign Out');
    await act(async () => {
      signOutButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('no');
    });

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
