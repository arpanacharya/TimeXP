
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

export const STUDY_SUBJECTS = [
  'Math', 'Science', 'History', 'English', 'Geography', 
  'Art', 'Music', 'Physical Education', 'Computer Science', 
  'Foreign Language', 'Social Studies', 'Physics', 'Biology', 
  'Chemistry', 'Calculus', 'Literature', 'Psychology', 'Economics'
];

export enum UserRole {
  STUDENT = 'STUDENT',
  PARENT = 'PARENT'
}

export interface UserAccount {
  id: string;
  userId: string;
  name: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  parentId?: string;
  childrenIds?: string[];
  weeklySchedule: WeeklySchedule;
  xp: number;
  grade?: GradeLevel;
  specificGrade?: number;
  onboardingCompleted?: boolean;
}

export interface ScheduleItem {
  id: string;
  category: ActivityCategory;
  startTime: string; 
  endTime: string; 
  label: string;
  plannedSubject?: string; 
  actualSubject?: string;  
  topic?: string; 
  notes?: string;          
  completed?: boolean;
  reminderMinutes?: number;
  plannedId?: string; 
  status?: 'LOGGED' | 'PENDING';
}

export interface WeeklySchedule {
  [day: string]: ScheduleItem[];
}

export interface DailyLog {
  id: string;
  userId: string;
  date: string; 
  actualActivities: ScheduleItem[];
  plannedSnapshot: ScheduleItem[];
}
