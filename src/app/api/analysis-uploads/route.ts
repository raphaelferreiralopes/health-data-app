import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { MAX_UPLOAD_PDF_BYTES, parsePdfDataUrl } from './shared';

const MAX_TITLE_LENGTH = 200;
const MAX_NOTES_LENGTH = 10_000;
const MAX_FILE_NAME_LENGTH = 255;

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

  const body = (await request.json()) as Partial<AnalysisUploadPayload>;

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const hasFile = typeof body.fileData === 'string' && body.fileData.length > 0;

  if (!title && !notes && !hasFile) {
    return NextResponse.json({ error: 'Bitte gib mindestens einen Titel, einen Text oder eine Datei an.' }, { status: 400 });
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: `Titel zu lang (max. ${MAX_TITLE_LENGTH} Zeichen).` }, { status: 400 });
  }
  if (notes.length > MAX_NOTES_LENGTH) {
    return NextResponse.json({ error: `Text zu lang (max. ${MAX_NOTES_LENGTH} Zeichen).` }, { status: 400 });
  }

  let fileName: string | null = null;
  let fileData: string | null = null;

  if (hasFile) {
    const parsed = parsePdfDataUrl(body.fileData as string);
    if (!parsed) {
      return NextResponse.json({ error: 'Es wird eine PDF-Datei erwartet.' }, { status: 400 });
    }
    if (parsed.approxBytes > MAX_UPLOAD_PDF_BYTES) {
      return NextResponse.json(
        { error: `Datei zu groß (max. ${Math.floor(MAX_UPLOAD_PDF_BYTES / (1024 * 1024))} MB).` },
        { status: 400 },
      );
    }
    fileName = typeof body.fileName === 'string' ? body.fileName.trim().slice(0, MAX_FILE_NAME_LENGTH) : null;
    fileData = body.fileData as string;
  }

  const payload = {
    user_id: userId,
    title: title || 'Analyse-Ergebnis',
    notes: notes || null,
    file_name: fileName,
    // Derived from the validated data URL rather than trusting the client's
    // claimed fileType -- parsePdfDataUrl already confirmed it's a PDF.
    file_type: fileData ? 'application/pdf' : null,
    file_data: fileData,
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
