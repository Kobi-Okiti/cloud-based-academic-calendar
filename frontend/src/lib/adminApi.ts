import { api, withAuth } from "@/lib/http";

export async function fetchPendingUsers(accessToken: string) {
  return api.get("/admin/pending-users", withAuth(accessToken));
}

export async function approveUser(accessToken: string, id: string) {
  return api.post(`/admin/approve/${id}`, null, withAuth(accessToken));
}

export async function rejectUser(accessToken: string, id: string) {
  return api.post(`/admin/reject/${id}`, null, withAuth(accessToken));
}
