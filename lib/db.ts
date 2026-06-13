// PostgreSQL connection pool is server-side only
// Import it in API routes, not here
let pool: any = null;

// Lazy load pool only on server side
function getPool() {
  if (typeof window !== 'undefined') {
    throw new Error('Database access is server-side only');
  }
  if (!pool) {
    const { Pool } = require('pg');
    pool = new Pool({
      host: process.env.NEXT_PUBLIC_VPS_HOST || '72.62.179.203',
      port: parseInt(process.env.NEXT_PUBLIC_VPS_POSTGRES_PORT || '5432'),
      database: process.env.NEXT_PUBLIC_VPS_DATABASE || 'errandwork',
      user: process.env.NEXT_PUBLIC_VPS_POSTGRES_USER || 'errandwork_user',
      password: process.env.NEXT_PUBLIC_VPS_POSTGRES_PASSWORD || 'ErandWApppass@01',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
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

export const COLLECTIONS = TABLES;
export const DATABASE_ID = 'errandwork';
export const STORAGE_BUCKET_ID = 'errandwork-storage';

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

// Database service for direct PostgreSQL access
export class DbService {
  // Generic query execution
  static async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const pool = getPool();
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Get client for transactions
  static async getClient(): Promise<any> {
    return getPool().connect();
  }

  // Generic CRUD operations
  static async getAll<T>(table: string, options?: { limit?: number; offset?: number; order?: string }): Promise<T[]> {
    let query = `SELECT * FROM ${table}`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (options?.order) {
      query += ` ORDER BY ${options.order}`;
    }

    if (options?.limit) {
      params.push(options.limit);
      query += ` LIMIT $${params.length}`;
    }

    if (options?.offset) {
      params.push(options.offset);
      query += ` OFFSET $${params.length}`;
    }

    const res = await this.query<T>(query, params);
    return res.rows;
  }

  static async getById<T>(table: string, id: string): Promise<T | null> {
    const res = await this.query<T>(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    return res.rows[0] || null;
  }

  static async create<T>(table: string, data: Partial<T>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const res = await this.query<T>(query, values);
    return res.rows[0];
  }

  static async update<T>(table: string, id: string, data: Partial<T>): Promise<T | null> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    
    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
    
    const res = await this.query<T>(query, [id, ...values]);
    return res.rows[0] || null;
  }

  static async delete(table: string, id: string): Promise<boolean> {
    const res = await this.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return (res.rowCount || 0) > 0;
  }

  // Query with filters
  static async queryWithFilters<T>(
    table: string,
    filters: { [key: string]: any },
    options?: { limit?: number; offset?: number; order?: string }
  ): Promise<T[]> {
    let query = `SELECT * FROM ${table}`;
    const params: any[] = [];
    const conditions: string[] = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (value.equal !== undefined) {
          params.push(value.equal);
          conditions.push(`${key} = $${params.length}`);
        } else if (value.contains !== undefined) {
          params.push(`%${value.contains}%`);
          conditions.push(`${key} ILIKE $${params.length}`);
        } else if (value.greaterThan !== undefined) {
          params.push(value.greaterThan);
          conditions.push(`${key} > $${params.length}`);
        } else if (value.lessThan !== undefined) {
          params.push(value.lessThan);
          conditions.push(`${key} < $${params.length}`);
        }
      } else {
        params.push(value);
        conditions.push(`${key} = $${params.length}`);
      }
    });

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (options?.order) {
      query += ` ORDER BY ${options.order}`;
    }

    if (options?.limit) {
      params.push(options.limit);
      query += ` LIMIT $${params.length}`;
    }

    if (options?.offset) {
      params.push(options.offset);
      query += ` OFFSET $${params.length}`;
    }

    const res = await this.query<T>(query, params);
    return res.rows;
  }
}

// Export for compatibility with existing code
export const databases = {
  listDocuments: async (databaseId: string, collectionId: string, queries?: any[]) => {
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
          options.order = `${query.attribute} DESC`;
        } else if (query.method === 'orderAsc') {
          options.order = `${query.attribute} ASC`;
        }
      });

      const documents = await DbService.queryWithFilters(table, filters, options);
      return { documents, total: documents.length };
    }
    const documents = await DbService.getAll(table);
    return { documents, total: documents.length };
  },

  getDocument: async (databaseId: string, collectionId: string, documentId: string) => {
    const table = collectionId;
    const doc = await DbService.getById(table, documentId);
    if (!doc) throw new Error('Document not found');
    return doc;
  },

  createDocument: async (databaseId: string, collectionId: string, documentId: string, data: any) => {
    const table = collectionId;
    return await DbService.create(table, { ...data, id: documentId });
  },

  updateDocument: async (databaseId: string, collectionId: string, documentId: string, data: any) => {
    const table = collectionId;
    const doc = await DbService.update(table, documentId, data);
    if (!doc) throw new Error('Document not found');
    return doc;
  },

  deleteDocument: async (databaseId: string, collectionId: string, documentId: string) => {
    const table = collectionId;
    await DbService.delete(table, documentId);
  },
};

// Auth operations (placeholder - needs implementation with JWT/session)
export const account = {
  get: async (userId?: string) => {
    if (userId) {
      const user = await DbService.getById<any>('users', userId);
      if (user) {
        return { $id: user.id, email: user.email, name: user.name, role: user.role };
      }
    }
    return null;
  },

  createEmailPasswordSession: async (email: string, password: string) => {
    // TODO: Implement authentication with password verification
    // This would need to check against a users table with hashed passwords
    throw new Error('Authentication not implemented yet');
  },

  create: async (userId: string, email: string, password: string, name: string) => {
    // TODO: Implement user registration with password hashing
    throw new Error('Registration not implemented yet');
  },

  deleteSession: async (sessionId: string) => {
    // TODO: Implement session deletion
    return {};
  },

  updatePrefs: async (prefs: any) => {
    // TODO: Implement preferences update
    throw new Error('Account.updatePrefs not implemented');
  },
};

// Storage implementation (placeholder)
export const storage = {
  createFile: async (bucketId: string, fileId: string, file: File) => {
    // TODO: Implement file upload to VPS storage
    return { $id: fileId };
  },
  
  getFilePreview: (bucketId: string, fileId: string) => {
    // TODO: Implement file preview from VPS storage
    return '';
  },
  
  deleteFile: async (bucketId: string, fileId: string) => {
    // TODO: Implement file deletion from VPS storage
  },
};

// ID generator
export const ID = {
  unique: () => Math.random().toString(36).substr(2, 9),
};

// Client for real-time subscriptions (placeholder)
export const client = {
  subscribe: (channel: string, callback?: (response: any) => void) => ({ unsubscribe: () => {} }),
};

export default pool;
