import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth, type NhimbeUser } from './auth-context';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock Stytch SDK — this is the critical fix.
// AuthProvider calls useStytchUser, useStytchSession, useStytch internally.
const mockStytchRevoke = vi.fn().mockResolvedValue(undefined);
const mockGetTokens = vi.fn().mockReturnValue({ session_jwt: 'mock-jwt-token' });
let mockStytchUser: { user_id: string; emails: { email: string }[]; name: { first_name: string; last_name: string } } | null = null;
let mockStytchSession: { session_id: string } | null = null;
let mockUserInitialized = true;
let mockSessionInitialized = true;

vi.mock('@stytch/nextjs', () => ({
  useStytchUser: () => ({ user: mockStytchUser, isInitialized: mockUserInitialized }),
  useStytchSession: () => ({ session: mockStytchSession, isInitialized: mockSessionInitialized }),
  useStytch: () => ({ session: { revoke: mockStytchRevoke, getTokens: mockGetTokens } }),
}));

// Test component that uses the auth context
function TestConsumer() {
  const { user, isAuthenticated, isLoading, profileCompleteness, signIn, signOut } = useAuth();
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="profile-complete">{profileCompleteness.complete ? 'yes' : 'no'}</div>
      <div data-testid="profile-name">{profileCompleteness.name ? 'yes' : 'no'}</div>
      <div data-testid="profile-city">{profileCompleteness.city ? 'yes' : 'no'}</div>
      <div data-testid="profile-interests">{profileCompleteness.interests ? 'yes' : 'no'}</div>
      <div data-testid="user-name">{user?.name || 'no-user'}</div>
      <button onClick={() => signIn('/dashboard')}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStytchUser = null;
    mockStytchSession = null;
    mockUserInitialized = true;
    mockSessionInitialized = true;

    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      configurable: true,
    });

    // Mock fetch
    global.fetch = vi.fn();
  });

  it('finishes loading when no Stytch session exists', async () => {
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

  it('shows loading when SDK is not initialized', async () => {
    mockUserInitialized = false;
    mockSessionInitialized = false;

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('loading');
  });

  it('syncs with backend when Stytch user and session exist', async () => {
    const backendUser: NhimbeUser = {
      id: 'usr-backend-1',
      email: 'test@example.com',
      name: 'Backend User',
      city: 'Harare',
      interests: ['music', 'tech'],
      stytchUserId: 'stytch-123',
      role: 'user',
    };

    mockStytchUser = {
      user_id: 'stytch-123',
      emails: [{ email: 'test@example.com' }],
      name: { first_name: 'Backend', last_name: 'User' },
    };
    mockStytchSession = { session_id: 'session-abc' };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: backendUser }),
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
      expect.stringContaining('/api/auth/sync'),
      expect.objectContaining({ method: 'POST' })
    );

    expect(screen.getByTestId('authenticated').textContent).toBe('yes');
    expect(screen.getByTestId('user-name').textContent).toBe('Backend User');
  });

  it('falls back to Stytch data when backend sync fails', async () => {
    mockStytchUser = {
      user_id: 'stytch-456',
      emails: [{ email: 'fallback@example.com' }],
      name: { first_name: 'Fallback', last_name: 'User' },
    };
    mockStytchSession = { session_id: 'session-xyz' };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
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
    expect(screen.getByTestId('user-name').textContent).toBe('Fallback User');
  });

  it('computes profileCompleteness based on user fields', async () => {
    const backendUser: NhimbeUser = {
      id: 'usr-complete',
      email: 'complete@example.com',
      name: 'Complete User',
      city: 'Harare',
      interests: ['music'],
      stytchUserId: 'stytch-789',
      role: 'user',
    };

    mockStytchUser = {
      user_id: 'stytch-789',
      emails: [{ email: 'complete@example.com' }],
      name: { first_name: 'Complete', last_name: 'User' },
    };
    mockStytchSession = { session_id: 'session-new' };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: backendUser }),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('profile-complete').textContent).toBe('yes');
    });
    expect(screen.getByTestId('profile-name').textContent).toBe('yes');
    expect(screen.getByTestId('profile-city').textContent).toBe('yes');
    expect(screen.getByTestId('profile-interests').textContent).toBe('yes');
  });

  it('marks profileCompleteness as incomplete when fields are missing', async () => {
    const backendUser: NhimbeUser = {
      id: 'usr-incomplete',
      email: 'incomplete@example.com',
      name: 'User',
      stytchUserId: 'stytch-incomplete',
      role: 'user',
    };

    mockStytchUser = {
      user_id: 'stytch-incomplete',
      emails: [{ email: 'incomplete@example.com' }],
      name: { first_name: '', last_name: '' },
    };
    mockStytchSession = { session_id: 'session-incomplete' };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: backendUser }),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('profile-complete').textContent).toBe('no');
    });
    expect(screen.getByTestId('profile-name').textContent).toBe('no');
    expect(screen.getByTestId('profile-city').textContent).toBe('no');
    expect(screen.getByTestId('profile-interests').textContent).toBe('no');
  });

  it('signIn redirects to /auth/signin and stores return URL', async () => {
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

    expect(localStorage.setItem).toHaveBeenCalledWith('auth_redirect', '/dashboard');
    expect(mockPush).toHaveBeenCalledWith('/auth/signin');
  });

  it('signOut revokes Stytch session and redirects home', async () => {
    const backendUser: NhimbeUser = {
      id: 'usr-123',
      email: 'test@example.com',
      name: 'Test',
      city: 'Harare',
      interests: ['music', 'tech'],
      stytchUserId: 'stytch-123',
      role: 'user',
    };

    mockStytchUser = {
      user_id: 'stytch-123',
      emails: [{ email: 'test@example.com' }],
      name: { first_name: 'Test', last_name: '' },
    };
    mockStytchSession = { session_id: 'session-123' };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: backendUser }),
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

    expect(mockStytchRevoke).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
