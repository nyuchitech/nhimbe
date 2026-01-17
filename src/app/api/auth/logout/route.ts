import { NextRequest, NextResponse } from 'next/server';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005').trim();
const ALLOWED_HOSTS = ['nhimbe.com', 'www.nhimbe.com', 'localhost'];

// Validate redirect URL to prevent open redirect attacks
function isValidRedirect(redirectTo: string): boolean {
  // Only allow relative paths or same-origin URLs
  if (redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
    return true;
  }

  try {
    const url = new URL(redirectTo, SITE_URL);
    const siteUrl = new URL(SITE_URL);

    // Check if the redirect URL is to the same host or an allowed host
    if (url.host === siteUrl.host || ALLOWED_HOSTS.includes(url.hostname)) {
      return true;
    }
  } catch {
    // Invalid URL, reject it
    return false;
  }

  return false;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const redirectTo = searchParams.get('redirect') || '/';

  // Validate redirect URL to prevent open redirect attacks
  const safeRedirect = isValidRedirect(redirectTo) ? redirectTo : '/';

  // Build redirect URL
  const redirectUrl = new URL(safeRedirect, SITE_URL);
  const response = NextResponse.redirect(redirectUrl);

  // Clear all auth cookies with domain for www/non-www compatibility
  const isProduction = process.env.NODE_ENV === 'production';
  const deleteCookieOptions = {
    path: '/',
    ...(isProduction && { domain: '.nhimbe.com' }),
  };

  response.cookies.delete({ name: 'nhimbe_access_token', ...deleteCookieOptions });
  response.cookies.delete({ name: 'nhimbe_refresh_token', ...deleteCookieOptions });
  response.cookies.delete({ name: 'nhimbe_user', ...deleteCookieOptions });

  return response;
}

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear all auth cookies with domain for www/non-www compatibility
  const isProduction = process.env.NODE_ENV === 'production';
  const deleteCookieOptions = {
    path: '/',
    ...(isProduction && { domain: '.nhimbe.com' }),
  };

  response.cookies.delete({ name: 'nhimbe_access_token', ...deleteCookieOptions });
  response.cookies.delete({ name: 'nhimbe_refresh_token', ...deleteCookieOptions });
  response.cookies.delete({ name: 'nhimbe_user', ...deleteCookieOptions });

  return response;
}
