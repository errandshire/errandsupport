import { NextRequest, NextResponse } from 'next/server';
import { COLLECTIONS, DATABASE_ID, databases, account } from '@/lib/client-utils';

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
  // 1. Try the httpOnly "session" cookie
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) return null;

  try {
    const user = await account.get() as { $id: string; email: string; name: string };

    let role: string | undefined;
    try {
      const userDoc = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        user.$id
      ) as { role?: string };
      role = userDoc.role;
    } catch {
      // User doc may not exist yet
    }

    return {
      user: { $id: user.$id, email: user.email, name: user.name },
      role,
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
