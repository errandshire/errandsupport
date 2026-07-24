import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://72.62.179.203:3004/api';

interface AuthenticatedUser {
  $id: string;
  email: string;
  name: string;
}

interface AuthResult {
  user: AuthenticatedUser;
  role?: string;
}

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthResult | null> {
  // The VPS backend identifies users via the x-user-id header or userId query.
  // The web/mobile client sends the current user's $id as x-user-id.
  const userId = request.headers.get('x-user-id') || '';

  if (!userId) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return null;

    const user = await response.json() as { $id: string; email: string; name: string; role?: string };

    return {
      user: { $id: user.$id, email: user.email, name: user.name },
      role: user.role,
    };
  } catch {
    return null;
  }
}

export function unauthorizedResponse(message = 'Authentication required') {
  return NextResponse.json(
    { success: false, message },
    { status: 401 }
  );
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json(
    { success: false, message },
    { status: 403 }
  );
}

export async function requireAuth(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return { error: unauthorizedResponse() };
  return { auth };
}

export async function requireAdmin(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return { error: unauthorizedResponse() };
  if (auth.role !== 'admin') return { error: forbiddenResponse('Admin access required') };
  return { auth };
}
