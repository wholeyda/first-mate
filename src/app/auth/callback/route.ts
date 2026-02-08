/**
 * Auth Callback Route
 *
 * Google OAuth redirects here after the user signs in.
 * Exchanges the auth code for a session, stores Google tokens
 * for Calendar API access, then redirects to the dashboard.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    // Exchange the auth code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the session to access Google tokens
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // Store user profile and Google tokens for Calendar API access
        await supabase.from("users").upsert(
          {
            id: session.user.id,
            email: session.user.email!,
            google_access_token: session.provider_token ?? null,
            google_refresh_token: session.provider_refresh_token ?? null,
          },
          { onConflict: "id" }
        );
      }

      // Redirect to dashboard on success
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // Redirect to login on error
  return NextResponse.redirect(`${origin}/login`);
}
