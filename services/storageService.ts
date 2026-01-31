
import { UserAccount, DailyLog } from '../types';
import { sql, isCloudEnabled } from './neonClient';

const KEYS = {
  USERS: 'txp_users',
  SESSION: 'txp_session',
  LOGS: 'txp_logs'
};

export const storageService = {
  getUsers: async (): Promise<UserAccount[]> => {
    if (isCloudEnabled && sql) {
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
          onboardingCompleted: d.onboarding_completed
        })) as UserAccount[];
      } catch (e) { console.error("Neon Fetch Error:", e); }
    }
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
  },

  getUserProfile: async (id: string): Promise<UserAccount | null> => {
    const users = await storageService.getUsers();
    return users.find(u => u.id === id) || null;
  },

  saveUser: async (user: UserAccount): Promise<void> => {
    if (isCloudEnabled && sql) {
      try {
        await sql`
          INSERT INTO profiles (id, user_id, name, role, parent_id, grade, weekly_schedule, xp, onboarding_completed, updated_at)
          VALUES (${user.id}, ${user.userId}, ${user.name}, ${user.role}, ${user.parentId || null}, ${user.grade || null}, ${JSON.stringify(user.weeklySchedule)}, ${user.xp}, ${user.onboardingCompleted || false}, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            weekly_schedule = EXCLUDED.weekly_schedule,
            xp = EXCLUDED.xp,
            onboarding_completed = EXCLUDED.onboarding_completed,
            updated_at = NOW()
        `;
      } catch (e) { console.warn("Neon Save Error:", e); }
    }
    const users = await storageService.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx > -1) users[idx] = user; else users.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    if (storageService.getSession()?.id === user.id) storageService.setSession(user);
  },

  getDailyLogs: async (userId: string): Promise<DailyLog[]> => {
    if (isCloudEnabled && sql) {
      try {
        const rows = await sql`SELECT * FROM daily_logs WHERE user_id = ${userId} ORDER BY date DESC`;
        return rows.map(d => ({
          id: d.id, userId: d.user_id, date: d.date, 
          actualActivities: d.actual_activities, plannedSnapshot: d.planned_snapshot
        }));
      } catch (e) { console.error("Log Fetch Error:", e); }
    }
    const all = JSON.parse(localStorage.getItem(KEYS.LOGS) || '[]');
    return all.filter((l: DailyLog) => l.userId === userId);
  },

  saveDailyLog: async (log: DailyLog): Promise<void> => {
    if (isCloudEnabled && sql) {
      try {
        await sql`
          INSERT INTO daily_logs (id, user_id, date, actual_activities, planned_snapshot)
          VALUES (${log.id}, ${log.userId}, ${log.date}, ${JSON.stringify(log.actualActivities)}, ${JSON.stringify(log.plannedSnapshot)})
          ON CONFLICT (user_id, date) DO UPDATE SET
            actual_activities = EXCLUDED.actual_activities, planned_snapshot = EXCLUDED.planned_snapshot
        `;
      } catch (e) { console.warn("Log Save Error:", e); }
    }
    const all = JSON.parse(localStorage.getItem(KEYS.LOGS) || '[]');
    const idx = all.findIndex((l: DailyLog) => l.userId === log.userId && l.date === log.date);
    if (idx > -1) all[idx] = log; else all.push(log);
    localStorage.setItem(KEYS.LOGS, JSON.stringify(all));
  },

  encryptPassword: (p: string) => btoa(p),
  setSession: (u: UserAccount | null) => u ? localStorage.setItem(KEYS.SESSION, JSON.stringify(u)) : localStorage.removeItem(KEYS.SESSION),
  getSession: (): UserAccount | null => {
    const s = localStorage.getItem(KEYS.SESSION);
    return s ? JSON.parse(s) : null;
  },
  clearAll: () => { localStorage.clear(); window.location.reload(); }
};
