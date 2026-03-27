"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchMe } from "@/lib/api";
import { fetchNotifications } from "@/lib/notificationsApi";

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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
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

        const notifRes = await fetchNotifications(token);
        if (notifRes.status < 400) {
          setNotifications(notifRes.data?.notifications || []);
        }
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Notifications</h2>
        <p className="helper-text">In-app reminders and updates.</p>
      </div>
      {notifications.length === 0 ? (
        <p className="helper-text">No notifications yet.</p>
      ) : (
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
      )}
    </div>
  );
}
