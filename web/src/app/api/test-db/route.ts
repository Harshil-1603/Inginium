/**
 * src/app/api/test-db/route.ts — Neon DB test endpoint
 *
 * GET /api/test-db
 *
 * HOW THE NEON DRIVER WORKS HERE:
 * ────────────────────────────────
 * We import `sql` from our db.ts. It's a tagged template literal, meaning:
 *
 *   const result = await sql`SELECT 1 + 1 AS answer, NOW() AS server_time`;
 *
 * The backtick syntax isn't just a string — it's a function call. The `sql`
 * tag automatically:
 *   1. Escapes any interpolated values (${value}) as parameterized bindings
 *   2. Sends the query over HTTP to Neon's serverless endpoint
 *   3. Returns an array of typed row objects
 *
 * DIFFERENCE vs the old `pg` approach:
 *   Old:  const result = await db.query('SELECT ...'); → result.rows
 *   New:  const rows = await sql`SELECT ...`;          → rows[0] directly
 */

import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        // sql`` returns an array of row objects directly (no .rows needed)
        const rows = await sql`
      SELECT
        1 + 1            AS answer,
        NOW()            AS server_time,
        version()        AS pg_version
    `;

        const row = rows[0];

        return NextResponse.json({
            success: true,
            message: '✅ Neon Postgres connected successfully!',
            data: {
                answer: row.answer,
                serverTime: row.server_time,
                pgVersion: (row.pg_version as string).split(' ').slice(0, 2).join(' '),
            },
        });
    } catch (error) {
        console.error('[Neon DB Error]', error);

        return NextResponse.json(
            {
                success: false,
                message: '❌ Failed to connect to Neon Postgres',
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
