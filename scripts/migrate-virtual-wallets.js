#!/usr/bin/env node
/**
 * Migration script: virtual_wallets CSV → PostgreSQL on VPS
 * Run: node scripts/migrate-virtual-wallets.js
 * Output: scripts/virtual_wallets_migration.sql
 */

const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', 'virtual_wallets_2026-05-17_08-42-43.csv');
const OUT_FILE = path.join(__dirname, 'virtual_wallets_migration.sql');

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

function escape(val) {
  if (val === '' || val === 'null' || val === 'NULL') return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

function toBoolean(val) {
  if (val === 'true') return 'TRUE';
  if (val === 'false') return 'FALSE';
  return 'NULL';
}

function toNumeric(val) {
  if (val === '' || val === 'null' || val === 'NULL') return '0';
  const n = parseFloat(val);
  return isNaN(n) ? '0' : String(n);
}

const lines = fs.readFileSync(CSV_FILE, 'utf8').split('\n').filter(l => l.trim());
const headers = parseCSVLine(lines[0]);
console.log('Columns found:', headers);

const sql = [];

sql.push(`-- virtual_wallets migration generated from CSV`);
sql.push(`-- Run on VPS: psql -U postgres -d errandwork -f virtual_wallets_migration.sql`);
sql.push(``);
sql.push(`CREATE TABLE IF NOT EXISTS virtual_wallets (`);
sql.push(`  id VARCHAR(255) PRIMARY KEY,`);
sql.push(`  user_id VARCHAR(255),`);
sql.push(`  is_active BOOLEAN DEFAULT TRUE,`);
sql.push(`  balance NUMERIC(12,2) DEFAULT 0,`);
sql.push(`  escrow NUMERIC(12,2) DEFAULT 0,`);
sql.push(`  total_earned NUMERIC(12,2) DEFAULT 0,`);
sql.push(`  total_spent NUMERIC(12,2) DEFAULT 0,`);
sql.push(`  requires_funding BOOLEAN DEFAULT NULL,`);
sql.push(`  created_at TIMESTAMPTZ DEFAULT NOW(),`);
sql.push(`  updated_at TIMESTAMPTZ DEFAULT NOW()`);
sql.push(`);`);
sql.push(``);
sql.push(`-- Clear existing data to avoid duplicates`);
sql.push(`TRUNCATE TABLE virtual_wallets;`);
sql.push(``);

let count = 0;
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const cols = parseCSVLine(line);

  const id       = cols[0];
  const createdAt = cols[2] || cols[6];
  const updatedAt = cols[3] || cols[7];
  const userId   = cols[4];
  const isActive = cols[5];
  const balance  = cols[8];
  const escrow   = cols[9];
  const totalEarned = cols[10];
  const totalSpent  = cols[11];
  const requiresFunding = cols[12];

  sql.push(
    `INSERT INTO virtual_wallets (id, user_id, is_active, balance, escrow, total_earned, total_spent, requires_funding, created_at, updated_at) VALUES (` +
    `${escape(id)}, ${escape(userId)}, ${toBoolean(isActive)}, ${toNumeric(balance)}, ${toNumeric(escrow)}, ` +
    `${toNumeric(totalEarned)}, ${toNumeric(totalSpent)}, ${toBoolean(requiresFunding)}, ` +
    `${escape(createdAt)}, ${escape(updatedAt)});`
  );
  count++;
}

fs.writeFileSync(OUT_FILE, sql.join('\n'));
console.log(`✅ Generated ${OUT_FILE} with ${count} wallet records`);
console.log(`\nNext steps:`);
console.log(`  1. scp scripts/virtual_wallets_migration.sql root@72.62.179.203:/root/`);
console.log(`  2. SSH into VPS and run: psql -U postgres -d errandwork -f /root/virtual_wallets_migration.sql`);
