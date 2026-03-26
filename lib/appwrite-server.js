const { Client, Databases, Storage } = require('node-appwrite');

// Lazy server-side Appwrite — avoids setEndpoint(undefined) during `next build`, and avoids
// initializing the client when modules do `const { serverDatabases } = require(...)` (that
// would otherwise trigger getters immediately).

let serverClient;
let serverDatabasesInstance;
let serverStorageInstance;

function getServerClient() {
  if (!serverClient) {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const key = process.env.APPWRITE_API_KEY;
    if (!endpoint || !projectId || !key) {
      throw new Error(
        'Appwrite server: set NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, and APPWRITE_API_KEY'
      );
    }
    serverClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(key);
  }
  return serverClient;
}

function getServerDatabases() {
  if (!serverDatabasesInstance) {
    serverDatabasesInstance = new Databases(getServerClient());
  }
  return serverDatabasesInstance;
}

function getServerStorage() {
  if (!serverStorageInstance) {
    serverStorageInstance = new Storage(getServerClient());
  }
  return serverStorageInstance;
}

/** Proxy so importing `serverDatabases` does not touch env until first API call */
const serverDatabases = new Proxy({}, {
  get(_, prop) {
    const db = getServerDatabases();
    const v = db[prop];
    return typeof v === 'function' ? v.bind(db) : v;
  },
});

const serverStorage = new Proxy({}, {
  get(_, prop) {
    const st = getServerStorage();
    const v = st[prop];
    return typeof v === 'function' ? v.bind(st) : v;
  },
});

const serverClientProxy = new Proxy({}, {
  get(_, prop) {
    const c = getServerClient();
    const v = c[prop];
    return typeof v === 'function' ? v.bind(c) : v;
  },
});

const { DATABASE_ID, COLLECTIONS } = require('./appwrite');

module.exports = {
  getServerClient,
  getServerDatabases,
  getServerStorage,
  serverClient: serverClientProxy,
  serverDatabases,
  serverStorage,
  DATABASE_ID,
  COLLECTIONS,
};
