"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchMe } from "@/lib/api";
import { fetchEvents } from "@/lib/eventsApi";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

type UserProfile = {
  id: string;
  full_name: string;
  role: "admin" | "staff" | "student";
  status: "pending" | "approved" | "rejected";
};

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const buildCalendar = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  while (cells.length < 42) {
    cells.push(null);
  }
  return cells;
};

export default function CalendarPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

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

        const eventsRes = await fetchEvents(token);
        if (eventsRes.status < 400) {
          setEvents(eventsRes.data?.events || []);
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

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    events.forEach((event) => {
      const key = dateKey(new Date(event.start_at));
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, list);
    });
    return map;
  }, [events]);

  const monthLabel = currentMonth.toLocaleString(undefined, {
    month: "long",
    year: "numeric"
  });

  const calendarCells = buildCalendar(
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  );

  const monthEvents = events
    .filter((event) => {
      const date = new Date(event.start_at);
      return (
        date.getFullYear() === currentMonth.getFullYear() &&
        date.getMonth() === currentMonth.getMonth()
      );
    })
    .sort(
      (a, b) =>
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );

  const mobileEvents = monthEvents.slice(0, 10);

  if (loading) {
    return <p className="helper-text">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Calendar</h2>
        <p className="helper-text">
          Welcome{profile ? `, ${profile.full_name}` : ""}
        </p>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{monthLabel}</h3>
          <div className="flex gap-2">
            <button
              className="btn btn-outline px-3 py-1 text-xs"
              type="button"
              onClick={() =>
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() - 1,
                    1
                  )
                )
              }
            >
              Prev
            </button>
            <button
              className="btn btn-outline px-3 py-1 text-xs"
              type="button"
              onClick={() =>
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() + 1,
                    1
                  )
                )
              }
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-4 hidden md:block">
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-500">
            {dayLabels.map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarCells.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-20 rounded" />;
              }

              const key = dateKey(date);
              const dayEvents = eventsByDate.get(key) || [];

              return (
                <div
                  key={key}
                  className="flex h-20 flex-col rounded-xl border border-slate-200 bg-white/80 p-2 text-xs"
                >
                  <div className="font-medium text-slate-900">
                    {date.getDate()}
                  </div>
                  {dayEvents.length > 0 ? (
                    <div className="mt-1 space-y-1 text-[11px] text-slate-600">
                      {dayEvents.slice(0, 2).map((eventItem) => (
                        <div key={eventItem.id} className="truncate">
                          {eventItem.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 ? (
                        <div className="text-[10px] text-slate-400">
                          +{dayEvents.length - 2} more
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 md:hidden">
          {mobileEvents.length === 0 ? (
            <p className="helper-text">No events this month.</p>
          ) : (
            <ul className="space-y-3">
              {mobileEvents.map((event) => (
                <li key={event.id} className="card-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-slate-600">
                        {new Date(event.start_at).toLocaleString()}
                      </p>
                    </div>
                    {event.is_urgent ? (
                      <span className="badge-urgent">Urgent</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-6 hidden md:block">
        <h3 className="text-lg font-semibold text-blue-950">Events this month</h3>
        {monthEvents.length === 0 ? (
          <p className="helper-text mt-2">No events this month.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {monthEvents.map((event) => (
              <li key={event.id} className="card-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-slate-600">
                      {new Date(event.start_at).toLocaleString()}
                    </p>
                  </div>
                  {event.is_urgent ? (
                    <span className="badge-urgent">Urgent</span>
                  ) : null}
                </div>
                {event.description ? (
                  <p className="mt-2 text-sm text-slate-600">
                    {event.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
