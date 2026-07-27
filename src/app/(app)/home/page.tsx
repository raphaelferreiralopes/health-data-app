import { redirect } from 'next/navigation';

// Home has no content of its own anymore -- document upload lives in
// Datenbank/Dokumente now, so this is just the post-login landing hop (see
// proxy.ts / login/page.tsx, which both target /home).
export default function HomePage() {
  redirect('/datenbank/diagnostik');
}
