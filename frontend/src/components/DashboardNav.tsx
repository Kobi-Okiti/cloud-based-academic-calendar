"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchMe } from "@/lib/api";

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
  const [role, setRole] = useState<Role | null>(null);

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

  if (!role) return null;

  const links = role === "admin" ? adminLinks : studentStaffLinks;

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="btn btn-ghost"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
