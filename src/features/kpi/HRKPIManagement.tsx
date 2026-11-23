import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Target,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  Award,
  X,
  Save,
  Loader2,
  Radio,
  Users,
  CalendarDays,
  Layers,
  FileText,
  Clock,
  Send
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

const DEPARTMENTS = ['Produksi', 'QC', 'Finance', 'IT', 'Marketing', 'Operasional', 'HRD'];
const JOB_LEVELS = ['Staff', 'Supervisor', 'Manager', 'Director'];

type EmployeeOption = {
  id: string;
  full_name: string;
  nik: string;
  department: string;
  position: string | null;
  job_level: string;
};

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
  hrd_notes: string | null;
  employees?: {
    full_name: string;
    nik: string;
    department: string;
    position: string | null;
    job_level: string;
  };
};

type KPITemplate = {
  id: string;
  department: string;
  job_level: string;
  title: string;
  description: string | null;
  category: string;
  default_target: number;
  unit: string;
  default_weight: number;
  expected_benchmark: number;
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

const getProgressPercent = (current: number, target: number) => {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((Number(current) / Number(target)) * 100));
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
  const [activeTab, setActiveTab] = useState<'global' | 'templates' | 'cycles'>('global');

  const [kpis, setKpis] = useState<HRKPIRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [templates, setTemplates] = useState<KPITemplate[]>([]);
  const [cycles, setCycles] = useState<KPICycle[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Modal Tambah/Edit KPI Individu
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    title: '',
    description: '',
    category: 'Operasional',
    target_value: '100',
    current_value: '0',
    unit: '%',
    weight: '25',
    expected_benchmark: '80',
    approval_status: 'draft',
    hrd_notes: ''
  });

  // Form Templat KPI
  const [tplForm, setTplForm] = useState({
    department: 'Produksi',
    job_level: 'Staff',
    title: '',
    description: '',
    category: 'Operasional',
    default_target: '100',
    unit: '%',
    default_weight: '25',
    expected_benchmark: '80'
  });

  // Form Siklus Evaluasi
  const [cycleForm, setCycleForm] = useState({
    name: `Evaluasi ${getMonthName(today.getMonth() + 1)} ${today.getFullYear()}`,
    progress_deadline: new Date(today.getFullYear(), today.getMonth(), 25).toISOString().split('T')[0],
    review_deadline: new Date(today.getFullYear(), today.getMonth(), 28).toISOString().split('T')[0],
    expected_score: '80'
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: empData }, { data: kpiData }, { data: tplData }, { data: cycData }] = await Promise.all([
        supabase
          .from('employees')
          .select('id, full_name, nik, department, position, job_level')
          .eq('is_active', true)
          .order('full_name', { ascending: true }),
        supabase
          .from('employee_kpis')
          .select('*, employees(full_name, nik, department, position, job_level)')
          .eq('period_month', selectedMonth)
          .eq('period_year', selectedYear)
          .order('created_at', { ascending: false }),
        supabase.from('kpi_templates').select('*').order('department', { ascending: true }),
        supabase
          .from('kpi_cycles')
          .select('*')
          .order('period_year', { ascending: false })
          .order('period_month', { ascending: false })
      ]);

      setEmployees((empData as EmployeeOption[]) || []);
      setKpis((kpiData as HRKPIRecord[]) || []);
      setTemplates((tplData as KPITemplate[]) || []);
      setCycles((cycData as KPICycle[]) || []);
    } catch (err: any) {
      console.error('Gagal memuat HR KPI:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel('realtime-hr-global-kpi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_kpis' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_templates' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_cycles' }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  // Filter Global View
  const filteredKPIs = kpis.filter((item) => {
    const empDept = item.employees?.department || item.department || '';
    const matchDept = departmentFilter === 'all' || empDept === departmentFilter;
    const q = searchTerm.toLowerCase();
    const matchSearch =
      item.title.toLowerCase().includes(q) ||
      empDept.toLowerCase().includes(q) ||
      (item.employees?.full_name || '').toLowerCase().includes(q) ||
      (item.employees?.nik || '').toLowerCase().includes(q);
    return matchDept && matchSearch;
  });

  // Grafik Perbandingan Rata-Rata Skor per Divisi (Global View)
  const divisionChartData = DEPARTMENTS.map((dept) => {
    const deptItems = kpis.filter((k) => (k.employees?.department || k.department) === dept);
    const avg =
      deptItems.length === 0
        ? 0
        : Math.round(
            deptItems.reduce((a, b) => a + getProgressPercent(b.current_value, b.target_value), 0) /
              deptItems.length
          );
    return { divisi: dept, skor: avg, total: deptItems.length };
  }).filter((d) => d.total > 0);

  // Simpan KPI Individu
  const handleSaveKPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) return alert('Pilih karyawan.');
    const targetEmp = employees.find((e) => e.id === formData.employee_id);
    setSaving(true);
    try {
      const payload = {
        employee_id: formData.employee_id,
        department: targetEmp?.department || 'Operasional',
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        target_value: Number(formData.target_value) || 100,
        current_value: Number(formData.current_value) || 0,
        unit: formData.unit.trim() || '%',
        weight: Number(formData.weight) || 25,
        expected_benchmark: Number(formData.expected_benchmark) || 80,
        period_month: selectedMonth,
        period_year: selectedYear,
        approval_status: formData.approval_status,
        status: formData.approval_status === 'approved' ? 'reviewed' : 'on_progress',
        hrd_notes: formData.hrd_notes.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase.from('employee_kpis').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employee_kpis').insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      await fetchAll();
    } catch (err: any) {
      alert('Gagal menyimpan KPI: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Simpan Templat KPI
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('kpi_templates').insert([
        {
          department: tplForm.department,
          job_level: tplForm.job_level,
          title: tplForm.title.trim(),
          description: tplForm.description.trim() || null,
          category: tplForm.category,
          default_target: Number(tplForm.default_target) || 100,
          unit: tplForm.unit.trim() || '%',
          default_weight: Number(tplForm.default_weight) || 25,
          expected_benchmark: Number(tplForm.expected_benchmark) || 80
        }
      ]);
      if (error) throw error;
      setTplForm({ ...tplForm, title: '', description: '' });
      await fetchAll();
    } catch (err: any) {
      alert('Gagal membuat templat: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Distribusikan Templat ke Seluruh Karyawan Sesuai Divisi & Level
  const handleApplyTemplate = async (tpl: KPITemplate) => {
    const matching = employees.filter(
      (e) => e.department === tpl.department && e.job_level === tpl.job_level
    );
    if (matching.length === 0) {
      return alert(`Tidak ada karyawan aktif di Divisi ${tpl.department} dengan Level ${tpl.job_level}.`);
    }
    if (
      !window.confirm(
        `Distribusikan templat "${tpl.title}" ke ${matching.length} karyawan (${tpl.department} - ${tpl.job_level}) untuk periode ${getMonthName(selectedMonth)} ${selectedYear}?`
      )
    )
      return;

    try {
      const rows = matching.map((emp) => ({
        employee_id: emp.id,
        department: emp.department,
        title: tpl.title,
        description: tpl.description,
        category: tpl.category,
        target_value: tpl.default_target,
        current_value: 0,
        unit: tpl.unit,
        weight: tpl.default_weight,
        expected_benchmark: tpl.expected_benchmark,
        period_month: selectedMonth,
        period_year: selectedYear,
        status: 'on_progress',
        approval_status: 'draft'
      }));
      const { error } = await supabase.from('employee_kpis').insert(rows);
      if (error) throw error;
      alert(`Berhasil membagikan KPI ke ${matching.length} karyawan!`);
      await fetchAll();
    } catch (err: any) {
      alert('Gagal distribusi templat: ' + err.message);
    }
  };

  // Simpan Siklus Evaluasi & Tenggat Pengingat
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
      alert('Siklus evaluasi & pengingat tenggat aktif untuk semua karyawan!');
      await fetchAll();
    } catch (err: any) {
      alert('Gagal menyimpan siklus: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (table: 'employee_kpis' | 'kpi_templates' | 'kpi_cycles', id: string) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    await supabase.from(table).delete().eq('id', id);
    await fetchAll();
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="text-indigo-600" /> HRD KPI Center (Global View)
            </h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <Radio size={10} className="animate-pulse" /> Super Admin Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Rekapitulasi semua divisi, pengaturan templat bobot KPI, dan jadwal siklus evaluasi otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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

          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                employee_id: employees[0]?.id || '',
                title: '',
                description: '',
                category: 'Operasional',
                target_value: '100',
                current_value: '0',
                unit: '%',
                weight: '25',
                expected_benchmark: '80',
                approval_status: 'draft',
                hrd_notes: ''
              });
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm"
          >
            <Plus size={16} /> Tambah KPI
          </button>
        </div>
      </div>

      {/* TAB MENU HRD */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('global')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'global' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Layers size={14} /> Global View Divisi
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'templates' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <FileText size={14} /> Templat & Bobot ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('cycles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'cycles' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Clock size={14} /> Siklus & Pengingat ({cycles.length})
        </button>
      </div>

      {/* ================================================= */}
      {/* TAB 1: GLOBAL VIEW SEMUA DIVISI                   */}
      {/* ================================================= */}
      {activeTab === 'global' && (
        <div className="space-y-5">
          {divisionChartData.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <Award size={16} className="text-indigo-600" /> Rata-Rata Skor KPI per Divisi ({getMonthName(selectedMonth)} {selectedYear})
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={divisionChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="divisi" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} />
                    <Bar dataKey="skor" name="Rata-rata Skor (%)" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari karyawan, NIK, divisi, atau judul KPI..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none sm:w-56"
            >
              <option value="all">Semua Divisi (Global)</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>Divisi {d}</option>
              ))}
            </select>
          </div>

          {/* Tabel Global */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>
            ) : filteredKPIs.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">Belum ada KPI pada filter ini.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Karyawan & Divisi</th>
                      <th className="px-5 py-3.5 font-bold">Indikator KPI</th>
                      <th className="px-5 py-3.5 font-bold">Realisasi</th>
                      <th className="px-5 py-3.5 font-bold text-center">Bobot</th>
                      <th className="px-5 py-3.5 font-bold text-center">Approval</th>
                      <th className="px-5 py-3.5 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredKPIs.map((item) => {
                      const pct = getProgressPercent(item.current_value, item.target_value);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-gray-900">{item.employees?.full_name || '-'}</div>
                            <div className="text-[11px] text-gray-500">
                              {item.employees?.department || item.department} • {item.employees?.job_level || 'Staff'}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 max-w-xs whitespace-normal">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 mr-1.5">
                              {item.category}
                            </span>
                            <span className="font-semibold text-gray-800">{item.title}</span>
                          </td>
                          <td className="px-5 py-3.5 min-w-[160px]">
                            <div className="flex justify-between mb-1 font-bold">
                              <span>{item.current_value}/{item.target_value} {item.unit}</span>
                              <span className="text-indigo-600">{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center font-bold">{item.weight}%</td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.approval_status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : item.approval_status === 'submitted'
                                  ? 'bg-blue-50 text-blue-700'
                                  : item.approval_status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {item.approval_status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-1">
                            <button
                              onClick={() => {
                                setEditingId(item.id);
                                setFormData({
                                  employee_id: item.employee_id,
                                  title: item.title,
                                  description: item.description || '',
                                  category: item.category,
                                  target_value: String(item.target_value),
                                  current_value: String(item.current_value),
                                  unit: item.unit,
                                  weight: String(item.weight),
                                  expected_benchmark: String(item.expected_benchmark || 80),
                                  approval_status: item.approval_status || 'draft',
                                  hrd_notes: item.hrd_notes || ''
                                });
                                setShowModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete('employee_kpis', item.id)}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                            >
                              <Trash2 size={14} />
                            </button>
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
      )}

      {/* ================================================= */}
      {/* TAB 2: TEMPLAT KPI & BOBOT PER DIVISI/LEVEL       */}
      {/* ================================================= */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleSaveTemplate} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 h-fit">
            <h3 className="font-bold text-gray-900 text-base">Buat Templat KPI Baru</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Divisi</label>
                <select
                  value={tplForm.department}
                  onChange={(e) => setTplForm({ ...tplForm, department: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Level Jabatan</label>
                <select
                  value={tplForm.job_level}
                  onChange={(e) => setTplForm({ ...tplForm, job_level: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  {JOB_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Judul Indikator</label>
              <input
                required
                type="text"
                value={tplForm.title}
                onChange={(e) => setTplForm({ ...tplForm, title: e.target.value })}
                placeholder="Contoh: Zero Defect Rate Bulanan"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Target</label>
                <input
                  required
                  type="number"
                  value={tplForm.default_target}
                  onChange={(e) => setTplForm({ ...tplForm, default_target: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Satuan</label>
                <input
                  required
                  type="text"
                  value={tplForm.unit}
                  onChange={(e) => setTplForm({ ...tplForm, unit: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Bobot %</label>
                <input
                  required
                  type="number"
                  value={tplForm.default_weight}
                  onChange={(e) => setTplForm({ ...tplForm, default_weight: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1.5"
            >
              <Save size={14} /> Simpan Templat
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            {templates.length === 0 ? (
              <div className="bg-white p-10 rounded-3xl border border-gray-100 text-center text-xs text-gray-400">
                Belum ada templat KPI. Buat templat di samping agar bisa dibagikan ke seluruh divisi dalam 1 klik.
              </div>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                        Divisi {tpl.department}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        {tpl.job_level}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">Bobot {tpl.default_weight}%</span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm">{tpl.title}</h4>
                    <p className="text-xs text-gray-500">
                      Target: {tpl.default_target} {tpl.unit} • Ekspektasi: {tpl.expected_benchmark}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApplyTemplate(tpl)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                    >
                      <Send size={13} /> Distribusikan
                    </button>
                    <button
                      onClick={() => handleDelete('kpi_templates', tpl.id)}
                      className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* TAB 3: SIKLUS EVALUASI & PENGINGAT OTOMATIS       */}
      {/* ================================================= */}
      {activeTab === 'cycles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleSaveCycle} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 h-fit">
            <h3 className="font-bold text-gray-900 text-base">Atur Siklus & Deadline</h3>
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
              <label className="block text-xs font-bold text-gray-600 mb-1">Batas Update Progres KPI</label>
              <input
                required
                type="date"
                value={cycleForm.progress_deadline}
                onChange={(e) => setCycleForm({ ...cycleForm, progress_deadline: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Batas Penilaian 360° & Approval</label>
              <input
                required
                type="date"
                value={cycleForm.review_deadline}
                onChange={(e) => setCycleForm({ ...cycleForm, review_deadline: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Standar Ekspektasi Perusahaan (%)</label>
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
              Aktifkan Siklus & Pengingat
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            {cycles.map((c) => (
              <div key={c.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 text-sm">{c.name}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      Ekspektasi {c.expected_score}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Deadline Progres: <strong>{c.progress_deadline}</strong> • Deadline 360° Review: <strong>{c.review_deadline}</strong>
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

      {/* MODAL TAMBAH / EDIT KPI INDIVIDU */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">{editingId ? 'Edit KPI Karyawan' : 'Tambah Target KPI'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 bg-white/20 rounded-full">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveKPI} className="p-6 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Karyawan</label>
                <select
                  required
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} — {e.department} ({e.job_level})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Judul KPI</label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Target</label>
                  <input type="number" value={formData.target_value} onChange={(e) => setFormData({ ...formData, target_value: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Aktual</label>
                  <input type="number" value={formData.current_value} onChange={(e) => setFormData({ ...formData, current_value: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Satuan</label>
                  <input type="text" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Bobot %</label>
                  <input type="number" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Status Approval</label>
                  <select value={formData.approval_status} onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs">
                    <option value="draft">Draft</option>
                    <option value="submitted">Menunggu Validasi</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Catatan HRD</label>
                  <input type="text" value={formData.hrd_notes} onChange={(e) => setFormData({ ...formData, hrd_notes: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-xs font-bold">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
