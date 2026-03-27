"use client";

import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  className?: string;
};

export default function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <button
      className={cn("btn btn-outline", className)}
      onClick={handleLogout}
      type="button"
    >
      Logout
    </button>
  );
}
