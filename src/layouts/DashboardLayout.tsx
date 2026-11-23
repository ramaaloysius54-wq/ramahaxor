import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
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
  Target,
  PanelLeftClose,
  PanelLeftOpen,
  Plus
} from 'lucide-react';

type MenuItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  end?: boolean;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [badges, setBadges] = useState({ pendingLeaves: 0, pendingKpis: 0 });

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const fetchBadges = useCallback(async () => {
    try {
      const [leaveRes, kpiRes] = await Promise.all([
        supabase
          .from('leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('employee_kpis')
          .select('*', { count: 'exact', head: true })
          .eq('approval_status', 'submitted')
      ]);

      setBadges({
        pendingLeaves: leaveRes.count || 0,
        pendingKpis: kpiRes.count || 0
      });
    } catch {
      // Abaikan jika tabel belum tersedia
    }
  }, []);

  useEffect(() => {
    fetchBadges();

    const channel = supabase
      .channel('hrd-minimal-sidebar-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => fetchBadges())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_kpis' }, () => fetchBadges())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBadges]);

  const handleLogout = async () => {
    const confirmLogout = window.confirm('Keluar dari portal HRD?');
    if (!confirmLogout) return;

    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuGroups: MenuGroup[] = [
    {
      label: 'Utama',
      items: [
        {
          name: 'Dashboard',
          path: '/hrd/dashboard',
          icon: <LayoutDashboard size={17} strokeWidth={1.8} />,
          end: true
        }
      ]
    },
    {
      label: 'Operasional',
      items: [
        { name: 'Karyawan', path: '/hrd/employees', icon: <Users size={17} strokeWidth={1.8} /> },
        { name: 'Absensi', path: '/hrd/attendance', icon: <Clock size={17} strokeWidth={1.8} /> },
        {
          name: 'Cuti & Izin',
          path: '/hrd/leaves',
          icon: <CalendarDays size={17} strokeWidth={1.8} />,
          badge: badges.pendingLeaves
        },
        { name: 'Payroll', path: '/hrd/payroll', icon: <Wallet size={17} strokeWidth={1.8} /> },
        {
          name: 'KPI Karyawan',
          path: '/hrd/kpi',
          icon: <Target size={17} strokeWidth={1.8} />,
          badge: badges.pendingKpis
        },
        { name: 'Rekrutmen', path: '/hrd/recruitment', icon: <Briefcase size={17} strokeWidth={1.8} /> }
      ]
    },
    {
      label: 'Administrasi',
      items: [
        { name: 'Pengumuman', path: '/hrd/announcements/new', icon: <Megaphone size={17} strokeWidth={1.8} /> },
        { name: 'Surat Peringatan', path: '/hrd/warning-letters', icon: <AlertOctagon size={17} strokeWidth={1.8} /> },
        { name: 'Kelola Akun', path: '/hrd/manage-accounts', icon: <Key size={17} strokeWidth={1.8} /> }
      ]
    }
  ];

  const allMenuItems = menuGroups
    .flatMap((group) => group.items)
    .sort((a, b) => b.path.length - a.path.length);
  const currentMenu = allMenuItems.find((item) => location.pathname.startsWith(item.path));
  const pageTitle = currentMenu ? currentMenu.name : 'Portal HRD';

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex font-sans text-zinc-900 antialiased selection:bg-zinc-900 selection:text-white">
      {/* Backdrop Mobile */}
      <div
        onClick={() => setIsMobileMenuOpen(false)}
        className={`fixed inset-0 bg-zinc-950/30 backdrop-blur-[2px] z-40 lg:hidden transition-opacity duration-200 ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-zinc-200/80 flex flex-col lg:sticky lg:top-0 lg:h-screen lg:shrink-0 transition-all duration-200 ease-out ${
          isCollapsed ? 'lg:w-[70px]' : 'lg:w-[248px]'
        } w-[260px] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand */}
        <div
          className={`h-14 border-b border-zinc-100 flex items-center shrink-0 ${
            isCollapsed ? 'lg:justify-center px-3' : 'justify-between px-4'
          }`}
        >
          <Link to="/hrd/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
              <Building2 size={16} strokeWidth={2} />
            </div>
            <div className={`min-w-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <h1 className="text-[13px] font-semibold text-zinc-900 tracking-tight truncate leading-none">
                PT Rama Cinta Sejati
              </h1>
              <p className="text-[11px] text-zinc-400 mt-0.5 truncate">HRIS Workspace</p>
            </div>
          </Link>

          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
            aria-label="Tutup Menu"
          >
            <X size={17} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
          {menuGroups.map((group) => (
            <div key={group.label}>
              <p
                className={`px-2.5 mb-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider ${
                  isCollapsed ? 'lg:hidden' : ''
                }`}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    title={isCollapsed ? item.name : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center rounded-lg text-[13px] transition-colors duration-150 ${
                        isCollapsed
                          ? 'lg:justify-center lg:px-0 lg:py-2 px-2.5 py-2 justify-between'
                          : 'justify-between px-2.5 py-2'
                      } ${
                        isActive
                          ? 'bg-zinc-900 text-white font-medium'
                          : 'text-zinc-600 font-normal hover:bg-zinc-100 hover:text-zinc-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`shrink-0 ${
                              isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-800'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>
                            {item.name}
                          </span>
                        </div>

                        {item.badge && item.badge > 0 ? (
                          <span
                            className={`text-[10px] font-semibold rounded-full flex items-center justify-center shrink-0 ${
                              isCollapsed
                                ? 'lg:absolute lg:top-1.5 lg:right-2 lg:w-1.5 lg:h-1.5 lg:p-0 bg-rose-500 text-white px-1.5 py-0.5'
                                : isActive
                                ? 'bg-white/20 text-white min-w-[18px] h-[18px] px-1.5'
                                : 'bg-rose-50 text-rose-600 min-w-[18px] h-[18px] px-1.5'
                            }`}
                          >
                            <span className={isCollapsed ? 'lg:hidden' : ''}>{item.badge}</span>
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Profil & Logout */}
        <div className="p-2.5 border-t border-zinc-100 shrink-0">
          <div
            className={`flex items-center rounded-lg p-2 bg-zinc-50 border border-zinc-200/60 ${
              isCollapsed ? 'lg:justify-center' : 'justify-between gap-2'
            }`}
          >
            <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <div className="w-7 h-7 rounded-md bg-zinc-900 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                HR
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-900 truncate leading-tight">Admin HRD</p>
                <p className="text-[10px] text-zinc-400 truncate">Super Admin</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Keluar Sistem"
              aria-label="Keluar Sistem"
              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors shrink-0"
            >
              <LogOut size={15} strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </aside>

      {/* Area Konten Kanan */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Bar Minimalis */}
        <header className="sticky top-0 z-30 h-14 bg-white/80 backdrop-blur-md border-b border-zinc-200/70 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
              aria-label="Buka Menu"
            >
              <Menu size={19} />
            </button>

            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="hidden lg:flex p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
              aria-label="Toggle Sidebar"
              title={isCollapsed ? 'Perlebar Sidebar' : 'Perkecil Sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>

            <span className="hidden lg:block h-4 w-px bg-zinc-200" />

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-zinc-400 font-normal">HRD</span>
              <span className="hidden sm:inline text-zinc-300">/</span>
              <h2 className="font-semibold text-zinc-900 tracking-tight truncate">{pageTitle}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-zinc-500 px-2.5 py-1 rounded-md bg-zinc-100/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {todayFormatted}
            </span>

            <Link
              to="/hrd/employees/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium active:scale-[0.98] transition-all"
            >
              <Plus size={14} strokeWidth={2.2} />
              <span className="hidden sm:inline">Karyawan</span>
            </Link>
          </div>
        </header>

        {/* Main Outlet */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
