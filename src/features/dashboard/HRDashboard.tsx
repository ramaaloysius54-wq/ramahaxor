import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, FileText, UserPlus, TrendingUp, 
  ArrowRight, Building, CalendarCheck, 
  Sparkles, Activity, Clock, BellRing, ChevronRight,
  UserCheck, Key, AlertOctagon,
  LogIn, LogOut
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { 
  PieChart, Pie, Cell, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

export default function HRDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingLeaves: 0,
    activeCandidates: 0,
    tetap: 0,
    kontrak: 0,
    keluar: 0,
    hadirHariIni: 0,
    pulangHariIni: 0,
    masihBekerja: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const utcDate = new Date().toISOString().split('T')[0];
      const localDate = new Date().toLocaleDateString('en-CA');

      const { count: empCount } = await supabase.from('employees').select('*', { count: 'exact', head: true });
      const { count: leaveCount } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: candCount } = await supabase.from('candidates').select('*', { count: 'exact', head: true }).neq('stage', 'rejected');
      
      const { data: empData } = await supabase.from('employees').select('*');
      
      let tetap = 0; let kontrak = 0; let keluar = 0;
      if (empData && empData.length > 0) {
        empData.forEach((emp: any) => {
          const type = (emp.employment_type || '').toLowerCase();
          
          if (emp.is_active === false || emp.status === 'inactive') {
            keluar++;
          } 
          else if (type.includes('tetap') || type.includes('full')) {
            tetap++;
          } 
          else if (type.includes('kontrak') || type.includes('magang') || type.includes('contract')) {
            kontrak++;
          }
          else {
            kontrak++;
          }
        });
      }

      const { data: attData } = await supabase
        .from('attendance_records')
        .select('*')
        .in('date', [utcDate, localDate]);

      let hadirHariIni = 0;
      let pulangHariIni = 0;
      let masihBekerja = 0;

      if (attData && attData.length > 0) {
        const todayRecords = attData.filter((record: any) => {
          if (!record.check_in) return record.date === localDate || record.date === utcDate;
          const checkInLocalDate = new Date(record.check_in).toLocaleDateString('en-CA');
          return checkInLocalDate === localDate || record.date === localDate || record.date === utcDate;
        });

        hadirHariIni = todayRecords.length;
        pulangHariIni = todayRecords.filter((record: any) => Boolean(record.check_out)).length;
        masihBekerja = todayRecords.filter((record: any) => !record.check_out).length;
      }

      setStats({
        totalEmployees: empCount || (empData ? empData.length : 0),
        pendingLeaves: leaveCount || 0,
        activeCandidates: candCount || 0,
        tetap,
        kontrak,
        keluar,
        hadirHariIni,
        pulangHariIni,
        masihBekerja
      });
    };
    
    fetchStats();

    const subscription = supabase
      .channel('realtime-hr-dashboard-live')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'employees' }, 
        () => { fetchStats(); }
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'attendance_records' }, 
        () => { fetchStats(); }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchStats();
    }, 4000);

    return () => {
      supabase.removeChannel(subscription);
      clearInterval(interval);
    };
  }, []);

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const chartData = [
    { name: 'Karyawan Tetap', total: stats.tetap, color: '#10b981' }, 
    { name: 'Kontrak/Magang', total: stats.kontrak, color: '#f59e0b' }, 
    { name: 'Keluar/Resign', total: stats.keluar, color: '#f43f5e' } 
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-700 rounded-[2rem] p-8 sm:p-10 text-white shadow-2xl shadow-indigo-900/20 border border-white/10">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-indigo-100 mb-6">
                <Sparkles size={14} className="text-blue-300" />
                <span>HRIS Portal 2.0</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight leading-tight">
                Selamat Datang, <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-100">Tim HRD</span> 👋
              </h1>
              <p className="text-indigo-200 text-sm sm:text-base max-w-md font-medium leading-relaxed">
                Pantau kehadiran, kelola cuti, rekrutmen, dan eksekusi penggajian massal karyawan dalam satu sentuhan.
              </p>
            </div>
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-blue-400 to-indigo-500 opacity-20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-10 w-40 h-40 bg-purple-400 opacity-20 rounded-full blur-2xl pointer-events-none"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
              <div className="flex justify-between items-start mb-5">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users size={24} />
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                  <TrendingUp size={10}/> +2.4%
                </span>
              </div>
              <div>
                <h3 className="text-gray-400 font-semibold text-xs uppercase tracking-wider mb-1">Total Karyawan</h3>
                <p className="text-3xl font-extrabold text-gray-900">{stats.totalEmployees}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
              <div className="flex justify-between items-start mb-5">
                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText size={24} />
                </div>
                {stats.pendingLeaves > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-1 rounded-lg animate-pulse">
                    Perlu Aksi
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-gray-400 font-semibold text-xs uppercase tracking-wider mb-1">Cuti Pending</h3>
                <p className="text-3xl font-extrabold text-gray-900">{stats.pendingLeaves}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group sm:col-span-2 lg:col-span-1">
              <div className="flex justify-between items-start mb-5">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserPlus size={24} />
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                  <TrendingUp size={10}/> Aktif
                </span>
              </div>
              <div>
                <h3 className="text-gray-400 font-semibold text-xs uppercase tracking-wider mb-1">Kandidat Pelamar</h3>
                <p className="text-3xl font-extrabold text-gray-900">{stats.activeCandidates}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-lg font-bold text-gray-900">Akses Cepat</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link to="/hrd/employees/new" className="group flex items-center justify-between p-5 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Building size={22}/>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Tambah Karyawan</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Daftarkan staf baru</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all relative z-10" />
              </Link>

              <Link to="/hrd/leaves" className="group flex items-center justify-between p-5 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 hover:border-amber-300 hover:shadow-md transition-all overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-50 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <CalendarCheck size={22}/>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Persetujuan Cuti</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Review pengajuan absen</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all relative z-10" />
              </Link>

              <Link to="/hrd/manage-accounts" className="group flex items-center justify-between p-5 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 hover:border-purple-300 hover:shadow-md transition-all overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-50 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Key size={22}/>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Kelola Akun</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Atur email & password</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all relative z-10" />
              </Link>

              <Link to="/hrd/warning-letters" className="group flex items-center justify-between p-5 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 hover:border-rose-300 hover:shadow-md transition-all overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-50 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <AlertOctagon size={22}/>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Surat Peringatan (SP)</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Buat & Ekspor ke Word</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-rose-600 group-hover:translate-x-1 transition-all relative z-10" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 mt-8">
            <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 flex flex-col h-[350px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><TrendingUp size={18} /></div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Distribusi Status</h3>
                  <p className="text-xs text-gray-500">Persentase karyawan aktif & non-aktif</p>
                </div>
              </div>
              <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="total">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 flex flex-col h-[350px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Building size={18} /></div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Komposisi Pegawai</h3>
                  <p className="text-xs text-gray-500">Perbandingan jumlah per status</p>
                </div>
              </div>
              <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} />
                    <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:space-y-8 mt-6 lg:mt-0">
          <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <div className="flex items-center gap-3 mb-1">
              <Clock size={16} className="text-blue-500" />
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Hari Ini</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{today}</p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <CalendarCheck size={18} className="text-blue-600" />
                Absensi Hari Ini
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-1" title="Real-time aktif"></span>
              </h3>
              <Link to="/hrd/attendance" className="text-xs font-bold text-blue-600 hover:underline">
                Detail
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <LogIn size={16} />
                  <span className="text-xs font-bold uppercase">Absen Masuk</span>
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{stats.hadirHariIni} <span className="text-xs font-normal text-gray-500">org</span></p>
              </div>

              <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-100">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <LogOut size={16} />
                  <span className="text-xs font-bold uppercase">Absen Keluar</span>
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{stats.pulangHariIni} <span className="text-xs font-normal text-gray-500">org</span></p>
              </div>
            </div>
            <div className="mt-3 px-3 py-2.5 rounded-xl bg-blue-50/60 border border-blue-100 flex justify-between items-center text-xs text-gray-700">
              <span className="font-medium">Masih Bekerja (Belum Pulang):</span>
              <span className="font-extrabold text-blue-600 text-sm">{stats.masihBekerja} org</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-6">
              <UserCheck size={18} className="text-emerald-500" />
              Rincian Karyawan
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-medium text-gray-700">Karyawan Tetap</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{stats.tetap} org</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-sm font-medium text-gray-700">Kontrak/Magang</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{stats.kontrak} org</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  <span className="text-sm font-medium text-gray-700">Keluar / Resign</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{stats.keluar} org</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Activity size={18} className="text-indigo-500" />
                Aktivitas Terkini
              </h3>
            </div>

            <div className="space-y-5 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-200 before:via-gray-100 before:to-transparent">
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-indigo-100 text-indigo-600 shadow shrink-0 z-10">
                  <BellRing size={12} />
                </div>
                <div className="w-[calc(100%-2.5rem)] ml-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">Pantauan Absensi</span>
                    <span className="text-xs text-gray-500 mt-0.5">{stats.hadirHariIni} hadir, {stats.masihBekerja} masih bekerja, {stats.pulangHariIni} sudah pulang.</span>
                    <span className="text-[10px] font-semibold text-indigo-500 mt-1">Real-time Hari Ini</span>
                  </div>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-amber-100 text-amber-500 shadow shrink-0 z-10">
                  <FileText size={12} />
                </div>
                <div className="w-[calc(100%-2.5rem)] ml-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">Pengajuan Cuti Baru</span>
                    <span className="text-xs text-gray-500 mt-0.5">Terdapat {stats.pendingLeaves} pengajuan cuti menunggu persetujuan.</span>
                    <span className="text-[10px] font-semibold text-amber-500 mt-1">Hari ini</span>
                  </div>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-emerald-100 text-emerald-500 shadow shrink-0 z-10">
                  <Users size={12} />
                </div>
                <div className="w-[calc(100%-2.5rem)] ml-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">Pembaruan Data</span>
                    <span className="text-xs text-gray-500 mt-0.5">Data {stats.totalEmployees} karyawan telah tersinkron.</span>
                    <span className="text-[10px] font-semibold text-emerald-500 mt-1">Otomatis</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Link to="/hrd/attendance" className="w-full mt-6 py-2.5 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-1">
              Lihat Semua Laporan <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
