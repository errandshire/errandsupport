// Server-side API client for VPS PostgreSQL backend
// Replaces node-appwrite for Next.js API routes

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://72.62.179.203:3004/api';

export class ServerApiService {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
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
  static async getAll<T>(table: string): Promise<T[]> {
    return this.request<T[]>(`/${table}`);
  }

  static async getById<T>(table: string, id: string): Promise<T> {
    return this.request<T>(`/${table}/${id}`);
  }

  static async create<T>(table: string, data: Partial<T>): Promise<T> {
    return this.request<T>(`/${table}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    return this.request<T>(`/${table}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async delete(table: string, id: string): Promise<void> {
    return this.request<void>(`/${table}/${id}`, {
      method: 'DELETE',
    });
  }

  // Query helpers
  static async query<T>(
    table: string,
    filters: { [key: string]: any },
    options?: { limit?: number; offset?: number; order?: string }
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
    
    return this.request<T[]>(endpoint);
  }

  // Database-like interface for compatibility
  static listDocuments(
    databaseId: string,
    collectionId: string,
    queries?: any[]
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

      return this.query(table, filters, options).then(documents => ({ documents, total: documents.length }));
    }
    return this.getAll(table).then(documents => ({ documents, total: documents.length }));
  }

  static getDocument(databaseId: string, collectionId: string, documentId: string) {
    return this.getById(collectionId, documentId);
  }

  static createDocument(databaseId: string, collectionId: string, documentId: string, data: any) {
    return this.create(collectionId, { ...data, $id: documentId });
  }

  static updateDocument(databaseId: string, collectionId: string, documentId: string, data: any) {
    return this.update(collectionId, documentId, data);
  }

  static deleteDocument(databaseId: string, collectionId: string, documentId: string) {
    return this.delete(collectionId, documentId);
  }
}

// Export for compatibility with existing code
export const serverDatabases = ServerApiService;
export const serverStorage = ServerApiService;

// Re-export constants
export { DATABASE_ID, COLLECTIONS } from './api';
