
import { UserAccount, DailyLog, UserRole } from '../types';
import { supabase, isCloudEnabled } from './supabaseClient';

const LOCAL_STORAGE_KEYS = {
  PROFILE: 'timexp_profile',
  LOGS: 'timexp_logs',
  USERS: 'timexp_all_users',
  SESSION: 'timexp_session'
};

export const storageService = {
  isCloud: () => isCloudEnabled,

  getUserProfile: async (id: string): Promise<UserAccount | null> => {
    if (isCloudEnabled && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          name: data.name,
          phone: data.phone || '',
          passwordHash: data.password_hash || '',
          role: data.role,
          parentId: data.parent_id,
          childrenIds: data.children_ids || [],
          weeklySchedule: data.weekly_schedule,
          xp: data.xp,
          grade: data.grade,
          specificGrade: data.specific_grade,
        } as UserAccount;
      }
    }

    // Fallback to Local Storage
    const localProfiles = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.USERS) || '[]');
    return localProfiles.find((u: UserAccount) => u.id === id) || null;
  },

  getUsers: async (): Promise<UserAccount[]> => {
    if (isCloudEnabled && supabase) {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data) {
        return data.map(d => ({
          id: d.id,
          userId: d.user_id,
          name: d.name,
          role: d.role,
          weeklySchedule: d.weekly_schedule,
          xp: d.xp,
          parentId: d.parent_id
        })) as UserAccount[];
      }
    }
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.USERS) || '[]');
  },

  saveUser: async (user: UserAccount): Promise<void> => {
    if (isCloudEnabled && supabase) {
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          user_id: user.userId,
          name: user.name,
          role: user.role,
          phone: user.phone,
          grade: user.grade,
          specific_grade: user.specificGrade,
          weekly_schedule: user.weeklySchedule,
          xp: user.xp,
          updated_at: new Date()
        });
      } catch (e) { console.warn("Cloud save failed, relying on local."); }
    }

    // Always update Local Storage as secondary/fallback
    const users = await storageService.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index > -1) users[index] = user;
    else users.push(user);
    localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(users));
    
    // Update current session if it's the same user
    const currentSession = storageService.getSession();
    if (currentSession?.id === user.id) {
      storageService.setSession(user);
    }
  },

  getDailyLogs: async (userId: string): Promise<DailyLog[]> => {
    if (isCloudEnabled && supabase) {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      
      if (!error && data) {
        return data.map(d => ({
          id: d.id,
          userId: d.user_id,
          date: d.date,
          actualActivities: d.actual_activities,
          plannedSnapshot: d.planned_snapshot
        }));
      }
    }
    const allLogs = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.LOGS) || '[]');
    return allLogs.filter((l: DailyLog) => l.userId === userId);
  },

  saveDailyLog: async (log: DailyLog): Promise<void> => {
    if (isCloudEnabled && supabase) {
      try {
        await supabase.from('daily_logs').upsert({
          id: log.id.includes('demo') || log.id.includes('init') ? undefined : log.id,
          user_id: log.userId,
          date: log.date,
          actual_activities: log.actualActivities,
          planned_snapshot: log.plannedSnapshot
        }, { onConflict: 'user_id, date' });
      } catch (e) { console.warn("Cloud log save failed."); }
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
    if (isCloudEnabled && supabase) await supabase.auth.signOut();
    localStorage.clear();
    window.location.reload();
  }
};
