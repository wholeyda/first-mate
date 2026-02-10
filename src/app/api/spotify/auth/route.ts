/**
 * Spotify Auth Route
 *
 * Redirects the user to Spotify's OAuth authorization page.
 * After authorization, Spotify redirects back to /api/spotify/callback.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSpotifyAuthUrl } from "@/lib/spotify";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Use user ID as state parameter for security
  const redirectUri = `${process.env.NEXT_PUBLIC_SUPABASE_URL ? "" : ""}${
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  }/api/spotify/callback`;

  const authUrl = getSpotifyAuthUrl(redirectUri, user.id);

  return NextResponse.redirect(authUrl);
}
