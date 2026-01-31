
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserAccount, DailyLog, ScheduleItem, ActivityCategory, GradeLevel, UserRole } from '../types';
import { storageService } from '../services/storageService';
import { getScheduleAdvice } from '../services/geminiService';

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

export const Dashboard: React.FC<Props> = ({ user, onToast }) => {
  const [activeUser, setActiveUser] = useState<UserAccount>(user);
  const [children, setChildren] = useState<UserAccount[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [advice, setAdvice] = useState<string>('');
  const [isAdviceLoading, setIsAdviceLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFullDay, setIsFullDay] = useState(false);
  const [xpFeedback, setXpFeedback] = useState<{ amount: number; reason: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewingItem, setViewingItem] = useState<ScheduleItem | null>(null);

  const isParentView = user.role === UserRole.PARENT;
  
  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, [currentTime]);

  const todayName = useMemo(() => currentTime.toLocaleDateString('en-US', { weekday: 'long' }), [currentTime]);
  const dateStr = useMemo(() => currentTime.toISOString().split('T')[0], [currentTime]);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isParentView) {
      storageService.getUsers().then(users => {
        const mySquad = users.filter(u => u.parentId === user.id);
        setChildren(mySquad);
        if (mySquad.length > 0 && activeUser.id === user.id) {
          setActiveUser(mySquad[0]);
        }
      });
    } else {
      setActiveUser(user);
    }
  }, [user, isParentView]);

  const initDashboard = async () => {
    if (activeUser.role === UserRole.PARENT && children.length === 0) return;
    
    setIsSyncing(true);
    try {
      const logs = await storageService.getDailyLogs(activeUser.id);
      setAllLogs(logs);
      
      let log = logs.find(l => l.date === dateStr);
      
      if (!log) {
        log = {
          id: `log-${activeUser.id}-${dateStr}`,
          userId: activeUser.id,
          date: dateStr,
          actualActivities: [],
          plannedSnapshot: activeUser.weeklySchedule?.[todayName] || []
        };
        await storageService.saveDailyLog(log);
        setAllLogs(prev => [...prev, log!]);
      }
      setTodayLog(log);
    } catch (err) {
      console.error("Dashboard init error:", err);
    } finally {
      setIsSyncing(false);
    }
    
    setIsAdviceLoading(true);
    if (activeUser.weeklySchedule) {
      const adviceStr = await getScheduleAdvice(activeUser.weeklySchedule);
      setAdvice(adviceStr);
    }
    setIsAdviceLoading(false);
  };

  useEffect(() => {
    initDashboard();
  }, [activeUser.id, todayName, dateStr, children.length]);

  const unifiedTimeline = useMemo(() => {
    if (!todayLog) return [];
    
    const plannedSlots = todayLog.plannedSnapshot.length > 0 
      ? todayLog.plannedSnapshot 
      : (activeUser.weeklySchedule?.[todayName] || []);
    
    const loggedMap = new Map<string, ScheduleItem>();
    todayLog.actualActivities.forEach(a => { if (a.plannedId) loggedMap.set(a.plannedId, a); });

    const slots = plannedSlots.map(p => {
      const actual = loggedMap.get(p.id);
      return actual ? { ...actual, status: 'LOGGED' as const } : { ...p, status: 'PENDING' as const };
    });

    const extras = (todayLog.actualActivities || []).filter(a => !a.plannedId).map(a => ({ ...a, status: 'LOGGED' as const }));
    return [...slots, ...extras].sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
  }, [todayLog, activeUser.weeklySchedule, todayName]);

  const syncStatus = useMemo(() => {
    const planned = todayLog?.plannedSnapshot || activeUser.weeklySchedule?.[todayName] || [];
    if (!todayLog || planned.length === 0) return 100;
    const syncedCount = todayLog.actualActivities.filter(a => !!a.plannedId).length;
    return Math.min(100, Math.round((syncedCount / planned.length) * 100));
  }, [todayLog, activeUser.weeklySchedule, todayName]);

  const weeklyStats = useMemo(() => {
    const stats = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
      const log = allLogs.find(l => l.date === ds);
      
      let score = 0;
      if (log && log.plannedSnapshot && log.plannedSnapshot.length > 0) {
        const matched = log.actualActivities.filter(a => !!a.plannedId).length;
        score = Math.round((matched / log.plannedSnapshot.length) * 100);
      } else if (ds === dateStr) {
        score = syncStatus;
      } else {
        score = 100;
      }
      stats.push({ day: dayLabel, score, isToday: ds === dateStr });
    }
    return stats;
  }, [allLogs, syncStatus, dateStr]);

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingItem || !todayLog || isParentView) return;
    
    setIsSyncing(true);
    let updatedLog = { ...todayLog };
    const isExistingActual = todayLog.actualActivities.some(a => a.id === viewingItem.id);

    try {
      if (isExistingActual) {
        updatedLog.actualActivities = todayLog.actualActivities.map(a => a.id === viewingItem.id ? viewingItem : a);
      } else {
        const newItem = { ...viewingItem, completed: true, status: 'LOGGED' as const };
        updatedLog.actualActivities = [...todayLog.actualActivities, newItem];
        
        const newXp = (activeUser.xp || 0) + 25;
        const updatedUser = { ...activeUser, xp: newXp };
        await storageService.saveUser(updatedUser);
        setActiveUser(updatedUser);
        setXpFeedback({ amount: 25, reason: "Manual Entry" });
      }

      await storageService.saveDailyLog(updatedLog);
      setTodayLog(updatedLog);
      setAllLogs(prev => prev.map(l => l.date === updatedLog.date ? updatedLog : l));
      
      setViewingItem(null);
      onToast("Operation Logged 📡");
      setTimeout(() => setXpFeedback(null), 2000);
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
    setViewingItem({
      id: Math.random().toString(36).substr(2, 9),
      label: 'New Task',
      startTime: `${String(startH).padStart(2, '0')}:00`,
      endTime: `${String(endH).padStart(2, '0')}:00`,
      category: ActivityCategory.OTHER,
      completed: true,
      plannedSubject: '',
      notes: ''
    });
  };

  const activateMission = async (plan: ScheduleItem) => {
    if (!todayLog || isParentView) return;
    setIsSyncing(true);
    const actualItem: ScheduleItem = {
      ...plan,
      id: Math.random().toString(36).substr(2, 9),
      plannedId: plan.id,
      completed: true,
      notes: plan.notes || 'Mission accomplished.'
    };
    const updatedLog = { ...todayLog, actualActivities: [...todayLog.actualActivities, actualItem] };
    
    try {
      await storageService.saveDailyLog(updatedLog);
      setTodayLog(updatedLog);
      setAllLogs(prev => prev.map(l => l.date === updatedLog.date ? updatedLog : l));

      const newXp = (activeUser.xp || 0) + 50;
      const updatedUser = { ...activeUser, xp: newXp };
      await storageService.saveUser(updatedUser);
      setActiveUser(updatedUser);
      setXpFeedback({ amount: 50, reason: "Task Complete" });
      onToast("Success! +50 XP ⚡");
      setTimeout(() => setXpFeedback(null), 2000);
    } catch (err) {
      onToast("Sync failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const hoursToDisplay = isFullDay 
    ? Array.from({ length: 24 }).map((_, i) => i) 
    : Array.from({ length: 18 }).map((_, i) => i + 6);

  const level = Math.floor((activeUser.xp || 0) / 1000) + 1;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 fade-in">
      {xpFeedback && (
        <div className="fixed top-48 left-1/2 -translate-x-1/2 z-[150] xp-float">
          <div className="bg-indigo-600 text-white px-10 py-5 rounded-full shadow-2xl border-4 border-white font-black text-3xl">
            +{xpFeedback.amount} XP
          </div>
        </div>
      )}

      <header className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="w-28 h-28 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-6xl shadow-2xl rotate-3 border-4 border-white/10 shrink-0">
            {activeUser.grade ? GRADE_AVATARS[activeUser.grade] : '👤'}
          </div>
          <div className="text-center md:text-left space-y-2 flex-grow">
            <h1 className="text-5xl font-black tracking-tighter mb-1">{activeUser.name}</h1>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
              <p className="text-indigo-400 font-black text-lg uppercase tracking-tight">{formattedDate}</p>
              <div className="flex gap-2 justify-center md:justify-start">
                <span className="bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Lvl {level}</span>
                <span className="bg-white/10 text-slate-300 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Academy Rank</span>
              </div>
            </div>
          </div>
          <div className="md:ml-auto max-w-xs text-center md:text-right bg-white/5 p-6 rounded-[2.5rem] border border-white/10 hidden lg:block">
            <p className="text-indigo-400 font-black text-[9px] uppercase tracking-[0.3em] mb-2">Tactical Intelligence</p>
            <p className="text-slate-300 text-xs italic font-medium leading-relaxed">
              {isAdviceLoading ? "Decoding..." : advice || "Stay on mission trajectory."}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-6">
            <div className="flex items-center gap-4">
               <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Mission Hub</h2>
               <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">Active Strategy: {todayName}</p>
            </div>
            {!isParentView && (
              <button onClick={handleNewManualEntry} className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl">+ Log Activity</button>
            )}
          </div>

          <div className="bg-white rounded-[3.5rem] shadow-xl border border-slate-100 min-h-[600px] relative overflow-hidden flex flex-col md:flex-row">
            <div className="w-full md:w-20 bg-slate-50/50 border-b md:border-b-0 md:border-r border-slate-100 flex md:flex-col overflow-x-auto md:overflow-x-visible custom-scroll">
              {hoursToDisplay.map(h => (
                <div key={h} className="min-w-[80px] md:min-w-0 h-24 border-r md:border-r-0 md:border-b border-slate-200/50 flex items-center justify-center text-[10px] font-black text-slate-400">
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            <div className="flex-grow relative blueprint-bg overflow-y-auto max-h-[700px] scrollbar-hide px-6 py-4" ref={timelineRef}>
              <div className="sticky top-0 right-0 flex justify-end pb-4 z-20">
                <button onClick={() => setIsFullDay(!isFullDay)} className="glass px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 shadow-sm hover:bg-white transition-all">
                  {isFullDay ? "Focus View" : "Full Ops Grid"}
                </button>
              </div>

              {hoursToDisplay.map(h => <div key={h} className="h-24 border-b border-slate-100/20"></div>)}
              
              {unifiedTimeline.map(item => {
                const sH = parseInt(item.startTime.split(':')[0]);
                const sM = parseInt(item.startTime.split(':')[1]);
                const eH = parseInt(item.endTime.split(':')[0]);
                const eM = parseInt(item.endTime.split(':')[1]);

                if (!isFullDay && (sH < 6 || sH >= 24)) return null;

                const offsetH = isFullDay ? 0 : 6;
                const top = ((sH - offsetH) * 60 + sM) * (96/60);
                const duration = ((eH * 60 + eM) - (sH * 60 + sM));
                // Strictly fit within the time values as requested.
                const height = Math.max(20, duration * (96/60)); 
                const isLogged = item.status === 'LOGGED';

                return (
                  <div 
                    key={item.id}
                    onClick={() => setViewingItem(item)}
                    className={`absolute left-4 right-4 rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-6 border-4 transition-all group shadow-sm flex flex-col justify-between overflow-hidden cursor-pointer ${isLogged ? 'bg-white border-green-400 shadow-green-100 shadow-lg' : 'bg-indigo-50 border-indigo-100 mission-pulse hover:shadow-xl'}`}
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5 sm:mb-1">
                           <h4 className={`font-black uppercase tracking-tight truncate ${height < 50 ? 'text-[10px]' : 'text-lg text-slate-800'}`}>{item.label}</h4>
                           {item.plannedSubject && height >= 80 && <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">{item.plannedSubject}</span>}
                        </div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${height < 40 ? 'hidden' : 'text-slate-400'}`}>{item.startTime} - {item.endTime}</p>
                        {item.notes && height >= 120 && <p className="text-[11px] text-slate-500 font-medium italic mt-3 border-l-2 border-indigo-100 pl-4 py-1 truncate">"{item.notes}"</p>}
                      </div>
                      
                      <div className="flex gap-2 items-center">
                        {isLogged ? (
                           <div className={`bg-green-100 text-green-600 p-2 sm:p-3 rounded-xl shrink-0 ${height < 40 ? 'scale-75' : ''}`}>
                              <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                           </div>
                        ) : (
                          !isParentView && height >= 60 && <button onClick={(e) => { e.stopPropagation(); activateMission(item); }} className="bg-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition shrink-0">VERIFY</button>
                        )}
                        {height >= 40 && (
                          <div className="text-slate-300 group-hover:text-indigo-400 transition-colors">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="space-y-8">
          <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 text-center">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Efficiency Fuel</p>
            <div className="relative inline-block">
               <svg className="w-48 h-48 -rotate-90">
                  <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-100" />
                  <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-indigo-600" 
                          strokeDasharray={552.92} strokeDashoffset={552.92 - (552.92 * syncStatus / 100)} />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-slate-900">{syncStatus}%</span>
               </div>
            </div>
            <p className="mt-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Today's Sync Rate</p>
          </div>

          <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Weekly Consistency</p>
            <div className="flex items-end justify-between h-32 gap-2">
              {weeklyStats.map((stat, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                  <div className="w-full bg-slate-50 rounded-full relative overflow-hidden h-full border border-slate-100">
                    <div 
                      className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-1000 ${stat.isToday ? 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)]' : 'bg-indigo-300'}`}
                      style={{ height: `${Math.max(5, stat.score)}%` }}
                    />
                  </div>
                  <span className={`text-[9px] font-black uppercase ${stat.isToday ? 'text-indigo-600' : 'text-slate-300'}`}>{stat.day}</span>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                    {stat.score}%
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-indigo-600 p-10 rounded-[3.5rem] text-white shadow-2xl flex flex-col justify-between h-[300px] relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 text-9xl opacity-10 font-black">XP</div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Experience Bank</p>
              <p className="text-5xl font-black">{activeUser.xp}</p>
            </div>
            <div className="flex items-center justify-between mt-auto">
               <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center font-black text-3xl">
                  {level}
               </div>
               <div className="text-right">
                  <p className="text-[9px] font-black uppercase opacity-60">Tier Rank</p>
                  <p className="text-xs font-black">SPECIALIST</p>
               </div>
            </div>
          </div>
        </aside>
      </div>

      {viewingItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setViewingItem(null)}></div>
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-8 sm:p-12 relative animate-in zoom-in-95 scrollbar-hide max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-start mb-6">
               <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Mission Profile</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Status: {viewingItem.status === 'LOGGED' ? 'COMPLETED' : 'PENDING'}</p>
               </div>
               <button onClick={() => setViewingItem(null)} className="p-3 bg-slate-100 rounded-2xl text-slate-500 hover:bg-slate-200 transition">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
               </button>
             </div>

             <div className="space-y-8">
               <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl">
                        {viewingItem.category === ActivityCategory.STUDYING ? '📚' : '⚡'}
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</p>
                        <p className="font-black text-slate-900 uppercase">{viewingItem.category}</p>
                     </div>
                  </div>
                  <h4 className="text-2xl font-black text-slate-800 uppercase leading-tight mb-2">{viewingItem.label}</h4>
                  <div className="flex items-center gap-4 text-slate-500 font-bold">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                     <span>{viewingItem.startTime} - {viewingItem.endTime}</span>
                  </div>
               </div>

               {isParentView || viewingItem.status === 'LOGGED' ? (
                 <div className="space-y-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Debrief Notes</label>
                     <div className="w-full p-6 bg-slate-50 rounded-[2rem] font-medium text-slate-600 border border-slate-100 min-h-[100px]">
                        {viewingItem.notes || "No extra intel reported for this mission."}
                     </div>
                   </div>
                   {!isParentView && viewingItem.status === 'LOGGED' && (
                     <p className="text-center text-[10px] font-black text-green-500 uppercase tracking-widest">Mission is finalized. Intelligence locked.</p>
                   )}
                 </div>
               ) : (
                 <form onSubmit={handleUpdateItem} className="space-y-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Task Update</label>
                     <input required className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold text-xl outline-none border-4 border-transparent focus:border-indigo-100" value={viewingItem.label} onChange={e => setViewingItem({...viewingItem, label: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Mission Observations</label>
                     <textarea rows={3} placeholder="How did it go? Any obstacles encountered?" className="w-full p-6 bg-slate-50 rounded-[2rem] font-medium text-slate-600 outline-none border-4 border-transparent focus:border-indigo-100 resize-none" value={viewingItem.notes || ''} onChange={e => setViewingItem({...viewingItem, notes: e.target.value})} />
                   </div>
                   <button className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition">Update Flight Log</button>
                 </form>
               )}

               {isParentView && viewingItem.status === 'PENDING' && (
                  <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex gap-4 items-center">
                     <div className="text-amber-500 text-2xl">⚠️</div>
                     <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase">Specialist has not verified this mission yet. Deployment status is pending.</p>
                  </div>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
