import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Target,
  Search,
  Trash2,
  CheckCircle2,
  Award,
  X,
  Loader2,
  Radio,
  CalendarDays,
  Clock,
  Star,
  ThumbsDown,
  MessageSquare,
  BellRing
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

type HRKPIRecord = {
  id: string;
  employee_id: string;
  department?: string | null;
  title: string;
  description: string | null;
  category: string;
  target_value: number;
  current_value: number;
  unit: string;
  weight: number;
  expected_benchmark: number;
  period_month: number;
  period_year: number;
  status: string;
  approval_status: string;
  hrd_score: number | null;
  hrd_notes: string | null;
  employee_notes: string | null;
  employees?: {
    full_name: string;
    nik: string;
    department: string | null;
    position: string | null;
    job_level: string | null;
  };
};

type KPICycle = {
  id: string;
  name: string;
  period_month: number;
  period_year: number;
  progress_deadline: string;
  review_deadline: string;
  expected_score: number;
  is_active: boolean;
};

const getClaimPercent = (current: number, target: number) => {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((Number(current) / Number(target)) * 100));
};

const getFinalScore = (item: HRKPIRecord) => {
  if (item.hrd_score !== null && item.hrd_score !== undefined) {
    return Math.round(Number(item.hrd_score));
  }
  return getClaimPercent(item.current_value, item.target_value);
};

const getMonthName = (m: number) => {
  const d = new Date();
  d.setMonth(m - 1);
  return d.toLocaleString('id-ID', { month: 'long' });
};

export default function HRKPIManagement() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [activeTab, setActiveTab] = useState<'evaluate' | 'cycles'>('evaluate');

  const [kpis, setKpis] = useState<HRKPIRecord[]>([]);
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [cycles, setCycles] = useState<KPICycle[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected' | 'draft'>('all');

  const [evaluatingKpi, setEvaluatingKpi] = useState<HRKPIRecord | null>(null);
  const [hrdScoreInput, setHrdScoreInput] = useState('85');
  const [hrdNotesInput, setHrdNotesInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [cycleForm, setCycleForm] = useState({
    name: `Evaluasi ${getMonthName(today.getMonth() + 1)} ${today.getFullYear()}`,
    progress_deadline: new Date(today.getFullYear(), today.getMonth(), 25).toISOString().split('T')[0],
    review_deadline: new Date(today.getFullYear(), today.getMonth(), 28).toISOString().split('T')[0],
    expected_score: '80'
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: kpiData }, { data: empDepts }, { data: cycData }] = await Promise.all([
        supabase
          .from('employee_kpis')
          .select('*, employees(full_name, nik, department, position, job_level)')
          .eq('period_month', selectedMonth)
          .eq('period_year', selectedYear)
          .order('created_at', { ascending: false }),
        supabase.from('employees').select('department').eq('is_active', true),
        supabase
          .from('kpi_cycles')
          .select('*')
          .order('period_year', { ascending: false })
          .order('period_month', { ascending: false })
      ]);

      const kpiRows = (kpiData as HRKPIRecord[]) || [];
      setKpis(kpiRows);
      setCycles((cycData as KPICycle[]) || []);

      // Daftar divisi ditarik dinamis dari data karyawan asli (bukan hardcode)
      const uniqueDepts = Array.from(
        new Set([
          ...((empDepts as any[]) || []).map((e) => e.department).filter(Boolean),
          ...kpiRows.map((k) => k.employees?.department).filter(Boolean)
        ])
      ).sort() as string[];
      setDepartmentsList(uniqueDepts);
    } catch (err: any) {
      console.error('Gagal memuat penilaian KPI HRD:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAll();

    // Sinkron real-time terhadap perubahan KPI, Siklus, DAN Data Karyawan
    const channel = supabase
      .channel('realtime-hrd-evaluate-kpi-synced')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_kpis' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_cycles' }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const openEvaluationModal = (item: HRKPIRecord) => {
    setEvaluatingKpi(item);
    const defaultScore =
      item.hrd_score !== null && item.hrd_score !== undefined
        ? String(item.hrd_score)
        : String(getClaimPercent(item.current_value, item.target_value));
    setHrdScoreInput(defaultScore);
    setHrdNotesInput(item.hrd_notes || '');
  };

  const handleSubmitEvaluation = async (decision: 'approved' | 'rejected') => {
    if (!evaluatingKpi) return;

    if (decision === 'approved') {
      const num = Number(hrdScoreInput);
      if (isNaN(num) || num < 0 || num > 100) {
        return alert('Masukkan Nilai HRD antara 0 sampai 100.');
      }
    } else if (!hrdNotesInput.trim()) {
      return alert('Tuliskan catatan alasan revisi untuk karyawan.');
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('employee_kpis')
        .update({
          hrd_score: decision === 'approved' ? Number(hrdScoreInput) : null,
          hrd_notes: hrdNotesInput.trim() || (decision === 'approved' ? 'Dinilai & disetujui HRD.' : 'Mohon revisi.'),
          approval_status: decision,
          status: decision === 'approved' ? 'reviewed' : 'on_progress',
          rated_at: decision === 'approved' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', evaluatingKpi.id);

      if (error) throw error;
      setEvaluatingKpi(null);
      await fetchAll();
    } catch (err: any) {
      alert('Gagal menyimpan penilaian HRD: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (table: 'employee_kpis' | 'kpi_cycles', id: string) => {
    if (!window.confirm('Hapus data ini?')) return;
    await supabase.from(table).delete().eq('id', id);
    await fetchAll();
  };

  const handleSaveCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('kpi_cycles').insert([
        {
          name: cycleForm.name.trim(),
          period_month: selectedMonth,
          period_year: selectedYear,
          progress_deadline: cycleForm.progress_deadline,
          review_deadline: cycleForm.review_deadline,
          expected_score: Number(cycleForm.expected_score) || 80,
          is_active: true
        }
      ]);
      if (error) throw error;
      alert('Siklus evaluasi & pengingat aktif!');
      await fetchAll();
    } catch (err: any) {
      alert('Gagal menyimpan siklus: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const submittedCount = kpis.filter((k) => k.approval_status === 'submitted').length;
  const approvedCount = kpis.filter((k) => k.approval_status === 'approved').length;
  const avgHrdScore = (() => {
    const rated = kpis.filter((k) => k.hrd_score !== null);
    if (rated.length === 0) return 0;
    return Math.round(rated.reduce((a, b) => a + Number(b.hrd_score || 0), 0) / rated.length);
  })();

  const filteredKPIs = kpis.filter((item) => {
    const empDept = item.employees?.department || '';
    const empPos = item.employees?.position || '';
    const empLvl = item.employees?.job_level || '';
    const matchDept = departmentFilter === 'all' || empDept === departmentFilter;
    const matchStatus = statusFilter === 'all' || item.approval_status === statusFilter;
    const q = searchTerm.toLowerCase();
    const matchSearch =
      item.title.toLowerCase().includes(q) ||
      empDept.toLowerCase().includes(q) ||
      empPos.toLowerCase().includes(q) ||
      empLvl.toLowerCase().includes(q) ||
      (item.employees?.full_name || '').toLowerCase().includes(q) ||
      (item.employees?.nik || '').toLowerCase().includes(q);
    return matchDept && matchStatus && matchSearch;
  });

  // Grafik dinamis per divisi asli dari relasi employees
  const divisionChartData = useMemo(() => {
    const grouped = new Map<string, number[]>();
    kpis.forEach((k) => {
      const key = k.employees?.department || 'Belum Diatur';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(getFinalScore(k));
    });
    return Array.from(grouped.entries()).map(([divisi, scores]) => ({
      divisi,
      skor: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    }));
  }, [kpis]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="text-indigo-600" /> Penilaian KPI Karyawan
            </h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <Radio size={10} className="animate-pulse" /> Sinkron Data Karyawan
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Review KPI yang diajukan karyawan, berikan skor resmi HRD, dan pantau performa seluruh divisi.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <CalendarDays size={15} className="text-indigo-600" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-transparent text-xs font-bold text-gray-700 outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{getMonthName(m)}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent text-xs font-bold text-gray-700 outline-none"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => {
            setActiveTab('evaluate');
            setStatusFilter('submitted');
          }}
          className="text-left bg-white p-5 rounded-3xl border border-amber-200 shadow-sm hover:shadow-md transition-all"
        >
          <span className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1.5 mb-1">
            <BellRing size={14} /> Menunggu Penilaian HRD
          </span>
          <p className="text-3xl font-extrabold text-gray-900">
            {submittedCount} <span className="text-xs font-normal text-gray-400">pengajuan</span>
          </p>
        </button>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1.5 mb-1">
            <CheckCircle2 size={14} /> Sudah Dinilai HRD
          </span>
          <p className="text-3xl font-extrabold text-gray-900">
            {approvedCount} <span className="text-xs font-normal text-gray-400">/ {kpis.length} KPI</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-1.5 mb-1">
            <Award size={14} /> Rata-Rata Skor Resmi HRD
          </span>
          <p className="text-3xl font-extrabold text-gray-900">
            {avgHrdScore}<span className="text-sm font-normal text-gray-400">/100</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('evaluate')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
            activeTab === 'evaluate' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Star size={14} /> Daftar & Penilaian KPI
        </button>
        <button
          onClick={() => setActiveTab('cycles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
            activeTab === 'cycles' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Clock size={14} /> Siklus & Deadline ({cycles.length})
        </button>
      </div>

      {activeTab === 'evaluate' ? (
        <div className="space-y-5">
          {divisionChartData.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Rata-Rata Nilai KPI per Divisi</h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={divisionChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="divisi" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} />
                    <Bar dataKey="skor" name="Skor (%)" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama, NIK, posisi, divisi, atau judul KPI..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="submitted">Menunggu Penilaian ({submittedCount})</option>
              <option value="approved">Sudah Dinilai HRD</option>
              <option value="rejected">Diminta Revisi</option>
              <option value="draft">Draft Karyawan</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 outline-none"
            >
              <option value="all">Semua Divisi</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>Divisi {d}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>
            ) : filteredKPIs.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                Belum ada pengajuan KPI dari karyawan pada filter ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Karyawan, Posisi & Divisi</th>
                      <th className="px-5 py-3.5 font-bold">KPI & Catatan Karyawan</th>
                      <th className="px-5 py-3.5 font-bold">Klaim Realisasi</th>
                      <th className="px-5 py-3.5 font-bold text-center">Nilai HRD</th>
                      <th className="px-5 py-3.5 font-bold text-center">Status</th>
                      <th className="px-5 py-3.5 font-bold text-right">Aksi Penilaian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredKPIs.map((item) => {
                      const claimPct = getClaimPercent(item.current_value, item.target_value);
                      const emp = item.employees;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-gray-900">{emp?.full_name || '-'}</div>
                            <div className="text-[11px] font-semibold text-indigo-600">
                              {emp?.position || '-'}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {emp?.nik || '-'} • Divisi {emp?.department || '-'}
                              {emp?.job_level ? ` (${emp.job_level})` : ''}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 max-w-xs whitespace-normal">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600">
                                {item.category}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400">Bobot {item.weight}%</span>
                            </div>
                            <div className="font-semibold text-gray-900">{item.title}</div>
                            {item.employee_notes && (
                              <div className="text-[11px] text-gray-500 mt-0.5 flex items-start gap-1">
                                <MessageSquare size={11} className="shrink-0 mt-0.5 text-blue-500" />
                                <span className="line-clamp-2">{item.employee_notes}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-gray-800">
                              {item.current_value} / {item.target_value} {item.unit}
                            </div>
                            <div className="text-[11px] text-gray-500">Klaim: {claimPct}%</div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {item.hrd_score !== null ? (
                              <span className="text-sm font-extrabold text-emerald-600">{item.hrd_score}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                item.approval_status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : item.approval_status === 'submitted'
                                  ? 'bg-amber-50 text-amber-700'
                                  : item.approval_status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {item.approval_status === 'approved'
                                ? 'Dinilai HRD'
                                : item.approval_status === 'submitted'
                                ? 'Menunggu HRD'
                                : item.approval_status === 'rejected'
                                ? 'Revisi'
                                : 'Draft'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => openEvaluationModal(item)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold shadow-sm"
                              >
                                <Star size={12} /> {item.hrd_score !== null ? 'Ubah Nilai' : 'Nilai KPI'}
                              </button>
                              <button
                                onClick={() => handleDelete('employee_kpis', item.id)}
                                className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                                title="Hapus"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleSaveCycle} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 h-fit">
            <h3 className="font-bold text-gray-900 text-base">Atur Siklus & Tenggat KPI</h3>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Nama Siklus</label>
              <input
                required
                type="text"
                value={cycleForm.name}
                onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Batas Pengajuan KPI Karyawan</label>
              <input
                required
                type="date"
                value={cycleForm.progress_deadline}
                onChange={(e) => setCycleForm({ ...cycleForm, progress_deadline: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Batas Penilaian HRD & 360°</label>
              <input
                required
                type="date"
                value={cycleForm.review_deadline}
                onChange={(e) => setCycleForm({ ...cycleForm, review_deadline: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Ekspektasi Perusahaan (%)</label>
              <input
                required
                type="number"
                min={50}
                max={100}
                value={cycleForm.expected_score}
                onChange={(e) => setCycleForm({ ...cycleForm, expected_score: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
            >
              Simpan & Aktifkan Pengingat
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            {cycles.map((c) => (
              <div key={c.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{c.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Batas Pengajuan: <b>{c.progress_deadline}</b> • Batas Penilaian: <b>{c.review_deadline}</b> • Ekspektasi: <b>{c.expected_score}%</b>
                  </p>
                </div>
                <button
                  onClick={() => handleDelete('kpi_cycles', c.id)}
                  className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {evaluatingKpi && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Evaluasi & Penilaian HRD</h3>
                <p className="text-[11px] text-indigo-100">
                  {evaluatingKpi.employees?.full_name} • {evaluatingKpi.employees?.position || '-'} ({evaluatingKpi.employees?.department || '-'})
                </p>
              </div>
              <button onClick={() => setEvaluatingKpi(null)} className="p-1 bg-white/20 rounded-full">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  {evaluatingKpi.category} • Bobot {evaluatingKpi.weight}%
                </span>
                <p className="font-bold text-gray-900 text-sm">{evaluatingKpi.title}</p>
                <p className="text-gray-600">
                  Klaim Karyawan: <b>{evaluatingKpi.current_value} / {evaluatingKpi.target_value} {evaluatingKpi.unit}</b> ({getClaimPercent(evaluatingKpi.current_value, evaluatingKpi.target_value)}%)
                </p>
                {evaluatingKpi.employee_notes && (
                  <p className="text-gray-600 pt-1 border-t border-slate-200">
                    <b>Bukti / Catatan Karyawan:</b> {evaluatingKpi.employee_notes}
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">Skor Penilaian Resmi HRD (0–100)</label>
                  <span className="text-lg font-extrabold text-indigo-600">{hrdScoreInput}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Number(hrdScoreInput) || 0}
                  onChange={(e) => setHrdScoreInput(e.target.value)}
                  className="w-full accent-indigo-600 mb-2"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={hrdScoreInput}
                  onChange={(e) => setHrdScoreInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Catatan Evaluasi / Alasan Revisi</label>
                <textarea
                  rows={3}
                  value={hrdNotesInput}
                  onChange={(e) => setHrdNotesInput(e.target.value)}
                  placeholder="Berikan feedback kinerja atau catatan revisi..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmitEvaluation('rejected')}
                  className="flex-1 py-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ThumbsDown size={14} /> Minta Revisi
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmitEvaluation('approved')}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Simpan Nilai HRD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
