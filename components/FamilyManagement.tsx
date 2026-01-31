
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

const GRADE_AVATARS: Record<GradeLevel, string> = {
  [GradeLevel.ELEMENTARY]: '🐣',
  [GradeLevel.MIDDLE]: '🚀',
  [GradeLevel.HIGH]: '☄️',
  [GradeLevel.UNIVERSITY]: '🏛️',
};

export const FamilyManagement: React.FC<Props> = ({ parent }) => {
  const [children, setChildren] = useState<UserAccount[]>([]);
  const [formData, setFormData] = useState({ name: '', userId: '', password: '', grade: GradeLevel.MIDDLE });
  const [editingChild, setEditingChild] = useState<UserAccount | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, [parent.id]);

  const fetchChildren = async () => {
    const allUsers = await storageService.getUsers();
    setChildren(allUsers.filter(u => u.parentId === parent.id));
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const users = await storageService.getUsers();
      const lowerUserId = formData.userId.trim().toLowerCase();

      if (!editingChild || (editingChild && editingChild.userId !== lowerUserId)) {
         if (users.some(u => u.userId === lowerUserId && u.id !== (editingChild?.id || ''))) {
            throw new Error("Access ID is already claimed by another specialist.");
         }
      }

      const updatedUser: UserAccount = {
        id: editingChild ? editingChild.id : Math.random().toString(36).substr(2, 9),
        userId: lowerUserId,
        name: formData.name,
        passwordHash: formData.password ? storageService.encryptPassword(formData.password) : (editingChild?.passwordHash || ''),
        role: UserRole.STUDENT,
        grade: formData.grade,
        parentId: parent.id,
        weeklySchedule: editingChild ? editingChild.weeklySchedule : DEFAULT_SCHEDULE,
        xp: editingChild ? editingChild.xp : 0,
        onboardingCompleted: editingChild ? editingChild.onboardingCompleted : false
      };

      await storageService.saveUser(updatedUser);
      await fetchChildren();
      
      resetForm();
      alert(`Tactical Success! ${updatedUser.name}'s records have been updated.`);
    } catch (err: any) {
      alert(err.message || 'Error processing request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChild = async (id: string, name: string) => {
    if (confirm(`CRITICAL: Are you sure you want to decommission Specialist ${name}? This will purge all their mission history and XP.`)) {
      await storageService.deleteUser(id);
      await fetchChildren();
    }
  };

  const handleDeleteParentAccount = async () => {
    const confirm1 = confirm("WARNING: You are about to delete YOUR Parent Account. This will also potentially orphan your squad members in the database. Continue?");
    if (confirm1) {
      const confirm2 = confirm("FINAL WARNING: This cannot be undone. All local and cloud data for this account will be purged. Proceed?");
      if (confirm2) {
        await storageService.deleteUser(parent.id);
        storageService.setSession(null);
        window.location.reload();
      }
    }
  };

  const forceSystemSync = () => {
    if (confirm("This will clear your local browser cache and force a fresh fetch from the server. Use this if you have manually modified the database. Continue?")) {
      storageService.setSession(null);
      localStorage.clear();
      window.location.reload();
    }
  };

  const openEdit = (child: UserAccount) => {
    setEditingChild(child);
    setFormData({
      name: child.name,
      userId: child.userId,
      password: '',
      grade: child.grade || GradeLevel.MIDDLE
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingChild(null);
    setFormData({ name: '', userId: '', password: '', grade: GradeLevel.MIDDLE });
    setShowAddForm(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 fade-in px-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">The Squad Hub</h2>
          <p className="text-slate-500 font-bold text-xs tracking-widest uppercase mt-1">Recruit and manage your family team</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={forceSystemSync}
            className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition shadow-sm"
          >
            Force Sync 🔄
          </button>
          <button 
            onClick={() => { if(showAddForm) resetForm(); else setShowAddForm(true); }}
            className={`flex-grow md:flex-grow-0 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl ${showAddForm ? 'bg-slate-200 text-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {showAddForm ? '✕ Close Form' : '+ Enroll Specialist'}
          </button>
        </div>
      </header>

      {showAddForm && (
        <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border border-indigo-50 animate-in slide-in-from-top-4">
          <form onSubmit={handleCreateOrUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2 mb-2">
                {editingChild ? 'Update Credentials' : 'Member Credentials'}
              </h3>
              <input required className="w-full p-5 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Specialist Name (e.g. Leo)" />
              <input required className="w-full p-5 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})} placeholder="Access ID" />
              <input required={!editingChild} type="password" className="w-full p-5 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editingChild ? "New Password (Leave blank to keep current)" : "Create Password"} />
            </div>
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2 mb-2">Sector Assignment</h3>
              <div className="grid grid-cols-2 gap-3">
                {GRADE_INFO.map((g) => (
                  <button key={g.level} type="button" onClick={() => setFormData({...formData, grade: g.level})} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${formData.grade === g.level ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-50 text-slate-500 hover:border-slate-100'}`}>
                    <span className="text-xl">{g.icon}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 flex gap-4 mt-4">
              <button disabled={isLoading} className="flex-grow bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition shadow-lg">
                {isLoading ? 'Processing...' : editingChild ? 'Update Specialist Data 📡' : 'Deploy Specialist 🚀'}
              </button>
              {editingChild && (
                <button type="button" onClick={resetForm} className="px-8 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition">Cancel</button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {children.length === 0 ? (
          <div className="md:col-span-3 py-32 bg-white rounded-[4rem] text-center border-4 border-dashed border-slate-100 flex flex-col items-center justify-center">
            <span className="text-7xl mb-6 grayscale opacity-20">👥</span>
            <p className="text-sm font-black text-slate-300 uppercase tracking-[0.2em]">Squad Roster Empty</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2">Enroll your students to start tracking their progress</p>
          </div>
        ) : (
          children.map(child => (
            <div key={child.id} className="bg-white p-10 rounded-[4rem] shadow-xl border border-slate-100 flex flex-col items-center text-center group hover:scale-[1.03] transition-all relative overflow-hidden">
              <div className="absolute top-6 right-6 flex gap-2">
                <button onClick={() => openEdit(child)} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl hover:bg-indigo-50 transition shadow-sm">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => handleDeleteChild(child.id, child.name)} className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 rounded-2xl hover:bg-red-50 transition shadow-sm">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>

              <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-5xl mb-8 shadow-inner group-hover:bg-indigo-100 transition rotate-3">
                {child.grade ? GRADE_AVATARS[child.grade] : '👤'}
              </div>
              
              <h3 className="text-3xl font-black text-slate-900 mb-2">{child.name}</h3>
              <div className="flex items-center gap-3 mb-8">
                 <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-slate-200">ID: {child.userId}</span>
                 <span className="bg-indigo-600 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">LVL {Math.floor(child.xp / 1000) + 1}</span>
              </div>
              
              <div className="w-full space-y-4 px-2">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                   <span>XP PROGRESS</span>
                   <span className="text-indigo-600">{child.xp % 1000} / 1000</span>
                </div>
                <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-1000" style={{ width: `${(child.xp % 1000) / 10}%` }}></div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-50 w-full flex justify-around">
                <div className="text-center">
                   <p className="text-[11px] font-black text-slate-900">{child.xp}</p>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total XP</p>
                </div>
                <div className="text-center">
                   <p className="text-[11px] font-black text-slate-900">{(child.grade || 'NONE').slice(0,3)}</p>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sector</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-20 border-t border-slate-200">
        <div className="bg-red-50 p-10 rounded-[3.5rem] border border-red-100">
           <h3 className="text-2xl font-black text-red-900 uppercase tracking-tight mb-2">Danger Zone</h3>
           <p className="text-red-600 text-xs font-bold mb-8">Irreversible actions for account management</p>
           
           <div className="flex flex-col md:flex-row gap-4">
              <button 
                onClick={handleDeleteParentAccount}
                className="px-10 py-5 bg-red-600 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-red-700 transition shadow-lg"
              >
                Delete My Parent Profile ☢️
              </button>
              <p className="flex-1 text-[10px] text-red-400 font-medium md:max-w-xs flex items-center">
                 Deleting your profile will permanently remove your login and may orphan squad members. All local sessions will be terminated.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};
