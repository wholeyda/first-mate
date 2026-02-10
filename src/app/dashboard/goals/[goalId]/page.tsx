/**
 * Goal Detail Page
 *
 * Server component that fetches goal data and renders the
 * goal detail client with Gantt chart and sub-goal management.
 */

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { GoalDetailClient } from "@/components/goal-detail-client";
import { Goal } from "@/types/database";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: goal } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .single();

  if (!goal) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-100 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-lg font-semibold text-gray-900">First Mate</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Goal detail content */}
      <GoalDetailClient goal={goal as Goal} />
    </div>
  );
}
