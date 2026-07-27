import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { serverError } from '@/app/lib/apiError';

// Every table that stores rows keyed by user_id -- kept as an explicit list
// (rather than relying only on FK cascades) so this stays correct even if a
// future table's cascade rule is misconfigured. recommended_tests and
// medication_intake_logs also cascade from body_checks/medications via their
// FK, deleting them here too is redundant but harmless.
const USER_DATA_TABLES = [
  'lab_results',
  'analysis_uploads',
  'pdf_extractions',
  'arztbefund_uploads',
  'prescription_extractions',
  'chat_interactions',
  'wearable_connections',
  'recommended_tests',
  'processes',
  'body_checks',
  'medication_intake_logs',
  'medications',
  'profiles',
] as const;

/**
 * Permanently deletes the signed-in user's data (GDPR Art. 17 -- right to
 * erasure) and then the Supabase Auth account itself. Irreversible: there is
 * no soft-delete/undo, by design of "erasure".
 */
export async function DELETE(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  for (const table of USER_DATA_TABLES) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) {
      return serverError(`account delete failed (${table})`, error);
    }
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) {
    return serverError('account auth delete failed', authError);
  }

  return NextResponse.json({ deleted: true });
}
