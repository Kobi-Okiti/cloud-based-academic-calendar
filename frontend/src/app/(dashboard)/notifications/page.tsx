"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchMe } from "@/lib/api";
import { fetchNotifications } from "@/lib/notificationsApi";
import { assertOk } from "@/lib/apiErrors";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "";

type NotificationItem = {
  id: string;
  channel: string;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
  event: {
    id: string;
    title: string;
    start_at: string;
    is_urgent: boolean;
  } | null;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadNotifications = useCallback(async (
    accessToken: string,
    nextPage: number
  ) => {
    try {
      setLoading(true);
      setError(null);

      const notifRes = await fetchNotifications(accessToken, {
        page: nextPage,
        limit: 10
      });
      const body = assertOk(notifRes, "Failed to load notifications").data;
      const nextItems = body?.notifications || [];
      const nextPagination = body?.pagination;

      setNotifications(nextItems);
      setPage(nextPagination?.page || nextPage);
      setTotalPages(nextPagination?.totalPages || 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;

        if (!accessToken) {
          router.push("/login");
          return;
        }

        const res = await fetchMe(accessToken);
        if (res.status === 403) {
          router.push("/pending");
          return;
        }

        assertOk(res, "Failed to load profile");
        setToken(accessToken);
        await loadNotifications(accessToken, 1);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error";
        setError(message);
        setLoading(false);
      }
    };

    load();
  }, [loadNotifications, router]);

  const handlePageChange = async (nextPage: number) => {
    if (!token || nextPage < 1 || nextPage > totalPages || loading) return;
    await loadNotifications(token, nextPage);
  };

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Notifications</h2>
        <p className="helper-text">In-app reminders and updates.</p>
      </div>
      {loading && notifications.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`notif-skel-${index}`} className="h-20" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="You will see reminders here when new events are scheduled."
          actionLabel="View calendar"
          actionHref="/calendar"
        />
      ) : (
        <>
          <div className="space-y-3">
            {notifications.map((item) => (
              <div key={item.id} className="card-sm p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {item.event?.title || "Event update"}
                    </p>
                    <p className="text-sm text-slate-600">
                      {formatDate(item.event?.start_at || item.scheduled_at)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Channel: {item.channel} • Status: {item.status}
                    </p>
                  </div>
                  {item.event?.is_urgent ? (
                    <span className="badge-urgent">Urgent</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={loading || page <= 1}
              >
                Prev
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={loading || page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
