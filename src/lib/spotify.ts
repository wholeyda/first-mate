/**
 * Spotify Service
 *
 * Handles Spotify OAuth, token management, and "Now Playing" detection.
 * Maps detected genres to dance styles for the dancing figures.
 */

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";

export type DanceStyle =
  | "pop"
  | "rock"
  | "hiphop"
  | "electronic"
  | "country"
  | "classical"
  | "jazz"
  | "blues"
  | "rnb"
  | "folk"
  | "default";

/**
 * Build the Spotify OAuth URL for user authorization.
 */
export function getSpotifyAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID || "",
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "user-read-currently-playing user-read-playback-state",
    state,
  });
  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens.
 */
export async function exchangeSpotifyCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Spotify token exchange failed: ${err}`);
  }

  return response.json();
}

/**
 * Refresh an expired Spotify access token.
 */
export async function refreshSpotifyToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Spotify token refresh failed: ${err}`);
  }

  return response.json();
}

interface SpotifyTrack {
  name: string;
  artists: { name: string; id: string }[];
  album: { name: string; images: { url: string }[] };
}

interface NowPlayingResult {
  isPlaying: boolean;
  track?: SpotifyTrack;
  danceStyle: DanceStyle;
}

/**
 * Get the currently playing track from Spotify.
 */
export async function getCurrentlyPlaying(
  accessToken: string
): Promise<NowPlayingResult> {
  const response = await fetch(`${SPOTIFY_API_URL}/me/player/currently-playing`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 204 = no content (nothing playing)
  if (response.status === 204 || response.status === 202) {
    return { isPlaying: false, danceStyle: "default" };
  }

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.is_playing || !data.item) {
    return { isPlaying: false, danceStyle: "default" };
  }

  const track: SpotifyTrack = {
    name: data.item.name,
    artists: data.item.artists?.map((a: { name: string; id: string }) => ({
      name: a.name,
      id: a.id,
    })) || [],
    album: {
      name: data.item.album?.name || "",
      images: data.item.album?.images || [],
    },
  };

  // Get artist genres to determine dance style
  let danceStyle: DanceStyle = "default";
  if (track.artists.length > 0) {
    danceStyle = await getArtistDanceStyle(accessToken, track.artists[0].id);
  }

  return { isPlaying: true, track, danceStyle };
}

/**
 * Fetch artist info and map their genres to a dance style.
 */
async function getArtistDanceStyle(
  accessToken: string,
  artistId: string
): Promise<DanceStyle> {
  try {
    const response = await fetch(`${SPOTIFY_API_URL}/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return "default";

    const data = await response.json();
    const genres: string[] = data.genres || [];

    return mapGenresToDanceStyle(genres);
  } catch {
    return "default";
  }
}

/**
 * Map Spotify genre tags to our dance styles.
 * Checks genre strings for keywords and returns the best match.
 */
export function mapGenresToDanceStyle(genres: string[]): DanceStyle {
  const joined = genres.join(" ").toLowerCase();

  // Check in priority order (more specific first)
  if (
    joined.includes("classical") ||
    joined.includes("orchestra") ||
    joined.includes("symphony") ||
    joined.includes("opera")
  )
    return "classical";
  if (
    joined.includes("jazz") ||
    joined.includes("bebop") ||
    joined.includes("swing")
  )
    return "jazz";
  if (
    joined.includes("blues") ||
    joined.includes("delta") ||
    joined.includes("chicago blues")
  )
    return "blues";
  if (
    joined.includes("country") ||
    joined.includes("bluegrass") ||
    joined.includes("nashville")
  )
    return "country";
  if (
    joined.includes("folk") ||
    joined.includes("traditional") ||
    joined.includes("celtic") ||
    joined.includes("acoustic")
  )
    return "folk";
  if (
    joined.includes("r&b") ||
    joined.includes("rnb") ||
    joined.includes("soul") ||
    joined.includes("neo soul") ||
    joined.includes("motown")
  )
    return "rnb";
  if (
    joined.includes("hip hop") ||
    joined.includes("hip-hop") ||
    joined.includes("hiphop") ||
    joined.includes("rap") ||
    joined.includes("trap")
  )
    return "hiphop";
  if (
    joined.includes("electronic") ||
    joined.includes("edm") ||
    joined.includes("house") ||
    joined.includes("techno") ||
    joined.includes("trance") ||
    joined.includes("dubstep") ||
    joined.includes("drum and bass")
  )
    return "electronic";
  if (
    joined.includes("rock") ||
    joined.includes("metal") ||
    joined.includes("punk") ||
    joined.includes("grunge") ||
    joined.includes("alternative")
  )
    return "rock";
  if (
    joined.includes("pop") ||
    joined.includes("dance pop") ||
    joined.includes("synth")
  )
    return "pop";

  return "default";
}
