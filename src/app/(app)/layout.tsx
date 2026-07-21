import { PrimaryNav } from "@/app/components/PrimaryNav";
import { LogoMark } from "@/app/components/Logo";
import { AuthGate } from "@/app/components/AuthGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-4 py-4 sm:px-6">
          <LogoMark className="h-6 w-6" />
          <span className="text-xl font-light tracking-tight text-ink">vitalis</span>
          <span className="hidden text-sm text-muted sm:inline">— Kenn dich. Von innen.</span>
        </div>
        <div className="pb-3">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <PrimaryNav />
            <AuthGate />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
