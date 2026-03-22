import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { sanitizeWorkerList } from '@/lib/sanitize-worker';

const { serverDatabases } = require('@/lib/appwrite-server');

const PAGE_LIMIT = 20;
const SEARCH_FETCH_LIMIT = 200;

function matchesSearch(doc: Record<string, unknown>, term: string): boolean {
  const name = String(doc.name || doc.displayName || '').toLowerCase();
  const bio = String(doc.bio || '').toLowerCase();
  const city = String(doc.city || '').toLowerCase();
  const state = String(doc.state || '').toLowerCase();
  const categories = Array.isArray(doc.categories) ? doc.categories : [];

  return (
    name.includes(term) ||
    bio.includes(term) ||
    city.includes(term) ||
    state.includes(term) ||
    categories.some((c: string) => String(c).toLowerCase().includes(term))
  );
}

function matchesCategory(doc: Record<string, unknown>, category: string): boolean {
  const categories = Array.isArray(doc.categories) ? doc.categories : [];
  const cat = category.toLowerCase();
  return categories.some((c: string) => String(c).toLowerCase() === cat);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(PAGE_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const category = (searchParams.get('category') || '').trim();

    const hasFilters = search !== '' || category !== '';

    if (!hasFilters) {
      const offset = (page - 1) * limit;
      const response = await serverDatabases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        [
          Query.equal('isVerified', true),
          Query.equal('isActive', true),
          Query.orderDesc('$createdAt'),
          Query.limit(limit),
          Query.offset(offset),
        ]
      );

      return NextResponse.json({
        total: response.total,
        workers: sanitizeWorkerList(response.documents as Record<string, unknown>[]),
      });
    }

    // When filters are active, fetch a larger batch and filter server-side.
    // Appwrite doesn't support fulltext search without explicit indexes, so we
    // do the matching in JS for reliability.
    const response = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.WORKERS,
      [
        Query.equal('isVerified', true),
        Query.equal('isActive', true),
        Query.orderDesc('$createdAt'),
        Query.limit(SEARCH_FETCH_LIMIT),
      ]
    );

    let filtered = response.documents as Record<string, unknown>[];
    if (search) {
      filtered = filtered.filter((doc) => matchesSearch(doc, search));
    }
    if (category) {
      filtered = filtered.filter((doc) => matchesCategory(doc, category));
    }

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const paged = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      total,
      workers: sanitizeWorkerList(paged),
    });
  } catch (error) {
    console.error('[API /workers] Error fetching workers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workers' },
      { status: 500 }
    );
  }
}
