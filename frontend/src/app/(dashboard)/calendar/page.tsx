"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchMe } from "@/lib/api";
import { fetchEvents } from "@/lib/eventsApi";
import { assertOk } from "@/lib/apiErrors";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import EventDetailDialog from "@/components/EventDetailDialog";

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

const buildMonthRange = (value: Date) => {
  const start = new Date(value.getFullYear(), value.getMonth(), 1);
  const end = new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const EVENTS_PAGE_LIMIT = 100;

export default function CalendarPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    const loadProfile = async () => {
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

        const body = assertOk(res, "Failed to load profile").data;
        setProfile(body.user);
        setToken(accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error";
        setError(message);
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const loadEvents = async () => {
      try {
        setEventsLoading(true);
        setError(null);
        setEvents([]);

        const { start, end } = buildMonthRange(currentMonth);
        const baseParams = {
          page: 1,
          limit: EVENTS_PAGE_LIMIT,
          from: start.toISOString(),
          to: end.toISOString()
        };

        const firstRes = await fetchEvents(token, baseParams);
        const firstBody = assertOk(firstRes, "Failed to load events").data;
        let allEvents: EventItem[] = firstBody?.events || [];

        const totalPages = firstBody?.pagination?.totalPages || 1;
        if (totalPages > 1) {
          const pages = Array.from({ length: totalPages - 1 }, (_, idx) => idx + 2);
          const responses = await Promise.all(
            pages.map((page) => fetchEvents(token, { ...baseParams, page }))
          );
          responses.forEach((response) => {
            const body = assertOk(response, "Failed to load events").data;
            allEvents = allEvents.concat(body?.events || []);
          });
        }

        setEvents(allEvents);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error";
        setError(message);
      } finally {
        setEventsLoading(false);
      }
    };

    loadEvents();
  }, [currentMonth, token]);

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

  const handleOpen = (event: EventItem) => {
    setSelectedEvent(event);
    setDetailOpen(true);
  };

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="card p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 14 }).map((_, index) => (
              <Skeleton key={`cal-skel-${index}`} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
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
          {eventsLoading ? (
            <div className="mt-2 grid grid-cols-7 gap-2">
              {Array.from({ length: 21 }).map((_, index) => (
                <Skeleton key={`grid-skel-${index}`} className="h-20" />
              ))}
            </div>
          ) : (
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
                          <button
                            key={eventItem.id}
                            type="button"
                            className="truncate text-left hover:text-blue-900"
                            onClick={() => handleOpen(eventItem)}
                          >
                            {eventItem.title}
                          </button>
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
          )}
        </div>

        <div className="mt-4 md:hidden">
          {eventsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={`mobile-skel-${index}`} className="h-20" />
              ))}
            </div>
          ) : mobileEvents.length === 0 ? (
            <EmptyState
              title="No events this month"
              description="We have not scheduled any updates for this month yet."
              actionLabel="View notifications"
              actionHref="/notifications"
            />
          ) : (
            <ul className="space-y-3">
              {mobileEvents.map((event) => (
                <li key={event.id} className="card-sm p-0">
                  <button
                    type="button"
                    className="w-full p-4 text-left"
                    onClick={() => handleOpen(event)}
                  >
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
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-6 hidden md:block">
        <h3 className="text-lg font-semibold text-blue-950">Events this month</h3>
        {eventsLoading ? (
          <div className="mt-3 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`list-skel-${index}`} className="h-20" />
            ))}
          </div>
        ) : monthEvents.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No events this month"
              description="No academic calendar updates have been posted yet."
              actionLabel="Check notifications"
              actionHref="/notifications"
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {monthEvents.map((event) => (
              <li key={event.id} className="card-sm p-0">
                <button
                  type="button"
                  className="w-full p-4 text-left"
                  onClick={() => handleOpen(event)}
                >
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
