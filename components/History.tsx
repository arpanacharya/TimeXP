
import React, { useState, useMemo, useEffect } from 'react';
import { UserAccount, DailyLog, ScheduleItem, ActivityCategory } from '../types';
import { storageService } from '../services/storageService';

interface Props {
  user: UserAccount;
}

export const History: React.FC<Props> = ({ user }) => {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      const data = await storageService.getDailyLogs(user.id);
      setLogs(data);
      setIsLoading(false);
    };
    fetchLogs();
  }, [user.id]);

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
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Querying Cloud Archives...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Historical Sync Pulse</h3>
        <div className="flex flex-wrap gap-2">
          {last30Days.map(date => {
            const log = getLogForDate(date);
            const score = log ? calculateSyncScore(log) : null;
            let color = 'bg-slate-50';
            if (score !== null) {
              if (score >= 80) color = 'bg-indigo-600';
              else if (score >= 50) color = 'bg-indigo-300';
              else color = 'bg-indigo-100';
            }
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl transition-all hover:scale-110 ${color} ${selectedDate === date ? 'ring-4 ring-indigo-200 border-2 border-indigo-600' : ''}`}
                title={`${date}: ${score !== null ? score + '%' : 'No Log'}`}
              />
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center px-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Timeline Replay</h2>
          <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Archive for {selectedDate}</p>
        </div>
        <input 
          type="date" 
          className="p-3 bg-white rounded-xl border border-slate-100 font-black text-slate-700 outline-none text-xs"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {!currentLog ? (
        <div className="bg-white p-20 rounded-[3rem] text-center border-4 border-dashed border-slate-100">
          <p className="text-7xl mb-6">🛰️</p>
          <h3 className="text-2xl font-black text-slate-400 uppercase">Void Detected</h3>
          <p className="text-slate-300 font-bold mt-2">No log transmission received on this date.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Sync Efficiency</p>
              <p className="text-5xl font-black mt-2">{syncScore}%</p>
              <p className="text-xs font-bold mt-4 opacity-80">
                {currentLog.actualActivities.length} total entries logged.
              </p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Focus Areas</p>
               <div className="mt-4 space-y-3">
                  {Array.from(new Set(currentLog.actualActivities.map(a => a.category))).map(cat => (
                    <div key={cat} className="flex justify-between items-center">
                      <span className="text-sm font-black text-slate-700">{cat}</span>
                      <span className="text-[10px] bg-slate-50 px-2 py-1 rounded-md font-bold text-slate-400">
                        {currentLog.actualActivities.filter(a => a.category === cat).length} Hits
                      </span>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Log Entries</h4>
            {currentLog.actualActivities.map(item => (
              <div key={item.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex items-start gap-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${item.plannedId ? 'bg-indigo-600 text-white' : 'bg-cyan-100 text-cyan-600'}`}>
                  {item.plannedId ? '✓' : '＋'}
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <h5 className="text-xl font-black text-slate-800">{item.label}</h5>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.startTime} - {item.endTime}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-slate-900 text-white">{item.category}</span>
                    {item.actualSubject && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-amber-400 text-amber-900">{item.actualSubject}</span>}
                  </div>
                  
                  {item.notes && (
                    <div className="mt-4 p-5 bg-slate-50 rounded-[2rem] text-sm font-bold text-slate-500 italic border-l-4 border-indigo-400">
                      "{item.notes}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
