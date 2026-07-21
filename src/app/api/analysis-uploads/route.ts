import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type AnalysisUploadPayload = {
  title: string;
  notes?: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
  createdAt?: string;
};

type AnalysisUploadRow = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  file_name: string | null;
  file_type: string | null;
  file_data: string | null;
  created_at: string;
};

/**
 * Resolves the user id from the request's bearer token instead of trusting
 * a client-supplied userId. This client is built with the service-role key
 * (bypasses RLS), so without this check any caller could read or write
 * another user's rows just by passing a different id.
 */
async function getAuthenticatedUserId(request: Request, supabase: ReturnType<typeof getSupabaseServerClient>) {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('analysis_uploads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    notes: item.notes ?? '',
    fileName: item.file_name ?? undefined,
    fileType: item.file_type ?? undefined,
    fileData: item.file_data ?? undefined,
    createdAt: item.created_at,
  })) });
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const body = (await request.json()) as AnalysisUploadPayload;

  const payload = {
    user_id: userId,
    title: body.title.trim() || 'Analyse-Ergebnis',
    notes: body.notes?.trim() || null,
    file_name: body.fileName ?? null,
    file_type: body.fileType ?? null,
    file_data: body.fileData ?? null,
    created_at: body.createdAt ?? new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('analysis_uploads')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as AnalysisUploadRow;

  return NextResponse.json({
    entry: {
      id: row.id,
      title: row.title,
      notes: row.notes ?? '',
      fileName: row.file_name ?? undefined,
      fileType: row.file_type ?? undefined,
      fileData: row.file_data ?? undefined,
      createdAt: row.created_at,
    },
  });
}
