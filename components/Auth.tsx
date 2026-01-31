
import React, { useState } from 'react';
import { UserAccount, UserRole, GradeLevel, DailyLog } from '../types';
import { supabase } from '../services/supabaseClient';
import { storageService } from '../services/storageService';
import { GRADE_TEMPLATES } from '../services/demoData';

interface AuthProps {
  onLogin: (user: UserAccount) => void;
}

const GRADE_INFO = [
  { level: GradeLevel.ELEMENTARY, icon: '🐣', label: 'Elementary', range: [1, 5] },
  { level: GradeLevel.MIDDLE, icon: '🚀', label: 'Middle School', range: [6, 8] },
  { level: GradeLevel.HIGH, icon: '☄️', label: 'High School', range: [9, 12] },
  { level: GradeLevel.UNIVERSITY, icon: '🏛️', label: 'University', range: [1, 4] },
];

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(''); // Use email for Supabase
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [grade, setGrade] = useState<GradeLevel>(GradeLevel.MIDDLE);
  const [specificGrade, setSpecificGrade] = useState<number>(6);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;

        if (data.user) {
          const profile = await storageService.getUserProfile(data.user.id);
          if (profile) onLogin(profile);
        }
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;

        if (data.user) {
          const template = GRADE_TEMPLATES[grade](specificGrade);
          const newUser: UserAccount = {
            id: data.user.id,
            userId: email.split('@')[0],
            name: name || email.split('@')[0],
            phone: '',
            passwordHash: '', // Handled by Supabase Auth
            role,
            grade: role === UserRole.STUDENT ? grade : undefined,
            specificGrade: role === UserRole.STUDENT ? specificGrade : undefined,
            weeklySchedule: template.schedule,
            xp: template.xp,
          };
          
          await storageService.saveUser(newUser);
          onLogin(newUser);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedLevelInfo = GRADE_INFO.find(g => g.level === grade);

  return (
    <div className="max-w-xl mx-auto mt-10 p-12 bg-white rounded-[3.5rem] shadow-2xl relative border border-slate-100 mb-20 overflow-hidden fade-in">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-cyan-400 to-purple-500"></div>
      
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] mx-auto mb-8 flex items-center justify-center text-white font-black text-4xl shadow-2xl rotate-3">XP</div>
        <h1 className="text-5xl font-black text-slate-900 mb-3 tracking-tighter">TimeXP</h1>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cloud Connected Student Command</p>
      </div>
      
      <form onSubmit={handleAuth} className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <input required type="email" className="w-full p-5 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold" value={email} onChange={e => setEmail(e.target.value)} placeholder="Academy Email" />
          <input required type="password" className="w-full p-5 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold" value={password} onChange={e => setPassword(e.target.value)} placeholder="Security Key" />
        </div>

        {!isLogin && (
          <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
            <input required className="w-full p-5 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold" value={name} onChange={e => setName(e.target.value)} placeholder="Callsign (Full Name)" />
            <div className="grid grid-cols-2 gap-4">
              {GRADE_INFO.map((g) => (
                <button key={g.level} type="button" onClick={() => { setGrade(g.level); setSpecificGrade(g.range[0]); }} className={`flex flex-col items-center gap-3 p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${grade === g.level ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl scale-105' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-100 hover:bg-white'}`}>
                  <span className="text-3xl">{g.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">{g.label}</span>
                </button>
              ))}
            </div>
            <div className="bg-slate-900 p-8 rounded-[3rem] text-white">
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 text-center">Specific Deployment Year</label>
              <div className="flex items-center justify-center gap-10">
                 <button type="button" onClick={() => setSpecificGrade(Math.max(selectedLevelInfo?.range[0] || 1, specificGrade - 1))} className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-black">-</button>
                 <span className="text-5xl font-black">{specificGrade}</span>
                 <button type="button" onClick={() => setSpecificGrade(Math.min(selectedLevelInfo?.range[1] || 12, specificGrade + 1))} className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-black">+</button>
              </div>
            </div>
          </div>
        )}

        <button disabled={isLoading} className="w-full bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black text-xl hover:bg-indigo-700 transition shadow-2xl uppercase tracking-[0.2em]">
          {isLoading ? 'Syncing...' : isLogin ? 'Initialize Command 🌐' : 'Enroll in Squad ✨'}
        </button>
      </form>

      <div className="mt-12 text-center">
        <button onClick={() => setIsLogin(!isLogin)} className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-indigo-600 transition">
          {isLogin ? "Recruit New Specialist" : "Back to Station Login"}
        </button>
      </div>
      {error && <p className="text-red-500 mt-6 text-center font-black bg-red-50 p-5 rounded-3xl border border-red-100">{error}</p>}
    </div>
  );
};
