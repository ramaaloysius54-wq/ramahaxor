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
  AlertOctagon,
  Key,
  LogOut,
  Menu,
  X,
  Building2,
  ShieldCheck,
  ChevronRight,
  Target
} from 'lucide-react';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Tutup drawer mobile otomatis saat berpindah halaman
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Kunci scroll halaman saat drawer mobile terbuka & bersihkan saat unmount
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Fungsi Logout HRD
  const handleLogout = async () => {
    const confirmLogout = window.confirm('Apakah Anda yakin ingin keluar dari portal HRD?');
    if (!confirmLogout) return;

    await supabase.auth.signOut();
    navigate('/login');
  };

  // Struktur Menu HRD Terkelompok
  const menuGroups = [
    {
      label: 'Utama',
      items: [
        { name: 'Dashboard', path: '/hrd/dashboard', icon: <LayoutDashboard size={19} /> },
      ],
    },
    {
      label: 'Operasional HR',
      items: [
        { name: 'Karyawan', path: '/hrd/employees', icon: <Users size={19} /> },
        { name: 'Absensi', path: '/hrd/attendance', icon: <Clock size={19} /> },
        { name: 'Cuti & Izin', path: '/hrd/leaves', icon: <CalendarDays size={19} /> },
        { name: 'Payroll', path: '/hrd/payroll', icon: <Wallet size={19} /> },
        { name: 'KPI Karyawan', path: '/hrd/kpi', icon: <Target size={19} /> },
        { name: 'Rekrutmen', path: '/hrd/recruitment', icon: <Briefcase size={19} /> },
      ],
    },
    {
      label: 'Administrasi',
      items: [
        { name: 'Pengumuman', path: '/hrd/announcements/new', icon: <Megaphone size={19} /> },
        { name: 'Surat Peringatan', path: '/hrd/warning-letters', icon: <AlertOctagon size={19} /> },
        { name: 'Kelola Akun', path: '/hrd/manage-accounts', icon: <Key size={19} /> },
      ],
    },
  ];

  // Judul halaman aktif otomatis untuk Header Bar
  const allMenuItems = menuGroups.flatMap((group) => group.items);
  const currentMenu = allMenuItems.find((item) => location.pathname.startsWith(item.path));
  const pageTitle = currentMenu ? currentMenu.name : 'Portal HRD';

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-800 selection:bg-indigo-600 selection:text-white">
      
      {/* ======================================= */}
      {/* 1. TOP BAR MOBILE & TABLET              */}
      {/* ======================================= */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-[68px] bg-white/90 backdrop-blur-lg border-b border-slate-200/80 z-40 flex items-center justify-between px-4 sm:px-6 shadow-[0_1px_12px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
            <Building2 size={20} />
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight block truncate leading-tight">
              PT Rama Cinta Sejati
            </span>
            <span className="text-[11px] font-semibold text-indigo-600 block truncate">
              {pageTitle}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2.5 text-slate-700 bg-slate-100/80 hover:bg-slate-200/70 rounded-xl active:scale-95 transition-all border border-slate-200/60"
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* ======================================= */}
      {/* 2. BACKDROP OVERLAY (MOBILE)            */}
      {/* ======================================= */}
      <div
        onClick={() => setIsMobileMenuOpen(false)}
        className={`
          fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] z-40 lg:hidden
          transition-opacity duration-300 ease-in-out
          ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* ======================================= */}
      {/* 3. SIDEBAR NAVIGASI                     */}
      {/* ======================================= */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[276px] bg-white flex flex-col
          border-r border-slate-200/80 shadow-2xl lg:shadow-none
          lg:sticky lg:top-0 lg:h-screen lg:shrink-0
          transform transition-transform duration-300 ease-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header Sidebar */}
        <div className="h-[72px] px-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-600/25">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-slate-900 text-sm truncate tracking-tight">
                PT Rama Cinta Sejati
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  HRIS Portal 2.0
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Tutup Menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Daftar Menu Terkelompok */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6 custom-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `
                      group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150
                      ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      }
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <span
                            className={`transition-colors ${
                              isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span>{item.name}</span>
                        </div>
                        {isActive && <ChevronRight size={15} className="text-indigo-200" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Profil & Logout */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-slate-200/70 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">Admin HRD</p>
              <p className="text-[11px] text-slate-500 truncate">Akses Penuh Sistem</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 w-full rounded-xl font-semibold text-xs text-rose-600 bg-rose-50/70 hover:bg-rose-600 hover:text-white active:scale-[0.98] transition-all border border-rose-100"
          >
            <LogOut size={16} />
            <span>Keluar dari Sistem</span>
          </button>
        </div>
      </aside>

      {/* ======================================= */}
      {/* 4. WRAPPER HEADER DESKTOP & KONTEN      */}
      {/* ======================================= */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Bar Desktop */}
        <header className="hidden lg:flex sticky top-0 z-30 h-[72px] bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-8 items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              HRIS / {pageTitle}
            </p>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
              {pageTitle}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/80 border border-slate-200/60 text-xs font-semibold text-slate-600">
              <CalendarDays size={14} className="text-indigo-600" />
              <span>{todayFormatted}</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online</span>
            </div>
          </div>
        </header>

        {/* Area Konten Utama */}
        <main className="flex-1 w-full p-4 pt-[88px] sm:p-6 sm:pt-[92px] lg:p-8 lg:pt-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

    </div>
  );
}
