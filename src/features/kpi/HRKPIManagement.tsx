import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Target,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Award,
  X,
  Save,
  Loader2,
  Radio,
  Users,
  CalendarDays,
  MessageSquare
} from 'lucide-react';

type EmployeeOption = {
  id: string;
  full_name: string;
  nik: string;
  position: string | null;
};

type HRKPIRecord = {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  category: string;
  target_value: number;
  current_value: number;
  unit: string;
  weight: number;
  period_month: number;
  period_year: number;
  status: string;
  hrd_notes: string | null;
  employees?: {
    full_name: string;
    nik: string;
    position: string | null;
  };
};

export default function HRKPIManagement() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const [kpis, setKpis] = useState<HRKPIRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');

  // State Modal Tambah / Edit & Review
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
    status: 'on_progress',
    hrd_notes: ''
  });

  const fetchEmployees = useCallback(async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, full_name, nik, position')
      .order('full_name', { ascending: true });

    if (!error && data) {
      setEmployees(data as EmployeeOption[]);
    }
  }, []);

  const fetchKPIs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_kpis')
        .select('*, employees ( full_name, nik, position )')
        .eq('period_month', selectedMonth)
        .eq('period_year', selectedYear)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKpis((data as HRKPIRecord[]) || []);
    } catch (err: any) {
      console.error('Gagal mengambil data KPI:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchKPIs();

    // Real-time dua arah: otomatis sinkron saat karyawan update progres
    const channel = supabase
      .channel('realtime-hrd-kpi-management')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employee_kpis' },
        () => {
          fetchKPIs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchKPIs]);

  const getProgressPercent = (current: number, target: number) => {
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((Number(current) / Number(target)) * 100));
  };

  const getMonthName = (m: number) => {
    const d = new Date();
    d.setMonth(m - 1);
    return d.toLocaleString('id-ID', { month: 'long' });
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      employee_id: employeeFilter !== 'all' ? employeeFilter : (employees[0]?.id || ''),
      title: '',
      description: '',
      category: 'Operasional',
      target_value: '100',
      current_value: '0',
      unit: '%',
      weight: '25',
      status: 'on_progress',
      hrd_notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (item: HRKPIRecord) => {
    setEditingId(item.id);
    setFormData({
      employee_id: item.employee_id,
      title: item.title,
      description: item.description || '',
      category: item.category || 'Operasional',
      target_value: String(item.target_value),
      current_value: String(item.current_value),
      unit: item.unit || '%',
      weight: String(item.weight),
      status: item.status || 'on_progress',
      hrd_notes: item.hrd_notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      alert('Pilih karyawan terlebih dahulu.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        employee_id: formData.employee_id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        target_value: Number(formData.target_value) || 100,
        current_value: Number(formData.current_value) || 0,
        unit: formData.unit.trim() || '%',
        weight: Number(formData.weight) || 25,
        period_month: selectedMonth,
        period_year: selectedYear,
        status: formData.status,
        hrd_notes: formData.hrd_notes.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from('employee_kpis')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employee_kpis')
          .insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      await fetchKPIs();
    } catch (err: any) {
      alert('Gagal menyimpan KPI: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Hapus indikator KPI "${title}"?`)) return;
    try {
      const { error } = await supabase.from('employee_kpis').delete().eq('id', id);
      if (error) throw error;
      await fetchKPIs();
    } catch (err: any) {
      alert('Gagal menghapus KPI: ' + err.message);
    }
  };

  const handleQuickReview = async (item: HRKPIRecord) => {
    const nextStatus = item.status === 'reviewed' ? 'on_progress' : 'reviewed';
    try {
      const { error } = await supabase
        .from('employee_kpis')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
      await fetchKPIs();
    } catch (err: any) {
      alert('Gagal mengubah status review: ' + err.message);
    }
  };

  // Filter tabel
  const filteredKPIs = kpis.filter((item) => {
    const matchesEmp = employeeFilter === 'all' || item.employee_id === employeeFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.employees?.full_name || '').toLowerCase().includes(q) ||
      (item.employees?.nik || '').toLowerCase().includes(q);
    return matchesEmp && matchesSearch;
  });

  // Ringkasan Statistik
  const uniqueEmployeesCount = new Set(filteredKPIs.map((k) => k.employee_id)).size;
  const achievedCount = filteredKPIs.filter((k) => getProgressPercent(k.current_value, k.target_value) >= 100).length;
  const reviewedCount = filteredKPIs.filter((k) => k.status === 'reviewed').length;
  const avgProgress = filteredKPIs.length === 0
    ? 0
    : Math.round(
        filteredKPIs.reduce((acc, k) => acc + getProgressPercent(k.current_value, k.target_value), 0) /
          filteredKPIs.length
      );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="text-indigo-600" /> Manajemen KPI Karyawan
            </h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <Radio size={10} className="animate-pulse" /> Live Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Tetapkan target kinerja, pantau progres real-time karyawan, dan kunci hasil penilaian periode {getMonthName(selectedMonth)} {selectedYear}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <CalendarDays size={15} className="text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-gray-700 outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{getMonthName(m)}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-gray-700 outline-none cursor-pointer"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={openAddModal}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus size={16} /> Tambah Target KPI
          </button>
        </div>
      </div>

      {/* Kartu Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <Award size={18} />
            <span className="text-xs font-bold uppercase text-gray-400">Rata-Rata Capaian</span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{avgProgress}%</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Users size={18} />
            <span className="text-xs font-bold uppercase text-gray-400">Karyawan Dinilai</span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{uniqueEmployeesCount} <span className="text-xs font-normal text-gray-400">org</span></p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <CheckCircle2 size={18} />
            <span className="text-xs font-bold uppercase text-gray-400">Target Tercapai</span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{achievedCount} <span className="text-xs font-normal text-gray-400">/ {filteredKPIs.length}</span></p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <Clock size={18} />
            <span className="text-xs font-bold uppercase text-gray-400">Sudah Direview</span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{reviewedCount} <span className="text-xs font-normal text-gray-400">KPI</span></p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama karyawan, NIK, atau judul KPI..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 sm:w-64"
        >
          <option value="all">Semua Karyawan</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name} ({emp.nik})
            </option>
          ))}
        </select>
      </div>

      {/* Tabel Data KPI */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 size={30} className="animate-spin text-indigo-600 mb-2" />
            <p className="text-sm font-medium">Memuat data KPI karyawan...</p>
          </div>
        ) : filteredKPIs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Target size={44} className="text-gray-300 mb-3" />
            <p className="font-bold text-gray-800">Belum Ada Indikator KPI</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              Klik tombol <b>Tambah Target KPI</b> di atas untuk mulai menetapkan target kinerja bagi karyawan di periode ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Karyawan</th>
                  <th className="px-6 py-4 font-semibold">Indikator & Kategori</th>
                  <th className="px-6 py-4 font-semibold">Progres Real-Time</th>
                  <th className="px-6 py-4 font-semibold text-center">Bobot</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredKPIs.map((item) => {
                  const percent = getProgressPercent(item.current_value, item.target_value);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{item.employees?.full_name || 'Karyawan'}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          {item.employees?.nik || '-'} • {item.employees?.position || '-'}
                        </div>
                      </td>

                      <td className="px-6 py-4 max-w-xs whitespace-normal">
                        <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 mb-1">
                          {item.category}
                        </span>
                        <div className="font-semibold text-gray-900 leading-snug">{item.title}</div>
                        {item.hrd_notes && (
                          <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                            <MessageSquare size={11} className="text-indigo-500 shrink-0" />
                            <span className="truncate max-w-[220px]">{item.hrd_notes}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 min-w-[200px]">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold text-gray-800">
                            {item.current_value} / {item.target_value} {item.unit}
                          </span>
                          <span className="font-extrabold text-indigo-600">{percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percent >= 100 ? 'bg-emerald-500' : percent >= 60 ? 'bg-indigo-600' : 'bg-amber-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-bold text-gray-700">
                        {item.weight}%
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleQuickReview(item)}
                          title="Klik untuk mengunci / membuka status review"
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                            item.status === 'reviewed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : item.status === 'achieved'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {item.status === 'reviewed'
                            ? 'Sudah Dinilai'
                            : item.status === 'achieved'
                            ? 'Tercapai'
                            : 'Berjalan'}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors"
                            title="Edit & Beri Catatan"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.title)}
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                            title="Hapus KPI"
                          >
                            <Trash2 size={15} />
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

      {/* Modal Tambah / Edit & Review KPI */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-lg">{editingId ? 'Edit & Review KPI' : 'Tambah Target KPI Baru'}</h3>
                <p className="text-xs text-indigo-100">Periode {getMonthName(selectedMonth)} {selectedYear}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Karyawan</label>
                <select
                  required
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.nik})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Judul Indikator KPI</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Penyelesaian Proyek Tepat Waktu"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Operasional">Operasional</option>
                    <option value="Penjualan">Penjualan</option>
                    <option value="Kedisiplinan">Kedisiplinan</option>
                    <option value="Kualitas Kerja">Kualitas Kerja</option>
                    <option value="Pengembangan Diri">Pengembangan Diri</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Deskripsi Target (Opsional)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Rincian indikator keberhasilan..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Target</label>
                  <input
                    required
                    type="number"
                    step="any"
                    min="1"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Aktual</label>
                  <input
                    required
                    type="number"
                    step="any"
                    min="0"
                    value={formData.current_value}
                    onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Satuan</label>
                  <input
                    required
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="%, proyek, klien"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Bobot (%)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="100"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Status Penilaian</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="on_progress">Berjalan (Karyawan bisa update)</option>
                    <option value="achieved">Tercapai</option>
                    <option value="reviewed">Sudah Dinilai (Kunci progres)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Catatan HRD</label>
                  <input
                    type="text"
                    value={formData.hrd_notes}
                    onChange={(e) => setFormData({ ...formData, hrd_notes: e.target.value })}
                    placeholder="Feedback untuk karyawan..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Menyimpan...' : 'Simpan KPI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
