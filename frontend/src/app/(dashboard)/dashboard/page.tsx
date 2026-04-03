"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchMe } from "@/lib/api";
import { fetchEvents } from "@/lib/eventsApi";
import { assertOk } from "@/lib/apiErrors";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import EventDetailDialog from "@/components/EventDetailDialog";

type UserProfile = {
  id: string;
  full_name: string;
  email: string | null;
  role: "admin" | "staff" | "student";
  status: "pending" | "approved" | "rejected";
  level: number | null;
  department: string | null;
};

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  audience_scope: string;
  audience_level: number | null;
  is_urgent: boolean;
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
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

        const body = assertOk(res, "Failed to load profile").data;
        if (body.user.role === "admin") {
          router.push("/admin/approvals");
          return;
        }
        setProfile(body.user);

        const eventsRes = await fetchEvents(token, {
          limit: 5,
          from: new Date().toISOString()
        });
        setEvents(assertOk(eventsRes, "Failed to load events").data?.events || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (loading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="card p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  const upcomingEvents = events.slice(0, 5);

  const handleOpen = (event: EventItem) => {
    setSelectedEvent(event);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="helper-text">Welcome, {profile.full_name}</p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-blue-950">Upcoming events</h3>
        {upcomingEvents.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No upcoming events"
              description="You are all caught up. Check back later for new calendar updates."
              actionLabel="View calendar"
              actionHref="/calendar"
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcomingEvents.map((event) => (
              <li key={event.id} className="card-sm p-0">
                <button
                  type="button"
                  className="w-full rounded-xl p-4 text-left transition-colors hover:bg-slate-50"
                  onClick={() => handleOpen(event)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{event.title}</p>
                      <p className="text-sm text-slate-600 truncate">
                        {new Date(event.start_at).toLocaleString()}
                      </p>
                    </div>
                    {event.is_urgent ? (
                      <span className="badge-urgent">Urgent</span>
                    ) : null}
                  </div>
                  {event.description ? (
                    <p className="mt-2 text-sm text-slate-600 truncate">
                      {event.description}
                    </p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EventDetailDialog
        event={selectedEvent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
