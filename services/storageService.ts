
import { UserAccount, DailyLog } from '../types';
import { supabase } from './supabaseClient';

export const storageService = {
  getUserProfile: async (id: string): Promise<UserAccount | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    
    // Explicitly map snake_case database fields to camelCase UserAccount properties
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
  },

  // Added getUsers to fix error in components/FamilyManagement.tsx (Line 26)
  getUsers: async (): Promise<UserAccount[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    
    if (error) return [];
    
    // Map snake_case database fields to camelCase UserAccount properties for all users
    return (data || []).map(d => ({
      id: d.id,
      userId: d.user_id,
      name: d.name,
      phone: d.phone || '',
      passwordHash: d.password_hash || '',
      role: d.role,
      parentId: d.parent_id,
      childrenIds: d.children_ids || [],
      weeklySchedule: d.weekly_schedule,
      xp: d.xp,
      grade: d.grade,
      specificGrade: d.specific_grade,
    })) as UserAccount[];
  },

  saveUser: async (user: UserAccount): Promise<void> => {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        user_id: user.userId,
        name: user.name,
        role: user.role,
        phone: user.phone,
        password_hash: user.passwordHash,
        parent_id: user.parentId,
        children_ids: user.childrenIds,
        grade: user.grade,
        specific_grade: user.specificGrade,
        weekly_schedule: user.weeklySchedule,
        xp: user.xp,
        updated_at: new Date()
      });
    
    if (error) throw error;
  },

  getDailyLogs: async (userId: string): Promise<DailyLog[]> => {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) return [];
    return (data || []).map(d => ({
      id: d.id,
      userId: d.user_id,
      date: d.date,
      actualActivities: d.actual_activities,
      plannedSnapshot: d.planned_snapshot
    }));
  },

  saveDailyLog: async (log: DailyLog): Promise<void> => {
    const { error } = await supabase
      .from('daily_logs')
      .upsert({
        id: log.id.includes('init') ? undefined : log.id,
        user_id: log.userId,
        date: log.date,
        actual_activities: log.actualActivities,
        planned_snapshot: log.plannedSnapshot
      }, { onConflict: 'user_id, date' });
    
    if (error) throw error;
  },

  // Added encryptPassword to fix errors in components/FamilyManagement.tsx (Line 41) and components/TestBed.tsx (Lines 24, 36)
  encryptPassword: (password: string): string => {
    // Placeholder encryption (Base64) for simulation and demonstration purposes
    return btoa(password);
  },

  setSession: (user: any) => {
    // Supabase handles sessions automatically via internal mechanisms
  },

  getSession: () => {
    // Managed by Supabase internally. Consumed via supabase.auth.getSession()
    return null; 
  },

  clearAll: async () => {
    await supabase.auth.signOut();
    window.location.reload();
  }
};
