import { NextRequest, NextResponse } from 'next/server';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005').trim();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const redirectTo = searchParams.get('redirect') || '/';

  // Build redirect URL
  const redirectUrl = new URL(redirectTo, SITE_URL);
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
