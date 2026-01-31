
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserAccount, DailyLog, ScheduleItem, ActivityCategory, GradeLevel, STUDY_SUBJECTS } from '../types';
import { storageService } from '../services/storageService';
import { getScheduleAdvice } from '../services/geminiService';
import { GRADE_TEMPLATES } from '../services/demoData';

interface Props {
  user: UserAccount;
  onToast: (msg: string) => void;
}

const GRADE_AVATARS: Record<GradeLevel, string> = {
  [GradeLevel.ELEMENTARY]: '🐣',
  [GradeLevel.MIDDLE]: '🚀',
  [GradeLevel.HIGH]: '☄️',
  [GradeLevel.UNIVERSITY]: '🏛️',
};

const CATEGORIES = Object.values(ActivityCategory);

export const Dashboard: React.FC<Props> = ({ user, onToast }) => {
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [advice, setAdvice] = useState<string>('');
  const [isAdviceLoading, setIsAdviceLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [xpFeedback, setXpFeedback] = useState<{ amount: number; reason: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  const todayName = useMemo(() => currentTime.toLocaleDateString('en-US', { weekday: 'long' }), [currentTime]);
  const dateStr = useMemo(() => currentTime.toISOString().split('T')[0], [currentTime]);

  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timelineRef.current) {
      const hours = currentTime.getHours();
      const pixelsPerHour = 96;
      const scrollPos = hours * pixelsPerHour - 240;
      timelineRef.current.scrollTo({ top: scrollPos, behavior: 'smooth' });
    }
  }, [todayLog]);

  useEffect(() => {
    const initDashboard = async () => {
      setIsSyncing(true);
      try {
        const logs = await storageService.getDailyLogs(user.id);
        let log = logs.find(l => l.date === dateStr);
        
        if (!log) {
          const plannedItems = (user.weeklySchedule?.[todayName] || []).map(item => ({ 
            ...item, 
            id: Math.random().toString(36).substr(2, 9) 
          }));
          log = {
            id: Math.random().toString(36).substr(2, 9),
            userId: user.id,
            date: dateStr,
            actualActivities: [],
            plannedSnapshot: plannedItems
          };
          await storageService.saveDailyLog(log);
        }
        setTodayLog(log);
      } catch (err) {
        console.error("Dashboard init error:", err);
      } finally {
        setIsSyncing(false);
      }
      
      setIsAdviceLoading(true);
      if (user.weeklySchedule) {
        const adviceStr = await getScheduleAdvice(user.weeklySchedule);
        setAdvice(adviceStr);
      }
      setIsAdviceLoading(false);
    };

    initDashboard();
  }, [user.id, user.weeklySchedule, todayName, dateStr]);

  const unifiedTimeline = useMemo(() => {
    if (!todayLog) return [];
    const loggedMap = new Map<string, ScheduleItem>();
    todayLog.actualActivities.forEach(a => { if (a.plannedId) loggedMap.set(a.plannedId, a); });

    const slots = (todayLog.plannedSnapshot || []).map(p => {
      const actual = loggedMap.get(p.id);
      return actual ? { ...actual, status: 'LOGGED' as const } : { ...p, status: 'PENDING' as const };
    });

    const extras = (todayLog.actualActivities || []).filter(a => !a.plannedId).map(a => ({ ...a, status: 'LOGGED' as const }));
    return [...slots, ...extras].sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
  }, [todayLog]);

  const syncStatus = useMemo(() => {
    if (!todayLog || !todayLog.plannedSnapshot || todayLog.plannedSnapshot.length === 0) return 100;
    const syncedCount = todayLog.actualActivities.filter(a => !!a.plannedId).length;
    return Math.round((syncedCount / todayLog.plannedSnapshot.length) * 100);
  }, [todayLog]);

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !todayLog) return;
    
    setIsSyncing(true);
    let updatedLog = { ...todayLog };

    // Determine if we are updating an existing entry or adding a brand new manual one
    const isExistingActual = todayLog.actualActivities.some(a => a.id === editingItem.id);
    const isExistingPlanned = todayLog.plannedSnapshot.some(p => p.id === editingItem.id);

    try {
      if (isExistingActual) {
        updatedLog.actualActivities = todayLog.actualActivities.map(a => a.id === editingItem.id ? editingItem : a);
      } else if (isExistingPlanned) {
        updatedLog.plannedSnapshot = todayLog.plannedSnapshot.map(p => p.id === editingItem.id ? editingItem : p);
      } else {
        // Brand new manual entry
        const newItem = { ...editingItem, completed: true };
        updatedLog.actualActivities = [...todayLog.actualActivities, newItem];
        
        // Award XP for spontaneous productivity
        const newXp = (user.xp || 0) + 25;
        await storageService.saveUser({ ...user, xp: newXp });
        setXpFeedback({ amount: 25, reason: "Spontaneous Productivity" });
        setTimeout(() => setXpFeedback(null), 2000);
      }

      await storageService.saveDailyLog(updatedLog);
      setTodayLog(updatedLog);
      setEditingItem(null);
      onToast("Telemetry Synchronized 📡");
    } catch (err) {
      onToast("Sync error.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleNewManualEntry = () => {
    const now = new Date();
    const startH = now.getHours();
    const endH = (startH + 1) % 24;
    
    const newItem: ScheduleItem = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'Spontaneous Mission',
      startTime: `${String(startH).padStart(2, '0')}:00`,
      endTime: `${String(endH).padStart(2, '0')}:00`,
      category: ActivityCategory.OTHER,
      completed: true,
      notes: ''
    };
    
    setEditingItem(newItem);
  };

  const deleteItem = async (itemId: string, status?: 'LOGGED' | 'PENDING') => {
    if (!todayLog) return;
    if (!confirm('Permanently scrub this mission?')) return;

    setIsSyncing(true);
    let updatedLog = { ...todayLog };
    if (status === 'LOGGED') {
      updatedLog.actualActivities = todayLog.actualActivities.filter(a => a.id !== itemId);
    } else {
      updatedLog.plannedSnapshot = todayLog.plannedSnapshot.filter(p => p.id !== itemId);
    }

    try {
      await storageService.saveDailyLog(updatedLog);
      setTodayLog(updatedLog);
      setEditingItem(null);
      onToast("Mission Scrubbed.");
    } catch (err) {
      onToast("Delete failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const activateMission = async (plan: ScheduleItem) => {
    if (!todayLog) return;
    setIsSyncing(true);
    const actualItem: ScheduleItem = {
      ...plan,
      id: Math.random().toString(36).substr(2, 9),
      plannedId: plan.id,
      completed: true,
      notes: 'Objective accomplished according to plan.'
    };
    const updatedLog = { ...todayLog, actualActivities: [...todayLog.actualActivities, actualItem] };
    
    try {
      await storageService.saveDailyLog(updatedLog);
      setTodayLog(updatedLog);
      
      const newXp = (user.xp || 0) + 50;
      await storageService.saveUser({ ...user, xp: newXp });
      
      setXpFeedback({ amount: 50, reason: "Mission Success" });
      onToast("XP Synced ⚡");
      setTimeout(() => setXpFeedback(null), 2000);
    } catch (err) {
      onToast("Sync failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const timeToPos = (time: string) => { 
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number); 
    return (h * 60 + m); 
  };

  const level = Math.floor((user.xp || 0) / 1000) + 1;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 fade-in">
      {/* XP Pop-up */}
      {xpFeedback && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[120] xp-float">
          <div className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] shadow-2xl border-2 border-indigo-400 flex flex-col items-center">
            <span className="text-3xl font-black">+{xpFeedback.amount} XP</span>
            <span className="text-[10px] uppercase font-black tracking-[0.3em] opacity-80 mt-1">{xpFeedback.reason}</span>
          </div>
        </div>
      )}

      {/* Modern Editing Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={() => setEditingItem(null)}></div>
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl p-12 border border-slate-200 relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-10">
              <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Configure Mission</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-300 hover:text-slate-900 transition-colors p-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleUpdateItem} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Objective Label</label>
                <input required className="w-full p-6 bg-slate-50 rounded-[2rem] border-none font-bold text-2xl outline-none focus:bg-white focus:ring-4 ring-indigo-50 transition" value={editingItem.label} onChange={e => setEditingItem({...editingItem, label: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Commence</label>
                  <input type="time" className="w-full p-5 bg-slate-50 rounded-[2rem] font-black text-xl outline-none" value={editingItem.startTime} onChange={e => setEditingItem({...editingItem, startTime: e.target.value})} />
                </div>
                 <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Terminate</label>
                  <input type="time" className="w-full p-5 bg-slate-50 rounded-[2rem] font-black text-xl outline-none" value={editingItem.endTime} onChange={e => setEditingItem({...editingItem, endTime: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Category</label>
                <select className="w-full p-5 bg-slate-50 rounded-[2rem] font-black text-lg outline-none appearance-none cursor-pointer" value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value as ActivityCategory})}>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => deleteItem(editingItem.id, (editingItem as any).status)} className="p-6 bg-red-50 text-red-500 rounded-[2rem] hover:bg-red-500 hover:text-white transition active:scale-90">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
                <button type="submit" className="flex-grow py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition">Authorize Mission 🚀</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Stats Header */}
      <header className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 shadow-2xl relative overflow-hidden text-white border border-slate-800">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_20%,#4f46e522,transparent_60%)]"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex items-center gap-10">
            <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-500 rounded-[3rem] flex items-center justify-center text-6xl font-black shadow-2xl ring-4 ring-slate-800/50 relative">
              {user.grade ? GRADE_AVATARS[user.grade] : '👤'}
              <div className="absolute -bottom-4 -right-4 bg-white text-slate-900 px-4 py-2 rounded-2xl flex items-center justify-center text-xs font-black border-4 border-slate-900 shadow-2xl">LV{level}</div>
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tighter leading-none mb-3">{user.name}</h1>
              <p className="text-indigo-400 font-black uppercase text-[10px] tracking-[0.4em]">
                {user.grade} Sector Command • Grade {user.specificGrade || 1}
              </p>
              <div className="mt-6 flex items-center gap-5">
                <div className="w-64 h-3.5 bg-slate-800 rounded-full overflow-hidden border border-white/5 shadow-inner p-[2px]">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-1000 shadow-[0_0_15px_#6366f166]" style={{ width: `${((user.xp % 1000) / 1000) * 100}%` }}></div>
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{user.xp % 1000} / 1000 XP</span>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 shadow-inner group">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]"></span>
              <p className="text-cyan-400 text-[11px] font-black uppercase tracking-[0.3em]">Tactical Intelligence Report</p>
            </div>
            <p className="text-base font-bold leading-relaxed opacity-95 italic text-slate-100">
              {isAdviceLoading ? (
                <span className="flex gap-2 items-center opacity-40"><div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent animate-spin rounded-full"></div> Analyzing trajectory...</span>
              ) : (
                `"${advice || 'Trajectory stable. All systems green for mission commencement.'}"`
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        <section className="lg:col-span-2 space-y-10">
          <div className="px-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Mission Timeline</h2>
              <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mt-2">Precision Sync: <span className={syncStatus > 80 ? "text-green-500" : "text-amber-500"}>{syncStatus}% Efficiency</span></p>
            </div>
            <div className="flex items-center gap-4">
              {isSyncing && (
                <div className="flex items-center gap-3 text-indigo-500 text-[11px] font-black uppercase animate-pulse bg-indigo-50 px-5 py-2.5 rounded-full border border-indigo-100">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  Syncing
                </div>
              )}
              <button 
                onClick={handleNewManualEntry}
                className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition shadow-xl flex items-center gap-2 group"
              >
                <span className="text-xl group-hover:rotate-90 transition-transform duration-300">+</span>
                Spontaneous Mission
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden flex min-h-[960px] relative">
            <div className="w-24 border-r border-slate-50 shrink-0 bg-slate-50/20 flex flex-col">
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="h-24 border-b border-slate-100 flex items-start justify-center pt-4">
                  <span className="text-[11px] font-black text-slate-300 tabular-nums">{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            <div 
              className="flex-grow relative blueprint-bg overflow-y-auto scrollbar-hide custom-scroll px-8" 
              ref={timelineRef}
            >
              {Array.from({ length: 24 }).map((_, h) => <div key={h} className="h-24 border-b border-slate-100/40 w-full"></div>)}
              
              <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: `${(currentTime.getHours() * 60 + currentTime.getMinutes()) * (96/60)}px` }}>
                <div className="w-full h-1 bg-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.4)]"></div>
                <div className="absolute -left-2 w-4 h-4 bg-red-500 rounded-full shadow-2xl ring-4 ring-red-100"></div>
              </div>

              {unifiedTimeline.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-20 text-center opacity-30">
                   <div className="text-8xl mb-6">🛰️</div>
                   <h3 className="text-2xl font-black uppercase tracking-tighter">Signal Dead</h3>
                   <p className="font-bold text-sm">No missions defined for this rotation. Sync your blueprint!</p>
                </div>
              ) : (
                unifiedTimeline.map(item => {
                  const startPos = timeToPos(item.startTime || '00:00') * (96/60);
                  const endPos = timeToPos(item.endTime || '01:00') * (96/60);
                  const height = Math.max(96, endPos - startPos);
                  const isLogged = item.status === 'LOGGED';

                  return (
                    <div 
                      key={item.id} 
                      onClick={() => setEditingItem(item)}
                      className={`absolute left-8 right-8 z-10 rounded-[3rem] border-2 shadow-sm cursor-pointer group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden ${isLogged ? 'bg-white border-green-500/30' : 'bg-indigo-50/80 border-indigo-100 mission-pulse'}`} 
                      style={{ top: `${startPos}px`, height: `${height}px` }}
                    >
                      <div className="p-8 h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start gap-6">
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-4">
                               <h4 className="text-2xl font-black text-slate-800 truncate leading-none mb-1">{item.label}</h4>
                               {isLogged && (
                                 <div className="bg-green-500 text-white p-1.5 rounded-xl shadow-lg">
                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                                 </div>
                               )}
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest tabular-nums">{item.startTime} — {item.endTime}</p>
                          </div>
                          {!isLogged && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); activateMission(item); }} 
                              className="bg-slate-900 text-white p-5 rounded-[2rem] hover:bg-indigo-600 shadow-2xl active:scale-90 transition group-hover:scale-110"
                            >
                              🚀
                            </button>
                          )}
                        </div>
                        <div className="flex gap-4 items-center">
                          <span className={`text-[10px] font-black uppercase px-5 py-2 rounded-full tracking-widest ${!item.plannedId && isLogged ? 'bg-cyan-500 text-white' : 'bg-slate-900 text-white'}`}>
                            {!item.plannedId && isLogged ? 'Spontaneous' : item.category}
                          </span>
                          {item.plannedSubject && <span className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em]">{item.plannedSubject} Sector</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-12">
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 flex flex-col items-center">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12 pb-6 border-b border-slate-50 w-full text-center">Sync Efficiency</h3>
            
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="128" cy="128" r="105" fill="transparent" stroke="#f8fafc" strokeWidth="22" />
                <circle 
                  cx="128" cy="128" r="105" 
                  fill="transparent" 
                  stroke={syncStatus >= 90 ? '#10b981' : syncStatus >= 50 ? '#6366f1' : '#f59e0b'} 
                  strokeWidth="22" 
                  strokeDasharray={659.7} 
                  strokeDashoffset={659.7 - (659.7 * syncStatus) / 100} 
                  strokeLinecap="round" 
                  className="transition-all duration-1500 ease-out" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                 <span className="text-7xl font-black text-slate-900 leading-none tracking-tighter">{syncStatus}%</span>
                 <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4">Current Cycle</span>
              </div>
            </div>

            <div className="w-full mt-14 space-y-5">
               <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 group hover:border-indigo-100 transition duration-300">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Targets Cleared</span>
                  <span className="text-2xl font-black text-slate-900 tabular-nums">{todayLog?.actualActivities.length || 0}</span>
               </div>
               <div className="flex justify-between items-center bg-indigo-50 p-6 rounded-[2.5rem] border border-indigo-100 group hover:bg-indigo-600 transition duration-300">
                  <span className="text-[11px] font-black uppercase text-indigo-500 group-hover:text-white tracking-widest transition">XP Accumulated</span>
                  <span className="text-2xl font-black text-indigo-800 group-hover:text-white transition tabular-nums">{user.xp}</span>
               </div>
            </div>
          </div>

          <div className="bg-indigo-600 p-12 rounded-[4rem] shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition duration-1000"></div>
            <h3 className="text-3xl font-black tracking-tighter mb-2">Fleet Rank</h3>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-80 mb-10">
              {GRADE_TEMPLATES[user.grade || GradeLevel.MIDDLE](user.specificGrade || 1).name}
            </p>
            <div className="flex items-center gap-6">
               <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-indigo-600 font-black text-4xl shadow-2xl rotate-3 group-hover:rotate-12 transition duration-500">
                 {level}
               </div>
               <div>
                  <p className="text-lg font-black leading-tight tracking-tight">Prime Commander</p>
                  <p className="text-[10px] font-black uppercase opacity-60 mt-1 tracking-widest">Clearance: Level Alpha</p>
               </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
