
import React, { useState } from 'react';
import { UserAccount, UserRole, GradeLevel } from '../types';
import { storageService } from '../services/storageService';
import { GRADE_TEMPLATES } from '../services/demoData';

interface Props { onLogin: (user: UserAccount) => void; }

const GRADES = [
  { level: GradeLevel.ELEMENTARY, icon: '🐣', label: 'Elementary' },
  { level: GradeLevel.MIDDLE, icon: '🚀', label: 'Middle' },
  { level: GradeLevel.HIGH, icon: '☄️', label: 'High School' },
  { level: GradeLevel.UNIVERSITY, icon: '🏛️', label: 'University' },
];

export const Auth: React.FC<Props> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ id: '', pass: '', name: '' });
  const [role, setRole] = useState(UserRole.STUDENT);
  const [grade, setGrade] = useState(GradeLevel.MIDDLE);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const users = await storageService.getUsers();
      const userId = formData.id.toLowerCase().trim();
      
      if (isLogin) {
        const found = users.find(u => u.userId === userId);
        if (found) onLogin(found);
        else throw new Error("Personnel record not found.");
      } else {
        if (users.some(u => u.userId === userId)) throw new Error("ID already taken.");
        const template = role === UserRole.STUDENT ? GRADE_TEMPLATES[grade](7) : { schedule: {}, xp: 0 };
        const newUser: UserAccount = {
          id: Math.random().toString(36).substr(2, 9),
          userId,
          name: formData.name,
          passwordHash: storageService.encryptPassword(formData.pass),
          role,
          grade: role === UserRole.STUDENT ? grade : undefined,
          weeklySchedule: template.schedule as any,
          xp: template.xp,
          onboardingCompleted: false
        };
        await storageService.saveUser(newUser);
        onLogin(newUser);
      }
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="max-w-xl mx-auto p-10 bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 fade-in">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white font-black text-3xl shadow-lg rotate-3">XP</div>
        <h1 className="text-4xl font-black tracking-tighter">TimeXP</h1>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-2">Mission Control Portal</p>
      </div>

      {!isLogin && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button onClick={() => setRole(UserRole.STUDENT)} className={`p-6 rounded-3xl border-4 transition-all ${role === UserRole.STUDENT ? 'border-indigo-600 bg-indigo-50 shadow-inner' : 'border-slate-50'}`}>
            <span className="text-3xl block mb-2">🚀</span>
            <span className="text-[10px] font-black uppercase">Student</span>
          </button>
          <button onClick={() => setRole(UserRole.PARENT)} className={`p-6 rounded-3xl border-4 transition-all ${role === UserRole.PARENT ? 'border-indigo-600 bg-indigo-50 shadow-inner' : 'border-slate-50'}`}>
            <span className="text-3xl block mb-2">🛡️</span>
            <span className="text-[10px] font-black uppercase">Parent</span>
          </button>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        {!isLogin && <input required className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-300 outline-none" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />}
        <input required className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-300 outline-none" placeholder="Access ID" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
        <input required type="password" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-300 outline-none" placeholder="Access Key" value={formData.pass} onChange={e => setFormData({...formData, pass: e.target.value})} />
        
        {!isLogin && role === UserRole.STUDENT && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {GRADES.map(g => (
              <button key={g.level} type="button" onClick={() => setGrade(g.level)} className={`p-4 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${grade === g.level ? 'bg-indigo-600 text-white' : 'bg-slate-50'}`}>{g.icon} {g.label}</button>
            ))}
          </div>
        )}

        <button className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition mt-6">
          {isLogin ? 'Log In 🌐' : 'Deploy 🚀'}
        </button>
      </form>
      
      <button onClick={() => setIsLogin(!isLogin)} className="w-full text-center mt-8 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition">
        {isLogin ? "New Specialist? Enroll Here" : "Already Registered? Sign In"}
      </button>
      {error && <p className="mt-4 text-center text-red-500 font-black text-xs bg-red-50 p-4 rounded-2xl">{error}</p>}
    </div>
  );
};
