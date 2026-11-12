import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, ScanFace, FileText, User, Bell, X, CheckCircle, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function EmployeeLayout() {
  const location = useLocation();
  const [session, setSession] = useState<any>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // 1. Ambil Session dan Cek Data Cuti yang Sudah Approved/Rejected Sebelumnya
  useEffect(() => {
    async function initSessionAndFetchLeaves() {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;
      setSession(currentSession);

      const userId = currentSession.user.id;

      // Ambil data cuti milik user yang statusnya sudah approved atau rejected
      const { data: existingLeaves, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', userId)
        .in('status', ['approved', 'rejected'])
        .order('created_at', { ascending: false });

      if (!error && existingLeaves) {
        const formattedNotifs = existingLeaves.map((leave) => ({
          id: leave.id,
          status: leave.status,
          message: `Pengajuan ${leave.leave_type === 'sick' ? 'sakit' : 'cuti/izin'} Anda telah ${leave.status === 'approved' ? 'DISETUJUI' : 'DITOLAK'}.`
        }));
        setNotifications(formattedNotifs);
      }
    }

    initSessionAndFetchLeaves();
  }, []);

  // 2. Listener Real-time untuk Perubahan Status Baru
  useEffect(() => {
    if (!session?.user?.id) return;

    const leaveSubscription = supabase
      .channel('realtime_leave_updates_layout')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'leave_requests',
          filter: `employee_id=eq.${session.user.id}`
        },
        (payload) => {
          const newRecord = payload.new;
          
          if (newRecord.status === 'approved' || newRecord.status === 'rejected') {
            // Cek apakah notifikasi dengan ID ini sudah ada agar tidak duplikat
            setNotifications((prev) => {
              const exists = prev.some((n) => n.id === newRecord.id);
              if (exists) return prev;

              return [
                {
                  id: newRecord.id,
                  status: newRecord.status,
                  message: `Pengajuan ${newRecord.leave_type === 'sick' ? 'sakit' : 'cuti/izin'} Anda telah ${newRecord.status === 'approved' ? 'DISETUJUI' : 'DITOLAK'}.`
                },
                ...prev
              ];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leaveSubscription);
    };
  }, [session]);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    if (notifications.length === 1) setIsNotifOpen(false); 
  };

  const navItems = [
    { name: 'Beranda', path: '/employee/dashboard', icon: Home },
    { name: 'Notifikasi', action: () => setIsNotifOpen(true), icon: Bell },
    { name: 'Absen', path: '/employee/attendance', icon: ScanFace, isCenter: true },
    { name: 'Pengajuan', path: '/employee/leaves', icon: FileText },
    { name: 'Profil', path: '/employee/profile', icon: User },
  ];

  return (
    <div className="flex flex-col h-screen bg-background font-sans text-gray-800">
      
      {/* POP-UP MODAL NOTIFIKASI */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-sm flex items-end justify-center sm:items-center">
          <div className="bg-white w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl p-5 pb-24 sm:pb-5 shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Notifikasi ({notifications.length})</h3>
              <button onClick={() => setIsNotifOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            {notifications.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">Tidak ada notifikasi baru.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`flex items-start justify-between gap-3 p-4 rounded-2xl border ${notif.status === 'approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                    <div className="flex items-center gap-3">
                      {notif.status === 'approved' ? <CheckCircle size={20} className="text-emerald-600 shrink-0" /> : <XCircle size={20} className="text-rose-600 shrink-0" />}
                      <p className="text-xs font-semibold leading-relaxed">{notif.message}</p>
                    </div>
                    <button onClick={() => dismissNotification(notif.id)} className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 transition shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Konten Utama */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet context={{ session }} /> 
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-surface border-t border-gray-100 shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.05)] px-4 py-2 pb-safe flex justify-between items-center z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path ? location.pathname === item.path : false;

          if (item.isCenter) {
            return (
              <Link key={item.name} to={item.path!} className="relative -top-6 flex flex-col items-center px-2">
                <div className="bg-primary-600 text-white p-4 rounded-full shadow-lg shadow-primary-500/30 active:scale-95 transition-transform">
                  <Icon size={28} />
                </div>
                <span className="text-[10px] font-medium text-gray-500 mt-1">{item.name}</span>
              </Link>
            );
          }

          if (item.action) {
            return (
              <button key={item.name} onClick={item.action} className="relative flex flex-col items-center p-2 text-gray-400 hover:text-primary-600 active:scale-95 transition-all outline-none flex-1">
                <div className="relative">
                  <Icon size={22} className="mb-1" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-surface shadow-sm">
                      {notifications.length}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.name}</span>
              </button>
            );
          }

          return (
            <Link key={item.name} to={item.path!} className={`flex flex-col items-center p-2 flex-1 active:scale-95 transition-all ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
              <Icon size={22} className="mb-1" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
