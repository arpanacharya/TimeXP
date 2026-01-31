
import { UserAccount, DailyLog } from '../types.ts';
import { sql, isCloudEnabled } from './neonClient.ts';

const KEYS = {
  SESSION: 'txp_session'
};

/**
 * Storage Service - Version 3
 * 
 * This version uses 'txp_v3_profiles' to ensure any old, broken 'profiles' 
 * tables are completely ignored.
 */
export const storageService = {
  initializeDatabase: async (): Promise<void> => {
    if (!isCloudEnabled || !sql) return;

    try {
      // Create Profiles Table V3
      await sql`
        CREATE TABLE IF NOT EXISTS txp_v3_profiles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          parent_id TEXT,
          grade TEXT,
          weekly_schedule JSONB DEFAULT '{}'::jsonb,
          xp INTEGER DEFAULT 0,
          onboarding_completed BOOLEAN DEFAULT FALSE,
          password_hash TEXT NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      // Create Daily Logs Table V3
      await sql`
        CREATE TABLE IF NOT EXISTS txp_v3_daily_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES txp_v3_profiles(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          actual_activities JSONB DEFAULT '[]'::jsonb,
          planned_snapshot JSONB DEFAULT '[]'::jsonb,
          UNIQUE(user_id, date)
        );
      `;
      console.log("🚀 MISSION CONTROL: V3 ONLINE - Database link established.");
    } catch (e) {
      console.error("CRITICAL: Database V3 initialization failed:", e);
      throw e;
    }
  },

  getUsers: async (): Promise<UserAccount[]> => {
    if (!isCloudEnabled || !sql) return [];
    try {
      const rows = await sql`SELECT * FROM txp_v3_profiles`;
      return rows.map(d => ({
        id: d.id,
        userId: d.id,
        name: d.name,
        role: d.role,
        parentId: d.parent_id,
        weeklySchedule: typeof d.weekly_schedule === 'string' ? JSON.parse(d.weekly_schedule) : d.weekly_schedule,
        xp: d.xp || 0,
        grade: d.grade,
        passwordHash: d.password_hash,
        onboardingCompleted: d.onboarding_completed
      })) as UserAccount[];
    } catch (e) { 
      console.error("Neon V3 Fetch Error:", e);
      throw new Error("Unable to reach the squad database.");
    }
  },

  saveUser: async (user: UserAccount): Promise<void> => {
    if (!isCloudEnabled || !sql) return;

    const cleanId = user.userId.toLowerCase().trim();
    const scheduleJson = JSON.stringify(user.weeklySchedule || {});

    try {
      await sql`
        INSERT INTO txp_v3_profiles (id, name, role, parent_id, grade, weekly_schedule, xp, onboarding_completed, password_hash, updated_at)
        VALUES (
          ${cleanId}, 
          ${user.name}, 
          ${user.role}, 
          ${user.parentId || null}, 
          ${user.grade || null}, 
          ${scheduleJson}, 
          ${user.xp || 0}, 
          ${user.onboardingCompleted || false}, 
          ${user.passwordHash}, 
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          password_hash = EXCLUDED.password_hash,
          grade = EXCLUDED.grade,
          weekly_schedule = EXCLUDED.weekly_schedule,
          xp = EXCLUDED.xp,
          onboarding_completed = EXCLUDED.onboarding_completed,
          updated_at = NOW()
      `;
    } catch (e: any) { 
      console.error("Neon V3 Save Error:", e);
      throw new Error(`Sync failed: ${e.message}`);
    }
    
    const session = storageService.getSession();
    if (session && (session.userId === user.userId || session.id === user.id)) {
      storageService.setSession(user);
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    if (!isCloudEnabled || !sql) return;
    try {
      await sql`DELETE FROM txp_v3_profiles WHERE id = ${id}`;
    } catch (e) { 
      console.error("Neon V3 Delete Error:", e);
      throw new Error("Failed to purge cloud records.");
    }
    const session = storageService.getSession();
    if (session && session.id === id) storageService.setSession(null);
  },

  getDailyLogs: async (userId: string): Promise<DailyLog[]> => {
    if (!isCloudEnabled || !sql) return [];
    try {
      const rows = await sql`SELECT * FROM txp_v3_daily_logs WHERE user_id = ${userId} ORDER BY date DESC`;
      return rows.map(d => ({
        id: d.id, 
        userId: d.user_id, 
        date: d.date, 
        actualActivities: typeof d.actual_activities === 'string' ? JSON.parse(d.actual_activities) : d.actual_activities, 
        plannedSnapshot: typeof d.planned_snapshot === 'string' ? JSON.parse(d.planned_snapshot) : d.planned_snapshot
      }));
    } catch (e) { 
      console.error("Log Fetch Error V3:", e);
      return [];
    }
  },

  saveDailyLog: async (log: DailyLog): Promise<void> => {
    if (!isCloudEnabled || !sql) return;
    
    const actualJson = JSON.stringify(log.actualActivities || []);
    const plannedJson = JSON.stringify(log.plannedSnapshot || []);

    try {
      await sql`
        INSERT INTO txp_v3_daily_logs (id, user_id, date, actual_activities, planned_snapshot)
        VALUES (${log.id}, ${log.userId}, ${log.date}, ${actualJson}, ${plannedJson})
        ON CONFLICT (user_id, date) DO UPDATE SET
          actual_activities = EXCLUDED.actual_activities, 
          planned_snapshot = EXCLUDED.planned_snapshot
      `;
    } catch (e: any) { 
      console.error("Log Save Error V3:", e);
      throw new Error(`Mission telemetry sync failed: ${e.message}`);
    }
  },

  encryptPassword: (p: string) => btoa(p),
  decryptPassword: (p: string) => atob(p),
  
  setSession: (u: UserAccount | null) => u ? localStorage.setItem(KEYS.SESSION, JSON.stringify(u)) : localStorage.removeItem(KEYS.SESSION),
  getSession: (): UserAccount | null => {
    const s = localStorage.getItem(KEYS.SESSION);
    try { return s ? JSON.parse(s) : null; } catch { return null; }
  },
  
  clearAll: () => { 
    localStorage.clear(); 
    window.location.reload(); 
  }
};
