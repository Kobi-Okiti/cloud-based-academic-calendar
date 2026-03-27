import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-700">
              Lead City University
            </p>
            <h1 className="text-4xl font-semibold text-blue-950 md:text-5xl">
              Academic Calendar Monitoring & Notifications
            </h1>
            <p className="text-base text-slate-600 md:text-lg">
              A central hub for academic sessions, test weeks, examinations, and
              campus-wide announcements — tailored for every student and staff
              member.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link className="btn btn-primary" href="/login">
                Login
              </Link>
              <Link className="btn btn-outline" href="/signup">
                Sign up
              </Link>
            </div>
          </div>
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-blue-950">
              Why use this portal?
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-yellow-400" />
                Track every academic milestone in one place.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-yellow-400" />
                Receive urgent updates immediately in-app.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-yellow-400" />
                Get reminders 7 days and 1 day before key events.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
