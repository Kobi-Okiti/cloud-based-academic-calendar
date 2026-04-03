import { api, withAuth } from "@/lib/http";

type FetchEventsParams = {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
};

export async function fetchEvents(accessToken: string, params?: FetchEventsParams) {
  return api.get("/events", {
    ...withAuth(accessToken),
    params
  });
}

export async function createEvent(
  accessToken: string,
  payload: Record<string, unknown>
) {
  return api.post("/events", payload, withAuth(accessToken));
}

export async function updateEvent(
  accessToken: string,
  id: string,
  payload: Record<string, unknown>
) {
  return api.put(`/events/${id}`, payload, withAuth(accessToken));
}

export async function deleteEvent(accessToken: string, id: string) {
  return api.delete(`/events/${id}`, withAuth(accessToken));
}
