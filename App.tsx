
import React, { useState, useEffect, useRef } from 'react';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { ScheduleEditor } from './components/ScheduleEditor';
import { FamilyManagement } from './components/FamilyManagement';
import { History } from './components/History';
import { TestBed } from './components/TestBed';
import { UserAccount, UserRole, ScheduleItem } from './types';
import { storageService } from './services/storageService';

const App: React.FC = () => {
  const [user, setUser] = useState<UserAccount | null>(storageService.getSession());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'family' | 'history'>('dashboard');
  const [toast, setToast] = useState<string | null>(null);
  const notifiedRefs = useRef<Set<string>>(new Set());

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = () => {
    storageService.setSession(null);
    setUser(null);
  };

  useEffect(() => {
    if (!user) return;
    const checkReminders = () => {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentSchedule = user.weeklySchedule[currentDay] || [];
      const nowTotalMinutes = now.getHours() * 60 + now.getMinutes();

      currentSchedule.forEach((item: ScheduleItem) => {
        if (item.reminderMinutes === undefined) return;
        const [h, m] = item.startTime.split(':').map(Number);
        const triggerTime = (h * 60 + m) - item.reminderMinutes;

        if (nowTotalMinutes === triggerTime) {
          const notificationId = `${item.id}-${now.toDateString()}-${triggerTime}`;
          if (!notifiedRefs.current.has(notificationId)) {
            if (Notification.permission === 'granted') {
              new Notification('Mission Alert! 🚀', { body: `"${item.label}" starts soon.` });
              notifiedRefs.current.add(notificationId);
            }
          }
        }
      });
    };
    const intervalId = setInterval(checkReminders, 30000);
    return () => clearInterval(intervalId);
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 py-10 blueprint-bg">
        <Auth onLogin={setUser} />
        <TestBed />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 md:pb-0">
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top duration-300">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3">
            <span className="text-cyan-400">⚡</span>
            <span className="text-xs font-black uppercase tracking-widest">{toast}</span>
          </div>
        </div>
      )}

      <nav className="fixed top-0 w-full glass z-40 border-b border-slate-200/50 hidden md:block">
        <div className="max-w-6xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4 cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg">XP</div>
            <span className="text-xl font-black text-slate-900 tracking-tighter">TimeXP</span>
          </div>
          <div className="flex space-x-6 items-center">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-800 uppercase">{user.name}</span>
                <span className="text-[8px] font-black text-indigo-500 uppercase">Rank: Explorer</span>
             </div>
            <button onClick={handleLogout} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition">Logoff</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-10 md:pt-32">
        {activeTab === 'dashboard' && <Dashboard user={user} onToast={showToast} />}
        {activeTab === 'schedule' && <ScheduleEditor user={user} onUpdate={(u) => { setUser(u); showToast("Blueprint saved!"); }} />}
        {activeTab === 'history' && <History user={user} />}
        {activeTab === 'family' && user.role === UserRole.PARENT && <FamilyManagement parent={user} />}
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
        <div className="bg-slate-900/95 backdrop-blur-xl p-2 rounded-[2.5rem] shadow-2xl border border-white/10 flex items-center justify-around">
          {[
            { id: 'dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { id: 'schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { id: 'history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            ...(user.role === UserRole.PARENT ? [{ id: 'family', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }] : [])
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`p-4 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl scale-110' : 'text-slate-500 hover:text-white'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={tab.icon}></path></svg>
            </button>
          ))}
          <button onClick={handleLogout} className="md:hidden p-4 text-red-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg></button>
        </div>
      </div>
      <TestBed />
    </div>
  );
};

export default App;
