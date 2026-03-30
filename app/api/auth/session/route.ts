import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/session — Set the session cookie after login
 * DELETE /api/auth/session — Clear the session cookie on logout
 *
 * The Appwrite client SDK manages its own cookies, but our API routes
 * (auth-guard.ts) need the session secret in a cookie named "session"
 * so they can create a server-side Appwrite client with the user's
 * credentials.
 */
export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json();

    if (!secret) {
      return NextResponse.json(
        { success: false, message: 'Session secret is required' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set('session', secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year — Appwrite handles actual expiry
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to set session' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
