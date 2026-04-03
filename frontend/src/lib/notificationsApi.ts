import { api, withAuth } from "@/lib/http";

type FetchNotificationsParams = {
  page?: number;
  limit?: number;
};

export async function fetchNotifications(
  accessToken: string,
  params?: FetchNotificationsParams
) {
  return api.get("/notifications", {
    ...withAuth(accessToken),
    params
  });
}
