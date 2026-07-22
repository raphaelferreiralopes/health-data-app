import { TabNav } from '@/app/components/TabNav';

export default function DiagnostikLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TabNav />
      {children}
    </>
  );
}
