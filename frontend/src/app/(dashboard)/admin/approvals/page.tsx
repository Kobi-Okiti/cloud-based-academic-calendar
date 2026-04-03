"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchMe } from "@/lib/api";
import {
  approveUser,
  fetchPendingUsers,
  promoteStudentLevels,
  rejectUser
} from "@/lib/adminApi";
import { assertOk } from "@/lib/apiErrors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

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

type PromotionSummary = {
  total: number;
  counts: Record<string, number>;
};

export default function ApprovalsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [promotionPreview, setPromotionPreview] = useState<PromotionSummary | null>(null);
  const [promotionStatus, setPromotionStatus] = useState<string | null>(null);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadPending = async (nextPage = 1) => {
    try {
      setError(null);
      setLoading(true);
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

      const res = await fetchPendingUsers(token, { page: nextPage, limit: 5 });
      const body = assertOk(res, "Failed to load pending users").data;
      setUsers(body?.users || []);
      const resolvedPage = body?.pagination?.page || nextPage;
      const resolvedTotalPages = body?.pagination?.totalPages || 1;
      setPage(resolvedPage);
      setTotalPages(resolvedTotalPages);
      return { page: resolvedPage, totalPages: resolvedTotalPages };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending(1);
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

      const currentPage = page;
      const result = await loadPending(currentPage);
      if (result && currentPage > 1 && currentPage > result.totalPages) {
        await loadPending(currentPage - 1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setError(message);
    }
  };

  const handlePreviewPromotion = async () => {
    try {
      setPromotionLoading(true);
      setPromotionStatus(null);
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        router.push("/login");
        return;
      }

      const res = await promoteStudentLevels(token, { dryRun: true });
      const body = assertOk(res, "Failed to preview promotion").data;
      setPromotionPreview(body);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setPromotionStatus(message);
    } finally {
      setPromotionLoading(false);
    }
  };

  const handlePromote = async () => {
    try {
      setPromotionLoading(true);
      setPromotionStatus(null);
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        router.push("/login");
        return;
      }

      const res = await promoteStudentLevels(token, {});
      const body = assertOk(res, "Failed to promote students").data;
      setPromotionStatus(
        `Promotion complete. ${body?.totalUpdated || 0} students updated.`
      );
      setPromotionPreview(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setPromotionStatus(message);
    } finally {
      setPromotionLoading(false);
      setConfirmOpen(false);
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
      {users.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => loadPending(page - 1)}
              disabled={loading || page <= 1}
            >
              Prev
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => loadPending(page + 1)}
              disabled={loading || page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <div className="card p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-blue-950">Session rollover</h3>
          <p className="helper-text">
            Promote approved students up by one level (100→200→300→400→500).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-outline"
            type="button"
            onClick={handlePreviewPromotion}
            disabled={promotionLoading}
          >
            {promotionLoading ? "Loading..." : "Preview changes"}
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={promotionLoading}
          >
            Promote students
          </button>
        </div>
        {promotionStatus ? (
          <p className="helper-text">{promotionStatus}</p>
        ) : null}
        {promotionPreview ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">
              Preview: {promotionPreview.total} student(s) will be updated.
            </p>
            <div className="mt-2 space-y-1">
              {Object.entries(promotionPreview.counts).map(([key, value]) => (
                <p key={key}>
                  {key}: {value}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm promotion</DialogTitle>
            <DialogDescription>
              This will promote approved students to the next level.
            </DialogDescription>
          </DialogHeader>
          {promotionPreview ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">
                {promotionPreview.total} student(s) will be updated.
              </p>
              <div className="mt-2 space-y-1">
                {Object.entries(promotionPreview.counts).map(([key, value]) => (
                  <p key={key}>
                    {key}: {value}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <p className="helper-text">
              Run a preview to see how many students will be updated.
            </p>
          )}
          <DialogFooter>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={promotionLoading}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handlePromote}
              disabled={promotionLoading}
            >
              {promotionLoading ? "Promoting..." : "Confirm promotion"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
