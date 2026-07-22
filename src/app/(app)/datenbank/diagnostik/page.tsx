import { redirect } from 'next/navigation';

export default function DiagnostikRootPage() {
  redirect('/datenbank/diagnostik/blutanalyse');
}
