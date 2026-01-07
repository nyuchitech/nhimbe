import { NextRequest, NextResponse } from 'next/server';

// Stytch Connected Apps Configuration
const STYTCH_PROJECT_ID = 'project-live-86090362-2491-4ca7-9037-f7688c7699ce';
const CLIENT_ID = process.env.NEXT_PUBLIC_MUKOKO_CLIENT_ID!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_MUKOKO_REDIRECT_URI || 'http://localhost:3005/api/auth/callback';

function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (v) => charset[v % charset.length]).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(digest)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const returnUrl = searchParams.get('returnUrl') || '/';

  // Generate PKCE values
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  // Build Stytch authorization URL
  const authUrl = new URL(`https://api.stytch.com/v1/public/${STYTCH_PROJECT_ID}/oauth2/authorize`);
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
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  };

  response.cookies.set('mukoko_code_verifier', codeVerifier, cookieOptions);
  response.cookies.set('mukoko_state', state, cookieOptions);
  response.cookies.set('mukoko_return_url', returnUrl, {
    ...cookieOptions,
    httpOnly: false,
  });

  return response;
}
