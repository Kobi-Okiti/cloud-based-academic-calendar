import { api, withAuth } from "@/lib/http";

export async function fetchNotifications(accessToken: string) {
  return api.get("/notifications", withAuth(accessToken));
}
