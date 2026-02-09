/**
 * Sign Out Button
 *
 * Client component that handles signing the user out of Supabase
 * and redirecting them back to the login page.
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-gray-400 hover:text-gray-900 text-sm transition-colors cursor-pointer"
    >
      Sign out
    </button>
  );
}
