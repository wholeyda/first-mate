/**
 * Notification System
 *
 * Manages browser push notifications using the Notification API.
 * Schedules three types of notifications:
 * - Daily end-of-day review reminder
 * - Sunday 10am weekly planning
 * - Motivational nudges (2-3x per week)
 */

/**
 * Request notification permission from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") return true;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

/**
 * Register the service worker for push notifications.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}

/**
 * Schedule a local notification using setTimeout.
 * For v1, we use local scheduling. Push server can be added later.
 */
export function scheduleLocalNotification(
  title: string,
  body: string,
  delayMs: number,
  tag: string
) {
  setTimeout(() => {
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/icon-192.png",
        tag,
      });
    }
  }, delayMs);
}

/**
 * Calculate milliseconds until a specific time today or tomorrow.
 */
function msUntilTime(targetHour: number, targetMinute: number = 0): number {
  const now = new Date();
  const target = new Date();
  target.setHours(targetHour, targetMinute, 0, 0);

  // If the time has passed today, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
}

/**
 * Schedule all recurring notifications.
 * Called once when the dashboard loads.
 */
export function scheduleAllNotifications() {
  // Daily end-of-day review at 6pm
  const msUntil6pm = msUntilTime(18, 0);
  scheduleLocalNotification(
    "⚓ Review your day, Captain",
    "How did today go? Mark your completed tasks and grow your crew!",
    msUntil6pm,
    "daily-review"
  );

  // Check if today is Sunday for weekly planning
  const now = new Date();
  if (now.getDay() === 0) {
    // Sunday
    const msUntil10am = msUntilTime(10, 0);
    scheduleLocalNotification(
      "⚓ Plan your week ahead",
      "Sunday morning — perfect time to chart your course for the week!",
      msUntil10am,
      "weekly-plan"
    );
  }

  // Motivational nudge — schedule for a random time tomorrow afternoon
  const msUntilTomorrow2pm = msUntilTime(14, 0);
  const randomOffset = Math.random() * 3 * 60 * 60 * 1000; // Random 0-3 hours
  scheduleLocalNotification(
    "🏴‍☠️ Your crew is waiting!",
    "You've got tasks on deck. Keep the momentum going!",
    msUntilTomorrow2pm + randomOffset,
    "motivational"
  );
}
