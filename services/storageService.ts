
import { UserAccount, DailyLog } from '../types';
import { sql, isCloudEnabled } from './neonClient';

const LOCAL_STORAGE_KEYS = {
  USERS: 'timexp_all_users',
  SESSION: 'timexp_session',
  LOGS: 'timexp_logs'
};

export const storageService = {
  isCloud: () => isCloudEnabled,

  getUserProfile: async (id: string): Promise<UserAccount | null> => {
    if (isCloudEnabled && sql) {
      try {
        const rows = await sql`SELECT * FROM profiles WHERE id = ${id}`;
        if (rows && rows.length > 0) {
          const d = rows[0];
          return {
            id: d.id,
            userId: d.user_id,
            name: d.name,
            phone: d.phone || '',
            role: d.role,
            grade: d.grade,
            specificGrade: d.specific_grade,
            weeklySchedule: d.weekly_schedule,
            xp: d.xp || 0,
            onboardingCompleted: d.onboarding_completed
          } as UserAccount;
        }
      } catch (e) { console.error("Neon Profile Fetch Error:", e); }
    }
    const localProfiles = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.USERS) || '[]');
    return localProfiles.find((u: UserAccount) => u.id === id) || null;
  },

  getUsers: async (): Promise<UserAccount[]> => {
    if (isCloudEnabled && sql) {
      try {
        const rows = await sql`SELECT * FROM profiles`;
        return rows.map(d => ({
          id: d.id,
          userId: d.user_id,
          name: d.name,
          role: d.role,
          weeklySchedule: d.weekly_schedule,
          xp: d.xp || 0,
          onboardingCompleted: d.onboarding_completed
        })) as UserAccount[];
      } catch (e) { console.error("Neon Users Fetch Error:", e); }
    }
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.USERS) || '[]');
  },

  saveUser: async (user: UserAccount): Promise<void> => {
    if (isCloudEnabled && sql) {
      try {
        await sql`
          INSERT INTO profiles (id, user_id, name, role, phone, grade, specific_grade, weekly_schedule, xp, onboarding_completed, updated_at)
          VALUES (${user.id}, ${user.userId}, ${user.name}, ${user.role}, ${user.phone}, ${user.grade}, ${user.specificGrade}, ${JSON.stringify(user.weeklySchedule)}, ${user.xp}, ${user.onboardingCompleted || false}, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            grade = EXCLUDED.grade,
            specific_grade = EXCLUDED.specific_grade,
            weekly_schedule = EXCLUDED.weekly_schedule,
            xp = EXCLUDED.xp,
            onboarding_completed = EXCLUDED.onboarding_completed,
            updated_at = NOW()
        `;
      } catch (e) { console.warn("Neon save failed, fallback to local.", e); }
    }

    const users = await storageService.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index > -1) users[index] = user;
    else users.push(user);
    localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(users));
    
    const currentSession = storageService.getSession();
    if (currentSession?.id === user.id) {
      storageService.setSession(user);
    }
  },

  getDailyLogs: async (userId: string): Promise<DailyLog[]> => {
    if (isCloudEnabled && sql) {
      try {
        const rows = await sql`SELECT * FROM daily_logs WHERE user_id = ${userId} ORDER BY date DESC`;
        return rows.map(d => ({
          id: d.id,
          userId: d.user_id,
          date: d.date,
          actualActivities: d.actual_activities,
          plannedSnapshot: d.planned_snapshot
        }));
      } catch (e) { console.error("Neon Logs Fetch Error:", e); }
    }
    const allLogs = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.LOGS) || '[]');
    return allLogs.filter((l: DailyLog) => l.userId === userId);
  },

  saveDailyLog: async (log: DailyLog): Promise<void> => {
    if (isCloudEnabled && sql) {
      try {
        await sql`
          INSERT INTO daily_logs (id, user_id, date, actual_activities, planned_snapshot)
          VALUES (${log.id}, ${log.userId}, ${log.date}, ${JSON.stringify(log.actualActivities)}, ${JSON.stringify(log.plannedSnapshot)})
          ON CONFLICT (user_id, date) DO UPDATE SET
            actual_activities = EXCLUDED.actual_activities,
            planned_snapshot = EXCLUDED.planned_snapshot
        `;
      } catch (e) { console.warn("Neon log save failed.", e); }
    }

    const allLogs = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.LOGS) || '[]');
    const index = allLogs.findIndex((l: DailyLog) => l.userId === log.userId && l.date === log.date);
    if (index > -1) allLogs[index] = log;
    else allLogs.push(log);
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGS, JSON.stringify(allLogs));
  },

  encryptPassword: (password: string): string => btoa(password),

  setSession: (user: UserAccount | null) => {
    if (user) localStorage.setItem(LOCAL_STORAGE_KEYS.SESSION, JSON.stringify(user));
    else localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION);
  },

  getSession: (): UserAccount | null => {
    const session = localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION);
    return session ? JSON.parse(session) : null;
  },

  clearAll: async () => {
    localStorage.clear();
    window.location.reload();
  }
};
