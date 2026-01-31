
import { GradeLevel, WeeklySchedule, ActivityCategory, ScheduleItem } from '../types';

export interface GradeTemplate {
  schedule: WeeklySchedule;
  name: string;
  xp: number;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const getSpecificSubjects = (level: GradeLevel, gradeNum: number): string[] => {
  if (level === GradeLevel.ELEMENTARY) {
    if (gradeNum <= 2) return ['Story Time', 'Phonics', 'Basic Counting', 'Drawing', 'Recess', 'Nature Study'];
    return ['Reading Mastery', 'Creative Writing', 'Multiplication', 'World Cultures', 'Art Studio', 'Science Lab'];
  }
  if (level === GradeLevel.MIDDLE) {
    return ['Algebra Foundations', 'Earth & Space Science', 'Civics', 'English Literature', 'Robotics Club', 'Physical Education'];
  }
  if (level === GradeLevel.HIGH) {
    if (gradeNum >= 11) return ['AP Calculus', 'Physics Honors', 'Advanced Psychology', 'World Literature', 'SAT/ACT Prep', 'Organic Chemistry'];
    return ['Geometry', 'Biology', 'US History', 'Foreign Language (Spanish)', 'Debate Team', 'Track & Field'];
  }
  return ['Advanced Algorithms', 'Quantum Mechanics', 'Social Psychology Research', 'Thesis Workshop', 'Machine Learning', 'Ethics in Tech'];
};

export const generateScheduleForGrade = (level: GradeLevel, gradeNum: number): WeeklySchedule => {
  const subjects = getSpecificSubjects(level, gradeNum);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const schedule: WeeklySchedule = {};

  days.forEach(day => {
    const isWeekend = day === 'Saturday' || day === 'Sunday';
    const items: ScheduleItem[] = [];

    if (!isWeekend) {
      // 1. Morning School Session
      items.push({
        id: generateId(),
        category: ActivityCategory.STUDYING,
        startTime: '08:30',
        endTime: '11:30',
        label: `${subjects[0]} Session`,
        plannedSubject: subjects[0]
      });

      // 2. Midday Session
      items.push({
        id: generateId(),
        category: ActivityCategory.STUDYING,
        startTime: '12:30',
        endTime: '15:00',
        label: `${subjects[1]} Lab`,
        plannedSubject: subjects[1]
      });

      // 3. Extracurricular / Exercise
      if (['Tuesday', 'Thursday'].includes(day)) {
        items.push({
          id: generateId(),
          category: ActivityCategory.EXERCISE,
          startTime: '16:00',
          endTime: '17:30',
          label: level === GradeLevel.ELEMENTARY ? 'Park Play' : 'Team Practice'
        });
      } else {
        items.push({
          id: generateId(),
          category: ActivityCategory.READING,
          startTime: '16:30',
          endTime: '17:30',
          label: 'Knowledge Expansion (Reading)'
        });
      }

      // 4. Evening Focus
      items.push({
        id: generateId(),
        category: ActivityCategory.STUDYING,
        startTime: '19:00',
        endTime: '20:30',
        label: 'Daily Mission Review',
        plannedSubject: subjects[2]
      });
    } else {
      // Weekend Schedule
      items.push({
        id: generateId(),
        category: ActivityCategory.REST,
        startTime: '10:00',
        endTime: '12:00',
        label: 'System Maintenance (Deep Sleep)'
      });
      items.push({
        id: generateId(),
        category: ActivityCategory.PLAYTIME,
        startTime: '14:00',
        endTime: '18:00',
        label: 'Social Simulation (Hangout)'
      });
      if (day === 'Sunday') {
        items.push({
          id: generateId(),
          category: ActivityCategory.CHORES,
          startTime: '19:00',
          endTime: '20:00',
          label: 'Quarterly Base Cleanup'
        });
      }
    }

    schedule[day] = items;
  });

  return schedule;
};

export const GRADE_TEMPLATES: Record<GradeLevel, (gradeNum: number) => GradeTemplate> = {
  [GradeLevel.ELEMENTARY]: (n) => ({ name: 'Junior Scout', xp: 500, schedule: generateScheduleForGrade(GradeLevel.ELEMENTARY, n) }),
  [GradeLevel.MIDDLE]: (n) => ({ name: 'Mission Specialist', xp: 1500, schedule: generateScheduleForGrade(GradeLevel.MIDDLE, n) }),
  [GradeLevel.HIGH]: (n) => ({ name: 'Senior Commander', xp: 4000, schedule: generateScheduleForGrade(GradeLevel.HIGH, n) }),
  [GradeLevel.UNIVERSITY]: (n) => ({ name: 'Elite Strategist', xp: 8000, schedule: generateScheduleForGrade(GradeLevel.UNIVERSITY, n) }),
};
