import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { serverError } from '@/app/lib/apiError';

type ArztbefundUploadRow = {
  id: string;
  title: string;
  file_name: string | null;
  file_data: string;
  explanation_level1: string;
  explanation_level2: string;
  explanation_level3: string;
  created_at: string;
};

export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('arztbefund_uploads')
    .select('id, title, file_name, file_data, explanation_level1, explanation_level2, explanation_level3, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return serverError('arztbefund-uploads list failed', error);
  }

  return NextResponse.json({
    entries: (data ?? []).map((item: ArztbefundUploadRow) => ({
      id: item.id,
      title: item.title,
      fileName: item.file_name ?? undefined,
      fileData: item.file_data,
      explanationLevel1: item.explanation_level1,
      explanationLevel2: item.explanation_level2,
      explanationLevel3: item.explanation_level3,
      createdAt: item.created_at,
    })),
  });
}
