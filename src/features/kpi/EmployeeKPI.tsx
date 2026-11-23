import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Target,
  TrendingUp,
  Award,
  CalendarDays,
  Loader2,
  CheckCircle2,
  Edit3,
  X,
  Save,
  AlertCircle,
  MessageSquare
} from 'lucide-react';

type KPIRecord = {
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
};

export default function EmployeeKPI() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [kpis, setKpis] = useState<KPIRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // State Modal Update Progres
  const [editingKpi, setEditingKpi] = useState<KPIRecord | null>(null);
  const [progressInput, setProgressInput] = useState<string>('0');
  const [saving, setSaving] = useState(false);

  const fetchMyKPIs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('employee_kpis')
        .select('*')
        .eq('employee_id', user.id)
        .eq('period_month', selectedMonth)
        .eq('period_year', selectedYear)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setKpis((data as KPIRecord[]) || []);
    } catch (err: any) {
      console.error('Gagal mengambil data KPI:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyKPIs();

    const channel = supabase
      .channel('realtime-employee-kpi')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employee_kpis' },
        () => {
          fetchMyKPIs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMonth, selectedYear]);

  // Hitung persentase capaian per indikator
  const getProgressPercent = (current: number, target: number) => {
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((Number(current) / Number(target)) * 100));
  };

  // Hitung Skor Total KPI Berbobot (0 - 100)
  const totalWeight = kpis.reduce((acc, item) => acc + Number(item.weight || 0), 0);
  const totalScore = kpis.length === 0
    ? 0
    : Math.round(
        kpis.reduce((acc, item) => {
          const pct = getProgressPercent(item.current_value, item.target_value);
          const weightRatio = totalWeight > 0 ? Number(item.weight) / totalWeight : 1 / kpis.length;
          return acc + pct * weightRatio;
        }, 0)
      );

  const getGrade = (score: number) => {
    if (score >= 90) return { label: 'Sangat Baik (A)', badge: 'bg-emerald-400/20 text-emerald-100 border-emerald-300/30' };
    if (score >= 75) return { label: 'Baik (B)', badge: 'bg-blue-400/20 text-blue-100 border-blue-300/30' };
    if (score >= 60) return { label: 'Cukup (C)', badge: 'bg-amber-400/20 text-amber-100 border-amber-300/30' };
    return { label: 'Perlu Peningkatan (D)', badge: 'bg-rose-400/20 text-rose-100 border-rose-300/30' };
  };

  const grade = getGrade(totalScore);
  const achievedCount = kpis.filter((k) => getProgressPercent(k.current_value, k.target_value) >= 100).length;

  const openUpdateModal = (item: KPIRecord) => {
    setEditingKpi(item);
    setProgressInput(String(item.current_value ?? 0));
  };

  const handleSaveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKpi) return;

    const numericVal = Number(progressInput);
    if (isNaN(numericVal) || numericVal < 0) {
      alert('Masukkan angka pencapaian yang valid.');
      return;
    }

    setSaving(true);
    try {
      const nextStatus = numericVal >= Number(editingKpi.target_value) ? 'achieved' : 'on_progress';

      const { error } = await supabase
        .from('employee_kpis')
        .update({
          current_value: numericVal,
          status: editingKpi.status === 'reviewed' ? 'reviewed' : nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingKpi.id);

      if (error) throw error;

      setEditingKpi(null);
      await fetchMyKPIs();
    } catch (err: any) {
      alert('Gagal memperbarui progres KPI: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getMonthName = (m: number) => {
    const d = new Date();
    d.setMonth(m - 1);
    return d.toLocaleString('id-ID', { month: 'long' });
  };

  return (
    <div className="p-4 space-y-6 pb-24 max-w-xl mx-auto animate-in fade-in duration-500">
      
      {/* Header Skor KPI */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-700 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                <Target size={20} className="text-blue-200" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">KPI & Kinerja Saya</h1>
                <p className="text-xs text-indigo-200">{getMonthName(selectedMonth)} {selectedYear}</p>
              </div>
            </div>
            {kpis.length > 0 && (
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border ${grade.badge}`}>
                <Award size={13} /> {grade.label}
              </span>
            )}
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider">Skor Total</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-4xl font-extrabold tracking-tight">{totalScore}</span>
                <span className="text-sm text-indigo-200 font-semibold">/ 100</span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-indigo-200">Target Tercapai</p>
              <p className="text-lg font-bold flex items-center justify-end gap-1.5 mt-0.5">
                <TrendingUp size={16} className="text-emerald-300" />
                {achievedCount} / {kpis.length} KPI
              </p>
            </div>
          </div>

          {/* Progress Bar Global */}
          <div className="mt-4 w-full h-2.5 bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 rounded-full transition-all duration-500"
              style={{ width: `${totalScore}%` }}
            />
          </div>
        </div>

        <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-400 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-purple-400 rounded-full blur-3xl opacity-20 pointer-events-none" />
      </div>

      {/* Filter Periode */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600 pl-1">
          <CalendarDays size={16} className="text-indigo-600" />
          <span>Periode</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{getMonthName(m)}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Daftar Indikator KPI */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-14 text-gray-400">
          <Loader2 className="animate-spin mb-2 text-indigo-600" size={28} />
          <span className="text-sm font-medium">Memuat target KPI...</span>
        </div>
      ) : kpis.length === 0 ? (
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm text-center flex flex-col items-center">
          <AlertCircle size={40} className="text-gray-300 mb-3" />
          <p className="font-bold text-gray-800">Belum Ada Target KPI</p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">
            HRD belum menetapkan indikator KPI untuk periode {getMonthName(selectedMonth)} {selectedYear}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {kpis.map((item) => {
            const percent = getProgressPercent(item.current_value, item.target_value);
            const isAchieved = percent >= 100;

            return (
              <div
                key={item.id}
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        Bobot {item.weight}%
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm leading-snug">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                    )}
                  </div>

                  {isAchieved ? (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <CheckCircle2 size={12} /> Tercapai
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
                      {percent}%
                    </span>
                  )}
                </div>

                {/* Progress Bar & Angka */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500 font-medium">
                      Aktual: <strong className="text-gray-900">{item.current_value} {item.unit}</strong>
                    </span>
                    <span className="text-gray-500 font-medium">
                      Target: <strong className="text-gray-900">{item.target_value} {item.unit}</strong>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isAchieved ? 'bg-emerald-500' : percent >= 60 ? 'bg-indigo-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Catatan HRD jika ada */}
                {item.hrd_notes && (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2 text-xs text-slate-600">
                    <MessageSquare size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-700 block text-[11px]">Catatan HRD:</span>
                      <span>{item.hrd_notes}</span>
                    </div>
                  </div>
                )}

                {/* Tombol Update Progres Mandiri */}
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => openUpdateModal(item)}
                    disabled={item.status === 'reviewed'}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit3 size={13} />
                    {item.status === 'reviewed' ? 'Sudah Dinilai HRD' : 'Update Progres'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Update Progres */}
      {editingKpi && (
        <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">Update Progres KPI</h3>
              <button
                onClick={() => setEditingKpi(null)}
                className="p-1 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProgress} className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase">{editingKpi.category}</p>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{editingKpi.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Target: <strong>{editingKpi.target_value} {editingKpi.unit}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                  Capaian Saat Ini ({editingKpi.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={progressInput}
                  onChange={(e) => setProgressInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingKpi(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? 'Menyimpan...' : 'Simpan Progres'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
