import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import pool from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const schema = await readFile(path.resolve(__dirname, 'schema.sql'), 'utf-8');

try {
  await pool.query(schema);
  console.log('Migration applied: invoices table ready.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
