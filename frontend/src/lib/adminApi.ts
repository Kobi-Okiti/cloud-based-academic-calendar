import { api, withAuth } from "@/lib/http";

type FetchPendingUsersParams = {
  page?: number;
  limit?: number;
};

export async function fetchPendingUsers(
  accessToken: string,
  params?: FetchPendingUsersParams
) {
  return api.get("/admin/pending-users", {
    ...withAuth(accessToken),
    params
  });
}

export async function approveUser(accessToken: string, id: string) {
  return api.post(`/admin/approve/${id}`, null, withAuth(accessToken));
}

export async function rejectUser(accessToken: string, id: string) {
  return api.post(`/admin/reject/${id}`, null, withAuth(accessToken));
}

export async function promoteStudentLevels(
  accessToken: string,
  payload: { dryRun?: boolean }
) {
  return api.post("/admin/promote-levels", payload, withAuth(accessToken));
}
