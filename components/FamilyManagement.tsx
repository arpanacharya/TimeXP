
import React, { useState, useEffect } from 'react';
import { UserAccount, UserRole, ActivityCategory, WeeklySchedule } from '../types';
import { storageService } from '../services/storageService';

interface Props {
  parent: UserAccount;
}

const DEFAULT_SCHEDULE: WeeklySchedule = {
  'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': [], 'Sunday': []
};

export const FamilyManagement: React.FC<Props> = ({ parent }) => {
  const [children, setChildren] = useState<UserAccount[]>([]);
  const [childName, setChildName] = useState('');
  const [childUserId, setChildUserId] = useState('');
  const [childPhone, setChildPhone] = useState('');
  const [childPassword, setChildPassword] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

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
        userId: childUserId,
        name: childName,
        phone: childPhone,
        passwordHash: storageService.encryptPassword(childPassword),
        role: UserRole.STUDENT,
        parentId: parent.id,
        weeklySchedule: DEFAULT_SCHEDULE,
        xp: 0,
        goals: []
      };
      await storageService.saveUser(newChild);
      
      const updatedParent = {
        ...parent,
        childrenIds: [...(parent.childrenIds || []), newChild.id]
      };
      await storageService.saveUser(updatedParent);

      setChildren([...children, newChild]);
      setChildName('');
      setChildUserId('');
      setChildPhone('');
      setChildPassword('');
      setShowAddForm(false);
      alert('Squad Member Enrolled in Cloud! 🚀');
    } catch (err) {
      alert('Recruitment error. Service unstable.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-end px-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Command & Control</h2>
          <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Global Cloud Squad Management</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition shadow-xl"
        >
          {showAddForm ? 'Abort Intake' : '+ Recruit Hero'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-indigo-100">
          <form onSubmit={createChild} className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-2">Display Name</label>
              <input required className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold" value={childName} onChange={e => setChildName(e.target.value)} placeholder="Hero's Alias" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-2">User ID</label>
              <input required className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold" value={childUserId} onChange={e => setChildUserId(e.target.value)} placeholder="login_handle" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-2">Phone</label>
              <input required className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold" value={childPhone} onChange={e => setChildPhone(e.target.value)} placeholder="000 000 0000" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-2">Initial Key</label>
              <input required type="password" className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold" value={childPassword} onChange={e => setChildPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button disabled={isLoading} className="md:col-span-2 w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-lg mt-4 flex items-center justify-center gap-2">
              {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              Authorize Personnel ⚡
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Squad Roster</h3>
          {children.length === 0 ? (
            <div className="p-8 bg-slate-100 rounded-[2rem] text-center border-2 border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-400">Roster Empty.</p>
            </div>
          ) : (
            children.map(child => (
              <button 
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`w-full p-6 rounded-[2rem] flex items-center gap-4 transition-all border-2 ${selectedChildId === child.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'}`}
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-lg">
                  {Math.floor((child.xp || 0) / 500) + 1}
                </div>
                <div className="text-left">
                  <p className="font-black text-sm truncate w-24">{child.name}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{child.xp} XP</p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-3">
          {!selectedChild ? (
            <div className="bg-white p-20 rounded-[3rem] text-center border-4 border-dashed border-slate-100 h-full flex flex-col items-center justify-center">
              <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Awaiting Link</h3>
              <p className="text-slate-300 font-bold mt-2">Select a cloud asset to view telemetry.</p>
            </div>
          ) : (
            <div className="bg-white p-10 rounded-[3rem] shadow-xl">
               <h3 className="text-2xl font-black mb-4">{selectedChild.name}'s Profile</h3>
               <p className="text-slate-400 text-sm font-bold">Cloud ID: {selectedChild.id}</p>
               <div className="mt-8 p-6 bg-indigo-50 rounded-2xl">
                 <p className="text-xs font-black text-indigo-600 uppercase">Live XP Telemetry</p>
                 <p className="text-4xl font-black text-indigo-900 mt-2">{selectedChild.xp} Points</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
