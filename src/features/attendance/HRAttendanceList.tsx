import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Clock, 
  MapPin, 
  Search, 
  Loader2, 
  Calendar,
  Image as ImageIcon,
  ExternalLink,
  FileSpreadsheet,
  Download,
  CalendarDays,
  LogIn,
  LogOut
} from 'lucide-react';

// --- DEFINISI TIPE DATA ---
type AttendanceRecord = {
  id: string;
  date: string;
  check_in: string;
  check_out: string | null; // Tambahan tipe data jam keluar
  photo_url: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  employees: {
    full_name: string;
    nik: string;
  };
};

type ReportData = {
  id: string;
  nik: string;
  full_name: string;
  position: string;
  total_present: number;
  total_checkout: number; // Tambahan tipe data rekap pulang
};

export default function HRAttendanceList() {
  // --- STATE HARIAN ---
  const [dailyData, setDailyData] = useState<AttendanceRecord[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailySearch, setDailySearch] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // --- STATE REKAP BULANAN ---
  const [recapData, setRecapData] = useState<ReportData[]>([]);
  const [recapLoading, setRecapLoading] = useState(true);
  const [recapSearch, setRecapSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // --- FUNGSI AMBIL DATA HARIAN ---
  const fetchDailyAttendance = async () => {
    try {
      setDailyLoading(true);
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`*, employees ( full_name, nik )`)
        .eq('date', dateFilter)
        .order('check_in', { ascending: false });

      if (error) throw error;
      setDailyData(data || []);
    } catch (error: any) {
      console.error('Gagal mengambil absen harian:', error.message);
    } finally {
      setDailyLoading(false);
    }
  };

  // --- FUNGSI AMBIL REKAP BULANAN ---
  const fetchMonthlyRecap = async () => {
    try {
      setRecapLoading(true);
      // 1. Ambil semua karyawan
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, nik, full_name, position')
        .order('full_name', { ascending: true });

      if (empError) throw empError;

      // 2. Rentang waktu bulan terpilih
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

      // 3. Ambil total absen hadir & keluar di bulan tersebut
      const { data: attendances, error: attError } = await supabase
        .from('attendance_records')
        .select('employee_id, check_out')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('status', 'present');

      if (attError) throw attError;

      // 4. Gabungkan datanya (Hadir & Pulang)
      const recap = employees.map(emp => {
        const empRecords = attendances.filter(a => a.employee_id === emp.id);
        const totalHadir = empRecords.length;
        const totalPulang = empRecords.filter(a => a.check_out !== null).length;

        return {
          id: emp.id,
          nik: emp.nik,
          full_name: emp.full_name,
          position: emp.position || '-',
          total_present: totalHadir,
          total_checkout: totalPulang
        };
      });

      setRecapData(recap);
    } catch (error: any) {
      console.error('Gagal memuat rekap:', error.message);
    } finally {
      setRecapLoading(false);
    }
  };

  // --- EFEK PERUBAHAN TANGGAL / BULAN & REALTIME UPDATE ---
  useEffect(() => { fetchDailyAttendance(); }, [dateFilter]);
  useEffect(() => { fetchMonthlyRecap(); }, [selectedMonth]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-attendance-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_records' },
        () => {
          fetchDailyAttendance();
          fetchMonthlyRecap();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateFilter, selectedMonth]);

  // --- FUNGSI EXPORT EXCEL ---
  const handleExportCSV = () => {
    const header = "NIK,Nama Karyawan,Jabatan,Total Hadir (Hari),Total Pulang (Hari)\n";
    const csvContent = recapData.map(row => 
      `="${row.nik}",${row.full_name},${row.position},${row.total_present},${row.total_checkout}`
    ).join("\n");
    
    const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_Kehadiran_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Search
  const filteredDaily = dailyData.filter(record => 
    record.employees?.full_name.toLowerCase().includes(dailySearch.toLowerCase()) ||
    record.employees?.nik.toLowerCase().includes(dailySearch.toLowerCase())
  );

  const filteredRecap = recapData.filter(emp => 
    emp.full_name.toLowerCase().includes(recapSearch.toLowerCase()) ||
    emp.nik.toLowerCase().includes(recapSearch.toLowerCase())
  );

  const getPhotoUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('attendance_photos').getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
      
      {/* ======================================= */}
      {/* BAGIAN 1: PANTAUAN HARIAN (FOTO & GPS)  */}
      {/* ======================================= */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="text-primary-600" /> Pantau Kehadiran Harian
            </h2>
            <p className="text-sm text-gray-500 mt-1">Laporan absensi masuk dan keluar harian karyawan beserta foto dan lokasi.</p>
          </div>
        </div>

        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4">
            <div className="relative max-w-md flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Cari nama atau NIK..." 
                value={dailySearch}
                onChange={(e) => setDailySearch(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Calendar size={18} />
              </div>
              <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all cursor-pointer"
              />
            </div>
          </div>

          {dailyLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Memuat data kehadiran...</p>
            </div>
          ) : filteredDaily.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Clock size={48} className="text-gray-300 mb-3" />
              <p className="font-medium text-gray-900">Belum ada yang absen</p>
              <p className="text-sm">Tidak ada data kehadiran untuk tanggal ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-sm text-gray-500">
                    <th className="px-6 py-4 font-semibold">Karyawan</th>
                    <th className="px-6 py-4 font-semibold">Jam Masuk</th>
                    <th className="px-6 py-4 font-semibold">Jam Keluar</th>
                    <th className="px-6 py-4 font-semibold">Foto Selfie</th>
                    <th className="px-6 py-4 font-semibold">Lokasi (GPS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDaily.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{record.employees?.full_name || 'Tidak diketahui'}</div>
                        <div className="text-sm text-gray-500 font-mono mt-0.5">{record.employees?.nik || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-sm border border-emerald-100">
                          <LogIn size={16} />
                          {new Date(record.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {record.check_out ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-50 text-orange-700 font-medium text-sm border border-orange-100">
                            <LogOut size={16} />
                            {new Date(record.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-600 font-medium text-xs border border-blue-100 animate-pulse">
                            Masih Bekerja
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {record.photo_url ? (
                          <a href={getPhotoUrl(record.photo_url)} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2">
                             <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200">
                               <img src={getPhotoUrl(record.photo_url)} alt="Selfie" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                             </div>
                          </a>
                        ) : (
                          <span className="text-gray-400 flex items-center gap-1 text-sm"><ImageIcon size={16}/> Tanpa foto</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {record.latitude && record.longitude ? (
                          <a href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium">
                            <MapPin size={16} /> Cek Maps <ExternalLink size={14} />
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm italic">GPS ditolak/gagal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ======================================= */}
      {/* BAGIAN 2: REKAP BULANAN                 */}
      {/* ======================================= */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-600" /> Rekap Bulanan Karyawan
            </h2>
            <p className="text-sm text-gray-500 mt-1">Total kehadiran dan absen pulang seluruh karyawan dalam satu bulan.</p>
          </div>
          <button 
            onClick={handleExportCSV}
            disabled={recapLoading || recapData.length === 0}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Download size={18} /> Export Excel (CSV)
          </button>
        </div>

        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4">
            <div className="relative max-w-md flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Cari karyawan di rekap..." 
                value={recapSearch}
                onChange={(e) => setRecapSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <CalendarDays size={18} />
              </div>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all cursor-pointer font-medium text-gray-700"
              />
            </div>
          </div>

          {recapLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Menghitung rekapitulasi data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-sm text-gray-500">
                    <th className="px-6 py-4 font-semibold">Nama Karyawan & NIK</th>
                    <th className="px-6 py-4 font-semibold">Jabatan</th>
                    <th className="px-6 py-4 font-semibold text-center">Total Hadir</th>
                    <th className="px-6 py-4 font-semibold text-center">Total Pulang</th>
                    <th className="px-6 py-4 font-semibold text-center">Status Keaktifan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecap.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{emp.full_name}</div>
                        <div className="text-sm text-gray-500 font-mono mt-0.5">{emp.nik}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{emp.position}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                          {emp.total_present}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 font-bold border border-orange-100">
                          {emp.total_checkout}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {emp.total_present > 0 ? (
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">Aktif</span>
                        ) : (
                          <span className="text-xs font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">Nihil</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
