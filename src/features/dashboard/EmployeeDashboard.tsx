import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
// TAMBAHAN: Import ikon X, CheckCircle, dan XCircle untuk notifikasi
import { Bell, LogOut, Clock, CalendarDays, ReceiptText, User, X, CheckCircle, XCircle } from 'lucide-react'; 

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  
  // PENAMBAHAN STATE: Untuk menyimpan daftar notifikasi cuti yang masuk
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    let leaveSubscription: any; // Variabel untuk menyimpan koneksi real-time

    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: empData } = await supabase
        .from('employees')
        .select('full_name, nik, avatar_url, job_positions(title)')
        .eq('id', user.id)
        .single();
      
      if (empData) setProfile(empData);

      const { data: news } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (news) setAnnouncements(news);

      // ==============================================================
      // AWAL PENAMBAHAN: LISTENER REAL-TIME UNTUK NOTIFIKASI CUTI
      // ==============================================================
      leaveSubscription = supabase
        .channel('realtime_leave_updates')
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'leave_requests',
            filter: `employee_id=eq.${user.id}` // Hanya dengarkan cuti milik user ini
          },
          (payload) => {
            const newRecord = payload.new;
            const oldRecord = payload.old;
            
            // Jika HRD merubah status menjadi approved atau rejected
            if (newRecord.status !== oldRecord.status && (newRecord.status === 'approved' || newRecord.status === 'rejected')) {
              setNotifications((prev) => [
                {
                  id: newRecord.id,
                  status: newRecord.status,
                  message: `Pengajuan ${newRecord.leave_type === 'sick' ? 'sakit' : 'cuti/izin'} Anda telah ${newRecord.status === 'approved' ? 'DISETUJUI' : 'DITOLAK'} oleh HRD.`
                },
                ...prev
              ]);
            }
          }
        )
        .subscribe();
      // ==============================================================
      // AKHIR PENAMBAHAN
      // ==============================================================
    }
    fetchData();

    // Membersihkan koneksi real-time saat komponen dilepas
    return () => {
      if (leaveSubscription) {
        supabase.removeChannel(leaveSubscription);
      }
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Fungsi untuk menutup notifikasi individual
  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header Profile */}
      <div className="flex justify-between items-center bg-primary-600 text-white p-6 rounded-3xl shadow-soft">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={24} className="text-white" />
            )}
          </div>
          
          <div>
            <p className="text-primary-100 text-sm">Selamat datang,</p>
            <h2 className="text-xl font-bold">{profile?.full_name || 'Karyawan'}</h2>
            <p className="text-sm opacity-90 mt-1">{profile?.job_positions?.title || '-'} • {profile?.nik || '-'}</p>
          </div>
        </div>

        <button onClick={handleLogout} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
          <LogOut size={20} />
        </button>
      </div>

      {/* ========================================= */}
      {/* AWAL PENAMBAHAN: BANNER NOTIFIKASI CUTI   */}
      {/* ========================================= */}
      {notifications.length > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
          {notifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`flex items-start justify-between gap-3 p-4 rounded-2xl shadow-sm border ${
                notif.status === 'approved' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {notif.status === 'approved' ? (
                  <CheckCircle size={20} className="text-emerald-600 shrink-0" />
                ) : (
                  <XCircle size={20} className="text-rose-600 shrink-0" />
                )}
                <p className="text-sm font-semibold">{notif.message}</p>
              </div>
              <button 
                onClick={() => dismissNotification(notif.id)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 transition"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* ========================================= */}
      {/* AKHIR PENAMBAHAN                          */}
      {/* ========================================= */}

      {/* Menu Kotak-Kotak (TIDAK DIUBAH SAMA SEKALI) */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">Menu Utama</h3>
        <div className="grid grid-cols-2 gap-4">
          
          <Link to="/employee/attendance" className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-primary-200 transition-all active:scale-95 group">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <Clock size={24} className="text-emerald-500" />
            </div>
            <span className="font-semibold text-gray-700 text-sm">Absensi</span>
          </Link>

          <Link to="/employee/leaves" className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-primary-200 transition-all active:scale-95 group">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <CalendarDays size={24} className="text-blue-500" />
            </div>
            <span className="font-semibold text-gray-700 text-sm">Cuti & Izin</span>
          </Link>

          {/* Kotak Slip Gaji */}
          <Link to="/employee/payslips" className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-primary-200 transition-all active:scale-95 group">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <ReceiptText size={24} className="text-amber-500" />
            </div>
            <span className="font-semibold text-gray-700 text-sm">Slip Gaji</span>
          </Link>

          <Link to="/employee/profile" className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-primary-200 transition-all active:scale-95 group">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <User size={24} className="text-purple-500" />
            </div>
            <span className="font-semibold text-gray-700 text-sm">Profil</span>
          </Link>

        </div>
      </div>

      {/* Berita Pengumuman (TIDAK DIUBAH SAMA SEKALI) */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Bell size={20} className="text-primary-500" /> Pengumuman Terbaru
        </h3>
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <p className="text-gray-500 text-sm bg-surface p-4 rounded-xl">Belum ada pengumuman saat ini.</p>
          ) : (
            announcements.map((news) => (
              <div key={news.id} className="bg-surface p-4 rounded-2xl shadow-sm border border-gray-100">
                {news.banner_url && (
                  <img src={news.banner_url} alt="Banner" className="w-full h-32 object-cover rounded-xl mb-3" />
                )}
                <span className="text-[10px] font-bold uppercase text-primary-600 tracking-wider">{news.category}</span>
                <h4 className="font-bold text-gray-800 mt-1">{news.title}</h4>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{news.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
