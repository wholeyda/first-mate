/**
 * Google Calendar Service
 *
 * Handles all interactions with the Google Calendar API:
 * - Fetching events from both personal and work calendars
 * - Creating new events (time blocks)
 * - Deleting app-created events
 *
 * App-created events are tagged with an extended property
 * "firstMateManaged=true" so we can identify and manage them.
 */

import { google, calendar_v3 } from "googleapis";

// Extended property key used to tag events created by this app
const APP_TAG_KEY = "firstMateManaged";
const APP_TAG_VALUE = "true";

/**
 * Create an authenticated Google Calendar client using OAuth tokens.
 */
function getCalendarClient(accessToken: string, refreshToken: string | null) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

/**
 * Fetch all events from a calendar within a date range.
 * Returns both regular events and app-created events.
 */
export async function fetchEvents(
  accessToken: string,
  refreshToken: string | null,
  calendarId: string,
  timeMin: string, // ISO date string
  timeMax: string // ISO date string
): Promise<calendar_v3.Schema$Event[]> {
  const calendar = getCalendarClient(accessToken, refreshToken);

  const response = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true, // Expand recurring events
    orderBy: "startTime",
    maxResults: 250,
  });

  return response.data.items ?? [];
}

/**
 * Get all busy time slots from both calendars.
 * Filters out app-created events (so we don't block against our own blocks).
 * Returns a flat list of { start, end } objects.
 */
export async function getBusySlots(
  accessToken: string,
  refreshToken: string | null,
  personalCalendarId: string,
  workCalendarId: string,
  timeMin: string,
  timeMax: string
): Promise<{ start: Date; end: Date; calendarType: string }[]> {
  const [personalEvents, workEvents] = await Promise.all([
    fetchEvents(accessToken, refreshToken, personalCalendarId, timeMin, timeMax),
    fetchEvents(accessToken, refreshToken, workCalendarId, timeMin, timeMax),
  ]);

  const allEvents = [
    ...personalEvents.map((e) => ({ event: e, calendarType: "personal" })),
    ...workEvents.map((e) => ({ event: e, calendarType: "work" })),
  ];

  // Filter out events created by this app
  const externalEvents = allEvents.filter((item) => {
    const props = item.event.extendedProperties?.private;
    return !(props && props[APP_TAG_KEY] === APP_TAG_VALUE);
  });

  // Convert to busy slots
  return externalEvents
    .filter((item) => item.event.start?.dateTime && item.event.end?.dateTime)
    .map((item) => ({
      start: new Date(item.event.start!.dateTime!),
      end: new Date(item.event.end!.dateTime!),
      calendarType: item.calendarType,
    }));
}

/**
 * Create a new event on the specified calendar.
 * Tags it with an extended property so we can identify it later.
 */
export async function createEvent(
  accessToken: string,
  refreshToken: string | null,
  calendarId: string,
  summary: string,
  description: string,
  startTime: string, // ISO datetime string
  endTime: string // ISO datetime string
): Promise<calendar_v3.Schema$Event> {
  const calendar = getCalendarClient(accessToken, refreshToken);

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      description,
      start: { dateTime: startTime },
      end: { dateTime: endTime },
      // Tag this event so we know we created it
      extendedProperties: {
        private: {
          [APP_TAG_KEY]: APP_TAG_VALUE,
        },
      },
    },
  });

  return response.data;
}

/**
 * Delete an event by its Google Calendar event ID.
 * Only deletes if the event was created by this app (safety check).
 */
export async function deleteEvent(
  accessToken: string,
  refreshToken: string | null,
  calendarId: string,
  eventId: string
): Promise<void> {
  const calendar = getCalendarClient(accessToken, refreshToken);

  // Safety check: verify this is an app-created event before deleting
  const event = await calendar.events.get({ calendarId, eventId });
  const props = event.data.extendedProperties?.private;

  if (!(props && props[APP_TAG_KEY] === APP_TAG_VALUE)) {
    throw new Error("Cannot delete events not created by First Mate");
  }

  await calendar.events.delete({ calendarId, eventId });
}

/**
 * List all calendars accessible by this user.
 * Used during onboarding to let user pick work vs personal calendar.
 */
export async function listCalendars(
  accessToken: string,
  refreshToken: string | null
): Promise<calendar_v3.Schema$CalendarListEntry[]> {
  const calendar = getCalendarClient(accessToken, refreshToken);

  const response = await calendar.calendarList.list();

  return response.data.items ?? [];
}
