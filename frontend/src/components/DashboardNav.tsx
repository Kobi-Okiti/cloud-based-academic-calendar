"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchMe } from "@/lib/api";
import { cn } from "@/lib/utils";
import LogoutButton from "@/components/LogoutButton";

type Role = "admin" | "staff" | "student";

type NavLink = {
  href: string;
  label: string;
};

const studentStaffLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/notifications", label: "Notifications" },
  { href: "/profile", label: "Profile" }
];

const adminLinks: NavLink[] = [
  { href: "/admin/approvals", label: "Approvals" },
  { href: "/admin/events", label: "Events" },
  { href: "/calendar", label: "Calendar" },
  { href: "/profile", label: "Profile" }
];

export default function DashboardNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;

        const res = await fetchMe(token);
        if (res.status < 400) {
          setRole(res.data?.user?.role ?? null);
        }
      } catch {
        // no-op
      }
    };

    loadRole();
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!role) return null;

  const links = role === "admin" ? adminLinks : studentStaffLinks;
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const linkClass = (href: string, mobile = false) =>
    cn(
      "btn btn-ghost",
      mobile && "w-full justify-start",
      isActive(href) && "border-white/50 bg-white/25 text-white"
    );

  return (
    <div className="flex w-full flex-col items-end gap-2 md:w-auto md:flex-row md:items-center">
      <div className="flex w-full items-center justify-end gap-2 md:w-auto">
        <nav className="hidden flex-wrap items-center gap-2 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClass(link.href)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="btn btn-ghost md:hidden"
          aria-expanded={open}
          aria-controls="dashboard-nav-mobile"
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="sr-only">Toggle navigation</span>
          <div className="flex flex-col gap-1">
            <span className="h-0.5 w-5 rounded-full bg-white" />
            <span className="h-0.5 w-5 rounded-full bg-white" />
            <span className="h-0.5 w-5 rounded-full bg-white" />
          </div>
        </button>
      </div>
      {open ? (
        <nav
          id="dashboard-nav-mobile"
          className="w-full rounded-2xl border border-white/20 bg-white/10 p-2 md:hidden"
        >
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={linkClass(link.href, true)}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <LogoutButton className="btn btn-ghost w-full justify-start" />
          </div>
        </nav>
      ) : null}
    </div>
  );
}
