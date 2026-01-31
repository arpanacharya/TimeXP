
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { UserAccount, UserRole, GradeLevel, DailyLog } from '../types';
import { GRADE_TEMPLATES } from '../services/demoData';

export const TestBed: React.FC = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [showGradeSelector, setShowGradeSelector] = useState(false);

  const performSeed = async (grade: GradeLevel, specificGrade: number) => {
    setIsSeeding(true);
    setShowGradeSelector(false);
    try {
      const parentId = 'p-demo';
      const childId = 'c-demo';
      const template = GRADE_TEMPLATES[grade](specificGrade);

      const parentUser: UserAccount = {
        id: parentId,
        userId: 'mentor',
        name: 'Mission Control',
        phone: '555-0000',
        passwordHash: storageService.encryptPassword('demo123'),
        role: UserRole.PARENT,
        childrenIds: [childId],
        weeklySchedule: template.schedule,
        xp: 1500
      };

      const childUser: UserAccount = {
        id: childId,
        userId: 'student',
        name: `${template.name} Demo`,
        phone: '555-0001',
        passwordHash: storageService.encryptPassword('demo123'),
        role: UserRole.STUDENT,
        parentId: parentId,
        weeklySchedule: template.schedule,
        xp: template.xp,
        grade,
        specificGrade
      };

      await storageService.saveUser(parentUser);
      await storageService.saveUser(childUser);

      const logPromises = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
        const plannedItems = template.schedule[dayOfWeek] || [];

        const log: DailyLog = {
          id: `demo-log-${childId}-${dateStr}`,
          userId: childId,
          date: dateStr,
          actualActivities: plannedItems.slice(0, Math.floor(plannedItems.length * 0.9) + 1).map(p => ({
            ...p,
            id: `actual-${p.id}-${dateStr}`,
            plannedId: p.id,
            completed: true,
            notes: 'Historical data synced.'
          })),
          plannedSnapshot: plannedItems
        };
        logPromises.push(storageService.saveDailyLog(log));
      }

      await Promise.all(logPromises);
      alert(`Simulation Ready!\nUser: student\nPass: demo123`);
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Seeding error.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 group">
      <div className="hidden group-hover:flex flex-col gap-2 bg-slate-900 p-4 rounded-3xl shadow-2xl border-2 border-indigo-500 mb-4 w-64">
        {showGradeSelector ? (
          <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
            <button onClick={() => performSeed(GradeLevel.ELEMENTARY, 3)} className="w-full bg-slate-800 text-white p-3 rounded-xl text-[10px] hover:bg-indigo-600 uppercase text-left">🐣 Grade 3 (Elementary)</button>
            <button onClick={() => performSeed(GradeLevel.MIDDLE, 7)} className="w-full bg-slate-800 text-white p-3 rounded-xl text-[10px] hover:bg-indigo-600 uppercase text-left">🚀 Grade 7 (Middle)</button>
            <button onClick={() => performSeed(GradeLevel.HIGH, 12)} className="w-full bg-slate-800 text-white p-3 rounded-xl text-[10px] hover:bg-indigo-600 uppercase text-left">☄️ Grade 12 (High School)</button>
            <button onClick={() => performSeed(GradeLevel.UNIVERSITY, 2)} className="w-full bg-slate-800 text-white p-3 rounded-xl text-[10px] hover:bg-indigo-600 uppercase text-left">🏛️ Year 2 (University)</button>
            <button onClick={() => setShowGradeSelector(false)} className="text-[9px] text-slate-500 font-black uppercase text-center mt-2">Back</button>
          </div>
        ) : (
          <>
            <button onClick={() => setShowGradeSelector(true)} className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-black text-xs hover:bg-indigo-500 uppercase tracking-widest text-left">🚀 Seed Scenario</button>
            <button onClick={() => storageService.clearAll()} className="w-full bg-red-900/50 text-red-400 py-3 px-6 rounded-xl font-black text-xs hover:bg-red-800 transition uppercase tracking-widest text-left">☢️ System Wipe</button>
          </>
        )}
      </div>
      <button className="w-14 h-14 bg-slate-900 text-indigo-500 rounded-2xl flex items-center justify-center shadow-2xl border-2 border-slate-800 transition-transform active:scale-95">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>
      </button>
    </div>
  );
};
