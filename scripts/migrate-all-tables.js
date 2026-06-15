#!/usr/bin/env node
/**
 * Migrates all Appwrite CSV backups to PostgreSQL on VPS.
 * Run: node scripts/migrate-all-tables.js
 * Output: scripts/full_migration.sql
 *
 * Strategy:
 * - CREATE TABLE IF NOT EXISTS (safe to re-run)
 * - INSERT ... ON CONFLICT (id) DO NOTHING (won't overwrite existing rows)
 * - $id → id (PRIMARY KEY), $permissions skipped, $createdAt/$updatedAt mapped
 */

const fs = require('fs');
const path = require('path');

const BACKUP_DIR = '/Users/mac/Desktop/DESKTOP_MAIN/Screemshots/database_backup';
const OUT_FILE = path.join(__dirname, 'full_migration.sql');

// Map CSV filename → PostgreSQL table name
const TABLE_MAP = {
  'BANK_ACCOUNTS_2026-05-17_08-36-57.csv': 'bank_accounts',
  'JOBS_2026-05-17_08-39-15.csv': 'jobs',
  'JOB_APPLICATIONS_2026-05-17_08-38-52.csv': 'job_applications',
  'WALLET_TRANSACTIONS_2026-05-17_08-43-06.csv': 'wallet_transactions',
  'WALLET_WITHDRAWALS_2026-05-17_08-43-23.csv': 'wallet_withdrawals',
  'WITHDRAWALS_2026-05-17_08-43-37.csv': 'withdrawals',
  'bookings_2026-05-17_08-37-13.csv': 'bookings',
  'dispute_2026-05-17_08-38-09.csv': 'disputes',
  'escrow_transactions_2026-05-17_08-38-27.csv': 'escrow_transactions',
  'messages_2026-05-17_08-39-30.csv': 'messages',
  'notifications_2026-05-17_08-39-56.csv': 'notifications',
  'partner_commissions_2026-05-17_08-40-13.csv': 'partner_commissions',
  'partners_2026-05-17_08-40-34.csv': 'partners',
  'payments_2026-05-17_08-40-52.csv': 'payments',
  'referrals_2026-05-17_08-41-04.csv': 'referrals',
  'reviews_2026-05-17_08-41-19.csv': 'reviews',
  'settings_2026-05-17_08-41-32.csv': 'settings',
  'transactions_2026-05-17_08-41-47.csv': 'transactions',
  'user_balances_2026-05-17_08-42-12.csv': 'user_balances',
  'users_2026-05-17_08-42-27.csv': 'users',
  'virtual_wallets_2026-05-17_08-42-43.csv': 'virtual_wallets',
  'worker-collection_2026-05-17_08-43-56.csv': 'workers',
};

// Tables to SKIP creating (VPS already manages these with its own schema)
const SKIP_CREATE = new Set(['users', 'workers', 'bookings', 'jobs', 'job_applications', 'virtual_wallets']);
// Tables to SKIP inserting data (already migrated separately with different schema)
const SKIP_INSERT = new Set(['virtual_wallets']);

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function sanitizeColumnName(name) {
  // Replace $ with nothing, keep camelCase
  return name.replace(/^\$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
}

function escapeValue(val) {
  if (val === '' || val === 'null' || val === 'NULL' || val === undefined) return 'NULL';
  // Remove surrounding quotes added by CSV parser
  const clean = val.replace(/^"+|"+$/g, '');
  if (clean === '' || clean === 'null' || clean === 'NULL') return 'NULL';
  return `'${clean.replace(/'/g, "''")}'`;
}

const allSql = [];
allSql.push(`-- Full Appwrite → PostgreSQL migration`);
allSql.push(`-- Generated: ${new Date().toISOString()}`);
allSql.push(`-- Run: psql -U postgres -d errandwork -f /tmp/full_migration.sql`);
allSql.push(`-- Or:  sudo -u postgres psql -d errandwork -f /tmp/full_migration.sql`);
allSql.push(``);

let totalRows = 0;

for (const [csvFile, tableName] of Object.entries(TABLE_MAP)) {
  const csvPath = path.join(BACKUP_DIR, csvFile);
  if (!fs.existsSync(csvPath)) {
    console.log(`⚠️  Skipping (not found): ${csvFile}`);
    continue;
  }

  const lines = fs.readFileSync(csvPath, 'utf8').split('\n').filter(l => l.trim());
  if (lines.length < 2) {
    console.log(`⚠️  Empty: ${csvFile}`);
    continue;
  }

  const rawHeaders = parseCSVLine(lines[0]);
  
  // Build column info: skip $permissions, deduplicate names
  // Keep $id as "$id" to match VPS convention
  const seenCols = new Set();
  const columns = rawHeaders
    .filter(h => h !== '$permissions')
    .map(h => ({
      raw: h,
      sql: h,  // keep original name, quote it in SQL
      sqlQuoted: `"${h}"`,
      idx: rawHeaders.indexOf(h),
    }))
    .filter(c => {
      if (seenCols.has(c.sql)) return false;
      seenCols.add(c.sql);
      return true;
    });

  allSql.push(`-- ============================================================`);
  allSql.push(`-- Table: ${tableName} (${lines.length - 1} rows)`);
  allSql.push(`-- ============================================================`);

  if (!SKIP_CREATE.has(tableName)) {
    const colDefs = columns.map((c, i) =>
      i === 0 ? `  ${c.sqlQuoted} TEXT PRIMARY KEY` : `  ${c.sqlQuoted} TEXT`
    ).join(',\n');
    allSql.push(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
    allSql.push(`CREATE TABLE ${tableName} (`);
    allSql.push(colDefs);
    allSql.push(`);`);
    allSql.push(``);
  }

  if (SKIP_INSERT.has(tableName)) {
    allSql.push(`-- Skipping data for ${tableName} (already migrated separately)`);
    allSql.push(``);
    console.log(`⏭️  Skipped data: ${tableName}`);
    continue;
  }

  // For users: inject default password since Appwrite doesn't export passwords
  const isUsersTable = tableName === 'users';
  const extraCols = isUsersTable && !columns.find(c => c.sql === 'password') ? ', password' : '';
  const colNames = columns.map(c => c.sqlQuoted).join(', ') + extraCols;
  let rowCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = parseCSVLine(line);
    const escapedVals = columns.map(c => escapeValue(vals[c.idx])).join(', ') + (isUsersTable && extraCols ? `, 'temp123'` : '');
    allSql.push(
      `INSERT INTO ${tableName} (${colNames}) VALUES (${escapedVals}) ON CONFLICT DO NOTHING;`
    );
    rowCount++;
  }

  allSql.push(``);
  totalRows += rowCount;
  console.log(`✅ ${tableName}: ${rowCount} rows`);
}

fs.writeFileSync(OUT_FILE, allSql.join('\n'));
console.log(`\n✅ Generated: scripts/full_migration.sql`);
console.log(`   Total rows: ${totalRows}`);
console.log(`\nNext steps:`);
console.log(`  scp scripts/full_migration.sql root@72.62.179.203:/tmp/`);
console.log(`  ssh root@72.62.179.203 "sudo -u postgres psql -d errandwork -f /tmp/full_migration.sql 2>&1 | tail -20"`);
