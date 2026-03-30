import { NextRequest, NextResponse } from 'next/server';
import { Client, Account, Databases } from 'node-appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';

const { serverDatabases } = require('@/lib/appwrite-server');

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
  // 1. Try the httpOnly "session" cookie (set by /api/auth/session)
  let sessionSecret = request.cookies.get('session')?.value;

  // 2. Fallback: read X-Appwrite-Session header (sent by client fetch calls)
  if (!sessionSecret) {
    sessionSecret = request.headers.get('x-appwrite-session') ?? undefined;
  }

  if (!sessionSecret) return null;

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
  client.setSession(sessionSecret);

  const account = new Account(client);

  try {
    const user = await account.get();

    let role: string | undefined;
    try {
      const userDoc = await serverDatabases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        user.$id
      );
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
