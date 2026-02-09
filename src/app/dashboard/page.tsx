/**
 * Dashboard Page
 *
 * Main app screen after login. Contains the chat interface
 * and a sidebar showing active goals. Server component that
 * checks auth, then renders client components.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if not signed in
  if (!user) {
    redirect("/login");
  }

  // Fetch active goals for the sidebar
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("priority", { ascending: false });

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      {/* Top bar */}
      <header className="border-b border-[#1e3a5f] px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-[#c9a84c]">⚓ First Mate</h1>
          <div className="flex items-center gap-4">
            <span className="text-[#d4c5a0] text-sm">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <DashboardClient initialGoals={goals || []} />
    </div>
  );
}
