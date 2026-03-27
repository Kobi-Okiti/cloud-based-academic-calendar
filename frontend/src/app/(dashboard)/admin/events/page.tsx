"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchMe } from "@/lib/api";
import { createEvent, deleteEvent, fetchEvents, updateEvent } from "@/lib/eventsApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

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

type EventForm = {
  title: string;
  description: string;
  category: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string;
  audience_scope: "everyone" | "students" | "staff";
  audience_level: string;
  is_urgent: boolean;
};

type FormErrors = Partial<Record<keyof EventForm, string>>;

const categories = [
  { value: "general", label: "General" },
  { value: "announcement", label: "Announcement" },
  { value: "exam", label: "Exam" },
  { value: "test_week", label: "Test Week" },
  { value: "holiday", label: "Holiday" },
  { value: "seminar", label: "Seminar" }
];

const toInputDateTime = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIsoString = (value: string) => new Date(value).toISOString();

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>({
    title: "",
    description: "",
    category: "general",
    start_at: "",
    end_at: "",
    all_day: false,
    location: "",
    audience_scope: "everyone",
    audience_level: "",
    is_urgent: false
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isEditing = Boolean(editingId);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadEvents = async () => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      router.push("/login");
      return;
    }

    const meRes = await fetchMe(token);
    if (meRes.status >= 400) {
      router.push("/login");
      return;
    }

    const meData = meRes.data;
    if (meData.user.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    const eventsRes = await fetchEvents(token);
    if (eventsRes.status < 400) {
      setEvents(eventsRes.data?.events || []);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = "Title is required.";
    }

    if (!form.start_at) {
      nextErrors.start_at = "Start time is required.";
    }

    if (form.end_at && form.start_at) {
      const start = new Date(form.start_at).getTime();
      const end = new Date(form.end_at).getTime();
      if (end < start) {
        nextErrors.end_at = "End time must be after start time.";
      }
    }

    if (form.audience_scope === "students" && !form.audience_level) {
      nextErrors.audience_level = "Select a level.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setErrors({});

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        router.push("/login");
        return;
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        start_at: toIsoString(form.start_at),
        end_at: form.end_at ? toIsoString(form.end_at) : null,
        all_day: form.all_day,
        location: form.location.trim() || null,
        audience_scope: form.audience_scope,
        audience_level:
          form.audience_scope === "students" && form.audience_level
            ? Number(form.audience_level)
            : null,
        is_urgent: form.is_urgent
      };

      const res = editingId
        ? await updateEvent(token, editingId, payload)
        : await createEvent(token, payload);

      if (res.status >= 400) {
        throw new Error(res.data?.error || "Failed to save event");
      }

      const body = res.data;
      if (editingId) {
        setEvents((prev) =>
          prev.map((item) => (item.id === editingId ? body.event : item))
        );
        setStatus("Event updated.");
      } else {
        setEvents((prev) => [...prev, body.event]);
        setStatus("Event created.");
      }
      setForm({
        title: "",
        description: "",
        category: "general",
        start_at: "",
        end_at: "",
        all_day: false,
        location: "",
        audience_scope: "everyone",
        audience_level: "",
        is_urgent: false
      });
      setEditingId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleteLoading(true);
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        router.push("/login");
        return;
      }

      const res = await deleteEvent(token, id);
      if (res.status >= 400) {
        throw new Error("Failed to delete event");
      }

      setEvents((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setStatus(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await handleDelete(deleteTarget.id);
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const startEdit = (item: EventItem) => {
    setEditingId(item.id);
    setStatus(null);
    setErrors({});
    setForm({
      title: item.title,
      description: item.description ?? "",
      category: item.category || "general",
      start_at: toInputDateTime(item.start_at),
      end_at: toInputDateTime(item.end_at),
      all_day: item.all_day,
      location: item.location ?? "",
      audience_scope: item.audience_scope as EventForm["audience_scope"],
      audience_level: item.audience_level ? String(item.audience_level) : "",
      is_urgent: item.is_urgent
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setErrors({});
    setStatus(null);
    setForm({
      title: "",
      description: "",
      category: "general",
      start_at: "",
      end_at: "",
      all_day: false,
      location: "",
      audience_scope: "everyone",
      audience_level: "",
      is_urgent: false
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">
            {isEditing ? "Edit event" : "Create event"}
          </h2>
          <p className="helper-text">
            Create academic calendar updates for students, staff, or everyone.
          </p>
        </div>
      </div>

      <form
        className="card grid gap-4 p-6 md:grid-cols-2"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="md:col-span-2">
          <label className="label">Title</label>
          <input
            className="input mt-1"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          {errors.title ? (
            <p className="text-sm text-red-600">{errors.title}</p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label className="label">Description</label>
          <textarea
            className="input mt-1"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Category</label>
          <select
            className="input mt-1"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Audience</label>
          <select
            className="input mt-1"
            value={form.audience_scope}
            onChange={(e) =>
              setForm({
                ...form,
                audience_scope: e.target.value as EventForm["audience_scope"],
                audience_level: ""
              })
            }
          >
            <option value="everyone">Everyone</option>
            <option value="students">Students</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        {form.audience_scope === "students" ? (
          <div>
            <label className="label">Student level</label>
            <select
              className="input mt-1"
              value={form.audience_level}
              onChange={(e) =>
                setForm({ ...form, audience_level: e.target.value })
              }
            >
              <option value="">Select level</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="300">300</option>
              <option value="400">400</option>
              <option value="500">500</option>
            </select>
            {errors.audience_level ? (
              <p className="text-sm text-red-600">{errors.audience_level}</p>
            ) : null}
          </div>
        ) : null}

        <div>
          <label className="label">Start</label>
          <input
            className="input mt-1"
            type="datetime-local"
            value={form.start_at}
            onChange={(e) => setForm({ ...form, start_at: e.target.value })}
          />
          {errors.start_at ? (
            <p className="text-sm text-red-600">{errors.start_at}</p>
          ) : null}
        </div>

        <div>
          <label className="label">End (optional)</label>
          <input
            className="input mt-1"
            type="datetime-local"
            value={form.end_at}
            onChange={(e) => setForm({ ...form, end_at: e.target.value })}
          />
          {errors.end_at ? (
            <p className="text-sm text-red-600">{errors.end_at}</p>
          ) : null}
        </div>

        <div>
          <label className="label">Location</label>
          <input
            className="input mt-1"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            id="all-day"
            type="checkbox"
            className="h-4 w-4 accent-blue-600"
            checked={form.all_day}
            onChange={(e) => setForm({ ...form, all_day: e.target.checked })}
          />
          <label htmlFor="all-day" className="text-sm text-slate-700">
            All day event
          </label>
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            id="urgent"
            type="checkbox"
            className="h-4 w-4 accent-blue-600"
            checked={form.is_urgent}
            onChange={(e) => setForm({ ...form, is_urgent: e.target.checked })}
          />
          <label htmlFor="urgent" className="text-sm text-slate-700">
            Mark as urgent
          </label>
        </div>

        {status ? (
          <p className="md:col-span-2 helper-text">{status}</p>
        ) : null}
        <div className="md:col-span-2 flex flex-wrap gap-3">
          <button
            className="btn btn-primary disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading ? "Saving..." : isEditing ? "Save changes" : "Create event"}
          </button>
          {isEditing ? (
            <button
              className="btn btn-outline"
              type="button"
              onClick={cancelEdit}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div>
        <h3 className="text-lg font-semibold text-blue-950">Existing events</h3>
        {events.length === 0 ? (
          <p className="helper-text mt-2">No events yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <div key={event.id} className="card-sm p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-slate-600">
                      {new Date(event.start_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-600">
                      Audience: {event.audience_scope}
                      {event.audience_level
                        ? ` (Level ${event.audience_level})`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-outline"
                      onClick={() => startEdit(event)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn border border-rose-200 text-rose-700 hover:bg-rose-50"
                      onClick={() => {
                        setDeleteTarget(event);
                        setDeleteOpen(true);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete event</DialogTitle>
            <DialogDescription>
              This will permanently remove the event from the calendar.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-medium text-slate-900">
              {deleteTarget?.title || "Selected event"}
            </p>
            {deleteTarget?.start_at ? (
              <p>{new Date(deleteTarget.start_at).toLocaleString()}</p>
            ) : null}
          </div>
          <DialogFooter>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </button>
            <button
              className="btn bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
              type="button"
              onClick={confirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
