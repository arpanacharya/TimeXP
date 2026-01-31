
import React, { useState, useEffect } from 'react';
import { UserAccount, UserRole, GradeLevel, WeeklySchedule } from '../types';
import { storageService } from '../services/storageService';

interface Props {
  parent: UserAccount;
}

const DEFAULT_SCHEDULE: WeeklySchedule = {
  'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': [], 'Sunday': []
};

const GRADE_INFO = [
  { level: GradeLevel.ELEMENTARY, icon: '🐣', label: 'Elementary' },
  { level: GradeLevel.MIDDLE, icon: '🚀', label: 'Middle' },
  { level: GradeLevel.HIGH, icon: '☄️', label: 'High School' },
  { level: GradeLevel.UNIVERSITY, icon: '🏛️', label: 'University' },
];

export const FamilyManagement: React.FC<Props> = ({ parent }) => {
  const [children, setChildren] = useState<UserAccount[]>([]);
  const [childName, setChildName] = useState('');
  const [childUserId, setChildUserId] = useState('');
  const [childPassword, setChildPassword] = useState('');
  const [childGrade, setChildGrade] = useState<GradeLevel>(GradeLevel.MIDDLE);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchChildren = async () => {
      const allUsers = await storageService.getUsers();
      setChildren(allUsers.filter(u => u.parentId === parent.id));
    };
    fetchChildren();
  }, [parent.id]);

  const createChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newChild: UserAccount = {
        id: Math.random().toString(36).substr(2, 9),
        userId: childUserId.trim().toLowerCase(),
        name: childName,
        phone: '',
        passwordHash: storageService.encryptPassword(childPassword),
        role: UserRole.STUDENT,
        grade: childGrade,
        parentId: parent.id,
        weeklySchedule: DEFAULT_SCHEDULE,
        xp: 0
      };
      await storageService.saveUser(newChild);
      
      setChildren([...children, newChild]);
      setChildName('');
      setChildUserId('');
      setChildPassword('');
      setShowAddForm(false);
      alert(`Success! ${childName} is now part of the squad. They can log in with ID: ${childUserId}`);
    } catch (err) {
      alert('Error creating account. Check if ID is unique.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 fade-in px-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">The Squad Hub</h2>
          <p className="text-slate-500 font-bold text-xs tracking-widest uppercase mt-1">Recruit and manage your family team</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className={`w-full md:w-auto px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl ${showAddForm ? 'bg-slate-200 text-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          {showAddForm ? '✕ Cancel Enrollment' : '+ Enroll New Specialist'}
        </button>
      </header>

      {showAddForm && (
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-indigo-50 animate-in slide-in-from-top-4">
          <form onSubmit={createChild} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2 mb-2">Member Credentials</h3>
              <input required className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold" value={childName} onChange={e => setChildName(e.target.value)} placeholder="Full Name (e.g. Leo)" />
              <input required className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold" value={childUserId} onChange={e => setChildUserId(e.target.value)} placeholder="Create Login ID" />
              <input required type="password" className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold" value={childPassword} onChange={e => setChildPassword(e.target.value)} placeholder="Create Password" />
            </div>
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2 mb-2">Sector Assignment</h3>
              <div className="grid grid-cols-2 gap-2">
                {GRADE_INFO.map((g) => (
                  <button key={g.level} type="button" onClick={() => setChildGrade(g.level)} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${childGrade === g.level ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-50 text-slate-500 hover:border-slate-100'}`}>
                    <span className="text-xl">{g.icon}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button disabled={isLoading} className="md:col-span-2 w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition shadow-lg mt-4">
              {isLoading ? 'Processing...' : 'Deploy Specialist 🚀'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children.length === 0 ? (
          <div className="md:col-span-3 py-32 bg-white rounded-[3rem] text-center border-4 border-dashed border-slate-100 flex flex-col items-center justify-center">
            <span className="text-6xl mb-6 grayscale">👥</span>
            <p className="text-sm font-black text-slate-300 uppercase tracking-[0.2em]">Squad Roster Empty</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2">Enroll your students to start tracking their progress</p>
          </div>
        ) : (
          children.map(child => (
            <div key={child.id} className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col items-center text-center group hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner group-hover:bg-indigo-100 transition">
                {child.grade ? GRADE_AVATARS[child.grade] : '👤'}
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-1">{child.name}</h3>
              <div className="flex items-center gap-2 mb-6">
                 <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest">ID: {child.userId}</span>
                 <span className="bg-indigo-100 text-indigo-600 text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest">LVL {Math.floor(child.xp / 1000) + 1}</span>
              </div>
              
              <div className="w-full space-y-3">
                <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 px-2">
                   <span>XP PROGRESS</span>
                   <span>{child.xp % 1000} / 1000</span>
                </div>
                <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${(child.xp % 1000) / 10}%` }}></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const GRADE_AVATARS: Record<GradeLevel, string> = {
  [GradeLevel.ELEMENTARY]: '🐣',
  [GradeLevel.MIDDLE]: '🚀',
  [GradeLevel.HIGH]: '☄️',
  [GradeLevel.UNIVERSITY]: '🏛️',
};
