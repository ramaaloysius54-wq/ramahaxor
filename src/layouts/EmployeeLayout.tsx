import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Home,
  ScanFace,
  FileText,
  User,
  Bell,
  Target,
  X,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type NotifItem = {
  id: string;
  status: 'approved' | 'rejected';
  message: string;
  link?: string;
};

export default function EmployeeLayout() {
  const location = useLocation();
  const [session, setSession] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // 1. Ambil Session + Cek Notifikasi Cuti & Penilaian KPI HRD
  useEffect(() => {
    async function initSessionAndFetchNotifs() {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();
      if (!currentSession) return;
      setSession(currentSession);

      const userId = currentSession.user.id;
      const combined: NotifItem[] = [];

      // Cuti yang sudah diproses HRD
      const { data: existingLeaves, error: leaveErr } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', userId)
        .in('status', ['approved', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (!leaveErr && existingLeaves) {
        (existingLeaves as any[]).forEach((leave) => {
          combined.push({
            id: `leave-${leave.id}`,
            status: leave.status,
            message: `Pengajuan ${leave.leave_type === 'sick' ? 'sakit' : 'cuti/izin'} Anda telah ${
              leave.status === 'approved' ? 'DISETUJUI' : 'DITOLAK'
            }.`,
            link: '/employee/leaves'
          });
        });
      }

      // KPI yang sudah dinilai atau diminta revisi oleh HRD
      const { data: ratedKpis, error: kpiErr } = await supabase
        .from('employee_kpis')
        .select('id, title, approval_status, hrd_score')
        .eq('employee_id', userId)
        .in('approval_status', ['approved', 'rejected'])
        .order('updated_at', { ascending: false })
        .limit(10);

      if (!kpiErr && ratedKpis) {
        (ratedKpis as any[]).forEach((kpi) => {
          combined.push({
            id: `kpi-${kpi.id}`,
            status: kpi.approval_status,
            message:
              kpi.approval_status === 'approved'
                ? `KPI "${kpi.title}" telah DINILAI HRD (Skor: ${kpi.hrd_score ?? '-'}).`
                : `KPI "${kpi.title}" diminta REVISI oleh HRD. Cek catatan evaluasi.`,
            link: '/employee/kpi'
          });
        });
      }

      setNotifications(combined);
    }

    initSessionAndFetchNotifs();
  }, []);

  // 2. Listener Real-time untuk Cuti & Penilaian KPI HRD
  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;

    const channel = supabase
      .channel('realtime_employee_layout_notifs')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leave_requests',
          filter: `employee_id=eq.${userId}`
        },
        (payload) => {
          const rec = payload.new as any;
          if (rec.status === 'approved' || rec.status === 'rejected') {
            const notifId = `leave-${rec.id}`;
            setNotifications((prev) => {
              if (prev.some((n) => n.id === notifId)) return prev;
              return [
                {
                  id: notifId,
                  status: rec.status,
                  message: `Pengajuan ${rec.leave_type === 'sick' ? 'sakit' : 'cuti/izin'} Anda telah ${
                    rec.status === 'approved' ? 'DISETUJUI' : 'DITOLAK'
                  }.`,
                  link: '/employee/leaves'
                },
                ...prev
              ];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'employee_kpis',
          filter: `employee_id=eq.${userId}`
        },
        (payload) => {
          const rec = payload.new as any;
          if (rec.approval_status === 'approved' || rec.approval_status === 'rejected') {
            const notifId = `kpi-${rec.id}`;
            const updatedItem: NotifItem = {
              id: notifId,
              status: rec.approval_status,
              message:
                rec.approval_status === 'approved'
                  ? `KPI "${rec.title}" telah DINILAI HRD (Skor: ${rec.hrd_score ?? '-'}).`
                  : `KPI "${rec.title}" diminta REVISI oleh HRD. Cek catatan evaluasi.`,
              link: '/employee/kpi'
            };
            setNotifications((prev) => [updatedItem, ...prev.filter((n) => n.id !== notifId)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    if (notifications.length === 1) setIsNotifOpen(false);
  };

  const navItems = [
    { name: 'Beranda', path: '/employee/dashboard', icon: Home },
    { name: 'KPI', path: '/employee/kpi', icon: Target },
    { name: 'Absen', path: '/employee/attendance', icon: ScanFace, isHighlight: true },
    { name: 'Pengajuan', path: '/employee/leaves', icon: FileText },
    { name: 'Notif', action: () => setIsNotifOpen(true), icon: Bell },
    { name: 'Profil', path: '/employee/profile', icon: User }
  ];

  return (
    <div className="flex flex-col h-screen bg-background font-sans text-gray-800">
      {/* POP-UP MODAL NOTIFIKASI */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-sm flex items-end justify-center sm:items-center">
          <div className="bg-white w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl p-5 pb-24 sm:pb-5 shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Notifikasi ({notifications.length})</h3>
              <button
                onClick={() => setIsNotifOpen(false)}
                className="p-1 text-gray-400 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {notifications.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">Tidak ada notifikasi baru.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start justify-between gap-3 p-4 rounded-2xl border ${
                      notif.status === 'approved'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                        : 'bg-rose-50 border-rose-100 text-rose-800'
                    }`}
                  >
                    <Link
                      to={notif.link || '/employee/dashboard'}
                      onClick={() => setIsNotifOpen(false)}
                      className="flex items-center gap-3 flex-1"
                    >
                      {notif.status === 'approved' ? (
                        <CheckCircle size={20} className="text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle size={20} className="text-rose-600 shrink-0" />
                      )}
                      <p className="text-xs font-semibold leading-relaxed">{notif.message}</p>
                    </Link>
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 transition shrink-0"
                    >
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
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet context={{ session }} />
      </main>

      {/* Bottom Navigation — Desain Kotak-Kotak Seragam */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.06)] px-2 py-2 pb-safe z-50">
        <div className="max-w-xl mx-auto grid grid-cols-6 gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path ? location.pathname.startsWith(item.path) : false;

            if (item.isHighlight) {
              return (
                <Link
                  key={item.name}
                  to={item.path!}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all active:scale-95 shadow-md ${
                    isActive
                      ? 'bg-primary-700 text-white shadow-primary-500/30 ring-2 ring-primary-200'
                      : 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-500/25'
                  }`}
                >
                  <Icon size={20} className="mb-0.5" />
                  <span className="text-[10px] font-bold leading-none">{item.name}</span>
                </Link>
              );
            }

            if (item.action) {
              return (
                <button
                  key={item.name}
                  onClick={item.action}
                  className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl border transition-all active:scale-95 outline-none ${
                    isNotifOpen
                      ? 'bg-primary-50 text-primary-600 border-primary-100'
                      : 'bg-gray-50/70 text-gray-500 border-gray-100 hover:bg-gray-100 hover:text-primary-600'
                  }`}
                >
                  <div className="relative">
                    <Icon size={19} className="mb-0.5" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold leading-none">{item.name}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.path!}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl border transition-all active:scale-95 ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 border-primary-200 shadow-sm'
                    : 'bg-gray-50/70 text-gray-500 border-gray-100 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                <Icon size={19} className="mb-0.5" />
                <span className="text-[10px] font-semibold leading-none">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
