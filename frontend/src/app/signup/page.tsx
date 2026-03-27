"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { cleanupSignup } from "@/lib/api";
import { DEPARTMENTS } from "@/lib/departments";

type Role = "student" | "staff";

type Field =
  | "role"
  | "fullName"
  | "email"
  | "password"
  | "level"
  | "department"
  | "matricNumber"
  | "staffId";

type SignupErrors = Partial<Record<Field, string>>;

type UpdateProfileArgs = {
  p_full_name: string;
  p_role: Role;
  p_level: number | null;
  p_department: string | null;
  p_matric_number: string | null;
  p_staff_id: string | null;
};

const allowedLevels = ["100", "200", "300", "400", "500"] as const;

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState<(typeof allowedLevels)[number]>("100");
  const [department, setDepartment] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [staffId, setStaffId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors: SignupErrors = {};
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedDepartment = department.trim();
    const trimmedMatric = matricNumber.trim();
    const trimmedStaffId = staffId.trim();

    if (!role) {
      nextErrors.role = "Role is required.";
    }

    if (trimmedName.length < 2) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!trimmedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (!trimmedDepartment) {
      nextErrors.department = "Department is required.";
    } else if (!DEPARTMENTS.includes(trimmedDepartment as (typeof DEPARTMENTS)[number])) {
      nextErrors.department = "Select a valid department.";
    }

    if (role === "student") {
      if (!level || !allowedLevels.includes(level)) {
        nextErrors.level = "Level is required.";
      }

      if (!trimmedMatric) {
        nextErrors.matricNumber = "Matric number is required.";
      }
    }

    if (role === "staff") {
      if (!trimmedStaffId) {
        nextErrors.staffId = "Staff ID is required.";
      }
    }

    return nextErrors;
  };

  const attemptCleanup = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        await cleanupSignup(token);
      }
      await supabase.auth.signOut();
    } catch {
      // noop - cleanup is best-effort
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setErrors({});

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = fullName.trim();
      const trimmedDepartment = department.trim();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName
          }
        }
      });

      if (signUpError || !data.user) {
        const message = signUpError?.message?.toLowerCase();
        if (message?.includes("already") && message.includes("registered")) {
          setErrors({ email: "Email already exists." });
          return;
        }
        throw new Error(signUpError?.message || "Signup failed");
      }

      const updateArgs: UpdateProfileArgs = {
        p_full_name: trimmedName,
        p_role: role,
        p_department: trimmedDepartment || null,
        p_level: role === "student" ? Number(level) : null,
        p_matric_number: role === "student" ? matricNumber.trim() || null : null,
        p_staff_id: role === "staff" ? staffId.trim() || null : null
      };

      const { error: updateError } = await supabase.rpc("update_profile", updateArgs);

      if (updateError) {
        const message = updateError.message || "Unable to update profile";
        if (message.includes("profiles_matric_number_unique")) {
          await attemptCleanup();
          setErrors({ matricNumber: "Matric number already exists." });
          return;
        }
        if (message.includes("profiles_staff_id_unique")) {
          await attemptCleanup();
          setErrors({ staffId: "Staff ID already exists." });
          return;
        }
        if (message.toLowerCase().includes("invalid role")) {
          await attemptCleanup();
          setErrors({ role: "Invalid role selected." });
          return;
        }
        if (message.toLowerCase().includes("invalid level")) {
          await attemptCleanup();
          setErrors({ level: "Invalid level selected." });
          return;
        }
        await attemptCleanup();
        throw new Error(message);
      }

      router.push("/pending");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup error";
      setFormError(message);
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
              Create your campus account
            </h1>
            <p className="text-base text-slate-600">
              Join the academic calendar portal to receive updates tailored to
              your role and level.
            </p>
            <div className="grid gap-3 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                Secure approval workflow for new users.
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                Always know what is happening this semester.
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                Timely reminders for upcoming academic events.
              </div>
            </div>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-semibold">Create account</h2>
            <p className="helper-text mt-1">
              Fill in your details to request access.
            </p>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <label className="label">Role</label>
                <select
                  className="input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                </select>
                {errors.role ? (
                  <p className="text-sm text-red-600">{errors.role}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="label">Full name</label>
                <input
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                {errors.fullName ? (
                  <p className="text-sm text-red-600">{errors.fullName}</p>
                ) : null}
              </div>
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

              {role === "student" ? (
                <>
                  <div className="space-y-2">
                    <label className="label">Level</label>
                    <select
                      className="input"
                      value={level}
                      onChange={(e) =>
                        setLevel(e.target.value as (typeof allowedLevels)[number])
                      }
                    >
                      {allowedLevels.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    {errors.level ? (
                      <p className="text-sm text-red-600">{errors.level}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label className="label">Matric number</label>
                    <input
                      className="input"
                      value={matricNumber}
                      onChange={(e) => setMatricNumber(e.target.value)}
                    />
                    {errors.matricNumber ? (
                      <p className="text-sm text-red-600">
                        {errors.matricNumber}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <label className="label">Staff ID</label>
                  <input
                    className="input"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                  />
                  {errors.staffId ? (
                    <p className="text-sm text-red-600">{errors.staffId}</p>
                  ) : null}
                </div>
              )}

              <div className="space-y-2">
                <label className="label">Department</label>
                <select
                  className="input"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="" disabled>
                    Select department
                  </option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {errors.department ? (
                  <p className="text-sm text-red-600">{errors.department}</p>
                ) : null}
              </div>

              {formError ? (
                <p className="text-sm text-red-600">{formError}</p>
              ) : null}
              <button
                className="btn btn-primary w-full disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
            <p className="mt-4 text-sm text-slate-600">
              Already have an account?{" "}
              <Link className="font-semibold text-blue-900 underline" href="/login">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
