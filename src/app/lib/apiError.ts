import { NextResponse } from 'next/server';

/**
 * Logs the underlying Supabase/Postgres error server-side and returns a
 * generic message to the client -- raw error.message can leak internal
 * details like column/constraint/table names.
 */
export function serverError(context: string, error: { message: string }, status = 500) {
  console.error(context, error.message);
  return NextResponse.json({ error: 'Serverfehler, bitte später erneut versuchen.' }, { status });
}
