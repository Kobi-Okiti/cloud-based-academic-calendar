"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchMe } from "@/lib/api";

type UserProfile = {
  id: string;
  full_name: string;
  email: string | null;
  role: "admin" | "staff" | "student";
  status: "pending" | "approved" | "rejected";
  level: number | null;
  department: string | null;
  matric_number: string | null;
  staff_id: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          router.push("/login");
          return;
        }

        const res = await fetchMe(token);
        if (res.status === 403) {
          router.push("/pending");
          return;
        }

        if (res.status >= 400) {
          throw new Error(res.data?.error || "Failed to load profile");
        }

        setProfile(res.data.user);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  if (loading) {
    return <p className="helper-text">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!profile) {
    return <p className="helper-text">Profile not available.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Profile</h2>
        <p className="helper-text">Your account details.</p>
      </div>

      <div className="card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-slate-500">Full name</p>
            <p className="font-medium">{profile.full_name}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Email</p>
            <p className="font-medium">{profile.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Role</p>
            <p className="font-medium">{profile.role}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Status</p>
            <p className="font-medium">{profile.status}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Department</p>
            <p className="font-medium">{profile.department || "—"}</p>
          </div>
          {profile.role === "student" ? (
            <>
              <div>
                <p className="text-xs uppercase text-slate-500">Level</p>
                <p className="font-medium">
                  {profile.level ? `${profile.level}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Matric number</p>
                <p className="font-medium">{profile.matric_number || "—"}</p>
              </div>
            </>
          ) : null}
          {profile.role === "staff" ? (
            <div>
              <p className="text-xs uppercase text-slate-500">Staff ID</p>
              <p className="font-medium">{profile.staff_id || "—"}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
