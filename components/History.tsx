
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fetching Archives...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-32 fade-in">
      {isParentView && children.length > 0 && (
        <div className="flex justify-center">
          <div className="bg-slate-100 p-2 rounded-[3rem] flex gap-2 border border-slate-200">
            {children.map(child => (
              <button 
                key={child.id}
                onClick={() => setActiveUser(child)}
                className={`px-6 py-2 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all ${activeUser.id === child.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}
              >
                {child.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Activity Pulse (30 Days)</h3>
        <div className="flex flex-wrap gap-2">
          {last30Days.map(date => {
            const log = getLogForDate(date);
            const score = log ? calculateSyncScore(log) : null;
            let color = 'bg-slate-50';
            if (score !== null) color = score >= 80 ? 'bg-indigo-600' : score >= 50 ? 'bg-indigo-300' : 'bg-indigo-100';
            return (
              <button key={date} onClick={() => setSelectedDate(date)} className={`w-10 h-10 rounded-xl transition-all hover:scale-110 ${color} ${selectedDate === date ? 'ring-4 ring-indigo-200' : ''}`} />
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center px-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase">{activeUser.name.split(' ')[0]}'s History</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{selectedDate}</p>
        </div>
        <input type="date" className="p-3 bg-white rounded-xl border border-slate-100 font-black text-xs" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
      </div>

      {!currentLog ? (
        <div className="bg-white p-20 rounded-[3.5rem] text-center border-4 border-dashed border-slate-100 text-slate-300">
          <span className="text-6xl">📡</span>
          <p className="mt-4 font-black uppercase text-sm tracking-widest">No telemetry for this cycle</p>
        </div>
      ) : (
        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-6">
             <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white">
               <p className="text-[10px] font-black uppercase opacity-60">Schedule Sync Rate</p>
               <p className="text-5xl font-black mt-2">{syncScore}%</p>
             </div>
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasks Recorded</p>
               <p className="text-5xl font-black text-slate-900 mt-2">{currentLog.actualActivities.length}</p>
             </div>
           </div>
           <div className="space-y-4">
             {currentLog.actualActivities.map(item => (
               <div key={item.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col gap-2">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-6">
                     <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 text-xl font-black">✓</div>
                     <div>
                       <div className="flex items-center gap-2">
                         <h4 className="font-black text-slate-800 text-lg">{item.label}</h4>
                         {item.plannedSubject && <span className="text-[8px] font-black uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{item.plannedSubject}</span>}
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.startTime} - {item.endTime}</p>
                     </div>
                   </div>
                   <span className="text-[10px] font-black uppercase px-4 py-2 bg-slate-100 rounded-full">{item.category}</span>
                 </div>
                 {item.notes && <p className="ml-20 text-xs text-slate-500 font-medium italic border-l-2 border-indigo-100 pl-4 py-1">"{item.notes}"</p>}
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};
