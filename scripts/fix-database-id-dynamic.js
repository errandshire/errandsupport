#!/usr/bin/env node
/**
 * Fixes files that use DATABASE_ID at module scope but only have it in dynamic imports.
 * Adds a static import: import { DATABASE_ID } from '@/lib/api';
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');

// Find files that use DATABASE_ID but don't have a static import of it
const allFiles = execSync(
  `grep -rl "DATABASE_ID" ${root} --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next" | grep -v "scripts/"`,
  { encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

let fixed = 0;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');

  // Skip if DATABASE_ID is already statically imported
  if (/^import\s+\{[^}]*\bDATABASE_ID\b[^}]*\}\s+from/m.test(content)) continue;
  // Skip if file IS the api/appwrite definition
  if (file.endsWith('lib/api.ts') || file.endsWith('lib/appwrite.ts') || file.endsWith('lib/db.ts')) continue;

  // Check if DATABASE_ID is actually used at module level (not just inside dynamic import destructure)
  // Look for DATABASE_ID used as an expression (not in import/require)
  const usedAtScope = /DATABASE_ID[^'"a-zA-Z_]/.test(content.replace(/await import\([^)]+\)/g, ''));
  if (!usedAtScope) continue;

  // Add static import after the first "use client" or after first import line
  const useClientMatch = content.match(/^"use client";\s*\n/);
  const importMatch = content.match(/^(import .+\n)/m);

  let insertAfter = '';
  if (useClientMatch) {
    insertAfter = useClientMatch[0];
  } else if (importMatch) {
    insertAfter = importMatch[0];
  }

  if (!insertAfter) {
    console.log(`⚠️  Can't find insertion point: ${path.relative(root, file)}`);
    continue;
  }

  // Insert DATABASE_ID import
  const newImport = `import { DATABASE_ID } from '@/lib/api';\n`;
  // Avoid duplicate insertion
  if (content.includes(newImport)) continue;

  content = content.replace(insertAfter, insertAfter + newImport);
  fs.writeFileSync(file, content);
  console.log(`✅ Fixed: ${path.relative(root, file)}`);
  fixed++;
}

console.log(`\nDone: ${fixed} files fixed`);
