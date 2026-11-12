import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  CalendarDays, 
  Wallet, 
  Briefcase, 
  Megaphone, 
  LogOut, 
  Menu, 
  X,
  Building2,
  Sparkles
} from 'lucide-react';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Otomatis menutup menu mobile jika rute/halaman berpindah
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Mencegah scroll pada halaman utama saat menu mobile terbuka
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  // Fungsi Logout untuk HRD
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Apakah Anda yakin ingin keluar dari portal HRD?");
    if (!confirmLogout) return;

    await supabase.auth.signOut();
    navigate('/login');
  };

  // Daftar Menu HRD
  const menuItems = [
    { name: 'Dashboard', path: '/hrd/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Karyawan', path: '/hrd/employees', icon: <Users size={20} /> },
    { name: 'Absensi', path: '/hrd/attendance', icon: <Clock size={20} /> },
    { name: 'Cuti & Izin', path: '/hrd/leaves', icon: <CalendarDays size={20} /> },
    { name: 'Payroll', path: '/hrd/payroll', icon: <Wallet size={20} /> },
    { name: 'Rekrutmen', path: '/hrd/recruitment', icon: <Briefcase size={20} /> },
    { name: 'Pengumuman', path: '/hrd/announcements/new', icon: <Megaphone size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col lg:flex-row font-sans selection:bg-primary-500 selection:text-white">
      
      {/* ======================================= */}
      {/* 1. TOP BAR KHUSUS MOBILE (HEADER HP)      */}
      {/* ======================================= */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-18 bg-white/90 backdrop-blur-md border-b border-gray-200/80 z-40 flex items-center justify-between px-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Building2 size={20} />
          </div>
          <div>
            <span className="font-extrabold text-gray-900 text-base tracking-tight block leading-none">PT Rama Cinta Sejati</span>
            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">HRIS Portal</span>
          </div>
        </div>
        
        {/* Tombol Hamburger Modern */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2.5 -mr-2 text-gray-700 bg-gray-50 rounded-2xl hover:bg-gray-100 active:scale-95 transition-all outline-none border border-gray-200/60"
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* ======================================= */}
      {/* 2. OVERLAY GELAP (BACKDROP MOBILE)        */}
      {/* ======================================= */}
      <div 
        onClick={() => setIsMobileMenuOpen(false)}
        className={`
          fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden
          transition-opacity duration-300 ease-in-out
          ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* ======================================= */}
      {/* 3. SIDEBAR NAVIGASI (KIRI)                */}
      {/* ======================================= */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col shadow-2xl lg:shadow-none
        border-r border-gray-100 lg:static lg:z-auto
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Header Sidebar Brand (Desktop) */}
        <div className="hidden lg:flex p-6 pb-5 border-b border-gray-100/80 items-center gap-3.5">
          <div className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/25">
            <Building2 size={22} />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-extrabold text-gray-900 text-sm truncate tracking-tight">PT Rama Cinta Sejati</h1>
            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mt-0.5 flex items-center gap-1">
              <Sparkles size={10} /> HRIS v2.0
            </p>
          </div>
        </div>

        {/* Header Sidebar Mobile Spacer */}
        <div className="h-20 flex items-center px-6 lg:hidden border-b border-gray-100">
          <div>
            <span className="font-bold text-gray-900 text-sm block">Navigasi Utama</span>
            <span className="text-xs text-gray-400">Pilih menu operasional HRD</span>
          </div>
        </div>

        {/* Daftar Menu dengan Efek Active Glow Indicator */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98]
                ${isActive 
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50/60 text-primary-700 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-900'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  {/* Indikator Garis Samping untuk Menu Aktif */}
                  {isActive && (
                    <div className="absolute left-0 top-2.5 bottom-2.5 w-1.5 bg-primary-600 rounded-r-full"></div>
                  )}
                  <span className={`${isActive ? 'text-primary-600' : 'text-gray-400'} transition-colors`}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Footer Sidebar & Logout */}
        <div className="p-4 border-t border-gray-100/80 bg-gray-50/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3.5 w-full rounded-2xl font-semibold text-sm text-rose-600 hover:bg-rose-50 active:scale-[0.98] transition-all border border-transparent hover:border-rose-100"
          >
            <LogOut size={18} />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* ======================================= */}
      {/* 4. AREA KONTEN UTAMA                      */}
      {/* ======================================= */}
      <main className="flex-1 w-full min-w-0 h-screen overflow-y-auto bg-slate-50/50 p-4 pt-24 sm:p-6 sm:pt-24 lg:p-10 relative">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

    </div>
  );
}
