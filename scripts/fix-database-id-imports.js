#!/usr/bin/env node
/**
 * Fixes all files that use DATABASE_ID but don't import it.
 * Run: node scripts/fix-database-id-imports.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');

// Find all TS/TSX files using DATABASE_ID
const output = execSync(
  `grep -rl "DATABASE_ID" ${root} --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"`,
  { encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

let fixed = 0;
let skipped = 0;

for (const file of output) {
  let content = fs.readFileSync(file, 'utf8');

  // Skip if DATABASE_ID is already imported
  if (/import\s+\{[^}]*\bDATABASE_ID\b[^}]*\}\s+from/.test(content)) {
    skipped++;
    continue;
  }

  // Find an existing import from @/lib/api or ./api or @/lib/appwrite or ./appwrite
  const importPattern = /^(import\s+\{)([^}]+)(\}\s+from\s+['"](?:@\/lib\/api|\.\/api|@\/lib\/appwrite|\.\/appwrite)['"];?)/m;
  const match = content.match(importPattern);

  if (match) {
    const existingImports = match[2];
    // Add DATABASE_ID if not already there
    if (!existingImports.includes('DATABASE_ID')) {
      const newImports = existingImports.trimEnd() + ', DATABASE_ID';
      content = content.replace(importPattern, `$1${newImports}$3`);
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed: ${path.relative(root, file)}`);
      fixed++;
    } else {
      skipped++;
    }
  } else {
    console.log(`⚠️  No matching import found: ${path.relative(root, file)}`);
    skipped++;
  }
}

console.log(`\nDone: ${fixed} fixed, ${skipped} skipped`);
