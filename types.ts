
export enum ActivityCategory {
  STUDYING = 'STUDYING',
  READING = 'READING',
  PLAYTIME = 'PLAYTIME',
  EXERCISE = 'EXERCISE',
  CHORES = 'CHORES',
  REST = 'REST',
  OTHER = 'OTHER'
}

export enum GradeLevel {
  ELEMENTARY = 'ELEMENTARY',
  MIDDLE = 'MIDDLE',
  HIGH = 'HIGH',
  UNIVERSITY = 'UNIVERSITY'
}

export enum UserRole {
  STUDENT = 'STUDENT',
  PARENT = 'PARENT'
}

// Added plannedSubject and reminderMinutes to resolve errors in ScheduleEditor, App, and demoData
export interface ScheduleItem {
  id: string;
  category: ActivityCategory;
  startTime: string; 
  endTime: string; 
  label: string;
  plannedId?: string; 
  completed?: boolean;
  status?: 'LOGGED' | 'PENDING';
  notes?: string;
  plannedSubject?: string;
  reminderMinutes?: number;
}

export interface WeeklySchedule {
  [day: string]: ScheduleItem[];
}

// Added phone, childrenIds, and specificGrade to resolve errors in FamilyManagement and TestBed
export interface UserAccount {
  id: string;
  userId: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  parentId?: string;
  weeklySchedule: WeeklySchedule;
  xp: number;
  grade?: GradeLevel;
  onboardingCompleted?: boolean;
  phone?: string;
  childrenIds?: string[];
  specificGrade?: number;
}

export interface DailyLog {
  id: string;
  userId: string;
  date: string; 
  actualActivities: ScheduleItem[];
  plannedSnapshot: ScheduleItem[];
}
