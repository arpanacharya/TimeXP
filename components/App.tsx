
import React, { useState, useEffect } from 'react';
import { Auth } from './Auth';
import { Dashboard } from './Dashboard';
import { ScheduleEditor } from './ScheduleEditor';
import { FamilyManagement } from './FamilyManagement';
import { History } from './History';
import { TestBed } from './TestBed';
import { UserAccount, UserRole } from '../types';
import { supabase, isCloudEnabled } from '../services/supabaseClient';
import { storageService } from '../services/storageService';

const App: React.FC = () => {
  const [user, setUser] = useState<UserAccount | null>(storageService.getSession());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'family' | 'history'>('dashboard');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const initAuth = async () => {
      if (isCloudEnabled && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await storageService.getUserProfile(session.user.id);
          if (profile) setUser(profile);
        }
      }
      setLoading(false);
    };

    initAuth();

    if (isCloudEnabled && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const profile = await storageService.getUserProfile(session.user.id);
          setUser(profile);
        } else {
          setUser(null);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleLogout = async () => {
    if (isCloudEnabled && supabase) await supabase.auth.signOut();
    storageService.setSession(null);
    setUser(null);
  };

  const handleLoginSuccess = (loggedInUser: UserAccount) => {
    storageService.setSession(loggedInUser);
    setUser(loggedInUser);
    showToast(`Welcome back, Commander ${loggedInUser.name.split(' ')[0]}!`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 blueprint-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Booting Systems...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 blueprint-bg">
        <Auth onLogin={handleLoginSuccess} />
        <TestBed />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 md:pb-0 overflow-x-hidden">
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top-4 duration-500">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl border border-white/10 flex items-center gap-4">
            <span className="text-indigo-400 text-xl">⚡</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{toast}</span>
          </div>
        </div>
      )}

      <nav className="fixed top-0 w-full glass z-40 border-b border-slate-200/50 hidden md:block">
        <div className="max-w-6xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4 cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-xl group-hover:rotate-12 transition duration-300">XP</div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">TimeXP</span>
              <div className="flex items-center gap-1 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isCloudEnabled ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                  {isCloudEnabled ? 'Cloud Sync Active' : 'Local Storage Mode'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-10 items-center">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{user.name}</p>
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mt-1">LVL {Math.floor(user.xp / 1000) + 1} Specialist</p>
            </div>
            <button onClick={handleLogout} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition">Logout</button>
          </div>
        </div>
      </nav>

      <main key={activeTab} className="max-w-6xl mx-auto px-6 pt-10 md:pt-36">
        {activeTab === 'dashboard' && <Dashboard user={user} onToast={showToast} />}
        {activeTab === 'schedule' && <ScheduleEditor user={user} onUpdate={(u) => { setUser(u); showToast("Telemetry Synchronized!"); }} />}
        {activeTab === 'history' && <History user={user} />}
        {activeTab === 'family' && user.role === UserRole.PARENT && <FamilyManagement parent={user} />}
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
        <div className="bg-slate-900/95 backdrop-blur-2xl p-3 rounded-[3rem] shadow-2xl border border-white/10 flex items-center justify-between">
          {[
            { id: 'dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { id: 'schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { id: 'history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`p-5 rounded-[2.5rem] transition-all duration-300 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-2xl scale-110 -translate-y-2' : 'text-slate-500 hover:text-white'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={tab.icon}></path></svg>
            </button>
          ))}
          <button onClick={handleLogout} className="md:hidden p-5 text-red-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg></button>
        </div>
      </div>
      <TestBed />
    </div>
  );
};

export default App;
