// Server-side API client for VPS PostgreSQL backend
// Replaces node-appwrite for Next.js API routes

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://72.62.179.203:3004/api';

export class ServerApiService {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    return this._request<T>(endpoint, options);
  }

  private static async _request<T>(
    endpoint: string,
    options: RequestInit = {},
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody?.error || `HTTP error! status: ${response.status}`;
        const err: any = new Error(message);
        err.code = errorBody?.code;
        throw err;
      }

      return await response.json();
    } catch (error) {
      console.error('Server API request failed:', error);
      throw error;
    }
  }

  // Generic CRUD operations
  static async getAll<T>(table: string, extraHeaders?: Record<string, string>): Promise<T[]> {
    return this._request<T[]>(`/${table}`, {}, extraHeaders);
  }

  static async getById<T>(table: string, id: string, extraHeaders?: Record<string, string>): Promise<T> {
    return this._request<T>(`/${table}/${id}`, {}, extraHeaders);
  }

  static async create<T>(table: string, data: Partial<T>, extraHeaders?: Record<string, string>): Promise<T> {
    return this._request<T>(`/${table}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, extraHeaders);
  }

  static async update<T>(table: string, id: string, data: Partial<T>, extraHeaders?: Record<string, string>): Promise<T> {
    return this._request<T>(`/${table}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, extraHeaders);
  }

  static async delete(table: string, id: string, extraHeaders?: Record<string, string>): Promise<void> {
    return this._request<void>(`/${table}/${id}`, {
      method: 'DELETE',
    }, extraHeaders);
  }

  // Query helpers
  static async query<T>(
    table: string,
    filters: { [key: string]: any },
    options?: { limit?: number; offset?: number; order?: string },
    extraHeaders?: Record<string, string>
  ): Promise<T[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (value.equal !== undefined) {
          params.append(`filter_${key}`, String(value.equal));
        }
        if (value.contains !== undefined) {
          params.append(`search_${key}`, String(value.contains));
        }
      } else {
        params.append(`filter_${key}`, String(value));
      }
    });

    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.order) params.append('order', options.order);

    const queryString = params.toString();
    const endpoint = queryString ? `/${table}?${queryString}` : `/${table}`;
    
    return this._request<T[]>(endpoint, {}, extraHeaders);
  }

  // Database-like interface for compatibility
  static listDocuments(
    databaseId: string,
    collectionId: string,
    queries?: any[],
    extraHeaders?: Record<string, string>
  ) {
    const table = collectionId;
    if (queries && queries.length > 0) {
      const filters: { [key: string]: any } = {};
      const options: { limit?: number; offset?: number; order?: string } = {};

      queries.forEach(query => {
        if (query.method === 'equal') {
          filters[query.attribute] = { equal: query.value };
        } else if (query.method === 'search') {
          filters[query.attribute] = { contains: query.value };
        } else if (query.method === 'limit') {
          options.limit = query.value;
        } else if (query.method === 'offset') {
          options.offset = query.value;
        } else if (query.method === 'orderDesc') {
          options.order = `${query.attribute},desc`;
        } else if (query.method === 'orderAsc') {
          options.order = `${query.attribute},asc`;
        }
      });

      return this.query(table, filters, options, extraHeaders).then(documents => ({ documents, total: documents.length }));
    }
    return this.getAll(table, extraHeaders).then(documents => ({ documents, total: documents.length }));
  }

  static getDocument(databaseId: string, collectionId: string, documentId: string, extraHeaders?: Record<string, string>) {
    return this.getById(collectionId, documentId, extraHeaders);
  }

  static createDocument(databaseId: string, collectionId: string, documentId: string, data: any, extraHeaders?: Record<string, string>) {
    return this.create(collectionId, { ...data, $id: documentId }, extraHeaders);
  }

  static updateDocument(databaseId: string, collectionId: string, documentId: string, data: any, extraHeaders?: Record<string, string>) {
    return this.update(collectionId, documentId, data, extraHeaders);
  }

  static deleteDocument(databaseId: string, collectionId: string, documentId: string, extraHeaders?: Record<string, string>) {
    return this.delete(collectionId, documentId, extraHeaders);
  }
}

// Per-request authenticated client that forwards browser cookies/headers to the VPS backend
export function createServerClient(requestHeaders?: Headers | Record<string, string | undefined>) {
  const extraHeaders: Record<string, string> = {};
  if (requestHeaders) {
    const get = (key: string) => {
      if (requestHeaders instanceof Headers) return requestHeaders.get(key);
      return requestHeaders[key as keyof typeof requestHeaders] as string | undefined;
    };
    const cookie = get('cookie');
    const authorization = get('authorization');
    const userId = get('x-user-id');
    if (cookie) extraHeaders['Cookie'] = cookie;
    if (authorization) extraHeaders['Authorization'] = authorization;
    if (userId) extraHeaders['x-user-id'] = userId;
  }

  return {
    listDocuments: (databaseId: string, collectionId: string, queries?: any[]) =>
      ServerApiService.listDocuments(databaseId, collectionId, queries, extraHeaders),
    getDocument: (databaseId: string, collectionId: string, documentId: string) =>
      ServerApiService.getDocument(databaseId, collectionId, documentId, extraHeaders),
    createDocument: (databaseId: string, collectionId: string, documentId: string, data: any) =>
      ServerApiService.createDocument(databaseId, collectionId, documentId, data, extraHeaders),
    updateDocument: (databaseId: string, collectionId: string, documentId: string, data: any) =>
      ServerApiService.updateDocument(databaseId, collectionId, documentId, data, extraHeaders),
    deleteDocument: (databaseId: string, collectionId: string, documentId: string) =>
      ServerApiService.deleteDocument(databaseId, collectionId, documentId, extraHeaders),
  };
}

// Export for compatibility with existing code
export const serverDatabases = ServerApiService;
export const serverStorage = ServerApiService;

// Re-export constants
export { DATABASE_ID, COLLECTIONS } from './api';
