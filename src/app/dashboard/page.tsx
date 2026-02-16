/**
 * Dashboard Page
 *
 * Main app screen after login. Server component that
 * checks auth, then renders client components.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
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

  // Fetch all sub_goals for active goals to display as items
  const goalIds = (goals || []).map((g) => g.id);
  let subGoals: Array<Record<string, unknown>> = [];
  if (goalIds.length > 0) {
    const { data: subs } = await supabase
      .from("sub_goals")
      .select("*, goals(title)")
      .in("parent_goal_id", goalIds)
      .neq("status", "completed")
      .order("sort_order", { ascending: true });
    subGoals = subs || [];
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-100 dark:border-gray-800 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">First Mate</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 dark:text-gray-500 text-sm">{user.email}</span>
            <DarkModeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <DashboardClient initialGoals={goals || []} initialSubGoals={subGoals} />
    </div>
  );
}
