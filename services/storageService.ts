
import { UserAccount, DailyLog } from '../types';
import { sql, isCloudEnabled } from './neonClient';

const KEYS = {
  SESSION: 'txp_session'
};

/**
 * Storage Service
 * 
 * Exclusively uses Neon Database for persistent data (Users, Logs).
 * Cross-device sync requires this cloud connection to be active.
 */
export const storageService = {
  /**
   * Initializes the database schema.
   * Creates the profiles and daily_logs tables if they do not already exist.
   */
  initializeDatabase: async (): Promise<void> => {
    if (!isCloudEnabled || !sql) return;

    try {
      // Create Profiles Table
      await sql`
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          user_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          parent_id TEXT,
          grade TEXT,
          weekly_schedule JSONB DEFAULT '{}',
          xp INTEGER DEFAULT 0,
          onboarding_completed BOOLEAN DEFAULT FALSE,
          password_hash TEXT NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      // Create Daily Logs Table
      await sql`
        CREATE TABLE IF NOT EXISTS daily_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          date TEXT NOT NULL,
          actual_activities JSONB DEFAULT '[]',
          planned_snapshot JSONB DEFAULT '[]',
          UNIQUE(user_id, date)
        );
      `;
      console.log("🚀 Mission Control: Database schema verified/initialized.");
    } catch (e) {
      console.error("Failed to initialize database schema:", e);
      throw new Error("Could not initialize database tables. Check your Neon permissions.");
    }
  },

  getUsers: async (): Promise<UserAccount[]> => {
    if (!isCloudEnabled || !sql) {
      throw new Error("Mission Control Link Offline: Database URL not configured in environment.");
    }

    try {
      const rows = await sql`SELECT * FROM profiles`;
      return rows.map(d => ({
        id: d.id,
        userId: d.user_id,
        name: d.name,
        role: d.role,
        parentId: d.parent_id,
        weeklySchedule: d.weekly_schedule,
        xp: d.xp || 0,
        grade: d.grade,
        passwordHash: d.password_hash,
        onboardingCompleted: d.onboarding_completed
      })) as UserAccount[];
    } catch (e) { 
      console.error("Neon Fetch Error:", e);
      throw new Error("Network disruption: Unable to reach the squad database.");
    }
  },

  getUserProfile: async (id: string): Promise<UserAccount | null> => {
    const users = await storageService.getUsers();
    return users.find(u => u.id === id) || null;
  },

  saveUser: async (user: UserAccount): Promise<void> => {
    if (!isCloudEnabled || !sql) return;

    try {
      await sql`
        INSERT INTO profiles (id, user_id, name, role, parent_id, grade, weekly_schedule, xp, onboarding_completed, password_hash, updated_at)
        VALUES (${user.id}, ${user.userId}, ${user.name}, ${user.role}, ${user.parentId || null}, ${user.grade || null}, ${JSON.stringify(user.weeklySchedule)}, ${user.xp}, ${user.onboardingCompleted || false}, ${user.passwordHash}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          user_id = EXCLUDED.user_id,
          password_hash = EXCLUDED.password_hash,
          grade = EXCLUDED.grade,
          weekly_schedule = EXCLUDED.weekly_schedule,
          xp = EXCLUDED.xp,
          onboarding_completed = EXCLUDED.onboarding_completed,
          updated_at = NOW()
      `;
    } catch (e) { 
      console.warn("Neon Save Error:", e);
      throw new Error("Sync failed: Profile could not be uploaded to cloud.");
    }
    
    // Update local session if this is the currently logged in user
    const session = storageService.getSession();
    if (session && session.id === user.id) {
      storageService.setSession(user);
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    if (!isCloudEnabled || !sql) return;

    try {
      await sql`DELETE FROM profiles WHERE id = ${id}`;
      await sql`DELETE FROM daily_logs WHERE user_id = ${id}`;
    } catch (e) { 
      console.warn("Neon Delete Error:", e);
      throw new Error("Failed to purge cloud records.");
    }
    
    const session = storageService.getSession();
    if (session && session.id === id) {
      storageService.setSession(null);
    }
  },

  getDailyLogs: async (userId: string): Promise<DailyLog[]> => {
    if (!isCloudEnabled || !sql) return [];

    try {
      const rows = await sql`SELECT * FROM daily_logs WHERE user_id = ${userId} ORDER BY date DESC`;
      return rows.map(d => ({
        id: d.id, userId: d.user_id, date: d.date, 
        actualActivities: d.actual_activities, plannedSnapshot: d.planned_snapshot
      }));
    } catch (e) { 
      console.error("Log Fetch Error:", e);
      return [];
    }
  },

  saveDailyLog: async (log: DailyLog): Promise<void> => {
    if (!isCloudEnabled || !sql) return;

    try {
      await sql`
        INSERT INTO daily_logs (id, user_id, date, actual_activities, planned_snapshot)
        VALUES (${log.id}, ${log.userId}, ${log.date}, ${JSON.stringify(log.actualActivities)}, ${JSON.stringify(log.plannedSnapshot)})
        ON CONFLICT (user_id, date) DO UPDATE SET
          actual_activities = EXCLUDED.actual_activities, 
          planned_snapshot = EXCLUDED.planned_snapshot
      `;
    } catch (e) { 
      console.warn("Log Save Error:", e);
      throw new Error("Mission data could not be synced.");
    }
  },

  encryptPassword: (p: string) => btoa(p),
  decryptPassword: (p: string) => atob(p),
  
  // Session management remains in localStorage for local device state (auth persistence)
  setSession: (u: UserAccount | null) => u ? localStorage.setItem(KEYS.SESSION, JSON.stringify(u)) : localStorage.removeItem(KEYS.SESSION),
  getSession: (): UserAccount | null => {
    const s = localStorage.getItem(KEYS.SESSION);
    try {
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  },
  
  clearAll: () => { 
    localStorage.clear(); 
    window.location.reload(); 
  }
};
