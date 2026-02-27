/**
 * src/lib/db.ts — Neon Serverless Driver (Singleton)
 *
 * WHY @neondatabase/serverless instead of `pg`?
 * ─────────────────────────────────────────────
 * The regular `pg` library opens TCP connections — great for traditional
 * long-running servers, but a problem for serverless/edge environments:
 *
 *   • Next.js API routes are serverless functions — they spin up and die
 *     per request. TCP connection setup takes ~50-100ms per cold start.
 *
 *   • @neondatabase/serverless can use HTTP for single queries (~3 round-
 *     trips) — much faster for stateless serverless invocations.
 *
 *   • The pooler URL (ep-...-pooler.neon.tech) uses PgBouncer on Neon's
 *     side, so connections are shared across all your serverless functions
 *     without exhausting Postgres's connection limit.
 *
 * HOW IT WORKS:
 * ─────────────
 * `neon(DATABASE_URL)` → a tagged template literal for single SQL queries:
 *
 *   const rows = await sql`SELECT * FROM users WHERE id = ${userId}`;
 *   // Parameters are automatically parameterized (SQL injection safe!)
 *
 * `Pool` → for transactions or when you need standard pg-compatible API:
 *
 *   const client = await pool.connect();
 *   await client.query('BEGIN');
 *   await client.query('INSERT ...');
 *   await client.query('COMMIT');
 *   client.release();
 *
 * SINGLETON PATTERN (global._neonPool):
 * ───────────────────────────────────────
 * Next.js hot-reloads modules in dev. Without this, every file save would
 * create a new Pool. We store it on `global` so it survives hot-reloads.
 */

import { neon, Pool } from '@neondatabase/serverless';

// ─── Type extensions for the global singleton ──────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var _neonPool: Pool | undefined;
}

// ─── Validate env var early ─────────────────────────────────────────────────
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      '❌ DATABASE_URL is not set. Check your .env.local file.'
    );
  }
  return url;
}

// ─── `sql` tagged template — use for simple, one-shot queries ───────────────
// Usage:  const rows = await sql`SELECT * FROM users`;
export const sql = neon(getDatabaseUrl());

// ─── `pool` — use when you need transactions or the classic pg.Pool API ─────
// Usage:  const result = await pool.query('SELECT $1::int', [1]);
const createPool = (): Pool =>
  new Pool({ connectionString: getDatabaseUrl() });

export const pool: Pool =
  process.env.NODE_ENV === 'production'
    ? createPool()
    : (global._neonPool ??= createPool());

// Default export is the `sql` tag — the most common usage
export default sql;
