/**
 * Spotify Now Playing Route
 *
 * Returns the currently playing track and mapped dance style.
 * Automatically refreshes expired tokens.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentlyPlaying, refreshSpotifyToken } from "@/lib/spotify";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get Spotify tokens from database
  const { data: userData, error: dbError } = await supabase
    .from("users")
    .select(
      "spotify_access_token, spotify_refresh_token, spotify_token_expires_at"
    )
    .eq("id", user.id)
    .single();

  if (dbError || !userData?.spotify_access_token) {
    return NextResponse.json({
      connected: false,
      isPlaying: false,
      danceStyle: "default",
    });
  }

  let accessToken = userData.spotify_access_token;

  // Check if token is expired and refresh if needed
  if (userData.spotify_token_expires_at) {
    const expiresAt = new Date(userData.spotify_token_expires_at);
    const now = new Date();

    if (now >= expiresAt && userData.spotify_refresh_token) {
      try {
        const refreshed = await refreshSpotifyToken(
          userData.spotify_refresh_token
        );
        accessToken = refreshed.access_token;

        const newExpiresAt = new Date(
          Date.now() + refreshed.expires_in * 1000
        ).toISOString();

        // Update tokens in database
        await supabase
          .from("users")
          .update({
            spotify_access_token: refreshed.access_token,
            spotify_token_expires_at: newExpiresAt,
            ...(refreshed.refresh_token
              ? { spotify_refresh_token: refreshed.refresh_token }
              : {}),
          })
          .eq("id", user.id);
      } catch (err) {
        console.error("Failed to refresh Spotify token:", err);
        return NextResponse.json({
          connected: false,
          isPlaying: false,
          danceStyle: "default",
          error: "token_expired",
        });
      }
    }
  }

  try {
    const result = await getCurrentlyPlaying(accessToken);
    return NextResponse.json({
      connected: true,
      ...result,
    });
  } catch (err) {
    console.error("Spotify now-playing error:", err);
    return NextResponse.json({
      connected: true,
      isPlaying: false,
      danceStyle: "default",
    });
  }
}
