import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete in correct order to respect foreign keys
    // 1. Delete sub_goals (references goals)
    await supabase.from("sub_goals").delete().eq("user_id", user.id);

    // 2. Delete scheduled_blocks (references goals)
    await supabase.from("scheduled_blocks").delete().eq("user_id", user.id);

    // 3. Delete aeiou_responses (references goals)
    await supabase.from("aeiou_responses").delete().eq("user_id", user.id);

    // 4. Delete islands (references goals)
    await supabase.from("islands").delete().eq("user_id", user.id);

    // 5. Delete pirates (references goals)
    await supabase.from("pirates").delete().eq("user_id", user.id);

    // 6. Delete productivity_scores
    await supabase.from("productivity_scores").delete().eq("user_id", user.id);

    // 7. Finally delete goals
    await supabase.from("goals").delete().eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clear history error:", error);
    return NextResponse.json({ error: "Failed to clear history" }, { status: 500 });
  }
}
