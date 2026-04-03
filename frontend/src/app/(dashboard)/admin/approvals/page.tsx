"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchMe } from "@/lib/api";
import { approveUser, fetchPendingUsers, rejectUser } from "@/lib/adminApi";
import { assertOk } from "@/lib/apiErrors";

type PendingUser = {
  id: string;
  full_name: string;
  email: string | null;
  role: "student" | "staff" | "admin";
  level: number | null;
  department: string | null;
  matric_number: string | null;
  staff_id: string | null;
  created_at: string;
};

export default function ApprovalsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPending = async () => {
    try {
      setError(null);
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        router.push("/login");
        return;
      }

      const meRes = await fetchMe(token);
      const meData = assertOk(meRes, "Failed to load profile").data;
      if (meData.user.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      const res = await fetchPendingUsers(token);
      const body = assertOk(res, "Failed to load pending users").data;
      setUsers(body?.users || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        router.push("/login");
        return;
      }

      const res =
        action === "approve"
          ? await approveUser(token, id)
          : await rejectUser(token, id);

      assertOk(res, "Action failed");

      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Pending approvals</h2>
          <p className="helper-text">Approve new users and review requests.</p>
        </div>
      </div>

      {loading ? <p className="helper-text">Loading...</p> : null}
      {error ? <p className="text-red-600">{error}</p> : null}
      {!loading && users.length === 0 ? (
        <p className="helper-text">No pending users.</p>
      ) : null}
      <div className="space-y-4">
        {users.map((user) => (
          <div key={user.id} className="card-sm p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{user.full_name}</p>
                <p className="text-sm text-slate-600">{user.email}</p>
                <p className="text-sm text-slate-600">
                  Role: {user.role}
                  {user.level ? ` • Level ${user.level}` : ""}
                </p>
                {user.role === "student" && user.matric_number ? (
                  <p className="text-sm text-slate-600">
                    Matric: {user.matric_number}
                  </p>
                ) : null}
                {user.role === "staff" && user.staff_id ? (
                  <p className="text-sm text-slate-600">
                    Staff ID: {user.staff_id}
                  </p>
                ) : null}
                {user.department ? (
                  <p className="text-sm text-slate-600">
                    Department: {user.department}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  className="btn bg-emerald-600 text-white hover:bg-emerald-500"
                  onClick={() => handleAction(user.id, "approve")}
                >
                  Approve
                </button>
                <button
                  className="btn border border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={() => handleAction(user.id, "reject")}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
