
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
  const [advice, setAdvice] = useState<string>('');
  const [isAdviceLoading, setIsAdviceLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFullDay, setIsFullDay] = useState(false);
  const [xpFeedback, setXpFeedback] = useState<{ amount: number; reason: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  const isParentView = user.role === UserRole.PARENT;
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
      let log = logs.find(l => l.date === dateStr);
      
      if (!log) {
        log = {
          id: Math.random().toString(36).substr(2, 9),
          userId: activeUser.id,
          date: dateStr,
          actualActivities: [],
          plannedSnapshot: activeUser.weeklySchedule?.[todayName] || []
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
    
    // IMPORTANT: Use the LIVE weekly schedule for immediate visibility on front page
    const livePlannedSlots = activeUser.weeklySchedule?.[todayName] || [];
    
    const loggedMap = new Map<string, ScheduleItem>();
    todayLog.actualActivities.forEach(a => { if (a.plannedId) loggedMap.set(a.plannedId, a); });

    const slots = livePlannedSlots.map(p => {
      const actual = loggedMap.get(p.id);
      return actual ? { ...actual, status: 'LOGGED' as const } : { ...p, status: 'PENDING' as const };
    });

    const extras = (todayLog.actualActivities || []).filter(a => !a.plannedId).map(a => ({ ...a, status: 'LOGGED' as const }));
    return [...slots, ...extras].sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
  }, [todayLog, activeUser.weeklySchedule, todayName]);

  const syncStatus = useMemo(() => {
    const livePlanned = activeUser.weeklySchedule?.[todayName] || [];
    if (!todayLog || livePlanned.length === 0) return 100;
    const syncedCount = todayLog.actualActivities.filter(a => !!a.plannedId).length;
    return Math.min(100, Math.round((syncedCount / livePlanned.length) * 100));
  }, [todayLog, activeUser.weeklySchedule, todayName]);

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !todayLog) return;
    
    setIsSyncing(true);
    let updatedLog = { ...todayLog };
    const isExistingActual = todayLog.actualActivities.some(a => a.id === editingItem.id);

    try {
      if (isExistingActual) {
        updatedLog.actualActivities = todayLog.actualActivities.map(a => a.id === editingItem.id ? editingItem : a);
      } else {
        const newItem = { ...editingItem, completed: true, status: 'LOGGED' as const };
        updatedLog.actualActivities = [...todayLog.actualActivities, newItem];
        
        const newXp = (activeUser.xp || 0) + 25;
        const updatedUser = { ...activeUser, xp: newXp };
        await storageService.saveUser(updatedUser);
        setActiveUser(updatedUser);
        setXpFeedback({ amount: 25, reason: "Manual Entry" });
      }

      await storageService.saveDailyLog(updatedLog);
      setTodayLog(updatedLog);
      setEditingItem(null);
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
    setEditingItem({
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
    if (!todayLog) return;
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
    : Array.from({ length: 18 }).map((_, i) => i + 6); // 6 AM to 11 PM

  const level = Math.floor((activeUser.xp || 0) / 1000) + 1;

  if (activeUser.role === UserRole.PARENT && children.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-32 text-center space-y-10 bg-white rounded-[4rem] shadow-2xl border border-slate-100 fade-in px-8">
        <div className="text-8xl animate-bounce">🛡️</div>
        <h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Squad Not Found</h2>
        <p className="text-slate-500 font-bold max-w-md mx-auto leading-relaxed">It looks like your fleet is empty. Head to the <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Squad Hub</span> to recruit your first Specialist and start their productivity journey!</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 fade-in">
      {/* XP Toast Animation */}
      {xpFeedback && (
        <div className="fixed top-48 left-1/2 -translate-x-1/2 z-[150] xp-float">
          <div className="bg-indigo-600 text-white px-10 py-5 rounded-full shadow-2xl border-4 border-white font-black text-3xl">
            +{xpFeedback.amount} XP
          </div>
        </div>
      )}

      {/* Hero Header */}
      <header className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="w-28 h-28 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-6xl shadow-2xl rotate-3 border-4 border-white/10">
            {activeUser.grade ? GRADE_AVATARS[activeUser.grade] : '👤'}
          </div>
          <div className="text-center md:text-left space-y-4">
            <h1 className="text-5xl font-black tracking-tighter mb-2">{activeUser.name}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <span className="bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em]">Rank: Level {level}</span>
              <span className="bg-white/10 text-slate-300 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em]">{activeUser.grade || 'Academy'} Mode</span>
            </div>
          </div>
          <div className="md:ml-auto max-w-sm text-center md:text-right bg-white/5 p-6 rounded-[2.5rem] border border-white/10">
            <p className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em] mb-3">Tactical Intelligence</p>
            <p className="text-slate-300 text-sm italic font-medium leading-relaxed">
              {isAdviceLoading ? "Decoding satellite data..." : advice || "Awaiting mission parameters from Command."}
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-6">
            <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Today's Timeline</h2>
            <div className="flex gap-3">
              {!isParentView && (
                <button onClick={handleNewManualEntry} className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl">+ Log New Activity</button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[3.5rem] shadow-xl border border-slate-100 min-h-[600px] relative overflow-hidden flex flex-col md:flex-row">
            {/* Hour Labels */}
            <div className="w-full md:w-20 bg-slate-50/50 border-b md:border-b-0 md:border-r border-slate-100 flex md:flex-col overflow-x-auto md:overflow-x-visible custom-scroll">
              {hoursToDisplay.map(h => (
                <div key={h} className="min-w-[80px] md:min-w-0 h-24 border-r md:border-r-0 md:border-b border-slate-200/50 flex items-center justify-center text-[10px] font-black text-slate-400">
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Timeline Content */}
            <div className="flex-grow relative blueprint-bg overflow-y-auto max-h-[700px] scrollbar-hide px-6 py-4" ref={timelineRef}>
              <div className="sticky top-0 right-0 flex justify-end pb-4 z-20">
                <button onClick={() => setIsFullDay(!isFullDay)} className="bg-white/80 backdrop-blur px-5 py-2.5 rounded-full border border-slate-200 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 shadow-sm hover:bg-white transition-all">
                  {isFullDay ? "Focus Core Hours (6-11)" : "Unlock 24H Grid"}
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
                const height = Math.max(96, ((eH * 60 + eM) - (sH * 60 + sM)) * (96/60));
                const isLogged = item.status === 'LOGGED';

                return (
                  <div 
                    key={item.id}
                    onClick={() => !isParentView && setEditingItem(item)}
                    className={`absolute left-4 right-4 rounded-[2.5rem] p-6 border-4 transition-all group shadow-sm flex flex-col justify-between overflow-hidden ${isLogged ? 'bg-white border-green-400' : 'bg-indigo-50 border-indigo-100 mission-pulse cursor-pointer'}`}
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                           <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight truncate">{item.label}</h4>
                           {item.plannedSubject && <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">{item.plannedSubject}</span>}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.startTime} - {item.endTime}</p>
                        {item.notes && <p className="text-[11px] text-slate-500 font-medium italic mt-3 border-l-2 border-indigo-100 pl-4 py-1">"{item.notes}"</p>}
                      </div>
                      
                      {isLogged ? (
                         <div className="bg-green-100 text-green-600 p-3 rounded-2xl shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                         </div>
                      ) : (
                        !isParentView && <button onClick={(e) => { e.stopPropagation(); activateMission(item); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition shrink-0">VERIFY</button>
                      )}
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
            <p className="mt-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Schedule Sync Rate</p>
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
                  <p className="text-[9px] font-black uppercase opacity-60">Tier Level</p>
                  <p className="text-xs font-black">SPECIALIST</p>
               </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Manual Entry / Update Modal */}
      {editingItem && !isParentView && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setEditingItem(null)}></div>
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-12 relative animate-in zoom-in-95 scrollbar-hide max-h-[90vh] overflow-y-auto">
             <h3 className="text-3xl font-black mb-8 uppercase tracking-tighter text-slate-900">Activity Debrief</h3>
             <form onSubmit={handleUpdateItem} className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Activity Name</label>
                 <input required className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold text-xl outline-none border-4 border-transparent focus:border-indigo-100" value={editingItem.label} onChange={e => setEditingItem({...editingItem, label: e.target.value})} placeholder="e.g. Science Revision" />
               </div>
               
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Subject Sector</label>
                 <input className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold text-lg outline-none border-4 border-transparent focus:border-indigo-100" value={editingItem.plannedSubject || ''} onChange={e => setEditingItem({...editingItem, plannedSubject: e.target.value})} placeholder="e.g. Mathematics" />
               </div>

               <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Start Time</label>
                   <input type="time" className="w-full p-6 bg-slate-50 rounded-[2rem] font-black text-xl" value={editingItem.startTime} onChange={e => setEditingItem({...editingItem, startTime: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-4">End Time</label>
                   <input type="time" className="w-full p-6 bg-slate-50 rounded-[2rem] font-black text-xl" value={editingItem.endTime} onChange={e => setEditingItem({...editingItem, endTime: e.target.value})} />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Mission Notes</label>
                 <textarea rows={3} className="w-full p-6 bg-slate-50 rounded-[2rem] font-medium text-slate-600 outline-none border-4 border-transparent focus:border-indigo-100 resize-none" value={editingItem.notes || ''} onChange={e => setEditingItem({...editingItem, notes: e.target.value})} placeholder="What did you achieve or learn?" />
               </div>

               <button className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition">Update Record</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
