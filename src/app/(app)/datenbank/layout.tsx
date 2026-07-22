import { DatenbankSectionNav } from '@/app/components/DatenbankSectionNav';

export default function DatenbankLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DatenbankSectionNav />
      {children}
    </>
  );
}
