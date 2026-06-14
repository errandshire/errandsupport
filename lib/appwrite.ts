// Compatibility shim - re-exports from the new API module
// This file exists to support legacy imports during the migration from Appwrite to VPS PostgreSQL
export {
  databases,
  COLLECTIONS,
  DATABASE_ID,
  Query,
  account,
  storage,
  client,
  ID,
  TABLES,
  ApiService,
  API_BASE_URL,
} from './api';
