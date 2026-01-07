import { NextRequest, NextResponse } from 'next/server';

// Stytch Connected Apps Configuration
// Authorization goes to Mukoko ID, token exchange goes to Stytch
const MUKOKO_ID_URL = (process.env.NEXT_PUBLIC_MUKOKO_ID_URL || 'https://id.mukoko.com').trim();
const CLIENT_ID = (process.env.NEXT_PUBLIC_MUKOKO_CLIENT_ID || '').trim();
const REDIRECT_URI = (process.env.NEXT_PUBLIC_MUKOKO_REDIRECT_URI || 'http://localhost:3005/api/auth/callback').trim();

function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (v) => charset[v % charset.length]).join('');
}

// Generate PKCE code challenge from verifier using S256
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  // Base64url encode (no padding, URL-safe characters)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const returnUrl = searchParams.get('returnUrl') || '/';

  // Generate state for CSRF protection
  const state = generateRandomString(32);

  // Generate PKCE code verifier and challenge (S256)
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Build Mukoko ID authorization URL
  const authUrl = new URL(`${MUKOKO_ID_URL}/oauth/authorize`);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  // Create redirect response
  const response = NextResponse.redirect(authUrl);

  // Set cookies for callback verification
  // Use .nhimbe.com domain in production so cookies work across www and non-www
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 10, // 10 minutes
    ...(isProduction && { domain: '.nhimbe.com' }),
  };

  response.cookies.set('mukoko_state', state, cookieOptions);
  response.cookies.set('mukoko_code_verifier', codeVerifier, cookieOptions);
  response.cookies.set('mukoko_return_url', returnUrl, {
    ...cookieOptions,
    httpOnly: false,
  });

  return response;
}
