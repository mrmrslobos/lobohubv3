// Applies migrations/0001_init.sql to the Neon database at DATABASE_URL.
// Usage: npm run migrate

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Set DATABASE_URL in .env.local first (see .env.example).');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'migrations');
const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

const client = new Client(DATABASE_URL);
await client.connect();

try {
  for (const file of files) {
    console.log(`Applying ${file}...`);
    const sqlText = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    await client.query(sqlText);
    console.log(`  done.`);
  }
  console.log('All migrations applied.');
} finally {
  await client.end();
}
