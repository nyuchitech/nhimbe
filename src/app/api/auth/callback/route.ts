import { NextRequest, NextResponse } from 'next/server';

// Stytch OIDC endpoints - Use environment variable for project ID
const STYTCH_PROJECT_ID = (process.env.STYTCH_PROJECT_ID || process.env.NEXT_PUBLIC_STYTCH_PROJECT_ID || '').trim();
// Use the authenticated token endpoint for confidential (first_party) clients
const STYTCH_TOKEN_URL = `https://api.stytch.com/v1/public/${STYTCH_PROJECT_ID}/oauth2/token`;
const STYTCH_USERINFO_URL = `https://api.stytch.com/v1/public/${STYTCH_PROJECT_ID}/oauth2/userinfo`;
const CLIENT_ID = (process.env.NEXT_PUBLIC_MUKOKO_CLIENT_ID || '').trim();
const CLIENT_SECRET = (process.env.MUKOKO_CLIENT_SECRET || '').trim();
const REDIRECT_URI = (process.env.NEXT_PUBLIC_MUKOKO_REDIRECT_URI || 'http://localhost:3005/api/auth/callback').trim();
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005').trim();
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8785').trim();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    const errorUrl = new URL('/auth/error', SITE_URL);
    errorUrl.searchParams.set('error', errorDescription || error);
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    const errorUrl = new URL('/auth/error', SITE_URL);
    errorUrl.searchParams.set('error', 'No authorization code received');
    return NextResponse.redirect(errorUrl);
  }

  // Get cookies
  const storedState = request.cookies.get('mukoko_state')?.value;
  const codeVerifier = request.cookies.get('mukoko_code_verifier')?.value;
  const returnUrl = request.cookies.get('mukoko_return_url')?.value || '/';

  // Verify state
  if (state !== storedState) {
    const errorUrl = new URL('/auth/error', SITE_URL);
    errorUrl.searchParams.set('error', 'Invalid state parameter');
    return NextResponse.redirect(errorUrl);
  }

  // Verify code_verifier exists (required for PKCE)
  if (!codeVerifier) {
    const errorUrl = new URL('/auth/error', SITE_URL);
    errorUrl.searchParams.set('error', 'Missing PKCE code verifier');
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Exchange code for tokens (PKCE + client_secret for auth)
    const tokenResponse = await fetch(STYTCH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      // Log only non-sensitive error information
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        error_type: errorData.error,
      });
      const errorUrl = new URL('/auth/error', SITE_URL);
      errorUrl.searchParams.set('error', errorData.error_description || errorData.error || 'Failed to exchange code');
      return NextResponse.redirect(errorUrl);
    }

    const tokens = await tokenResponse.json();

    // Get user info from Stytch
    const userInfoResponse = await fetch(STYTCH_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorUrl = new URL('/auth/error', SITE_URL);
      errorUrl.searchParams.set('error', 'Failed to fetch user info');
      return NextResponse.redirect(errorUrl);
    }

    const stytchUser = await userInfoResponse.json();

    // Create or update user in our backend
    let nhimbeUser;
    try {
      const backendResponse = await fetch(`${API_URL}/api/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stytch_user: stytchUser,
          access_token: tokens.access_token,
          id_token: tokens.id_token,
        }),
      });

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        nhimbeUser = backendData.user;
      }
    } catch (err) {
      console.error('Backend sync failed:', err);
      // Continue anyway, user info from Stytch is sufficient for basic auth
    }

    // Build success redirect URL
    const successUrl = new URL(nhimbeUser?.onboardingCompleted === false ? '/onboarding' : returnUrl, SITE_URL);
    const response = NextResponse.redirect(successUrl);

    // Set auth cookies with shared domain for www/non-www compatibility
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
      ...(isProduction && { domain: '.nhimbe.com' }),
    };

    // Store access token in non-httpOnly cookie for client access
    // (needed for frontend API calls to backend)
    response.cookies.set('nhimbe_access_token', tokens.access_token, {
      ...cookieOptions,
      httpOnly: false,
      maxAge: tokens.expires_in || 3600,
    });

    if (tokens.refresh_token) {
      response.cookies.set('nhimbe_refresh_token', tokens.refresh_token, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    // Store user data in non-httpOnly cookie for client access
    // Pull any additional profile data from Mukoko ID via Stytch userinfo
    const userData = nhimbeUser || {
      id: stytchUser.sub,
      email: stytchUser.email,
      name: stytchUser.name || stytchUser.given_name || stytchUser.email?.split('@')[0] || 'User',
      stytchUserId: stytchUser.sub,
      // Mukoko ID may pass these through custom claims
      city: stytchUser.city || stytchUser['custom:city'] || null,
      country: stytchUser.country || stytchUser['custom:country'] || null,
      interests: stytchUser.interests || stytchUser['custom:interests'] || [],
      avatarUrl: stytchUser.picture || null,
      // Mark onboarding as complete if we already have location data
      onboardingCompleted: !!(stytchUser.city || stytchUser['custom:city']),
    };

    response.cookies.set('nhimbe_user', JSON.stringify(userData), {
      ...cookieOptions,
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
    });

    // Clear auth flow cookies (with domain to match how they were set)
    const deleteCookieOptions = {
      path: '/',
      ...(isProduction && { domain: '.nhimbe.com' }),
    };
    response.cookies.delete({ name: 'mukoko_code_verifier', ...deleteCookieOptions });
    response.cookies.delete({ name: 'mukoko_state', ...deleteCookieOptions });
    response.cookies.delete({ name: 'mukoko_return_url', ...deleteCookieOptions });

    return response;
  } catch (err) {
    console.error('Auth callback error:', err);
    const errorUrl = new URL('/auth/error', SITE_URL);
    errorUrl.searchParams.set('error', 'Authentication failed');
    return NextResponse.redirect(errorUrl);
  }
}
