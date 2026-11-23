import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Target,
  TrendingUp,
  Award,
  CalendarDays,
  Loader2,
  CheckCircle2,
  Edit3,
  Trash2,
  X,
  Save,
  AlertCircle,
  MessageSquare,
  BellRing,
  Send,
  History,
  Star,
  Plus,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LineChart,
  Line,
  Legend
} from 'recharts';

type EmployeeProfile = {
  id: string;
  full_name: string;
  nik: string;
  department: string;
  position: string;
  job_level: string;
};

type KPIRecord = {
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
  rated_at: string | null;
};

type Review360 = {
  id: string;
  employee_id: string;
  reviewer_id: string;
  reviewer_type: 'self' | 'peer' | 'manager';
  period_month: number;
  period_year: number;
  score_quality: number;
  score_teamwork: number;
  score_initiative: number;
  score_discipline: number;
  average_score: number;
  strengths: string | null;
  improvements: string | null;
  reviewer?: { full_name: string; position: string };
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

const getItemScore = (item: KPIRecord) => {
  if (item.hrd_score !== null && item.hrd_score !== undefined) {
    return Math.min(100, Math.max(0, Math.round(Number(item.hrd_score))));
  }
  if (!item.target_value || Number(item.target_value) <= 0) return 0;
  return Math.min(100, Math.round((Number(item.current_value || 0) / Number(item.target_value)) * 100));
};

const calcWeightedScore = (items: KPIRecord[]) => {
  if (!items || items.length === 0) return 0;
  const totalWeight = items.reduce((acc, i) => acc + Number(i.weight || 0), 0);
  return Math.round(
    items.reduce((acc, item) => {
      const score = getItemScore(item);
      const ratio = totalWeight > 0 ? Number(item.weight) / totalWeight : 1 / items.length;
      return acc + score * ratio;
    }, 0)
  );
};

const getShortMonth = (m: number) => {
  const d = new Date();
  d.setMonth(m - 1);
  return d.toLocaleString('id-ID', { month: 'short' });
};

const getFullMonth = (m: number) => {
  const d = new Date();
  d.setMonth(m - 1);
  return d.toLocaleString('id-ID', { month: 'long' });
};

export default function EmployeeKPI() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [activeTab, setActiveTab] = useState<'my_kpi' | 'review_360' | 'history'>('my_kpi');

  const [me, setMe] = useState<EmployeeProfile | null>(null);
  const [kpis, setKpis] = useState<KPIRecord[]>([]);
  const [allMyKpis, setAllMyKpis] = useState<KPIRecord[]>([]);
  const [reviewsReceived, setReviewsReceived] = useState<Review360[]>([]);
  const [reviewsGiven, setReviewsGiven] = useState<Review360[]>([]);
  const [colleagues, setColleagues] = useState<EmployeeProfile[]>([]);
  const [activeCycle, setActiveCycle] = useState<KPICycle | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Tambah / Edit KPI Mandiri oleh Karyawan
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [kpiForm, setKpiForm] = useState({
    title: '',
    description: '',
    category: 'Operasional',
    target_value: '100',
    current_value: '0',
    unit: '%',
    weight: '25',
    employee_notes: ''
  });

  // Form 360 Review
  const [reviewMode, setReviewMode] = useState<'self' | 'peer'>('self');
  const [reviewTargetId, setReviewTargetId] = useState('');
  const [reviewForm, setReviewForm] = useState({
    score_quality: 85,
    score_teamwork: 85,
    score_initiative: 85,
    score_discipline: 85,
    strengths: '',
    improvements: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: myProfile } = await supabase
        .from('employees')
        .select('id, full_name, nik, department, position, job_level')
        .eq('id', user.id)
        .single();
      const profile = (myProfile as EmployeeProfile) || null;
      setMe(profile);

      const { data: cycleData } = await supabase
        .from('kpi_cycles')
        .select('*')
        .eq('period_month', selectedMonth)
        .eq('period_year', selectedYear)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      setActiveCycle((cycleData as KPICycle) || null);

      const { data: myKpiData } = await supabase
        .from('employee_kpis')
        .select('*')
        .eq('employee_id', user.id)
        .eq('period_month', selectedMonth)
        .eq('period_year', selectedYear)
        .order('created_at', { ascending: false });
      setKpis((myKpiData as KPIRecord[]) || []);

      const { data: historyData } = await supabase
        .from('employee_kpis')
        .select('*')
        .eq('employee_id', user.id)
        .order('period_year', { ascending: true })
        .order('period_month', { ascending: true });
      setAllMyKpis((historyData as KPIRecord[]) || []);

      const { data: recReviews } = await supabase
        .from('kpi_360_reviews')
        .select('*, reviewer:employees!kpi_360_reviews_reviewer_id_fkey(full_name, position)')
        .eq('employee_id', user.id)
        .eq('period_month', selectedMonth)
        .eq('period_year', selectedYear);
      setReviewsReceived((recReviews as Review360[]) || []);

      const { data: givReviews } = await supabase
        .from('kpi_360_reviews')
        .select('*')
        .eq('reviewer_id', user.id)
        .eq('period_month', selectedMonth)
        .eq('period_year', selectedYear);
      setReviewsGiven((givReviews as Review360[]) || []);

      if (profile?.department) {
        const { data: peers } = await supabase
          .from('employees')
          .select('id, full_name, nik, department, position, job_level')
          .eq('department', profile.department)
          .neq('id', user.id)
          .eq('is_active', true)
          .order('full_name', { ascending: true });
        setColleagues((peers as EmployeeProfile[]) || []);
      }
    } catch (err: any) {
      console.error('Gagal memuat KPI karyawan:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAllData();

    const channel = supabase
      .channel('realtime-emp-kpi-hrd-eval')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_kpis' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_360_reviews' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_cycles' }, () => fetchAllData()).on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => fetchAllData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllData]);

  // Statistik Skor
  const totalScore = calcWeightedScore(kpis);
  const expectedScore = activeCycle?.expected_score ?? 80;
  const ratedByHrdCount = kpis.filter((k) => k.approval_status === 'approved' || k.hrd_score !== null).length;
  const waitingHrdCount = kpis.filter((k) => k.approval_status === 'submitted').length;
  const rejectedCount = kpis.filter((k) => k.approval_status === 'rejected').length;

  const selfReview = reviewsReceived.find((r) => r.reviewer_type === 'self');
  const peerReviews = reviewsReceived.filter((r) => r.reviewer_type === 'peer');
  const avgPeerScore = peerReviews.length
    ? Math.round(peerReviews.reduce((a, b) => a + Number(b.average_score || 0), 0) / peerReviews.length)
    : 0;

  // Grafik Perbandingan Capaian vs Ekspektasi
  const comparisonChartData = kpis.map((k) => ({
    name: k.title.length > 14 ? k.title.slice(0, 14) + '…' : k.title,
    Skor: getItemScore(k),
    Ekspektasi: Number(k.expected_benchmark || expectedScore)
  }));

  // Grafik Riwayat 6 Periode
  const historyPeriods = (() => {
    const map = new Map<string, { year: number; month: number; items: KPIRecord[] }>();
    allMyKpis.forEach((item) => {
      const key = `${item.period_year}-${String(item.period_month).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, { year: item.period_year, month: item.period_month, items: [] });
      }
      map.get(key)!.items.push(item);
    });
    const sorted = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);

    return sorted.map(([, val], idx, arr) => {
      const score = calcWeightedScore(val.items);
      const prevScore = idx > 0 ? calcWeightedScore(arr[idx - 1][1].items) : null;
      return {
        label: `${getShortMonth(val.month)} ${val.year}`,
        score,
        ekspektasi: expectedScore,
        count: val.items.length,
        delta: prevScore !== null ? score - prevScore : 0
      };
    });
  })();

  // Pengingat Otomatis
  const reminders: { type: 'warn' | 'info' | 'urgent'; text: string }[] = [];
  if (rejectedCount > 0) {
    reminders.push({
      type: 'urgent',
      text: `Ada ${rejectedCount} KPI yang diminta revisi oleh HRD. Cek catatan HRD, perbaiki, lalu ajukan ulang.`
    });
  }
  if (kpis.some((k) => k.approval_status === 'draft')) {
    reminders.push({
      type: 'warn',
      text: 'Anda memiliki KPI berstatus Draft. Jangan lupa klik "Ajukan ke HRD" agar segera dinilai.'
    });
  }
  if (activeCycle) {
    const daysLeft = Math.ceil(
      (new Date(activeCycle.progress_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft <= 7) {
      reminders.push({
        type: daysLeft <= 2 ? 'urgent' : 'info',
        text:
          daysLeft >= 0
            ? `Batas akhir pengajuan KPI "${activeCycle.name}" sisa ${daysLeft} hari (${activeCycle.progress_deadline}).`
            : `Tenggat pengajuan KPI "${activeCycle.name}" telah lewat (${activeCycle.progress_deadline}).`
      });
    }
  }
  if (kpis.length > 0 && !reviewsGiven.some((r) => r.reviewer_type === 'self')) {
    reminders.push({
      type: 'info',
      text: 'Self-Assessment 360° bulan ini belum diisi.'
    });
  }

  // Modal Tambah / Edit KPI oleh Karyawan
  const openAddModal = () => {
    setEditingKpiId(null);
    setKpiForm({
      title: '',
      description: '',
      category: 'Operasional',
      target_value: '100',
      current_value: '0',
      unit: '%',
      weight: '25',
      employee_notes: ''
    });
    setShowKpiModal(true);
  };

  const openEditModal = (item: KPIRecord) => {
    setEditingKpiId(item.id);
    setKpiForm({
      title: item.title,
      description: item.description || '',
      category: item.category || 'Operasional',
      target_value: String(item.target_value),
      current_value: String(item.current_value),
      unit: item.unit || '%',
      weight: String(item.weight),
      employee_notes: item.employee_notes || ''
    });
    setShowKpiModal(true);
  };

  const handleSaveKpi = async (e: React.FormEvent, submitDirectly = false) => {
    e.preventDefault();
    if (!me) return;
    setSaving(true);
    try {
      const payload = {
        employee_id: me.id,
        department: me.department || 'Operasional',
        title: kpiForm.title.trim(),
        description: kpiForm.description.trim() || null,
        category: kpiForm.category,
        target_value: Number(kpiForm.target_value) || 100,
        current_value: Number(kpiForm.current_value) || 0,
        unit: kpiForm.unit.trim() || '%',
        weight: Number(kpiForm.weight) || 25,
        expected_benchmark: expectedScore,
        period_month: selectedMonth,
        period_year: selectedYear,
        employee_notes: kpiForm.employee_notes.trim() || null,
        approval_status: submitDirectly ? 'submitted' : 'draft',
        status: 'on_progress',
        submitted_at: submitDirectly ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      if (editingKpiId) {
        const { error } = await supabase.from('employee_kpis').update(payload).eq('id', editingKpiId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employee_kpis').insert([payload]);
        if (error) throw error;
      }

      setShowKpiModal(false);
      await fetchAllData();
    } catch (err: any) {
      alert('Gagal menyimpan KPI: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitToHRD = async (item: KPIRecord) => {
    if (!window.confirm(`Ajukan KPI "${item.title}" ke HRD untuk dinilai?`)) return;
    try {
      const { error } = await supabase
        .from('employee_kpis')
        .update({
          approval_status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
      if (error) throw error;
      await fetchAllData();
    } catch (err: any) {
      alert('Gagal mengajukan ke HRD: ' + err.message);
    }
  };

  const handleDeleteKpi = async (item: KPIRecord) => {
    if (!window.confirm(`Hapus KPI "${item.title}"?`)) return;
    try {
      const { error } = await supabase.from('employee_kpis').delete().eq('id', item.id);
      if (error) throw error;
      await fetchAllData();
    } catch (err: any) {
      alert('Gagal menghapus KPI: ' + err.message);
    }
  };

  const handleSubmit360 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) return;
    const targetId = reviewMode === 'self' ? me.id : reviewTargetId;
    if (!targetId) return alert('Pilih rekan kerja yang ingin dinilai.');
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from('kpi_360_reviews').upsert(
        {
          employee_id: targetId,
          reviewer_id: me.id,
          reviewer_type: reviewMode,
          period_month: selectedMonth,
          period_year: selectedYear,
          score_quality: Number(reviewForm.score_quality),
          score_teamwork: Number(reviewForm.score_teamwork),
          score_initiative: Number(reviewForm.score_initiative),
          score_discipline: Number(reviewForm.score_discipline),
          strengths: reviewForm.strengths.trim() || null,
          improvements: reviewForm.improvements.trim() || null
        },
        { onConflict: 'employee_id,reviewer_id,reviewer_type,period_month,period_year' }
      );
      if (error) throw error;
      alert('Penilaian 360° berhasil disimpan!');
      setReviewForm({
        score_quality: 85,
        score_teamwork: 85,
        score_initiative: 85,
        score_discipline: 85,
        strengths: '',
        improvements: ''
      });
      await fetchAllData();
    } catch (err: any) {
      alert('Gagal menyimpan 360° Review: ' + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const getGrade = (score: number) => {
    if (score >= 90) return { label: 'Grade A (Sangat Baik)', cls: 'bg-emerald-400/20 text-emerald-100 border-emerald-300/30' };
    if (score >= 75) return { label: 'Grade B (Baik)', cls: 'bg-blue-400/20 text-blue-100 border-blue-300/30' };
    if (score >= 60) return { label: 'Grade C (Cukup)', cls: 'bg-amber-400/20 text-amber-100 border-amber-300/30' };
    return { label: 'Grade D (Perlu Pembinaan)', cls: 'bg-rose-400/20 text-rose-100 border-rose-300/30' };
  };

  const grade = getGrade(totalScore);

  return (
    <div className="p-4 space-y-5 pb-28 max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* HERO BANNER */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-700 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                <Target size={22} className="text-blue-200" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold leading-tight">KPI & Penilaian Kinerja</h1>
                <p className="text-xs text-indigo-200 mt-0.5">
                  {me ? `${me.full_name} • ${me.position} (${me.department})` : 'Memuat profil...'}
                </p>
              </div>
            </div>

            {kpis.length > 0 && (
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border ${grade.cls}`}>
                <Award size={13} /> {grade.label}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
            <div>
              <p className="text-[10px] text-indigo-200 uppercase font-bold">Skor Akhir</p>
              <p className="text-2xl sm:text-3xl font-extrabold mt-0.5">
                {totalScore}
                <span className="text-xs font-semibold text-indigo-200">/100</span>
              </p>
            </div>
            <div className="border-x border-white/15 px-3">
              <p className="text-[10px] text-indigo-200 uppercase font-bold">Dinilai HRD</p>
              <p className="text-2xl sm:text-3xl font-extrabold mt-0.5 text-emerald-300">
                {ratedByHrdCount}
                <span className="text-xs font-semibold text-indigo-200">/{kpis.length}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-indigo-200 uppercase font-bold">Menunggu HRD</p>
              <p className="text-2xl sm:text-3xl font-extrabold mt-0.5 text-amber-300">{waitingHrdCount}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-indigo-100 mb-1.5">
              <span>Ekspektasi Perusahaan: {expectedScore}%</span>
              <span className="font-bold">
                {totalScore >= expectedScore
                  ? `+${totalScore - expectedScore}% di atas ekspektasi`
                  : `${expectedScore - totalScore}% menuju ekspektasi`}
              </span>
            </div>
            <div className="relative w-full h-2.5 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 rounded-full transition-all duration-500"
                style={{ width: `${totalScore}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-300"
                style={{ left: `${Math.min(100, expectedScore)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-blue-400 rounded-full blur-3xl opacity-20 pointer-events-none" />
      </div>

      {/* NOTIFIKASI PENGINGAT */}
      {reminders.length > 0 && (
        <div className="space-y-2">
          {reminders.map((rem, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs font-semibold ${
                rem.type === 'urgent'
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : rem.type === 'warn'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              <BellRing size={16} className="shrink-0" />
              <span>{rem.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* TAB NAVIGASI + PERIODE + TOMBOL TAMBAH KPI */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('my_kpi')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'my_kpi' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Target size={14} /> KPI Saya
          </button>
          <button
            onClick={() => setActiveTab('review_360')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'review_360' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Star size={14} /> 360° Review
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <History size={14} /> Riwayat
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white px-3 py-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2 flex-1 sm:flex-none">
            <CalendarDays size={15} className="text-indigo-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-gray-700 outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{getFullMonth(m)}</option>
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
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all shrink-0"
          >
            <Plus size={15} /> Tambah KPI
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Loader2 className="animate-spin mb-2 text-indigo-600" size={30} />
          <span className="text-sm font-medium">Memuat data KPI...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: DAFTAR KPI KARYAWAN & HASIL PENILAIAN HRD */}
          {activeTab === 'my_kpi' && (
            <div className="space-y-5">
              {comparisonChartData.length > 0 && (
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-1">
                    <TrendingUp size={16} className="text-indigo-600" /> Capaian KPI vs Ekspektasi Perusahaan
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Menggunakan Nilai Resmi HRD (jika sudah dinilai) atau estimasi progres mandiri.
                  </p>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <ReferenceLine y={expectedScore} stroke="#f59e0b" strokeDasharray="4 4" />
                        <Bar dataKey="Skor" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="Ekspektasi" fill="#cbd5e1" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {kpis.length === 0 ? (
                <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm text-center flex flex-col items-center">
                  <AlertCircle size={42} className="text-gray-300 mb-3" />
                  <p className="font-bold text-gray-800">Belum Ada KPI untuk {getFullMonth(selectedMonth)} {selectedYear}</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mb-4">
                    Tambahkan indikator target & pencapaian kerja Anda sekarang agar bisa dinilai oleh tim HRD.
                  </p>
                  <button
                    onClick={openAddModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                  >
                    <Plus size={15} /> Tambah KPI Pertama
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {kpis.map((item) => {
                    const score = getItemScore(item);
                    const isRated = item.approval_status === 'approved' || item.hrd_score !== null;
                    const isSubmitted = item.approval_status === 'submitted';
                    const isRejected = item.approval_status === 'rejected';
                    const canEdit = !isRated && !isSubmitted;

                    return (
                      <div key={item.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                                {item.category}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400">Bobot {item.weight}%</span>
                            </div>

                            {isRated ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={11} /> Dinilai HRD: {item.hrd_score ?? score}
                              </span>
                            ) : isSubmitted ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock size={11} /> Menunggu HRD
                              </span>
                            ) : isRejected ? (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                Perlu Revisi HRD
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                Draft
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                          {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">
                              Realisasi: <strong className="text-gray-900">{item.current_value} / {item.target_value} {item.unit}</strong>
                            </span>
                            <span className="font-extrabold text-indigo-600">
                              {isRated ? `Nilai HRD: ${score}%` : `Progres: ${score}%`}
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isRated ? 'bg-emerald-500' : score >= 75 ? 'bg-indigo-600' : 'bg-amber-500'
                              }`}
                              style={{ width: `${score}%` }}
                            />
                          </div>

                          {item.employee_notes && (
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600">
                              <strong className="text-gray-700 block text-[11px]">Catatan / Bukti Saya:</strong>
                              <span>{item.employee_notes}</span>
                            </div>
                          )}

                          {item.hrd_notes && (
                            <div className={`border rounded-xl p-2.5 text-xs flex items-start gap-2 ${
                              isRejected ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50/70 border-emerald-100 text-emerald-800'
                            }`}>
                              <MessageSquare size={13} className="shrink-0 mt-0.5" />
                              <div>
                                <strong className="block text-[11px]">Evaluasi HRD:</strong>
                                <span>{item.hrd_notes}</span>
                              </div>
                            </div>
                          )}

                          {canEdit && (
                            <div className="flex items-center justify-between gap-2 pt-1">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors"
                                >
                                  <Edit3 size={12} /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteKpi(item)}
                                  className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                                  title="Hapus KPI"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              <button
                                onClick={() => handleSubmitToHRD(item)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                              >
                                <Send size={12} /> Ajukan ke HRD
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 360 REVIEW */}
          {activeTab === 'review_360' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Star size={18} className="text-amber-500" /> Rapor 360° Saya
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Self-Assessment</p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1">{selfReview ? selfReview.average_score : '-'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 text-center">
                    <p className="text-[10px] font-bold text-purple-600 uppercase">Peer Review ({peerReviews.length})</p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1">{peerReviews.length > 0 ? avgPeerScore : '-'}</p>
                  </div>
                </div>
                <div className="space-y-2.5 pt-2">
                  {reviewsReceived.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Belum ada umpan balik 360° di periode ini.</p>
                  ) : (
                    reviewsReceived.map((rev) => (
                      <div key={rev.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between font-bold">
                          <span className="text-gray-800">
                            {rev.reviewer_type === 'self' ? 'Penilaian Mandiri' : `Rekan (${rev.reviewer?.full_name || 'Peer'})`}
                          </span>
                          <span className="text-indigo-600">{rev.average_score}/100</span>
                        </div>
                        {rev.strengths && <p className="text-gray-600"><b>Kelebihan:</b> {rev.strengths}</p>}
                        {rev.improvements && <p className="text-gray-600"><b>Saran:</b> {rev.improvements}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 text-base">Isi Evaluasi 360°</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewMode('self')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border ${
                      reviewMode === 'self' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    Self-Assessment
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewMode('peer')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border ${
                      reviewMode === 'peer' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    Peer Review
                  </button>
                </div>

                <form onSubmit={handleSubmit360} className="space-y-3">
                  {reviewMode === 'peer' && (
                    <select
                      required
                      value={reviewTargetId}
                      onChange={(e) => setReviewTargetId(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none"
                    >
                      <option value="">-- Pilih Rekan Sejawat --</option>
                      {colleagues.map((c) => (
                        <option key={c.id} value={c.id}>{c.full_name} ({c.position})</option>
                      ))}
                    </select>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { key: 'score_quality', label: 'Kualitas Kerja' },
                      { key: 'score_teamwork', label: 'Kerja Sama' },
                      { key: 'score_initiative', label: 'Inisiatif' },
                      { key: 'score_discipline', label: 'Disiplin' }
                    ].map((f) => (
                      <div key={f.key} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span>{f.label}</span>
                          <span className="text-indigo-600">{(reviewForm as any)[f.key]}</span>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={100}
                          value={(reviewForm as any)[f.key]}
                          onChange={(e) => setReviewForm({ ...reviewForm, [f.key]: Number(e.target.value) })}
                          className="w-full accent-indigo-600"
                        />
                      </div>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    value={reviewForm.strengths}
                    onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
                    placeholder="Kelebihan / pencapaian..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <textarea
                    rows={2}
                    value={reviewForm.improvements}
                    onChange={(e) => setReviewForm({ ...reviewForm, improvements: e.target.value })}
                    placeholder="Area pengembangan..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1.5"
                  >
                    {submittingReview ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Simpan Penilaian 360°
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: RIWAYAT PERIODE */}
          {activeTab === 'history' && (
            <div className="space-y-5">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 text-base mb-1">Tren Rapor KPI (6 Periode Terakhir)</h3>
                <p className="text-xs text-gray-500 mb-4">Perbandingan skor performa Anda dari waktu ke waktu.</p>
                {historyPeriods.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">Belum ada riwayat KPI.</p>
                ) : (
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyPeriods} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line type="monotone" dataKey="score" name="Skor Saya" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="ekspektasi" name="Ekspektasi" stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Periode</th>
                      <th className="px-5 py-3.5 font-bold text-center">Indikator</th>
                      <th className="px-5 py-3.5 font-bold text-center">Skor Akhir</th>
                      <th className="px-5 py-3.5 font-bold text-right">Tren</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyPeriods.map((row) => (
                      <tr key={row.label}>
                        <td className="px-5 py-3.5 font-bold text-gray-900">{row.label}</td>
                        <td className="px-5 py-3.5 text-center text-gray-600">{row.count} KPI</td>
                        <td className="px-5 py-3.5 text-center font-extrabold text-indigo-600">{row.score}%</td>
                        <td className="px-5 py-3.5 text-right font-bold">
                          <span className={`px-2 py-0.5 rounded-full ${
                            row.delta > 0 ? 'bg-emerald-50 text-emerald-700' : row.delta < 0 ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {row.delta > 0 ? `+${row.delta}%` : row.delta < 0 ? `${row.delta}%` : 'Stabil'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL TAMBAH / EDIT KPI KARYAWAN */}
      {showKpiModal && (
        <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm">{editingKpiId ? 'Edit KPI Saya' : 'Tambah KPI Baru'}</h3>
                <p className="text-[11px] text-indigo-100">Periode {getFullMonth(selectedMonth)} {selectedYear} • Akan dinilai oleh HRD</p>
              </div>
              <button onClick={() => setShowKpiModal(false)} className="p-1.5 bg-white/20 rounded-full hover:bg-white/30">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => handleSaveKpi(e, false)} className="p-6 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Judul Target / Indikator KPI</label>
                <input
                  required
                  type="text"
                  value={kpiForm.title}
                  onChange={(e) => setKpiForm({ ...kpiForm, title: e.target.value })}
                  placeholder="Contoh: Penyelesaian Laporan Bulanan Tepat Waktu"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Kategori</label>
                  <select
                    value={kpiForm.category}
                    onChange={(e) => setKpiForm({ ...kpiForm, category: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none"
                  >
                    <option value="Operasional">Operasional</option>
                    <option value="Penjualan">Penjualan</option>
                    <option value="Kedisiplinan">Kedisiplinan</option>
                    <option value="Kualitas Kerja">Kualitas Kerja</option>
                    <option value="Pengembangan Diri">Pengembangan Diri</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Bobot (%)</label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={100}
                    value={kpiForm.weight}
                    onChange={(e) => setKpiForm({ ...kpiForm, weight: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Target</label>
                  <input
                    required
                    type="number"
                    step="any"
                    min={1}
                    value={kpiForm.target_value}
                    onChange={(e) => setKpiForm({ ...kpiForm, target_value: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Realisasi Saya</label>
                  <input
                    required
                    type="number"
                    step="any"
                    min={0}
                    value={kpiForm.current_value}
                    onChange={(e) => setKpiForm({ ...kpiForm, current_value: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Satuan</label>
                  <input
                    required
                    type="text"
                    value={kpiForm.unit}
                    onChange={(e) => setKpiForm({ ...kpiForm, unit: e.target.value })}
                    placeholder="%, tugas, klien"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Deskripsi Target (Opsional)</label>
                <textarea
                  rows={2}
                  value={kpiForm.description}
                  onChange={(e) => setKpiForm({ ...kpiForm, description: e.target.value })}
                  placeholder="Rincian target kerja..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Catatan / Bukti Pencapaian untuk HRD</label>
                <textarea
                  rows={2}
                  value={kpiForm.employee_notes}
                  onChange={(e) => setKpiForm({ ...kpiForm, employee_notes: e.target.value })}
                  placeholder="Jelaskan hasil kerja atau lampirkan link bukti..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
                >
                  Simpan Draft
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={(e) => handleSaveKpi(e as any, true)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Simpan & Ajukan ke HRD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
