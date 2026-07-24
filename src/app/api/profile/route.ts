import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { serverError } from '@/app/lib/apiError';

type ProfileRow = {
  gender: 'm' | 'f';
  date_of_birth: string;
};

type ProfilePayload = {
  gender: 'm' | 'f';
  dateOfBirth: string;
};

function toProfile(row: ProfileRow) {
  return { gender: row.gender, dateOfBirth: row.date_of_birth };
}

/** The signed-in user's profile (gender + date of birth), or null if not created yet. */
export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('gender, date_of_birth')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return serverError('profile lookup failed', error);
  }

  return NextResponse.json({ profile: data ? toProfile(data as ProfileRow) : null });
}

/** Creates or updates the signed-in user's profile. */
export async function PUT(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const body = (await request.json()) as Partial<ProfilePayload>;

  if (body.gender !== 'm' && body.gender !== 'f') {
    return NextResponse.json({ error: 'Ungültiges Geschlecht' }, { status: 400 });
  }
  const dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
  if (!body.dateOfBirth || !dateOfBirth || Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date()) {
    return NextResponse.json({ error: 'Ungültiges Geburtsdatum' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { user_id: userId, gender: body.gender, date_of_birth: body.dateOfBirth, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select('gender, date_of_birth')
    .single();

  if (error) {
    return serverError('profile upsert failed', error);
  }

  return NextResponse.json({ profile: toProfile(data as ProfileRow) });
}
