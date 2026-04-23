import DashboardNav from "@/components/DashboardNav";
import LogoutButton from "@/components/LogoutButton";
import AppLogo from "@/components/AppLogo";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen text-slate-900">
      <header className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-sky-800 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_60%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <AppLogo
              size="small"
              className="border-white/50 bg-white/95"
              priority
            />
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-200">
                Lead City University
              </p>
              <h1 className="text-lg font-semibold">Academic Calendar</h1>
            </div>
          </div>
          <DashboardNav />
          <LogoutButton className="btn btn-ghost hidden md:inline-flex" />
        </div>
        <div className="h-1 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-200" />
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
