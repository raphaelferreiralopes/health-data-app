import { TabNav } from '@/app/components/TabNav';

export default function DatenbankLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TabNav />
      {children}
    </>
  );
}
