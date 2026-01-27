
import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrashIcon, 
  DownloadIcon, 
  RefreshCcwIcon, 
  SparklesIcon,
  ClockIcon, 
  CoffeeIcon, 
  LogOutIcon, 
  PhoneIncomingIcon, 
  PhoneOutgoingIcon, 
  UserCheckIcon, 
  KeyIcon, 
  UserIcon, 
  IdCardIcon, 
  CalendarIcon, 
  ArrowRightIcon, 
  MoonIcon, 
  SunIcon, 
  ShieldCheckIcon, 
  ArrowLeftIcon, 
  SearchIcon, 
  ChevronRightIcon, 
  UsersIcon, 
  LayersIcon, 
  TrophyIcon, 
  ZapIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  FlagIcon, 
  TimerIcon, 
  ActivityIcon, 
  CircleMinusIcon, 
  EditIcon, 
  XIcon, 
  ShieldAlertIcon, 
  LogInIcon, 
  ShieldIcon, 
  LayoutGridIcon,
  FileSpreadsheetIcon,
  AlertCircleIcon,
  InfoIcon
} from 'lucide-react';
import { TimeData, User, ShiftType, EntryStatus } from './types';
import { timeToSeconds, secondsToTime, autoCorrectTime } from './utils';
import { parseRawTimeData } from './services/geminiService';
import { exportToExcel, exportConsolidatedExcel } from './services/excelService';

const MILESTONES = [1800, 2100, 2500];

const INITIAL_FORM_STATE = {
  pause: '00:00:00',
  dispo: '00:00:00',
  dead: '00:00:00',
  currentLogin: '00:00:00',
  loginTimestamp: '00:00:00',
  logoutTimestamp: '00:00:00',
  wait: '00:00:00',
  talk: '00:00:00',
  hold: '00:00:00',
  customerTalk: '00:00:00',
  inbound: 0,
  outbound: 0,
  reason: ''
};

function StatusBadge({ status }: { status: EntryStatus }) {
  const styles = {
    'Approved': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'Pending': 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse',
    'Rejected': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    'N/A': 'bg-slate-500/10 text-slate-500 border-slate-500/20'
  };
  
  const icon = status === 'Approved' ? <CheckCircleIcon size={10}/> :
               status === 'Pending' ? <TimerIcon size={10}/> :
               status === 'Rejected' ? <XCircleIcon size={10}/> :
               <CircleMinusIcon size={10}/>;

  return (
    <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1 border ${styles[status]}`}>
      {icon} {status}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [authRole, setAuthRole] = useState<'user' | 'admin'>('user');
  const [authError, setAuthError] = useState('');
  const [entries, setEntries] = useState<TimeData[]>([]);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isParsing, setIsParsing] = useState(false);
  const [rawText, setRawText] = useState('');
  const [activeTab, setActiveTab] = useState<'calc' | 'details' | 'admin' | 'all-logs' | 'ot-log'>('calc');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [shiftType, setShiftType] = useState<ShiftType>('Full Day');
  const [showOTModal, setShowOTModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [adminViewingUserId, setAdminViewingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsSearchQuery, setDetailsSearchQuery] = useState('');
  const [masterSearchQuery, setMasterSearchQuery] = useState('');

  const viewingUser = useMemo(() => {
    if (!user) return null;
    return adminViewingUserId ? allUsers.find(u => u.id === adminViewingUserId) || null : user;
  }, [adminViewingUserId, allUsers, user]);

  useEffect(() => {
    const session = localStorage.getItem('current_session');
    if (session) {
      const parsedUser = JSON.parse(session);
      setUser(parsedUser);
      if (parsedUser.role === 'admin') setActiveTab('admin');
    }
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme || 'light');
    const registered = JSON.parse(localStorage.getItem('registered_users') || '[]');
    setAllUsers(registered);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      const idToFetch = adminViewingUserId || user.id;
      const savedEntries = localStorage.getItem(`entries_${idToFetch}`);
      setEntries(savedEntries ? JSON.parse(savedEntries) : []);
    }
  }, [user, adminViewingUserId]);

  const handleAuthSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError('');
    const data = new FormData(e.currentTarget);
    const empId = (data.get('empId') as string || '').trim().toLowerCase();
    const password = (data.get('password') as string || '');
    const name = (data.get('name') as string || '').trim();

    setTimeout(() => {
      const users: User[] = JSON.parse(localStorage.getItem('registered_users') || '[]');
      
      if (authView === 'login') {
        const found = users.find(u => u.empId.toLowerCase() === empId && u.password === password && u.role === authRole);
        if (found) {
          setUser(found);
          localStorage.setItem('current_session', JSON.stringify(found));
          if (found.role === 'admin') setActiveTab('admin');
          else setActiveTab('calc');
        } else { 
          setAuthError(`Authentication failed. Check credentials and role.`); 
        }
      } else {
        const newUser: User = { id: crypto.randomUUID(), empId, name, email: '', password, role: authRole };
        const updatedUsers = [...users, newUser];
        localStorage.setItem('registered_users', JSON.stringify(updatedUsers));
        setAllUsers(updatedUsers);
        setAuthView('login');
      }
    }, 600);
  };

  const logout = () => {
    localStorage.removeItem('current_session');
    setUser(null);
    setAdminViewingUserId(null);
    setActiveTab('calc');
    setAuthView('login');
  };

  const handleAIParsing = async () => {
    if (!rawText || !rawText.trim()) return;
    setIsParsing(true);
    try {
      const parsed = await parseRawTimeData(rawText);
      if (parsed) { 
        setFormData(prev => ({ 
          ...prev, 
          ...parsed,
          loginTimestamp: parsed.loginTimestamp || prev.loginTimestamp,
          logoutTimestamp: parsed.logoutTimestamp || prev.logoutTimestamp
        })); 
        setRawText(''); 
      }
    } catch (e) { alert("Extraction failed."); } finally { setIsParsing(false); }
  };

  const loginSec = timeToSeconds(formData.currentLogin);
  const shiftBase = shiftType === 'Full Day' ? 9 * 3600 : 4.5 * 3600;
  const otSec = loginSec > shiftBase ? (loginSec - shiftBase) : 0;
  
  const loginRemainingSec = Math.max(0, shiftBase - loginSec);
  const totalBreakSec = timeToSeconds(formData.pause) + timeToSeconds(formData.dispo) + timeToSeconds(formData.dead);
  const breakLimit = shiftType === 'Full Day' ? 7200 : 2700; 
  const breakRemainingSec = Math.max(0, breakLimit - totalBreakSec);
  
  const loginExceeded = loginSec > shiftBase;
  const breakExceeded = totalBreakSec > breakLimit;

  const commitRecord = (applyForOT?: boolean) => {
    if (!user) return;
    const targetUserId = adminViewingUserId || user.id;
    const calculatedStatus: EntryStatus = (applyForOT) ? 'Pending' : 'N/A';

    if (editingId) {
      const updatedEntries = entries.map(e => e.id === editingId ? { ...e, ...formData, shiftType, status: calculatedStatus } : e);
      localStorage.setItem(`entries_${targetUserId}`, JSON.stringify(updatedEntries));
      setEntries(updatedEntries);
      setEditingId(null);
    } else {
      const newEntry: TimeData = { 
        id: crypto.randomUUID(), 
        userId: viewingUser?.empId || '', 
        userName: viewingUser?.name,
        date: new Date().toISOString(), 
        shiftType, 
        ...formData,
        status: calculatedStatus
      };
      const currentEntries = JSON.parse(localStorage.getItem(`entries_${targetUserId}`) || '[]');
      const updatedEntries = [newEntry, ...currentEntries];
      localStorage.setItem(`entries_${targetUserId}`, JSON.stringify(updatedEntries));
      setEntries(updatedEntries);
    }
    setFormData(INITIAL_FORM_STATE);
    setShowOTModal(false);
  };

  const saveToHistory = () => {
    if (otSec > 0 && !showOTModal) {
      setShowOTModal(true);
      return;
    }
    commitRecord(false);
  };

  const updateStatus = (userId: string, entryId: string, newStatus: EntryStatus) => {
    const internalUser = allUsers.find(u => u.empId.toLowerCase() === userId.toLowerCase());
    if (!internalUser) return;
    const savedEntries = JSON.parse(localStorage.getItem(`entries_${internalUser.id}`) || '[]');
    const updated = savedEntries.map((e: TimeData) => e.id === entryId ? { ...e, status: newStatus } : e);
    localStorage.setItem(`entries_${internalUser.id}`, JSON.stringify(updated));
    if (adminViewingUserId === internalUser.id) setEntries(updated);
    else if (!adminViewingUserId && activeTab === 'all-logs') setAllUsers([...allUsers]);
    alert(`Status updated.`);
  };

  const deleteEntry = (id: string, logOwnerEmpId?: string) => {
    if (!confirm("Permanently delete this entry?")) return;
    let targetId = logOwnerEmpId ? allUsers.find(u => u.empId.toLowerCase() === logOwnerEmpId.toLowerCase())?.id : (adminViewingUserId || user?.id);
    if (!targetId) return;
    const current = JSON.parse(localStorage.getItem(`entries_${targetId}`) || '[]');
    const filtered = current.filter((e: any) => e.id !== id);
    localStorage.setItem(`entries_${targetId}`, JSON.stringify(filtered));
    if (adminViewingUserId === targetId || user?.id === targetId) setEntries(filtered);
    setAllUsers([...allUsers]);
  };

  const startEdit = (entry: TimeData) => {
    setFormData({
      pause: entry.pause,
      dispo: entry.dispo,
      dead: entry.dead,
      currentLogin: entry.currentLogin,
      loginTimestamp: entry.loginTimestamp || '00:00:00',
      logoutTimestamp: entry.logoutTimestamp || '00:00:00',
      wait: entry.wait,
      talk: entry.talk,
      hold: entry.hold,
      customerTalk: entry.customerTalk,
      inbound: entry.inbound,
      outbound: entry.outbound,
      reason: entry.reason || ''
    });
    setShiftType(entry.shiftType);
    setEditingId(entry.id);
    setActiveTab('calc');
  };

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const relevant = entries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      inbound: relevant.reduce((acc, curr) => acc + (curr.inbound || 0), 0),
      outbound: relevant.reduce((acc, curr) => acc + (curr.outbound || 0), 0)
    };
  }, [entries]);

  const masterData = useMemo(() => {
    if (user?.role !== 'admin') return [];
    return allUsers.flatMap(u => {
      const uData = JSON.parse(localStorage.getItem(`entries_${u.id}`) || '[]');
      return uData.map((d: any) => ({ ...d, userName: u.name, userId: u.empId }));
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allUsers, user]);

  const filteredMasterData = useMemo(() => {
    if (!masterSearchQuery) return masterData;
    const q = masterSearchQuery.toLowerCase();
    return masterData.filter(d => 
      d.userName.toLowerCase().includes(q) || 
      d.userId.toLowerCase().includes(q) ||
      new Date(d.date).toLocaleDateString().includes(q)
    );
  }, [masterData, masterSearchQuery]);

  const filteredDetailsEntries = useMemo(() => {
    if (!detailsSearchQuery) return entries;
    const q = detailsSearchQuery.toLowerCase();
    return entries.filter(e => 
      new Date(e.date).toLocaleDateString().includes(q) ||
      e.shiftType.toLowerCase().includes(q) ||
      e.currentLogin.includes(q)
    );
  }, [entries, detailsSearchQuery]);

  const otLogEntries = useMemo(() => {
    return entries.filter(e => timeToSeconds(e.currentLogin) > (e.shiftType === 'Full Day' ? 9 * 3600 : 4.5 * 3600));
  }, [entries]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 border-4 border-indigo-500/20">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 rounded-[1.5rem] text-white mb-4 shadow-xl bg-indigo-600">
              <ActivityIcon size={32} />
            </div>
            <h1 className="text-2xl font-black dark:text-white tracking-tight">WorkFlow Pro</h1>
            <p className="text-[10px] font-black tracking-widest uppercase mt-1 text-slate-400">Performance Audit Hub</p>
          </div>
          
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-8">
            <button onClick={() => setAuthRole('user')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authRole === 'user' ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600' : 'text-slate-400'}`}>Agent</button>
            <button onClick={() => setAuthRole('admin')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authRole === 'admin' ? 'bg-white dark:bg-slate-700 shadow-lg text-amber-600' : 'text-slate-400'}`}>Admin</button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authView === 'register' && (
              <div className="group relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input required name="name" placeholder="Full Name" className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-950 rounded-xl outline-none border-2 border-transparent focus:border-indigo-500 transition-all text-sm" />
              </div>
            )}
            <div className="group relative">
              <IdCardIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input required name="empId" placeholder="Employee ID" className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-950 rounded-xl outline-none border-2 border-transparent focus:border-indigo-500 transition-all text-sm uppercase font-black" />
            </div>
            <div className="group relative">
              <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input required name="password" type="password" placeholder="Password" className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-950 rounded-xl outline-none border-2 border-transparent focus:border-indigo-500 transition-all text-sm" />
            </div>
            {authError && <div className="text-rose-500 text-[9px] font-black uppercase text-center">{authError}</div>}
            <button type="submit" className="w-full py-5 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl bg-indigo-600 hover:scale-[1.02] transition-all">
              {authView === 'login' ? 'Authorize Access' : 'Register Account'} 
              <ArrowRightIcon className="inline ml-2" size={16}/>
            </button>
          </form>

          <button onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} className="w-full mt-6 text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] text-center hover:text-indigo-600 transition-colors">
            {authView === 'login' ? 'Create Account' : 'Back to Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors">
      {showOTModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 space-y-6 animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-amber-500/10 rounded-3xl text-amber-500 mb-6"><AlertCircleIcon size={40}/></div>
              <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">Overtime Threshold</h3>
              <p className="text-xs text-slate-500 mt-2">Duration <strong>{formData.currentLogin}</strong> exceeds baseline shift requirements.</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => commitRecord(true)} className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Apply for OT Approval</button>
              <button onClick={() => commitRecord(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest">Discard OT Claim</button>
              <button onClick={() => setShowOTModal(false)} className="w-full py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Return to Editor</button>
            </div>
          </div>
        </div>
      )}

      <aside className={`w-full md:w-60 flex flex-col p-5 shadow-2xl ${user.role === 'admin' ? 'bg-slate-950' : 'bg-slate-900'} text-white`}>
        <div className="flex items-center gap-3 mb-10 px-2">
          <ActivityIcon size={20} className={user.role === 'admin' ? 'text-amber-500' : 'text-indigo-500'}/>
          <span className="font-black text-lg tracking-tight">WorkFlow</span>
        </div>
        <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs bg-indigo-600">{user.name.charAt(0)}</div>
          <div className="overflow-hidden"><p className="text-[11px] font-bold truncate uppercase">{user.name}</p><p className="text-[9px] text-slate-400 font-mono mt-1 opacity-60 uppercase">{user.empId}</p></div>
        </div>
        <nav className="flex-1 space-y-1">
          {user.role === 'admin' && (
            <>
              <button onClick={() => { setAdminViewingUserId(null); setActiveTab('admin'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'admin' && !adminViewingUserId ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5'}`}><UsersIcon size={16}/> Team Hub</button>
              <button onClick={() => { setAdminViewingUserId(null); setActiveTab('all-logs'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'all-logs' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5'}`}><LayersIcon size={16}/> Master Stream</button>
            </>
          )}
          <button onClick={() => setActiveTab('calc')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'calc' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-white/5'}`}><ClockIcon size={16}/> Dashboard</button>
          <button onClick={() => setActiveTab('details')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'details' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-white/5'}`}><LayoutGridIcon size={16}/> Sequential Data</button>
          <button onClick={() => setActiveTab('ot-log')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'ot-log' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-white/5'}`}><ZapIcon size={16}/> OT Records</button>
        </nav>
        <div className="mt-auto pt-6 space-y-2">
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase text-slate-500 hover:text-white">{theme === 'light' ? <MoonIcon size={14}/> : <SunIcon size={14}/>} Theme</button>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase text-rose-500 hover:text-rose-400"><LogOutIcon size={14}/> Logout</button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto space-y-8">
          {adminViewingUserId && (
             <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl">
               <div className="flex items-center gap-4">
                 <button onClick={() => setAdminViewingUserId(null)} className="p-2 bg-white dark:bg-slate-900 rounded-xl text-amber-600"><ArrowLeftIcon size={18}/></button>
                 <div><h3 className="text-sm font-black dark:text-white uppercase">{viewingUser?.name}</h3><p className="text-[9px] text-amber-600 uppercase font-black">{viewingUser?.empId}</p></div>
               </div>
               <ShieldAlertIcon className="text-amber-600" size={18} />
             </div>
          )}

          {activeTab === 'calc' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border dark:border-slate-800">
                   <div className="flex items-center gap-2 mb-3"><SparklesIcon size={14} className="text-indigo-500"/><h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Performance Injector</h4></div>
                   <textarea value={rawText} onChange={(e)=>setRawText(e.target.value)} className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl outline-none text-xs font-mono resize-none border focus:border-indigo-500 dark:text-white" placeholder="Paste squashed dialer performance text..."/>
                   <button onClick={handleAIParsing} disabled={isParsing || !rawText} className={`w-full mt-3 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-slate-900 text-white ${isParsing || !rawText ? 'opacity-50' : ''}`}>{isParsing ? <RefreshCcwIcon className="animate-spin" size={14}/> : 'Auto-Extract Metrics'}</button>
                </div>
                
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border dark:border-slate-800">
                  <div className="flex justify-between mb-8 items-center">
                    <h2 className="font-black text-sm uppercase dark:text-white flex items-center gap-3"><ActivityIcon className="text-indigo-500" size={18}/> Audit Inspector</h2>
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <button onClick={() => setShiftType('Full Day')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${shiftType === 'Full Day' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Full Day</button>
                      <button onClick={() => setShiftType('Half Day')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${shiftType === 'Half Day' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Half Day</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    {[
                      { l: 'Login At', n: 'loginTimestamp', i: <LogInIcon size={12}/> },
                      { l: 'Logout At', n: 'logoutTimestamp', i: <LogOutIcon size={12}/> },
                      { l: 'Login Dur.', n: 'currentLogin', i: <ClockIcon size={12}/> }, 
                      { l: 'Talk Time', n: 'talk', i: <UserCheckIcon size={12}/> }, 
                      { l: 'Pause Time', n: 'pause', i: <CoffeeIcon size={12}/> }, 
                      { l: 'Dispo Time', n: 'dispo', i: <RefreshCcwIcon size={12}/> },
                      { l: 'Dead Time', n: 'dead', i: <TrashIcon size={12}/> }, 
                      { l: 'Inbound', n: 'inbound', i: <PhoneIncomingIcon size={12}/>, t: 'number' },
                      { l: 'Outbound', n: 'outbound', i: <PhoneOutgoingIcon size={12}/>, t: 'number' },
                      { l: 'Customer Talk', n: 'customerTalk', i: <UserCheckIcon size={12}/> },
                      { l: 'Hold Time', n: 'hold', i: <TimerIcon size={12}/> },
                      { l: 'Wait Time', n: 'wait', i: <ActivityIcon size={12}/> },
                    ].map(f => (
                      <div key={f.n} className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">{f.i} {f.l}</label><input type={f.t || 'text'} value={(formData as any)[f.n]} onChange={(e)=>setFormData({...formData, [f.n]: f.t === 'number' ? parseInt(e.target.value) || 0 : e.target.value})} onBlur={(e)=> f.t !== 'number' && setFormData({...formData, [f.n]: autoCorrectTime(e.target.value)})} className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl outline-none border focus:border-indigo-500/20 font-mono text-xs dark:text-white" /></div>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-8">
                    {editingId && ( <button onClick={() => { setEditingId(null); setFormData(INITIAL_FORM_STATE); }} className="px-6 py-4 bg-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase">Cancel</button> )}
                    <button onClick={saveToHistory} className={`flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl text-white bg-indigo-600`}>{editingId ? 'Update Session' : 'Commit Audit'}</button>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-4 space-y-6">
                {/* Visual Representation Section */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border dark:border-slate-800 space-y-8">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Real-time Session Status</p>
                  
                  {/* Login Progress */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Logged Duration</span>
                        <div className={`text-2xl font-black font-mono tracking-tighter dark:text-white ${loginExceeded ? 'text-rose-600' : ''}`}>{formData.currentLogin}</div>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Total Login Remaining</span>
                        <div className={`text-sm font-black font-mono tracking-tighter ${loginExceeded ? 'text-rose-600' : 'text-emerald-500'}`}>{secondsToTime(loginRemainingSec)}</div>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${loginExceeded ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                        style={{ width: `${Math.min(100, (loginSec / shiftBase) * 100)}%` }} 
                      />
                    </div>
                    <div className="flex justify-between items-center text-[7px] font-black uppercase text-slate-400">
                      <span>Shift Start</span>
                      <span>Target: {secondsToTime(shiftBase)}</span>
                    </div>
                  </div>

                  {/* Break Progress (Pause + Dispo + Dead) */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Cumulative Break Used</span>
                        <div className={`text-2xl font-black font-mono tracking-tighter dark:text-white ${breakExceeded ? 'text-rose-600' : ''}`}>{secondsToTime(totalBreakSec)}</div>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Total Pause Remaining</span>
                        <div className={`text-sm font-black font-mono tracking-tighter ${breakExceeded ? 'text-rose-600' : 'text-emerald-500'}`}>{secondsToTime(breakRemainingSec)}</div>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${breakExceeded ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min(100, (totalBreakSec / breakLimit) * 100)}%` }} 
                      />
                    </div>
                    <div className="flex justify-between items-center text-[7px] font-black uppercase text-slate-400">
                      <span>Available</span>
                      <span>Cap: {secondsToTime(breakLimit)}</span>
                    </div>
                  </div>

                  {loginExceeded && (
                    <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-center animate-pulse">
                      <div className="text-[8px] font-black text-rose-600 uppercase tracking-widest flex items-center justify-center gap-2">
                        <ZapIcon size={12}/> Overtime Detected: {secondsToTime(otSec)}
                      </div>
                    </div>
                  )}
                </div>

                <div className={`p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden bg-slate-900`}>
                  <div className="absolute -top-10 -right-10 p-10 opacity-10 rotate-12"><TrophyIcon size={150}/></div>
                  <p className="text-[10px] font-black uppercase opacity-60 mb-6 tracking-widest">Monthly Inbound Target</p>
                  <div className="flex gap-4 mb-8">
                    <div className="flex-1 p-3 bg-white/5 rounded-2xl border border-white/10 text-center"><div className="text-[8px] font-black opacity-40 uppercase mb-1">Inbound</div><div className="text-2xl font-black tracking-tighter leading-none">{monthlyStats.inbound}</div></div>
                    <div className="flex-1 p-3 bg-white/5 rounded-2xl border border-white/10 text-center"><div className="text-[8px] font-black opacity-40 uppercase mb-1">Outbound</div><div className="text-2xl font-black tracking-tighter leading-none">{monthlyStats.outbound}</div></div>
                  </div>
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase opacity-80"><span>Milestone Reach</span><span>{Math.round(Math.min(100, (monthlyStats.inbound / 2500) * 100))}%</span></div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-indigo-400 transition-all duration-1000" style={{ width: `${Math.min(100, (monthlyStats.inbound / 2500) * 100)}%` }}/></div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {MILESTONES.map((target) => (
                        <div key={target} className={`flex flex-col items-center p-2 rounded-xl border border-white/5 transition-all duration-500 ${monthlyStats.inbound >= target ? 'bg-white/20 border-white/20' : 'opacity-20'}`}><span className="text-[9px] font-black">{target}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wider dark:text-white">Sequential Performance Data</h2>
                  <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Full property inspection per extraction (Excel View)</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => viewingUser && exportToExcel(entries, viewingUser)} className="bg-indigo-600 px-6 py-3 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all"><FileSpreadsheetIcon size={14}/> Performance XLSX</button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm space-y-6">
                <div className="relative group max-w-md">
                  <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18}/>
                  <input 
                    type="text" 
                    placeholder="Global property search (Date, Shift, Dur)..." 
                    value={detailsSearchQuery} 
                    onChange={(e)=>setDetailsSearchQuery(e.target.value)} 
                    className="w-full py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl outline-none pl-14 pr-8 text-xs font-bold border border-transparent focus:border-indigo-500/20 dark:text-white transition-all shadow-inner" 
                  />
                </div>

                <div className="overflow-x-auto rounded-[2rem] border dark:border-slate-800/50">
                  <table className="w-full text-left text-[10px] border-collapse min-w-[1200px]">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase font-black tracking-[0.1em] text-[8px] sticky top-0 z-10 border-b dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-5 whitespace-nowrap">Date Recorded</th>
                        <th className="px-4 py-5">Shift Type</th>
                        <th className="px-4 py-5">Login Dur.</th>
                        <th className="px-4 py-5">Talk Time</th>
                        <th className="px-4 py-5">Cust Talk</th>
                        <th className="px-4 py-5">Wait Time</th>
                        <th className="px-4 py-5">Pause</th>
                        <th className="px-4 py-5">Dispo</th>
                        <th className="px-4 py-5">Dead</th>
                        <th className="px-4 py-5 font-black text-indigo-500">Total Break</th>
                        <th className="px-4 py-5 text-center">Inbound</th>
                        <th className="px-4 py-5 text-center">Outbound</th>
                        <th className="px-4 py-5 text-center">Status</th>
                        <th className="px-4 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800/50">
                      {filteredDetailsEntries.map((e) => {
                        const tBrk = timeToSeconds(e.pause) + timeToSeconds(e.dispo) + timeToSeconds(e.dead);
                        const sLimit = e.shiftType === 'Full Day' ? 7200 : 2700;
                        const bExceed = tBrk > sLimit;
                        
                        return (
                          <tr key={e.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 transition-colors">
                            <td className="px-4 py-5">
                              <div className="font-black dark:text-slate-200">{new Date(e.date).toLocaleDateString()}</div>
                              <div className="text-[7px] text-slate-400 uppercase font-bold">{new Date(e.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                            </td>
                            <td className="px-4 py-5"><span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-black uppercase text-[7px] dark:text-slate-300">{e.shiftType}</span></td>
                            <td className="px-4 py-5 font-mono font-black text-indigo-500">{e.currentLogin}</td>
                            <td className="px-4 py-5 font-mono dark:text-slate-300">{e.talk}</td>
                            <td className="px-4 py-5 font-mono dark:text-slate-300">{e.customerTalk}</td>
                            <td className="px-4 py-5 font-mono dark:text-slate-400">{e.wait}</td>
                            <td className="px-4 py-5 font-mono dark:text-slate-400">{e.pause}</td>
                            <td className="px-4 py-5 font-mono dark:text-slate-400">{e.dispo}</td>
                            <td className="px-4 py-5 font-mono dark:text-slate-400">{e.dead}</td>
                            <td className={`px-4 py-5 font-mono font-black ${bExceed ? 'text-rose-500' : 'text-emerald-500'}`}>{secondsToTime(tBrk)}</td>
                            <td className="px-4 py-5 text-center font-black dark:text-slate-200">{e.inbound}</td>
                            <td className="px-4 py-5 text-center font-black dark:text-slate-200">{e.outbound || 0}</td>
                            <td className="px-4 py-5 text-center"><StatusBadge status={e.status}/></td>
                            <td className="px-4 py-5 text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => startEdit(e)} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded transition-all"><EditIcon size={12}/></button>
                                <button onClick={() => deleteEntry(e.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded transition-all"><TrashIcon size={12}/></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredDetailsEntries.length === 0 && (
                        <tr><td colSpan={14} className="px-6 py-24 text-center text-slate-400 font-bold uppercase tracking-[0.2em] opacity-30">No sequential entries found matching audit filter</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ot-log' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <div><h2 className="text-xl font-black uppercase tracking-wider dark:text-white">Overtime Activity Log</h2><p className="text-slate-400 text-[10px] font-bold mt-1">Archived records of session duration exceeding baseline requirements</p></div>
                <button onClick={() => viewingUser && exportToExcel(otLogEntries, viewingUser)} className="bg-amber-600 px-6 py-3 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-amber-700 transition-all"><ZapIcon size={14}/> Save OT Records</button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border dark:border-slate-800 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-950/50 font-black uppercase tracking-[0.2em] text-slate-400 text-[8px]">
                      <tr>
                        <th className="px-6 py-5">Shift Date</th>
                        <th className="px-6 py-5">Logged Duration</th>
                        <th className="px-6 py-5 text-center">Calculated OT</th>
                        <th className="px-6 py-5 text-center">Status</th>
                        <th className="px-6 py-5 text-right">Commit Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800/50">
                      {otLogEntries.map(e => {
                        const lSec = timeToSeconds(e.currentLogin);
                        const sBase = e.shiftType === 'Full Day' ? 9 * 3600 : 4.5 * 3600;
                        return (
                          <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="px-6 py-6">
                              <span className="font-black dark:text-slate-200">{new Date(e.date).toLocaleDateString()}</span>
                              <span className="block text-[8px] text-slate-400 font-black uppercase mt-0.5">{e.shiftType}</span>
                            </td>
                            <td className="px-6 py-6 font-mono font-black dark:text-slate-400">{e.currentLogin}</td>
                            <td className="px-6 py-6 text-center text-amber-600 font-black font-mono">{secondsToTime(lSec - sBase)}</td>
                            <td className="px-6 py-6 text-center">
                               <StatusBadge status={e.status} />
                            </td>
                            <td className="px-6 py-6 text-right">
                               <button onClick={() => startEdit(e)} className="text-indigo-500 hover:bg-indigo-500/5 px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase transition-colors">Inspect Session</button>
                            </td>
                          </tr>
                        );
                      })}
                      {otLogEntries.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-24 text-center text-slate-400 font-bold uppercase tracking-widest opacity-30">No Overtime Activity Detected</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center"><h2 className="text-xl font-black uppercase dark:text-white">Admin Control Hub</h2><button onClick={() => exportConsolidatedExcel(masterData)} className="bg-amber-600 px-6 py-4 text-white rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-amber-700 transition-all">Master Analysis Report</button></div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border dark:border-slate-800">
                <div className="relative mb-8"><SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="Search team by ID or name..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-full py-5 bg-slate-50 dark:bg-slate-950 rounded-3xl outline-none pl-14 pr-8 text-xs font-bold border focus:border-amber-500/20 dark:text-white" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.empId.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                    <div key={u.id} className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl flex items-center justify-between hover:ring-2 hover:ring-amber-500 transition-all cursor-pointer group shadow-sm" onClick={() => { setAdminViewingUserId(u.id); setActiveTab('details'); }}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-600/10 text-amber-600 rounded-2xl flex items-center justify-center font-black text-xs group-hover:bg-amber-600 group-hover:text-white transition-all shadow-inner">{u.name.charAt(0)}</div>
                        <div className="overflow-hidden"><p className="text-xs font-black dark:text-white uppercase truncate">{u.name}</p><p className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter mt-1">{u.empId}</p></div>
                      </div>
                      <ChevronRightIcon size={18} className="text-slate-300 group-hover:translate-x-2 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'all-logs' && (
            <div className="animate-in fade-in duration-700 space-y-8">
              <div className="flex justify-between items-center">
                <div><h2 className="text-xl font-black uppercase dark:text-white">Master Property Stream</h2><p className="text-[10px] text-slate-400 font-bold mt-1">Consolidated audit of all team session extractions</p></div>
                <button onClick={() => exportConsolidatedExcel(masterData)} className="bg-emerald-600 px-8 py-4 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-700 transition-all"><FileSpreadsheetIcon size={16} className="mr-2 inline"/> Generate Team Report</button>
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border dark:border-slate-800 shadow-sm space-y-6">
                <div className="relative group max-w-lg">
                  <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18}/>
                  <input 
                    type="text" 
                    placeholder="Global master filter: Agent name, ID, or Date..." 
                    value={masterSearchQuery} 
                    onChange={(e)=>setMasterSearchQuery(e.target.value)} 
                    className="w-full py-5 bg-slate-50 dark:bg-slate-950 rounded-3xl outline-none pl-14 pr-8 text-xs font-bold border focus:border-indigo-500/20 dark:text-white transition-all shadow-inner" 
                  />
                </div>

                <div className="overflow-x-auto rounded-[2.5rem] border dark:border-slate-800">
                  <table className="w-full text-left text-[10px] min-w-[1300px]">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase font-black tracking-[0.1em] text-[8px] sticky top-0 z-10 border-b dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-5">Agent Identity</th>
                        <th className="px-4 py-5">Timeline</th>
                        <th className="px-4 py-5">Shift</th>
                        <th className="px-4 py-5">Login Dur.</th>
                        <th className="px-4 py-5">Talk Time</th>
                        <th className="px-4 py-5">Pause</th>
                        <th className="px-4 py-5">Dispo</th>
                        <th className="px-4 py-5">Dead</th>
                        <th className="px-4 py-5 font-black text-indigo-500">Total Break</th>
                        <th className="px-4 py-5 text-center">Inbound</th>
                        <th className="px-4 py-5 text-center">Outbound</th>
                        <th className="px-4 py-5 text-center">Status / OT</th>
                        <th className="px-4 py-5 text-right">Master Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800/50">
                      {filteredMasterData.map(log => {
                         const lSec = timeToSeconds(log.currentLogin);
                         const sBase = log.shiftType === 'Full Day' ? 9 * 3600 : 4.5 * 3600;
                         const tBrk = timeToSeconds(log.pause) + timeToSeconds(log.dispo) + timeToSeconds(log.dead);
                         const bLimit = log.shiftType === 'Full Day' ? 7200 : 2700;
                         const bExceed = tBrk > bLimit;
                         
                         return (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="px-4 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-[10px] shadow-sm">{log.userName?.charAt(0)}</div>
                                <div><div className="font-black dark:text-slate-200 uppercase">{log.userName}</div><div className="text-[9px] font-mono text-slate-400 mt-0.5 uppercase">{log.userId}</div></div>
                              </div>
                            </td>
                            <td className="px-4 py-5">
                              <span className="font-bold text-slate-600 dark:text-slate-400 text-xs">{new Date(log.date).toLocaleDateString()}</span>
                              <span className="block text-[9px] text-indigo-500 font-black mt-1 uppercase tracking-widest">{log.shiftType}</span>
                            </td>
                            <td className="px-4 py-5"><span className="text-[8px] text-indigo-500 font-black uppercase">{log.shiftType}</span></td>
                            <td className="px-4 py-5 font-mono font-black text-indigo-500">{log.currentLogin}</td>
                            <td className="px-4 py-5 font-mono dark:text-slate-300">{log.talk}</td>
                            <td className="px-4 py-5 font-mono dark:text-slate-400">{log.pause}</td>
                            <td className="px-4 py-5 font-mono dark:text-slate-400">{log.dispo}</td>
                            <td className="px-4 py-5 font-mono dark:text-slate-400">{log.dead}</td>
                            <td className={`px-4 py-5 font-mono font-black ${bExceed ? 'text-rose-500' : 'text-emerald-500'}`}>{secondsToTime(tBrk)}</td>
                            <td className="px-4 py-5 text-center font-black dark:text-slate-200">{log.inbound}</td>
                            <td className="px-4 py-5 text-center font-black dark:text-slate-200">{log.outbound || 0}</td>
                            <td className="px-4 py-5 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <StatusBadge status={log.status} />
                                {lSec > sBase && <span className="text-[8px] font-black text-amber-600 uppercase">OT: {secondsToTime(lSec - sBase)}</span>}
                              </div>
                            </td>
                            <td className="px-4 py-5 text-right">
                               <div className="flex items-center justify-end gap-2">
                                 {log.status === 'Pending' && (
                                   <div className="flex gap-1.5">
                                     <button onClick={() => updateStatus(log.userId, log.id, 'Approved')} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="Approve"><CheckCircleIcon size={16}/></button>
                                     <button onClick={() => updateStatus(log.userId, log.id, 'Rejected')} className="p-2 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm" title="Reject"><XIcon size={16}/></button>
                                   </div>
                                 )}
                                 <button onClick={() => deleteEntry(log.id, log.userId)} className="p-2.5 text-slate-300 hover:text-rose-500 transition-all" title="Wipe Session"><TrashIcon size={16}/></button>
                               </div>
                            </td>
                          </tr>
                         );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
