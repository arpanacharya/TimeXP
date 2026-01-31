
import React, { useState, useMemo, useEffect } from 'react';
import { UserAccount, DailyLog, ScheduleItem, ActivityCategory, UserRole } from '../types';
import { storageService } from '../services/storageService';

interface Props {
  user: UserAccount;
}

export const History: React.FC<Props> = ({ user }) => {
  const [activeUser, setActiveUser] = useState<UserAccount>(user);
  const [children, setChildren] = useState<UserAccount[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);

  const isParentView = user.role === UserRole.PARENT;

  useEffect(() => {
    if (isParentView) {
      storageService.getUsers().then(users => {
        const mySquad = users.filter(u => u.parentId === user.id);
        setChildren(mySquad);
        if (mySquad.length > 0 && activeUser.id === user.id) {
          setActiveUser(mySquad[0]);
        }
      });
    }
  }, [user.id, isParentView]);

  useEffect(() => {
    const fetchLogs = async () => {
      if (activeUser.role === UserRole.PARENT && children.length === 0) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const data = await storageService.getDailyLogs(activeUser.id);
      setLogs(data);
      setIsLoading(false);
    };
    fetchLogs();
  }, [activeUser.id]);

  const last30Days = useMemo(() => {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  const getLogForDate = (date: string) => logs.find(l => l.date === date);

  const calculateSyncScore = (log: DailyLog) => {
    if (!log || log.plannedSnapshot.length === 0) return 0;
    const matched = log.actualActivities.filter(a => !!a.plannedId).length;
    return Math.round((matched / log.plannedSnapshot.length) * 100);
  };

  const currentLog = useMemo(() => getLogForDate(selectedDate), [logs, selectedDate]);
  const syncScore = currentLog ? calculateSyncScore(currentLog) : 0;

  // Comparison logic for Planned vs Actual
  const timelineComparison = useMemo(() => {
    if (!currentLog) return [];
    
    const planned = currentLog.plannedSnapshot;
    const actual = currentLog.actualActivities;
    
    const loggedMap = new Map<string, ScheduleItem>();
    actual.forEach(a => { if (a.plannedId) loggedMap.set(a.plannedId, a); });

    const items = planned.map(p => {
      const log = loggedMap.get(p.id);
      return { 
        ...p, 
        actual: log || null,
        isSynced: !!log
      };
    });

    const unscheduled = actual.filter(a => !a.plannedId);
    return { scheduled: items, unscheduled };
  }, [currentLog]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Decrypting Archives...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-32 fade-in px-4">
      {isParentView && children.length > 0 && (
        <div className="flex justify-center mb-8">
          <div className="bg-slate-100 p-2 rounded-[3rem] flex gap-2 border border-slate-200">
            {children.map(child => (
              <button 
                key={child.id}
                onClick={() => setActiveUser(child)}
                className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeUser.id === child.id ? 'bg-slate-900 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-white'}`}
              >
                {child.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 px-2">Historical Pulse (30 Days)</h3>
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          {last30Days.map(date => {
            const log = getLogForDate(date);
            const score = log ? calculateSyncScore(log) : null;
            let color = 'bg-slate-50';
            if (score !== null) color = score >= 80 ? 'bg-indigo-600' : score >= 50 ? 'bg-indigo-300' : 'bg-indigo-100';
            return (
              <button 
                key={date} 
                onClick={() => setSelectedDate(date)} 
                className={`w-10 h-10 rounded-xl transition-all hover:scale-110 border ${selectedDate === date ? 'ring-4 ring-indigo-200 border-indigo-400' : 'border-transparent'} ${color}`}
                title={`${date}: ${score !== null ? score + '%' : 'No Data'}`}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900">{activeUser.name.split(' ')[0]}'s Mission Logs</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Analytics Archive: {selectedDate}</p>
        </div>
        <div className="relative">
          <input type="date" className="p-4 bg-white rounded-2xl border border-slate-200 font-black text-xs shadow-sm outline-none focus:border-indigo-500" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
      </div>

      {!currentLog ? (
        <div className="bg-white p-24 rounded-[4rem] text-center border-4 border-dashed border-slate-100 text-slate-300">
          <span className="text-8xl block mb-6">📡</span>
          <p className="font-black uppercase text-sm tracking-widest">No telemetry available for this cycle</p>
          <p className="text-[10px] font-bold mt-2">Try selecting a date highlighted in the pulse grid above</p>
        </div>
      ) : (
        <div className="space-y-10">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-indigo-600 p-10 rounded-[3.5rem] text-white shadow-xl flex flex-col justify-between">
               <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Efficiency Rating</p>
               <p className="text-6xl font-black my-4">{syncScore}%</p>
               <p className="text-[9px] font-black uppercase opacity-40">Based on planned snapshot</p>
             </div>
             <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl flex flex-col justify-between">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasks Finalized</p>
               <p className="text-6xl font-black text-slate-900 my-4">{currentLog.actualActivities.length}</p>
               <div className="w-full h-1 bg-slate-100 rounded-full">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, currentLog.actualActivities.length * 10)}%` }}></div>
               </div>
             </div>
             <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-xl flex flex-col justify-between">
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">XP Earned</p>
               <p className="text-6xl font-black text-white my-4">
                  {currentLog.actualActivities.reduce((acc, a) => acc + (a.plannedId ? 50 : 25), 0)}
               </p>
               <p className="text-[9px] font-black uppercase text-slate-500">Day Total Balance</p>
             </div>
           </div>

           <div className="space-y-12">
             <div className="space-y-6">
               <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] px-4 flex items-center gap-3">
                 <span className="w-8 h-px bg-slate-200"></span>
                 Scheduled Operations
                 <span className="flex-grow h-px bg-slate-200"></span>
               </h4>
               <div className="space-y-4">
                 {(timelineComparison as any).scheduled.map((item: any) => (
                   <div key={item.id} className={`bg-white p-8 rounded-[3rem] border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${item.isSynced ? 'border-green-100 shadow-lg shadow-green-50' : 'border-slate-50 opacity-60'}`}>
                     <div className="flex items-center gap-6">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black transition-colors ${item.isSynced ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                         {item.isSynced ? '✓' : '!'}
                       </div>
                       <div>
                         <div className="flex items-center gap-3">
                           <h4 className={`font-black text-lg uppercase tracking-tight ${item.isSynced ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{item.label}</h4>
                           {item.plannedSubject && <span className="text-[8px] font-black uppercase bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">{item.plannedSubject}</span>}
                         </div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.startTime} - {item.endTime}</p>
                       </div>
                     </div>
                     {item.actual?.notes && (
                       <p className="text-xs text-slate-500 font-medium italic sm:max-w-xs border-l-2 border-indigo-100 pl-4 py-1">
                         "{item.actual.notes}"
                       </p>
                     )}
                   </div>
                 ))}
               </div>
             </div>

             {(timelineComparison as any).unscheduled.length > 0 && (
               <div className="space-y-6">
                 <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] px-4 flex items-center gap-3">
                   <span className="w-8 h-px bg-indigo-100"></span>
                   Off-Schedule Exploits
                   <span className="flex-grow h-px bg-indigo-100"></span>
                 </h4>
                 <div className="space-y-4">
                   {(timelineComparison as any).unscheduled.map((item: any) => (
                     <div key={item.id} className="bg-indigo-50/30 p-8 rounded-[3rem] border-2 border-indigo-100 border-dashed flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                       <div className="flex items-center gap-6">
                         <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-lg">
                           +
                         </div>
                         <div>
                           <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight">{item.label}</h4>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.startTime} - {item.endTime} • BONUS XP</p>
                         </div>
                       </div>
                       {item.notes && (
                         <p className="text-xs text-indigo-600 font-medium italic sm:max-w-xs border-l-2 border-indigo-200 pl-4 py-1">
                           "{item.notes}"
                         </p>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};
