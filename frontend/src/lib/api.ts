import { api, withAuth } from "@/lib/http";

export async function fetchMe(accessToken: string) {
  return api.get("/me", withAuth(accessToken));
}

export async function cleanupSignup(accessToken: string) {
  return api.post("/auth/cleanup", null, withAuth(accessToken));
}
