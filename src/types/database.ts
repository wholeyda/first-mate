/**
 * Database Types
 *
 * TypeScript interfaces matching our Supabase database schema.
 * These ensure type safety when reading/writing to the database.
 */

export interface User {
  id: string;
  email: string;
  google_access_token: string | null;
  google_refresh_token: string | null;
  work_calendar_id: string | null;
  personal_calendar_id: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string;
  estimated_hours: number;
  is_hard_deadline: boolean;
  priority: 1 | 2 | 3 | 4 | 5;
  is_work: boolean;
  status: "active" | "completed" | "archived";
  created_at: string;
}

export interface ScheduledBlock {
  id: string;
  user_id: string;
  goal_id: string;
  google_event_id: string | null;
  calendar_type: "work" | "personal";
  start_time: string;
  end_time: string;
  is_completed: boolean;
}

export interface ProductivityScore {
  id: string;
  user_id: string;
  month: number;
  year: number;
  total_points: number;
  created_at: string;
}

export interface Pirate {
  id: string;
  user_id: string;
  goal_id: string;
  trait_description: string;
  image_key: string;
  month: number;
  year: number;
  created_at: string;
}
