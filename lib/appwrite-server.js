const { Client, Databases } = require('node-appwrite');

// Server-side Appwrite client with API key
// Use this for server-side operations (API routes, cron jobs, etc.)
const serverClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY); // API key for elevated permissions

const serverDatabases = new Databases(serverClient);

// Re-export constants for convenience
const { DATABASE_ID, COLLECTIONS } = require('./appwrite');

module.exports = {
  serverClient,
  serverDatabases,
  DATABASE_ID,
  COLLECTIONS
};
