import { NextRequest, NextResponse } from 'next/server';

/**
 * Mukoko ID (Stytch B2B SSO) callback handler.
 * Authenticates the B2B SSO token, syncs user to nhimbe backend,
 * and sets session cookies.
 */

const STYTCH_B2B_PROJECT_ID = (process.env.STYTCH_B2B_PROJECT_ID || '').trim();
const STYTCH_B2B_SECRET = (process.env.STYTCH_B2B_SECRET || '').trim();
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').trim();
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787').trim();

const STYTCH_B2B_API_URL = 'https://api.stytch.com/v1/b2b';

function stytchB2BAuthHeader(): string {
  return `Basic ${Buffer.from(`${STYTCH_B2B_PROJECT_ID}:${STYTCH_B2B_SECRET}`).toString('base64')}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const stytchTokenType = searchParams.get('stytch_token_type');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle errors
  if (error) {
    const errorUrl = new URL('/auth/error', SITE_URL);
    errorUrl.searchParams.set('error', errorDescription || error);
    return NextResponse.redirect(errorUrl);
  }

  if (!token) {
    const errorUrl = new URL('/auth/error', SITE_URL);
    errorUrl.searchParams.set('error', 'No authentication token received');
    return NextResponse.redirect(errorUrl);
  }

  if (!STYTCH_B2B_PROJECT_ID || !STYTCH_B2B_SECRET) {
    console.error('Missing Stytch B2B credentials');
    const errorUrl = new URL('/auth/error', SITE_URL);
    errorUrl.searchParams.set('error', 'Mukoko ID authentication is not configured');
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Authenticate the SSO token with Stytch B2B
    const authenticateResponse = await fetch(`${STYTCH_B2B_API_URL}/sso/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: stytchB2BAuthHeader(),
      },
      body: JSON.stringify({
        sso_token: token,
        session_duration_minutes: 60 * 24 * 30, // 30 days
      }),
    });

    if (!authenticateResponse.ok) {
      const errorData = await authenticateResponse.json().catch(() => ({}));
      console.error('Stytch B2B SSO authenticate failed:', {
        status: authenticateResponse.status,
        error_type: errorData.error_type,
        error_message: errorData.error_message,
        stytch_token_type: stytchTokenType,
      });

      const errorUrl = new URL('/auth/error', SITE_URL);
      errorUrl.searchParams.set('error', 'Mukoko ID authentication failed. Please try again.');
      return NextResponse.redirect(errorUrl);
    }

    const authData = await authenticateResponse.json();
    const { session_token, session_jwt, member, organization } = authData;

    // Extract member info
    const memberEmail = member?.email_address || '';
    const memberName = member?.name
      ? `${member.name.first_name || ''} ${member.name.last_name || ''}`.trim()
      : memberEmail.split('@')[0] || 'User';
    const memberId = member?.member_id || '';
    const orgSlug = organization?.organization_slug || '';

    // Sync user to nhimbe backend
    let nhimbeUser;
    try {
      const backendResponse = await fetch(`${API_URL}/api/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: memberEmail,
          name: memberName,
          mukoko_org_member_id: memberId,
          auth_provider: 'mukoko_id',
        }),
      });

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        nhimbeUser = backendData.user;
      }
    } catch (err) {
      console.error('Backend sync failed (Mukoko ID):', err);
    }

    // Build redirect URL
    const successUrl = new URL(
      nhimbeUser?.onboardingCompleted === false ? '/onboarding' : '/',
      SITE_URL
    );
    const response = NextResponse.redirect(successUrl);

    // Set auth cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
      ...(isProduction && { domain: '.nhimbe.com' }),
    };

    // Session JWT in httpOnly cookie
    response.cookies.set('nhimbe_session', session_jwt, {
      ...cookieOptions,
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
    });

    // Session token for backend validation
    response.cookies.set('nhimbe_session_token', session_token, {
      ...cookieOptions,
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
    });

    // User data for client-side access
    const userData = nhimbeUser || {
      _id: memberId,
      email: memberEmail,
      name: memberName,
      stytchUserId: memberId,
      mukokoOrgMemberId: memberId,
      authProvider: 'mukoko_id',
      onboardingCompleted: false,
      role: 'user',
    };

    response.cookies.set('nhimbe_user', JSON.stringify(userData), {
      ...cookieOptions,
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err) {
    console.error('Mukoko ID callback error:', err);
    const errorUrl = new URL('/auth/error', SITE_URL);
    errorUrl.searchParams.set('error', 'Mukoko ID authentication failed. Please try again.');
    return NextResponse.redirect(errorUrl);
  }
}
