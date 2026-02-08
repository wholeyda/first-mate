/**
 * Dashboard Page
 *
 * Main app screen after login. Shows the user's name and a sign-out button.
 * This is a placeholder — will be expanded with chat, calendar, and pirate crew.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

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

  return (
    <div className="min-h-screen bg-[#0a1628] p-8">
      {/* Top bar */}
      <div className="flex items-center justify-between max-w-6xl mx-auto mb-12">
        <h1 className="text-2xl font-bold text-[#c9a84c]">⚓ First Mate</h1>
        <div className="flex items-center gap-4">
          <span className="text-[#d4c5a0] text-sm">
            {user.email}
          </span>
          <SignOutButton />
        </div>
      </div>

      {/* Main content placeholder */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-[#112240] border border-[#1e3a5f] rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-[#c9a84c] mb-4">
            Welcome aboard, Captain!
          </h2>
          <p className="text-[#d4c5a0] text-lg">
            Your ship is ready. Chat and calendar features coming next.
          </p>
        </div>
      </div>
    </div>
  );
}
