/**
 * Reject Pending Events API
 *
 * POST - Reject pending blocks (delete them from the database).
 *
 * Body: { blockIds: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { blockIds } = await request.json();

    if (!blockIds || !Array.isArray(blockIds) || blockIds.length === 0) {
      return NextResponse.json(
        { error: "blockIds array is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("scheduled_blocks")
      .delete()
      .in("id", blockIds)
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (error) {
      console.error("Reject error:", error);
      return NextResponse.json(
        { error: "Failed to reject blocks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ rejected: blockIds.length });
  } catch (error) {
    console.error("Reject error:", error);
    return NextResponse.json(
      { error: "Failed to reject events" },
      { status: 500 }
    );
  }
}
