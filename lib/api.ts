// API Configuration for VPS PostgreSQL backend
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.erandwork.com/api';

// ID generator for client-side use
export const ID = {
  unique: () => Math.random().toString(36).substr(2, 9),
};

// Query helper class to replace Appwrite SDK Query
export class Query {
  method: string;
  attribute: string;
  value: any;

  constructor(method: string, attribute: string, value?: any) {
    this.method = method;
    this.attribute = attribute;
    this.value = value;
  }

  static equal(attribute: string, value: any) {
    return { method: 'equal', attribute, value };
  }

  static notEqual(attribute: string, value: any) {
    return { method: 'notEqual', attribute, value };
  }

  static search(attribute: string, value: string) {
    return { method: 'search', attribute, value };
  }

  static greaterThan(attribute: string, value: any) {
    return { method: 'greaterThan', attribute, value };
  }

  static lessThan(attribute: string, value: any) {
    return { method: 'lessThan', attribute, value };
  }

  static limit(value: number) {
    return { method: 'limit', attribute: '', value };
  }

  static offset(value: number) {
    return { method: 'offset', attribute: '', value };
  }

  static orderDesc(attribute: string) {
    return { method: 'orderDesc', attribute, value: null };
  }

  static orderAsc(attribute: string) {
    return { method: 'orderAsc', attribute, value: null };
  }
}

// Table names matching the VPS database
export const TABLES = {
  USERS: 'users',
  WORKERS: 'workers',
  BOOKINGS: 'bookings',
  JOBS: 'jobs',
  JOB_APPLICATIONS: 'job_applications',
  REVIEWS: 'reviews',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
  WALLET_TRANSACTIONS: 'wallet_transactions',
  VIRTUAL_WALLETS: 'virtual_wallets',
  BANK_ACCOUNTS: 'bank_accounts',
  WITHDRAWALS: 'withdrawals',
  PAYMENTS: 'payments',
  ESCROW_TRANSACTIONS: 'escrow_transactions',
  USER_BALANCES: 'user_balances',
  TRANSACTIONS: 'transactions',
  AUTO_RELEASE_RULES: 'auto_release_rules',
  AUTO_RELEASE_LOGS: 'auto_release_logs',
  WALLET_WITHDRAWALS: 'wallet_withdrawals',
  DISPUTES: 'disputes',
  PARTNERS: 'partners',
  REFERRALS: 'referrals',
  SETTINGS: 'settings',
};

/**
 * API Service for VPS PostgreSQL backend
 * Replaces Appwrite SDK with HTTP requests
 */
export class ApiService {
  public static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
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
      console.error('API request failed:', error);
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

  // Query helpers using server-side filtering
  static async query<T>(
    table: string,
    filters: { [key: string]: any },
    options?: { limit?: number; offset?: number; order?: string }
  ): Promise<T[]> {
    const params = new URLSearchParams();
    
    // Add filters as query parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Complex query object
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

    // Add options
    if (options?.limit) {
      params.append('limit', String(options.limit));
    }
    if (options?.offset) {
      params.append('offset', String(options.offset));
    }
    if (options?.order) {
      params.append('order', options.order);
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/${table}?${queryString}` : `/${table}`;
    
    return this.request<T[]>(endpoint);
  }

  // Auth operations
  static async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  static async register(email: string, password: string, name: string, role: string = 'client') {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
  }

  static async getCurrentUser() {
    return this.request('/auth/me');
  }
}

// Export for compatibility with existing code
export const databases = {
  listDocuments: async (databaseId: string, collectionId: string, queries?: any[]) => {
    const table = collectionId; // Use collection ID as table name
    if (queries && queries.length > 0) {
      // Convert Appwrite queries to VPS API filters
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

      return { documents: await ApiService.query(table, filters, options), total: 0 };
    }
    return { documents: await ApiService.getAll(table), total: 0 };
  }, 

  getDocument: async (databaseId: string, collectionId: string, documentId: string) => {
    const table = collectionId;
    return await ApiService.getById(table, documentId);
  },

  createDocument: async (databaseId: string, collectionId: string, documentId: string, data: any, _permissions?: any[]) => {
    const table = collectionId;
    return await ApiService.create(table, { ...data, $id: documentId });
  },

  updateDocument: async (databaseId: string, collectionId: string, documentId: string, data: any) => {
    const table = collectionId;
    return await ApiService.update(table, documentId, data);
  },

  deleteDocument: async (databaseId: string, collectionId: string, documentId: string) => {
    const table = collectionId;
    return await ApiService.delete(table, documentId);
  },
};

export const account = {
  get: async (userId?: string) => {
    try {
      if (userId) {
        const response = await ApiService.request<{ $id: string; email: string; name: string; role: string }>(
          `/auth/me?userId=${userId}`
        );
        return response;
      }
      
      const response = await ApiService.getCurrentUser();
      return response;
    } catch (error) {
      console.error('Account.get error:', error);
      return null;
    }
  },

  createEmailPasswordSession: async (email: string, password: string) => {
    try {
      const response = await ApiService.request<{ $id: string; userId: string; email: string; name: string; role: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      return response;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  },

  create: async (userId: string, email: string, password: string, name: string) => {
    try {
      const response = await ApiService.request<{ $id: string; email: string; name: string; role: string }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, name, role: 'client' }),
        }
      );
      return response;
    } catch (error: any) {
      console.error('Register error:', error);
      throw error;
    }
  },

  deleteSession: async (sessionId: string) => {
    return ApiService.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },

  updatePrefs: async (prefs: any) => {
    return ApiService.request('/auth/prefs', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  },
};

// Re-export COLLECTIONS for compatibility
export const COLLECTIONS = TABLES;
export const DATABASE_ID = 'errandwork';
export const STORAGE_BUCKET_ID = 'errandwork-storage';

// Storage implementation for VPS API
export const storage = {
  createFile: async (bucketId: string, fileId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileId', fileId);
    
    const response = await fetch(`${API_BASE_URL}/storage/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('File upload failed');
    }
    
    return await response.json();
  },

  getFilePreview: (bucketId: string, fileId: string) => {
    return `${API_BASE_URL}/storage/${fileId}`;
  },

  deleteFile: async (bucketId: string, fileId: string) => {
    return ApiService.request(`/storage/${fileId}`, {
      method: 'DELETE',
    });
  },
};

// Client for real-time subscriptions (placeholder)
export const client = {
  subscribe: (channel: string, callback?: (response: any) => void) => ({ unsubscribe: () => {} }),
};

// Permission and Role stubs for Appwrite compatibility
// These are no-ops since the new PostgreSQL backend handles permissions differently
export class Permission {
  static read(role: string): string {
    return `read:${role}`;
  }
  static create(role: string): string {
    return `create:${role}`;
  }
  static update(role: string): string {
    return `update:${role}`;
  }
  static delete(role: string): string {
    return `delete:${role}`;
  }
}

export class Role {
  static user(userId: string): string {
    return `user:${userId}`;
  }
  static users(): string {
    return 'users';
  }
  static guests(): string {
    return 'guests';
  }
  static any(): string {
    return 'any';
  }
}
