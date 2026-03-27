"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchMe } from "@/lib/api";
import LogoutButton from "@/components/LogoutButton";

export default function PendingPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setMessage(null);
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        router.push("/login");
        return;
      }

      const res = await fetchMe(accessToken);
      if (res.status === 403) {
        setMessage("Your account is still pending approval.");
        return;
      }

      if (res.status >= 400) {
        setMessage("Unable to check status. Try again.");
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setMessage("Unable to check status. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-4xl items-center">
        <div className="card w-full p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-700">
                Lead City University
              </p>
              <h1 className="text-2xl font-semibold">Pending approval</h1>
            </div>
            <LogoutButton />
          </div>
          <p className="helper-text mt-4">
            Your account is waiting for admin approval. You will be notified
            once access is granted.
          </p>
          {message ? <p className="helper-text mt-2">{message}</p> : null}
          <button
            className="btn btn-primary mt-6 disabled:opacity-50"
            onClick={handleCheck}
            disabled={loading}
          >
            {loading ? "Checking..." : "Check status"}
          </button>
        </div>
      </div>
    </main>
  );
}
