/**
 * Spotify Callback Route
 *
 * Handles the OAuth callback from Spotify after user authorization.
 * Exchanges the authorization code for tokens and stores them in Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeSpotifyCode } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("Spotify auth error:", error);
    return NextResponse.redirect(`${origin}/dashboard?spotify_error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard?spotify_error=no_code`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    const redirectUri = `${origin}/api/spotify/callback`;
    const tokens = await exchangeSpotifyCode(code, redirectUri);

    // Calculate token expiry timestamp
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    // Store tokens in Supabase
    const { error: dbError } = await supabase
      .from("users")
      .update({
        spotify_access_token: tokens.access_token,
        spotify_refresh_token: tokens.refresh_token,
        spotify_token_expires_at: expiresAt,
      })
      .eq("id", user.id);

    if (dbError) {
      console.error("Failed to save Spotify tokens:", dbError);
      return NextResponse.redirect(
        `${origin}/dashboard?spotify_error=save_failed`
      );
    }

    return NextResponse.redirect(`${origin}/dashboard?spotify=connected`);
  } catch (err) {
    console.error("Spotify callback error:", err);
    return NextResponse.redirect(
      `${origin}/dashboard?spotify_error=exchange_failed`
    );
  }
}
