
import React, { useState, useEffect, useRef } from 'react';
import { Auth } from './Auth.tsx';
import { Dashboard } from './Dashboard.tsx';
import { ScheduleEditor } from './ScheduleEditor.tsx';
import { FamilyManagement } from './FamilyManagement.tsx';
import { History } from './History.tsx';
import { TestBed } from './TestBed.tsx';
import { OnboardingTour } from './OnboardingTour.tsx';
import { UserAccount, UserRole, ScheduleItem } from '../types.ts';
import { storageService } from '../services/storageService.ts';
import { isCloudEnabled } from '../services/neonClient.ts';

const App: React.FC = () => {
  const [user, setUser] = useState<UserAccount | null>(storageService.getSession());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'family' | 'history'>('dashboard');
  const [toast, setToast] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
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
    const startup = async () => {
      if (!isCloudEnabled) {
        setIsValidating(false);
        return;
      }

      try {
        // Automatically ensure tables exist on the current Neon instance
        await storageService.initializeDatabase();
        
        if (user) {
          const users = await storageService.getUsers();
          const stillExists = users.find((u: UserAccount) => u.id === user.id);
          if (!stillExists) {
            handleLogout();
          } else {
            setUser(stillExists);
          }
        }
      } catch (err) {
        console.error("Mission Control Initialization Failed:", err);
      } finally {
        setIsValidating(false);
      }
    };
    startup();
  }, []);

  useEffect(() => {
    if (!user || user.role !== UserRole.STUDENT) return;
    
    const checkReminders = () => {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentSchedule = user.weeklySchedule?.[currentDay] || [];
      const nowTotalMinutes = now.getHours() * 60 + now.getMinutes();

      currentSchedule.forEach((item: ScheduleItem) => {
        if (item.reminderMinutes === undefined || item.reminderMinutes === null) return;
        
        const [h, m] = item.startTime.split(':').map(Number);
        const triggerTime = (h * 60 + m) - item.reminderMinutes;

        if (nowTotalMinutes === triggerTime) {
          const notificationId = `${item.id}-${now.toDateString()}-${triggerTime}`;
          if (!notifiedRefs.current.has(notificationId)) {
            if (Notification.permission === 'granted') {
              new Notification('Mission Alert! 🚀', { 
                body: `"${item.label}" starts in ${item.reminderMinutes} minutes.`,
                icon: 'https://cdn-icons-png.flaticon.com/512/3069/3069186.png'
              });
              notifiedRefs.current.add(notificationId);
            }
          }
        }
      });
    };

    const intervalId = setInterval(checkReminders, 30000);
    return () => clearInterval(intervalId);
  }, [user]);

  const login = (u: UserAccount) => {
    storageService.setSession(u);
    setUser(u);
    showToast(`Welcome back, Specialist ${u.name.split(' ')[0]}!`);
  };

  if (isValidating) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing with Mission Control...</p>
      </div>
    </div>
  );

  if (!isCloudEnabled) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-8 fade-in">
          <div className="text-8xl">📡</div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Connection Lost</h1>
          <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 space-y-4">
            <p className="text-slate-400 font-bold text-sm leading-relaxed">
              Mission Control cannot find the <code className="text-indigo-400">NEON_DATABASE_URL</code> in the environment.
            </p>
            <p className="text-slate-500 text-xs italic">
              1. Add your database URL to Netlify Site Settings.<br/>
              2. Trigger a new Production Deploy.
            </p>
          </div>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition">Retry Link 🔄</button>
        </div>
      </div>
    );
  }

  if (!user) return (
    <div className="min-h-screen bg-slate-50 py-20 blueprint-bg">
      <Auth onLogin={login} />
      <TestBed />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {user.role === UserRole.STUDENT && !user.onboardingCompleted && (
        <OnboardingTour onComplete={() => {
          const updated = { ...user, onboardingCompleted: true };
          storageService.saveUser(updated);
          setUser(updated);
        }} />
      )}

      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
          <div className="glass px-8 py-4 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-4">
            <span className="text-indigo-600 text-xl font-black">⚡</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{toast}</span>
          </div>
        </div>
      )}

      <nav className="fixed top-0 w-full glass z-40 hidden md:block border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg">XP</div>
            <span className="text-2xl font-black tracking-tighter">TimeXP</span>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-xs font-black uppercase">{user.name}</p>
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{user.role}</p>
            </div>
            <button onClick={handleLogout} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition">Logoff</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-10 md:pt-32">
        {activeTab === 'dashboard' && <Dashboard user={user} onToast={showToast} />}
        {activeTab === 'schedule' && <ScheduleEditor user={user} onUpdate={(u: UserAccount) => { setUser(u); showToast("Strategy Updated! 📡"); }} />}
        {activeTab === 'family' && user.role === UserRole.PARENT && <FamilyManagement parent={user} />}
        {activeTab === 'history' && <History user={user} />}
      </main>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
        <div className="bg-slate-900/95 backdrop-blur-2xl p-3 rounded-[3rem] shadow-2xl border border-white/10 flex justify-between">
          {[
            { id: 'dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { id: 'schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { id: 'history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            ...(user.role === UserRole.PARENT ? [{ id: 'family', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' }] : [])
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`p-5 rounded-[2rem] transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-xl scale-110 -translate-y-2' : 'text-slate-400 hover:text-white'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={t.icon} /></svg>
            </button>
          ))}
          <button onClick={handleLogout} className="md:hidden p-5 text-red-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg></button>
        </div>
      </div>
      <TestBed />
    </div>
  );
};

export default App;
