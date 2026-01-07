import { NextRequest, NextResponse } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005';
const MUKOKO_ID_URL = process.env.NEXT_PUBLIC_MUKOKO_ID_URL || 'https://id.mukoko.com';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const redirectTo = searchParams.get('redirect') || '/';

  // Build redirect URL
  const redirectUrl = new URL(redirectTo, SITE_URL);
  const response = NextResponse.redirect(redirectUrl);

  // Clear all auth cookies
  response.cookies.delete('nhimbe_access_token');
  response.cookies.delete('nhimbe_refresh_token');
  response.cookies.delete('nhimbe_user');

  return response;
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  // Clear all auth cookies
  response.cookies.delete('nhimbe_access_token');
  response.cookies.delete('nhimbe_refresh_token');
  response.cookies.delete('nhimbe_user');

  return response;
}
