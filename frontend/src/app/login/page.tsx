"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchMe } from "@/lib/api";

type LoginErrors = {
  email?: string;
  password?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors: LoginErrors = {};
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setErrors({});

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (signInError || !data.session) {
        throw new Error(signInError?.message || "Login failed");
      }

      const res = await fetchMe(data.session.access_token);
      if (res.status === 403) {
        router.push("/pending");
        return;
      }

      if (res.status >= 400) {
        throw new Error(res.data?.error || "Unable to load profile");
      }

      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-5xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-700">
              Lead City University
            </p>
            <h1 className="text-4xl font-semibold text-blue-950">
              Academic Calendar Portal
            </h1>
            <p className="text-base text-slate-600">
              Stay ahead of exams, seminars, and key academic updates with timely
              in-app notifications.
            </p>
            <div className="grid gap-3 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                Personalized updates by level and role.
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                Urgent announcements delivered instantly.
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                Centralized view of every academic session.
              </div>
            </div>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-semibold">Login</h2>
            <p className="helper-text mt-1">
              Use your school email and password to continue.
            </p>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email ? (
                  <p className="text-sm text-red-600">{errors.email}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {errors.password ? (
                  <p className="text-sm text-red-600">{errors.password}</p>
                ) : null}
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <button
                className="btn btn-primary w-full disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
            <p className="mt-4 text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link className="font-semibold text-blue-900 underline" href="/signup">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
