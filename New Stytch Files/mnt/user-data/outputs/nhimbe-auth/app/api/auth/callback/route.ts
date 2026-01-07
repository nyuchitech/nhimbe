import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Stytch Connected Apps Configuration
const config = {
  clientId: process.env.NEXT_PUBLIC_MUKOKO_CLIENT_ID!,
  clientSecret: process.env.MUKOKO_CLIENT_SECRET!,
  redirectUri: process.env.NEXT_PUBLIC_MUKOKO_REDIRECT_URI!,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005',
  
  // Stytch OIDC endpoints
  tokenEndpoint: 'https://api.stytch.com/v1/oauth2/token',
  userInfoEndpoint: 'https://api.stytch.com/v1/oauth2/userinfo',
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth error
  if (error) {
    const errorUrl = new URL('/auth/error', config.siteUrl);
    errorUrl.searchParams.set('error', errorDescription || error);
    return NextResponse.redirect(errorUrl);
  }

  // Validate params
  if (!code || !state) {
    const errorUrl = new URL('/auth/error', config.siteUrl);
    errorUrl.searchParams.set('error', 'Missing authorization code');
    return NextResponse.redirect(errorUrl);
  }

  // Get PKCE values from cookies
  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get('mukoko_code_verifier')?.value;
  const savedState = cookieStore.get('mukoko_state')?.value;
  const returnUrl = cookieStore.get('mukoko_return_url')?.value;

  // Validate state
  if (state !== savedState) {
    const errorUrl = new URL('/auth/error', config.siteUrl);
    errorUrl.searchParams.set('error', 'Invalid state parameter');
    return NextResponse.redirect(errorUrl);
  }

  if (!codeVerifier) {
    const errorUrl = new URL('/auth/error', config.siteUrl);
    errorUrl.searchParams.set('error', 'Missing code verifier');
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Exchange code for tokens via Stytch
    const tokenResponse = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Stytch requires Basic auth with client credentials for confidential clients
        'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Token exchange error:', errorData);
      throw new Error(errorData.error_description || 'Token exchange failed');
    }

    const tokens = await tokenResponse.json();

    // Get user info from Stytch
    const userResponse = await fetch(config.userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const user = await userResponse.json();

    // Create response with redirect
    const redirectUrl = new URL(returnUrl || '/', config.siteUrl);
    const response = NextResponse.redirect(redirectUrl);

    // Cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    // Store tokens in httpOnly cookie (secure)
    response.cookies.set('mukoko_access_token', tokens.access_token, {
      ...cookieOptions,
      maxAge: tokens.expires_in || 3600,
    });

    if (tokens.refresh_token) {
      response.cookies.set('mukoko_refresh_token', tokens.refresh_token, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    // Store user info (readable by client)
    response.cookies.set('mukoko_user', JSON.stringify({
      sub: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      email_verified: user.email_verified,
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokens.expires_in || 3600,
    });

    // Clear auth flow cookies
    response.cookies.delete('mukoko_code_verifier');
    response.cookies.delete('mukoko_state');
    response.cookies.delete('mukoko_return_url');

    return response;
  } catch (err) {
    console.error('OAuth callback error:', err);
    const errorUrl = new URL('/auth/error', config.siteUrl);
    errorUrl.searchParams.set(
      'error',
      err instanceof Error ? err.message : 'Authentication failed'
    );
    return NextResponse.redirect(errorUrl);
  }
}
