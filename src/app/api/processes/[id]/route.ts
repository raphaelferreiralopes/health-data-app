import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { serverError } from '@/app/lib/apiError';
import { toProcessEntry, type ProcessRow } from '../shared';
import { isProcessStageStatus, type ProcessStageStatus } from '@/core/processStages';

type PatchPayload = { status: ProcessStageStatus };

/** Advances (or reverts) a process's checklist stage; reaching "hochgeladen" stamps completed_at. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const body = (await request.json()) as Partial<PatchPayload>;

  if (!isProcessStageStatus(body.status)) {
    return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('processes')
    .update({
      status: body.status,
      updated_at: new Date().toISOString(),
      completed_at: body.status === 'hochgeladen' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    return serverError('processes update failed', error);
  }

  return NextResponse.json({ entry: toProcessEntry(data as ProcessRow) });
}
