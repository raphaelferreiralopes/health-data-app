import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';

// Every table that stores rows keyed by user_id -- kept as an explicit list
// (rather than relying only on FK cascades) so this stays correct even if a
// future table's cascade rule is misconfigured. recommended_tests also
// cascades from body_checks via its FK, deleting it here too is redundant
// but harmless.
const USER_DATA_TABLES = ['lab_results', 'analysis_uploads', 'pdf_extractions', 'recommended_tests', 'processes', 'body_checks'] as const;

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
      return NextResponse.json({ error: `Löschen fehlgeschlagen (${table}): ${error.message}` }, { status: 500 });
    }
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) {
    return NextResponse.json({ error: `Konto konnte nicht gelöscht werden: ${authError.message}` }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
