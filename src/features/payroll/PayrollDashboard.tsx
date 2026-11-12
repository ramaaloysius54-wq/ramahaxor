import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import PayrollRealtimeRow from './PayrollRealtimeRow';
import { 
  FileSpreadsheet, 
  Calculator, 
  CreditCard, 
  Download, 
  Search, 
  Clock, 
  Radio 
} from 'lucide-react';

export default function PayrollDashboard() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const fetchPayroll = async () => {
    setLoading(true);
    const { data: periodData } = await supabase
      .from('payroll_periods')
      .select('id, status')
      .eq('month', selectedMonth)
      .eq('year', selectedYear)
      .maybeSingle();

    if (periodData) {
      const { data: records } = await supabase
        .from('payroll_records')
        .select('*, employees(full_name, nik, position, bank_name, bank_account_number, base_salary)')
        .eq('period_id', periodData.id);
      setPayrolls(records || []);
    } else {
      setPayrolls([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayroll();

    // Supabase Realtime Listener (WebSocket)
    const channel = supabase
      .channel('realtime_payroll_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payroll_records' },
        () => {
          // Ketika ada row yang update (misalnya by trigger trigger supabase atau client lain)
          // kita fetch ulang ringan jika perlu. Namun kalkulasi sudah ada di PayrollRealtimeRow.
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMonth, selectedYear]);

  // Bulk Processor untuk inisialisasi awal periode
  const generateBulkPayroll = async () => {
    if (!confirm('Inisialisasi draf penggajian untuk periode ini? Data baru akan ditambahkan.')) return;
    setIsGenerating(true);

    try {
      let periodId: string;
      const { data: existingPeriod } = await supabase
        .from('payroll_periods')
        .select('id')
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .maybeSingle();

      if (existingPeriod) {
        periodId = existingPeriod.id;
      } else {
        const { data: newPeriod, error: pErr } = await supabase
          .from('payroll_periods')
          .insert({ month: selectedMonth, year: selectedYear, status: 'draft' })
          .select('id')
          .single();
        if (pErr) throw pErr;
        periodId = newPeriod.id;
      }

      const { data: employees } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true);

      if (!employees || employees.length === 0) throw new Error('Data karyawan tidak ditemukan.');

      // Inisialisasi draft, belum dikalkulasi penuh (Kalkulasi realtime ada di Row)
      const initialDrafts = employees.map((emp) => {
        const base = Number(emp.base_salary) || 0;
        return {
          period_id: periodId,
          employee_id: emp.id,
          base_salary: base,
          overtime_pay: 0,
          late_deduction: 0,
          bpjs_kes_employee: 0,
          bpjs_tk_employee: 0,
          pph21_ter: 0,
          gross_salary: base,
          total_allowance: 0,
          total_deduction: 0,
          net_salary: base,
          is_paid: false,
          // Tambahan field untuk form baru (Pastikan field ini sudah ada di schema database Anda, 
          // jika belum, tambahkan tipe json atau update schema Anda)
          // Kita akan simpan data sementara di client state Row jika field DB belum siap, 
          // tapi idealnya kolom-kolom ini ada di table payroll_records:
          // overtime_hours: 0,
          // overtime_rate: 20000,
          // performance_allowance: 0,
          // sick_days: 0,
          // daily_rate: Math.round(base / 22), 
        };
      });

      const { error: upsertErr } = await supabase
        .from('payroll_records')
        .upsert(initialDrafts, { onConflict: 'period_id,employee_id' });

      if (upsertErr) throw upsertErr;
      await fetchPayroll();
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportBankFile = () => {
    if (payrolls.length === 0) return;
    let csv = 'Rekening_Tujuan,Nama_Penerima,Nominal,Berita_Transfer,Bank_Tujuan\n';
    payrolls.forEach((p) => {
      const emp = p.employees;
      csv += `"${emp?.bank_account_number}","${emp?.full_name}",${p.net_salary},"Gaji ${selectedMonth}/${selectedYear}","${emp?.bank_name}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bank_Disbursement_${selectedMonth}_${selectedYear}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">Payroll </h2>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <Radio size={10} className="animate-pulse" /> Live Calc
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Hitung otomatis Gaji, Lembur, Tunjangan Kinerja, BPJS, dan Potongan Kehadiran (Sakit).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>Bulan {m}</option>
            ))}
          </select>

          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button 
            onClick={generateBulkPayroll}
            disabled={isGenerating}
            className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            {isGenerating ? <Clock className="animate-spin" size={14} /> : <Calculator size={14} />}
            Inisialisasi Periode
          </button>
        </div>
      </div>

      {/* Ekspor Toolbar */}
      {payrolls.length > 0 && (
        <div className="flex justify-between items-center bg-indigo-50/70 border border-indigo-100 p-3 rounded-2xl">
          <span className="text-xs text-indigo-900 font-medium">
            Terhubung dengan <b>{payrolls.length} Karyawan Aktif</b>
          </span>
          <button 
            onClick={exportBankFile}
            className="flex items-center gap-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm"
          >
            <CreditCard size={13} /> Unduh File Transfer Bank (CSV)
          </button>
        </div>
      )}

      {/* Tabel Interaktif */}
      {loading ? (
        <div className="flex justify-center p-12"><Clock className="animate-spin text-primary-600" size={28} /></div>
      ) : payrolls.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <Search size={32} className="mx-auto text-gray-300 mb-2" />
          <h4 className="font-bold text-gray-700 text-sm">Periode Belum Diinisialisasi</h4>
          <p className="text-xs text-gray-400 mt-1">Klik tombol Inisialisasi Periode untuk memuat seluruh daftar karyawan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-4 w-1/4">Karyawan & Info Dasar</th>
                  <th className="px-5 py-4 w-1/4">Form Variabel (Lembur, Tunjangan, Kehadiran)</th>
                  <th className="px-5 py-4 w-1/4">Komputasi & BPJS</th>
                  <th className="px-5 py-4 text-right">Take Home Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrolls.map((row) => (
                  <PayrollRealtimeRow 
                    key={row.id} 
                    record={row} 
                    onUpdateSuccess={fetchPayroll} 
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
