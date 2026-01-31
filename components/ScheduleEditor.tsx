
import React, { useState, useMemo, useEffect } from 'react';
import { UserAccount, WeeklySchedule, ScheduleItem, ActivityCategory, UserRole } from '../types';
import { storageService } from '../services/storageService';

interface Props {
  user: UserAccount;
  onUpdate: (user: UserAccount) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const CATEGORIES = Object.values(ActivityCategory);
const DURATIONS = [30, 45, 60, 90, 120];

export const ScheduleEditor: React.FC<Props> = ({ user, onUpdate }) => {
  const [activeUser, setActiveUser] = useState<UserAccount>(user);
  const [children, setChildren] = useState<UserAccount[]>([]);
  const [schedule, setSchedule] = useState<WeeklySchedule>(user.weeklySchedule);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [isSaving, setIsSaving] = useState(false);

  const isParentView = user.role === UserRole.PARENT;

  // Fetch children if parent
  useEffect(() => {
    if (isParentView) {
      storageService.getUsers().then(users => {
        const mySquad = users.filter(u => u.parentId === user.id);
        setChildren(mySquad);
        if (mySquad.length > 0 && activeUser.id === user.id) {
          setActiveUser(mySquad[0]);
          setSchedule(mySquad[0].weeklySchedule);
        }
      });
    }
  }, [user.id, isParentView]);

  // Update local schedule when active user changes
  useEffect(() => {
    setSchedule(activeUser.weeklySchedule);
  }, [activeUser]);

  const addItem = () => {
    const newItem: ScheduleItem = {
      id: Math.random().toString(36).substr(2, 9),
      category: ActivityCategory.STUDYING,
      startTime: '08:00',
      endTime: '09:00',
      label: 'New Task',
      plannedSubject: 'General Study',
      reminderMinutes: 10
    };
    setSchedule({ ...schedule, [selectedDay]: [...(schedule[selectedDay] || []), newItem] });
  };

  const updateItem = (itemId: string, updates: Partial<ScheduleItem>) => {
    const dayItems = (schedule[selectedDay] || []).map(item => item.id === itemId ? { ...item, ...updates } : item);
    setSchedule({ ...schedule, [selectedDay]: dayItems });
  };

  const applyDuration = (itemId: string, startTime: string, mins: number) => {
    const [h, m] = startTime.split(':').map(Number);
    const date = new Date(); 
    date.setHours(h);
    date.setMinutes(m + mins);
    const endTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    updateItem(itemId, { endTime });
  };

  const cloneDay = () => {
    const nextDay = DAYS[(DAYS.indexOf(selectedDay) + 1) % 7];
    const cloned = (schedule[selectedDay] || []).map(item => ({ ...item, id: Math.random().toString(36).substr(2, 9) }));
    setSchedule({ ...schedule, [nextDay]: cloned });
    setSelectedDay(nextDay);
  };

  const removeItem = (itemId: string) => {
    setSchedule({ ...schedule, [selectedDay]: (schedule[selectedDay] || []).filter(item => item.id !== itemId) });
  };

  const getDurationString = (start: string, end: string) => {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let total = (eH * 60 + eM) - (sH * 60 + sM);
    if (total < 0) total += 1440;
    const hrs = Math.floor(total / 60);
    const mins = total % 60;
    return `${hrs > 0 ? hrs + 'h ' : ''}${mins > 0 ? mins + 'm' : hrs === 0 ? '0m' : ''}`;
  };

  const conflicts = useMemo(() => {
    const items = schedule[selectedDay] || [];
    const ids = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        if ((a.startTime >= b.startTime && a.startTime < b.endTime) || (b.startTime >= a.startTime && b.startTime < a.endTime)) {
          ids.add(a.id); ids.add(b.id);
        }
      }
    }
    return ids;
  }, [schedule, selectedDay]);

  const save = async () => {
    setIsSaving(true);
    try {
      const updatedUser = { ...activeUser, weeklySchedule: schedule };
      await storageService.saveUser(updatedUser);
      
      if (activeUser.id === user.id) {
        onUpdate(updatedUser);
      } else {
        setActiveUser(updatedUser);
      }
      alert(`Schedule for ${activeUser.name} has been deployed! 📡`);
    } catch (err) {
      alert("Failed to sync schedule.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isParentView && children.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8 bg-white rounded-[4rem] shadow-2xl border border-slate-100">
        <div className="text-8xl">🗺️</div>
        <h2 className="text-4xl font-black tracking-tighter">Planner Access Restricted</h2>
        <p className="text-slate-500 font-bold max-w-md mx-auto">You need squad members to manage schedules. Recruit them in the Squad Hub.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 fade-in">
      {/* Personnel Selector for Parents */}
      {isParentView && (
        <div className="flex flex-col items-center gap-4 mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Updating Schedule For</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide p-2 bg-slate-100 rounded-full border border-slate-200">
            {children.map(child => (
              <button 
                key={child.id}
                onClick={() => setActiveUser(child)}
                className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeUser.id === child.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}
              >
                {child.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-end gap-6 px-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Weekly Schedule</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">{activeUser.name}'s {selectedDay}</span>
            <button onClick={cloneDay} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-indigo-600">Clone to Next Day →</button>
          </div>
        </div>
        <button 
          onClick={save} 
          disabled={isSaving}
          className="w-full md:w-auto px-10 py-4 bg-indigo-600 text-white rounded-[2rem] font-black shadow-2xl hover:bg-indigo-700 hover:scale-105 transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3"
        >
          {isSaving ? "Syncing..." : isParentView ? "Deploy Schedule 📡" : "Lock Schedule 🔒"}
        </button>
      </div>

      <div className="bg-white p-4 rounded-[2.5rem] shadow-xl border border-slate-100 flex space-x-2 overflow-x-auto scrollbar-hide">
        {DAYS.map(day => (
          <button 
            key={day} 
            onClick={() => setSelectedDay(day)} 
            className={`px-8 py-3 rounded-2xl font-black transition-all whitespace-nowrap text-xs tracking-widest uppercase ${selectedDay === day ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Daily Allocation Radar</h4>
        <div className="h-10 bg-slate-50 rounded-2xl flex overflow-hidden border border-slate-100 relative shadow-inner">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="flex-1 border-r border-slate-200/50 last:border-0 relative" />
          ))}
          {(schedule[selectedDay] || []).map(item => {
            const [sH, sM] = item.startTime.split(':').map(Number);
            const [eH, eM] = item.endTime.split(':').map(Number);
            const startPct = ((sH * 60 + sM) / 1440) * 100;
            const endPct = ((eH * 60 + eM) / 1440) * 100;
            return (
              <div 
                key={item.id} 
                className={`absolute top-0 bottom-0 transition-all border-x border-white/20 flex items-center justify-center overflow-hidden cursor-help ${item.category === 'STUDYING' ? 'bg-indigo-500' : 'bg-cyan-400'}`}
                style={{ left: `${startPct}%`, width: `${Math.max(1, endPct - startPct)}%` }}
              >
                <span className="text-[6px] text-white font-black uppercase opacity-60 px-1 truncate">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="blueprint-bg bg-white p-10 rounded-[3rem] shadow-xl border border-slate-200 min-h-[400px] space-y-6">
        {schedule[selectedDay]?.map(item => (
          <div key={item.id} className={`glass p-8 rounded-[2.5rem] border-2 transition-all relative ${conflicts.has(item.id) ? 'border-amber-300' : 'border-slate-50 hover:border-indigo-200'}`}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
              <div className="shrink-0 flex flex-col items-center gap-2 bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl min-w-[160px]">
                <input type="time" className="bg-transparent text-xl font-black outline-none text-center w-full [color-scheme:dark]" value={item.startTime} onChange={e => updateItem(item.id, { startTime: e.target.value })} />
                <div className="w-full h-px bg-slate-700 my-2 relative flex justify-center items-center">
                  <span className="bg-slate-900 px-3 text-[9px] font-black text-slate-500 uppercase rounded-full border border-slate-700">{getDurationString(item.startTime, item.endTime)}</span>
                </div>
                <input type="time" className="bg-transparent text-xl font-black outline-none text-center w-full [color-scheme:dark]" value={item.endTime} onChange={e => updateItem(item.id, { endTime: e.target.value })} />
              </div>

              <div className="flex-grow space-y-4">
                <input className="w-full bg-transparent text-xl font-black text-slate-800 outline-none border-b-2 border-transparent focus:border-indigo-100 transition-colors" value={item.label} placeholder="Task Name..." onChange={e => updateItem(item.id, { label: e.target.value })} />
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex gap-1 p-1 bg-slate-50 rounded-xl">
                    {DURATIONS.map(d => (
                      <button key={d} onClick={() => applyDuration(item.id, item.startTime, d)} className="px-3 py-1.5 bg-white rounded-lg text-[9px] font-black uppercase text-slate-500 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                        {d}m
                      </button>
                    ))}
                  </div>
                  <select className="text-[9px] font-black uppercase px-4 py-2 rounded-xl bg-slate-900 text-white border-none shadow-md cursor-pointer" value={item.category} onChange={e => updateItem(item.id, { category: e.target.value as ActivityCategory })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={() => removeItem(item.id)} className="bg-red-50 text-red-400 p-4 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        ))}
        
        <button onClick={addItem} className="w-full py-12 bg-indigo-50/20 text-indigo-400 rounded-[3rem] border-4 border-dashed border-indigo-100 font-black text-sm hover:bg-indigo-50 transition-all flex flex-col items-center justify-center gap-2 group">
          <div className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </div>
          <span className="uppercase tracking-widest text-[10px] font-black">Add New Task</span>
        </button>
      </div>
    </div>
  );
};
