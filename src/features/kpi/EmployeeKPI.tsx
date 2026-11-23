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
  X,
  Save,
  AlertCircle,
  MessageSquare,
  BellRing,
  Users,
  Send,
  ThumbsUp,
  ThumbsDown,
  History,
  Star,
  Plus,
  ShieldCheck
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
  kpi_role: string;
  manager_id: string | null;
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
  hrd_notes: string | null;
  manager_notes: string | null;
  employees?: {
    full_name: string;
    nik: string;
    position: string;
    job_level: string;
  };
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

const getProgressPercent = (current: number, target: number) => {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((Number(current) / Number(target)) * 100));
};

const calcWeightedScore = (items: KPIRecord[]) => {
  if (!items || items.length === 0) return 0;
  const totalWeight = items.reduce((acc, i) => acc + Number(i.weight || 0), 0);
  return Math.round(
    items.reduce((acc, item) => {
      const pct = getProgressPercent(item.current_value, item.target_value);
      const ratio = totalWeight > 0 ? Number(item.weight) / totalWeight : 1 / items.length;
      return acc + pct * ratio;
    }, 0)
  );
};

const getMonthName = (m: number) => {
  const d = new Date();
  d.setMonth(m - 1);
  return d.toLocaleString('id-ID', { month: 'short' });
};

const getFullMonthName = (m: number) => {
  const d = new Date();
  d.setMonth(m - 1);
  return d.toLocaleString('id-ID', { month: 'long' });
};

export default function EmployeeKPI() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [activeTab, setActiveTab] = useState<'my_kpi' | 'review_360' | 'history' | 'team'>('my_kpi');

  const [me, setMe] = useState<EmployeeProfile | null>(null);
  const [kpis, setKpis] = useState<KPIRecord[]>([]);
  const [allMyKpis, setAllMyKpis] = useState<KPIRecord[]>([]);
  const [reviewsReceived, setReviewsReceived] = useState<Review360[]>([]);
  const [reviewsGiven, setReviewsGiven] = useState<Review360[]>([]);
  const [colleagues, setColleagues] = useState<EmployeeProfile[]>([]);
  const [activeCycle, setActiveCycle] = useState<KPICycle | null>(null);

  // Khusus Manager / Approver
  const [teamMembers, setTeamMembers] = useState<EmployeeProfile[]>([]);
  const [teamKpis, setTeamKpis] = useState<KPIRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Update Progres Pribadi
  const [editingKpi, setEditingKpi] = useState<KPIRecord | null>(null);
  const [progressInput, setProgressInput] = useState('0');
  const [saving, setSaving] = useState(false);

  // Form 360 Review
  const [reviewMode, setReviewMode] = useState<'self' | 'peer' | 'manager'>('self');
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

  // Modal Tambah Target Tim (Khusus Manajer)
  const [showTeamTargetModal, setShowTeamTargetModal] = useState(false);
  const [teamForm, setTeamForm] = useState({
    employee_id: '',
    title: '',
    description: '',
    category: 'Operasional',
    target_value: '100',
    unit: '%',
    weight: '25',
    expected_benchmark: '80'
  });

  // Modal Reject Note (Khusus Manajer)
  const [rejectingKpi, setRejectingKpi] = useState<KPIRecord | null>(null);
  const [managerNoteInput, setManagerNoteInput] = useState('');

  const isManager =
    me?.job_level === 'Manager' || me?.job_level === 'Director' || me?.kpi_role === 'manager';

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Profil karyawan + Deteksi Divisi & Level Jabatan
      const { data: myProfile } = await supabase
        .from('employees')
        .select('id, full_name, nik, department, position, job_level, kpi_role, manager_id')
        .eq('id', user.id)
        .single();

      const profile = myProfile as EmployeeProfile | null;
      setMe(profile);

      // 2. Siklus Evaluasi Aktif (untuk Reminder & Benchmark Ekspektasi)
      const { data: cycleData } = await supabase
        .from('kpi_cycles')
        .select('*')
        .eq('period_month', selectedMonth)
        .eq('period_year', selectedYear)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      setActiveCycle((cycleData as KPICycle) || null);

      // 3. KPI Pribadi Periode Terpilih
      const { data: myKpiData } = await supabase
        .from('employee_kpis')
        .select('*')
        .eq('employee_id', user.id)
        .eq('period_month', selectedMonth)
        .eq('period_year', selectedYear)
        .order('created_at', { ascending: true });
      setKpis((myKpiData as KPIRecord[]) || []);

      // 4. Riwayat Seluruh KPI Pribadi (Perbandingan Periode)
      const { data: historyData } = await supabase
        .from('employee_kpis')
        .select('*')
        .eq('employee_id', user.id)
        .order('period_year', { ascending: true })
        .order('period_month', { ascending: true });
      setAllMyKpis((historyData as KPIRecord[]) || []);

      // 5. Data 360 Review (Diterima & Diberikan)
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

      // 6. Rekan Sejawat & Anggota Tim berdasarkan Divisi
      if (profile?.department) {
        const { data: deptPeers } = await supabase
          .from('employees')
          .select('id, full_name, nik, department, position, job_level, kpi_role, manager_id')
          .eq('department', profile.department)
          .neq('id', user.id)
          .eq('is_active', true)
          .order('full_name', { ascending: true });

        const peersList = (deptPeers as EmployeeProfile[]) || [];
        setColleagues(peersList);

        // Jika otomatis terdeteksi sebagai Manager / Director -> muat KPI Tim Divisi
        if (
          profile.job_level === 'Manager' ||
          profile.job_level === 'Director' ||
          profile.kpi_role === 'manager'
        ) {
          const subordinates = peersList.filter(
            (p) => p.job_level === 'Staff' || p.job_level === 'Supervisor' || p.manager_id === user.id
          );
          setTeamMembers(subordinates);

          const subIds = subordinates.map((s) => s.id);
          if (subIds.length > 0) {
            const { data: tKpis } = await supabase
              .from('employee_kpis')
              .select('*, employees(full_name, nik, position, job_level)')
              .in('employee_id', subIds)
              .eq('period_month', selectedMonth)
              .eq('period_year', selectedYear)
              .order('created_at', { ascending: false });
            setTeamKpis((tKpis as KPIRecord[]) || []);
          } else {
            setTeamKpis([]);
          }
        }
      }
    } catch (err: any) {
      console.error('Gagal memuat modul KPI:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAllData();

    const channel = supabase
      .channel('realtime-full-kpi-360')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_kpis' }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_360_reviews' }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_cycles' }, () => {
        fetchAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllData]);

  // Kalkulasi Skor KPI & 360
  const totalScore = calcWeightedScore(kpis);
  const expectedScore = activeCycle?.expected_score ?? 80;
  const achievedCount = kpis.filter((k) => getProgressPercent(k.current_value, k.target_value) >= 100).length;

  const selfReview = reviewsReceived.find((r) => r.reviewer_type === 'self');
  const peerReviews = reviewsReceived.filter((r) => r.reviewer_type === 'peer');
  const managerReview = reviewsReceived.find((r) => r.reviewer_type === 'manager');

  const avgPeerScore = peerReviews.length
    ? Math.round(peerReviews.reduce((a, b) => a + Number(b.average_score || 0), 0) / peerReviews.length)
    : 0;

  const combined360Score = (() => {
    const parts: number[] = [];
    if (selfReview) parts.push(Number(selfReview.average_score));
    if (peerReviews.length > 0) parts.push(avgPeerScore);
    if (managerReview) parts.push(Number(managerReview.average_score));
    if (parts.length === 0) return 0;
    return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  })();

  // Data Grafik Perbandingan Realisasi vs Ekspektasi Perusahaan
  const comparisonChartData = kpis.map((k) => ({
    name: k.title.length > 14 ? k.title.slice(0, 14) + '…' : k.title,
    fullTitle: k.title,
    Realisasi: getProgressPercent(k.current_value, k.target_value),
    Ekspektasi: Number(k.expected_benchmark || expectedScore)
  }));

  // Data Grafik Riwayat & Perbandingan 6 Periode Terakhir
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
        label: `${getMonthName(val.month)} ${val.year}`,
        score,
        ekspektasi: expectedScore,
        count: val.items.length,
        delta: prevScore !== null ? score - prevScore : 0
      };
    });
  })();

  // Daftar Pengingat Otomatis (Reminders)
  const pendingApprovalCount = teamKpis.filter((t) => t.approval_status === 'submitted').length;
  const reminders: { type: 'warn' | 'info' | 'urgent'; text: string }[] = [];

  if (activeCycle) {
    const daysToProgress = Math.ceil(
      (new Date(activeCycle.progress_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const daysToReview = Math.ceil(
      (new Date(activeCycle.review_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const hasDraftKpi = kpis.some((k) => k.approval_status === 'draft' || k.approval_status === 'rejected');
    if (hasDraftKpi && daysToProgress <= 7) {
      reminders.push({
        type: daysToProgress <= 2 ? 'urgent' : 'warn',
        text:
          daysToProgress >= 0
            ? `Tenggat update & submit KPI "${activeCycle.name}" sisa ${daysToProgress} hari lagi (${activeCycle.progress_deadline}).`
            : `Tenggat update progres KPI telah lewat (${activeCycle.progress_deadline}). Segera submit ke atasan!`
      });
    }

    const hasDoneSelf = reviewsGiven.some((r) => r.reviewer_type === 'self');
    if (!hasDoneSelf && daysToReview <= 10) {
      reminders.push({
        type: daysToReview <= 2 ? 'urgent' : 'info',
        text: `Formulir Self-Assessment 360° belum diisi. Tenggat review: ${activeCycle.review_deadline}.`
      });
    }
  } else {
    const hasDoneSelf = reviewsGiven.some((r) => r.reviewer_type === 'self');
    if (kpis.length > 0 && !hasDoneSelf) {
      reminders.push({
        type: 'info',
        text: 'Anda belum mengisi Self-Assessment 360° untuk periode bulan ini.'
      });
    }
  }

  if (isManager && pendingApprovalCount > 0) {
    reminders.push({
      type: 'urgent',
      text: `Ada ${pendingApprovalCount} realisasi KPI anggota Divisi ${me?.department} menunggu validasi (Approve/Reject) Anda.`
    });
  }

  // Handler Update Progres Pribadi
  const handleSaveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKpi) return;
    const numericVal = Number(progressInput);
    if (isNaN(numericVal) || numericVal < 0) return alert('Masukkan angka yang valid.');

    setSaving(true);
    try {
      const nextStatus = numericVal >= Number(editingKpi.target_value) ? 'achieved' : 'on_progress';
      const { error } = await supabase
        .from('employee_kpis')
        .update({
          current_value: numericVal,
          status: nextStatus,
          approval_status: editingKpi.approval_status === 'rejected' ? 'draft' : editingKpi.approval_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingKpi.id);

      if (error) throw error;
      setEditingKpi(null);
      await fetchAllData();
    } catch (err: any) {
      alert('Gagal update progres: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handler Submit KPI ke Atasan (Employee -> Manager)
  const handleSubmitToManager = async (item: KPIRecord) => {
    if (!window.confirm(`Kirim realisasi KPI "${item.title}" untuk divalidasi atasan?`)) return;
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
      alert('Gagal submit KPI: ' + err.message);
    }
  };

  // Handler Submit 360 Review
  const handleSubmit360 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) return;
    const targetEmpId = reviewMode === 'self' ? me.id : reviewTargetId;
    if (!targetEmpId) return alert('Pilih rekan/anggota tim yang akan dinilai.');

    setSubmittingReview(true);
    try {
      const { error } = await supabase.from('kpi_360_reviews').upsert(
        {
          employee_id: targetEmpId,
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
      alert('Gagal menyimpan penilaian 360°: ' + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handler Manager: Tambah Target Tim
  const handleAddTeamTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me || !teamForm.employee_id) return alert('Pilih anggota tim.');
    setSaving(true);
    try {
      const { error } = await supabase.from('employee_kpis').insert([
        {
          employee_id: teamForm.employee_id,
          department: me.department,
          title: teamForm.title.trim(),
          description: teamForm.description.trim() || null,
          category: teamForm.category,
          target_value: Number(teamForm.target_value) || 100,
          current_value: 0,
          unit: teamForm.unit.trim() || '%',
          weight: Number(teamForm.weight) || 25,
          expected_benchmark: Number(teamForm.expected_benchmark) || 80,
          period_month: selectedMonth,
          period_year: selectedYear,
          status: 'on_progress',
          approval_status: 'draft'
        }
      ]);
      if (error) throw error;
      setShowTeamTargetModal(false);
      setTeamForm({
        employee_id: '',
        title: '',
        description: '',
        category: 'Operasional',
        target_value: '100',
        unit: '%',
        weight: '25',
        expected_benchmark: '80'
      });
      await fetchAllData();
    } catch (err: any) {
      alert('Gagal menambah target tim: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handler Manager: Approve / Reject Realisasi Bawahan
  const handleApproveReject = async (
    item: KPIRecord,
    decision: 'approved' | 'rejected',
    note?: string
  ) => {
    if (!me) return;
    try {
      const { error } = await supabase
        .from('employee_kpis')
        .update({
          approval_status: decision,
          status: decision === 'approved' ? 'reviewed' : 'on_progress',
          approved_by: me.id,
          manager_notes: note || (decision === 'approved' ? 'Realisasi disetujui Manajer.' : 'Perlu revisi realisasi.'),
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
      if (error) throw error;
      setRejectingKpi(null);
      setManagerNoteInput('');
      await fetchAllData();
    } catch (err: any) {
      alert('Gagal memvalidasi KPI: ' + err.message);
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-extrabold leading-tight">Performance & KPI</h1>
                  {isManager && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                      <ShieldCheck size={11} /> Manager / Approver
                    </span>
                  )}
                </div>
                <p className="text-xs text-indigo-200 mt-0.5">
                  {me ? `${me.position} • Divisi ${me.department} (${me.job_level})` : 'Memuat profil...'}
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
              <p className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Skor KPI Saya</p>
              <p className="text-2xl sm:text-3xl font-extrabold mt-0.5">
                {totalScore}
                <span className="text-xs font-semibold text-indigo-200">/100</span>
              </p>
            </div>
            <div className="border-x border-white/15 px-3">
              <p className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Ekspektasi</p>
              <p className="text-2xl sm:text-3xl font-extrabold mt-0.5 text-emerald-300">
                {expectedScore}
                <span className="text-xs font-semibold text-indigo-200">%</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Skor 360°</p>
              <p className="text-2xl sm:text-3xl font-extrabold mt-0.5 text-cyan-200">
                {combined360Score || '-'}
              </p>
            </div>
          </div>

          {/* Progress Bar vs Ekspektasi */}
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-indigo-100 mb-1.5">
              <span>Capaian Berbobot ({achievedCount}/{kpis.length} target tercapai)</span>
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
                title={`Ekspektasi Perusahaan ${expectedScore}%`}
              />
            </div>
          </div>
        </div>
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-blue-400 rounded-full blur-3xl opacity-20 pointer-events-none" />
      </div>

      {/* NOTIFIKASI & PENGINGAT OTOMATIS */}
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
              <BellRing size={16} className="shrink-0 animate-bounce" />
              <span>{rem.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* FILTER PERIODE & NAVIGASI TAB */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('my_kpi')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'my_kpi' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Target size={14} /> KPI Saya
          </button>
          <button
            onClick={() => setActiveTab('review_360')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'review_360' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Star size={14} /> 360° Review
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <History size={14} /> Riwayat
          </button>

          {/* OTOMATIS MUNCUL HANYA JIKA TERDETEKSI SEBAGAI MANAGER / DIRECTOR */}
          {isManager && (
            <button
              onClick={() => setActiveTab('team')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'team' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
              }`}
            >
              <Users size={14} /> KPI Tim
              {pendingApprovalCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-500 text-white">
                  {pendingApprovalCount}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="bg-white px-3 py-2 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between sm:justify-end gap-2">
          <CalendarDays size={15} className="text-indigo-600" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{getFullMonthName(m)}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Loader2 className="animate-spin mb-2 text-indigo-600" size={30} />
          <span className="text-sm font-medium">Menyinkronkan data KPI...</span>
        </div>
      ) : (
        <>
          {/* ================================================= */}
          {/* TAB 1: KPI SAYA & GRAFIK VS EKSPEKTASI PERUSAHAAN */}
          {/* ================================================= */}
          {activeTab === 'my_kpi' && (
            <div className="space-y-5">
              {comparisonChartData.length > 0 && (
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        <TrendingUp size={16} className="text-indigo-600" /> Pencapaian vs Ekspektasi Perusahaan
                      </h3>
                      <p className="text-xs text-gray-500">Perbandingan persentase realisasi tiap indikator (%)</p>
                    </div>
                  </div>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <ReferenceLine y={expectedScore} stroke="#f59e0b" strokeDasharray="4 4" />
                        <Bar dataKey="Realisasi" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="Ekspektasi" fill="#cbd5e1" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {kpis.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center flex flex-col items-center">
                  <AlertCircle size={40} className="text-gray-300 mb-3" />
                  <p className="font-bold text-gray-800">Belum Ada Target KPI</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Belum ada indikator KPI ditetapkan untuk periode {getFullMonthName(selectedMonth)} {selectedYear}.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {kpis.map((item) => {
                    const percent = getProgressPercent(item.current_value, item.target_value);
                    const bench = Number(item.expected_benchmark || expectedScore);
                    const isLocked = item.approval_status === 'approved' || item.status === 'reviewed';

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
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                item.approval_status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : item.approval_status === 'submitted'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : item.approval_status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-gray-50 text-gray-600 border-gray-200'
                              }`}
                            >
                              {item.approval_status === 'approved'
                                ? 'Disetujui'
                                : item.approval_status === 'submitted'
                                ? 'Menunggu Validasi'
                                : item.approval_status === 'rejected'
                                ? 'Ditolak / Revisi'
                                : 'Draft'}
                            </span>
                          </div>

                          <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                          {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">
                              Aktual: <strong className="text-gray-900">{item.current_value} {item.unit}</strong>
                            </span>
                            <span className="text-gray-500">
                              Target: <strong className="text-gray-900">{item.target_value} {item.unit}</strong> ({percent}%)
                            </span>
                          </div>
                          <div className="relative w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                percent >= bench ? 'bg-emerald-500' : percent >= 60 ? 'bg-indigo-600' : 'bg-amber-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-amber-500"
                              style={{ left: `${Math.min(100, bench)}%` }}
                              title={`Ekspektasi ${bench}%`}
                            />
                          </div>

                          {(item.manager_notes || item.hrd_notes) && (
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs text-slate-600 flex items-start gap-2">
                              <MessageSquare size={13} className="text-indigo-500 shrink-0 mt-0.5" />
                              <div>
                                <strong className="text-slate-700 block text-[11px]">
                                  {item.manager_notes ? 'Catatan Atasan:' : 'Catatan HRD:'}
                                </strong>
                                <span>{item.manager_notes || item.hrd_notes}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => {
                                setEditingKpi(item);
                                setProgressInput(String(item.current_value ?? 0));
                              }}
                              disabled={isLocked}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors disabled:opacity-40"
                            >
                              <Edit3 size={13} /> Update
                            </button>
                            {!isLocked && item.approval_status !== 'submitted' && (
                              <button
                                onClick={() => handleSubmitToManager(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                              >
                                <Send size={13} /> Submit ke Atasan
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 2: EVALUASI & PENILAIAN 360 DERAJAT           */}
          {/* ================================================= */}
          {activeTab === 'review_360' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Ringkasan 360 yang Diterima */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Star size={18} className="text-amber-500" /> Rapor 360° Saya
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Self</p>
                    <p className="text-xl font-extrabold text-gray-900 mt-1">
                      {selfReview ? selfReview.average_score : '-'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100 text-center">
                    <p className="text-[10px] font-bold text-purple-600 uppercase">Peer ({peerReviews.length})</p>
                    <p className="text-xl font-extrabold text-gray-900 mt-1">
                      {peerReviews.length > 0 ? avgPeerScore : '-'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Atasan</p>
                    <p className="text-xl font-extrabold text-gray-900 mt-1">
                      {managerReview ? managerReview.average_score : '-'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-xs font-bold text-gray-500 uppercase">Umpan Balik Masuk</p>
                  {reviewsReceived.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-4 text-center">
                      Belum ada penilaian 360° untuk periode ini.
                    </p>
                  ) : (
                    reviewsReceived.map((rev) => (
                      <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-800 uppercase text-[10px] px-2 py-0.5 rounded-md bg-white border border-gray-200">
                            {rev.reviewer_type === 'self'
                              ? 'Self-Assessment'
                              : rev.reviewer_type === 'manager'
                              ? `Atasan (${rev.reviewer?.full_name || 'Manajer'})`
                              : `Peer Review (${rev.reviewer?.full_name || 'Rekan'})`}
                          </span>
                          <span className="font-extrabold text-indigo-600">{rev.average_score} / 100</span>
                        </div>
                        {rev.strengths && (
                          <p className="text-gray-700">
                            <strong className="text-emerald-700">Kelebihan:</strong> {rev.strengths}
                          </p>
                        )}
                        {rev.improvements && (
                          <p className="text-gray-700">
                            <strong className="text-amber-700">Saran Pengembangan:</strong> {rev.improvements}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Form Isi Self / Peer / Manager Review */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 text-base">Isi Formulir Penilaian 360°</h3>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewMode('self')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      reviewMode === 'self'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    Penilaian Mandiri
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewMode('peer')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      reviewMode === 'peer'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    Peer Review
                  </button>
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => setReviewMode('manager')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        reviewMode === 'manager'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      Nilai Bawahan
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit360} className="space-y-3.5">
                  {reviewMode !== 'self' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Pilih {reviewMode === 'manager' ? 'Anggota Tim' : 'Rekan Sejawat'} (Divisi {me?.department})
                      </label>
                      <select
                        required
                        value={reviewTargetId}
                        onChange={(e) => setReviewTargetId(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Pilih Karyawan --</option>
                        {(reviewMode === 'manager' ? teamMembers : colleagues).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.full_name} ({c.position})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'score_quality', label: 'Kualitas Kerja' },
                      { key: 'score_teamwork', label: 'Kerja Sama Tim' },
                      { key: 'score_initiative', label: 'Inisiatif' },
                      { key: 'score_discipline', label: 'Kedisiplinan' }
                    ].map((field) => (
                      <div key={field.key} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                          <span>{field.label}</span>
                          <span className="text-indigo-600">{(reviewForm as any)[field.key]}</span>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={100}
                          value={(reviewForm as any)[field.key]}
                          onChange={(e) =>
                            setReviewForm({ ...reviewForm, [field.key]: Number(e.target.value) })
                          }
                          className="w-full accent-indigo-600"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Kelebihan / Pencapaian Utama</label>
                    <textarea
                      rows={2}
                      value={reviewForm.strengths}
                      onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
                      placeholder="Apa hal terbaik yang ditunjukkan di periode ini?"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Area Pengembangan / Saran</label>
                    <textarea
                      rows={2}
                      value={reviewForm.improvements}
                      onChange={(e) => setReviewForm({ ...reviewForm, improvements: e.target.value })}
                      placeholder="Apa yang bisa ditingkatkan untuk periode berikutnya?"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {submittingReview ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    Simpan Penilaian 360°
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 3: RIWAYAT & PERBANDINGAN PERIODE             */}
          {/* ================================================= */}
          {activeTab === 'history' && (
            <div className="space-y-5">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 text-base mb-1">Tren Performa 6 Periode Terakhir</h3>
                <p className="text-xs text-gray-500 mb-4">Bandingkan perkembangan skor KPI Anda dari bulan ke bulan.</p>

                {historyPeriods.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-10">Belum ada riwayat KPI tersimpan.</p>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyPeriods} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line type="monotone" dataKey="score" name="Skor Saya" stroke="#4f46e5" strokeWidth={3} dot={{ r: 5 }} />
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
                      <th className="px-5 py-3.5 font-bold text-center">Jumlah KPI</th>
                      <th className="px-5 py-3.5 font-bold text-center">Skor Akhir</th>
                      <th className="px-5 py-3.5 font-bold text-right">Tren</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyPeriods.map((row) => (
                      <tr key={row.label} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 font-bold text-gray-900">{row.label}</td>
                        <td className="px-5 py-3.5 text-center text-gray-600">{row.count} indikator</td>
                        <td className="px-5 py-3.5 text-center font-extrabold text-indigo-600">{row.score}%</td>
                        <td className="px-5 py-3.5 text-right font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-full ${
                              row.delta > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : row.delta < 0
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
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

          {/* ================================================= */}
          {/* TAB 4 (OTOMATIS MANAJER): KPI TIM & APPROVAL      */}
          {/* ================================================= */}
          {activeTab === 'team' && isManager && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Users size={18} className="text-indigo-600" /> Dashboard KPI Tim — Divisi {me?.department}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {teamMembers.length} anggota tim terikat otomatis pada Reporting Line Anda.
                  </p>
                </div>
                <button
                  onClick={() => setShowTeamTargetModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm"
                >
                  <Plus size={15} /> Susun Target Tim
                </button>
              </div>

              {/* Ringkasan Anggota Tim */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {teamMembers.map((member) => {
                  const memberKpis = teamKpis.filter((k) => k.employee_id === member.id);
                  const memberScore = calcWeightedScore(memberKpis);
                  const waitingCount = memberKpis.filter((k) => k.approval_status === 'submitted').length;
                  return (
                    <div key={member.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{member.full_name}</p>
                          <p className="text-[11px] text-gray-500">{member.position} • {member.job_level}</p>
                        </div>
                        <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                          {memberScore}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${memberScore}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-gray-500">
                        <span>{memberKpis.length} target KPI</span>
                        {waitingCount > 0 ? (
                          <span className="font-bold text-rose-600">{waitingCount} perlu validasi</span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Terkendali</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Daftar Validasi Realisasi Tim */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 text-sm">Validasi & Realisasi KPI Anggota</h4>
                </div>
                {teamKpis.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-10">
                    Belum ada target KPI anggota tim pada periode ini. Klik <b>Susun Target Tim</b>.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {teamKpis.map((item) => {
                      const pct = getProgressPercent(item.current_value, item.target_value);
                      return (
                        <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 text-sm">
                                {item.employees?.full_name || 'Staf'}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {item.category} • Bobot {item.weight}%
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  item.approval_status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : item.approval_status === 'submitted'
                                    ? 'bg-amber-50 text-amber-700'
                                    : item.approval_status === 'rejected'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {item.approval_status}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-gray-700">{item.title}</p>
                            <p className="text-xs text-gray-500">
                              Realisasi: <strong>{item.current_value} / {item.target_value} {item.unit}</strong> ({pct}%)
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleApproveReject(item, 'approved')}
                              disabled={item.approval_status === 'approved'}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors disabled:opacity-40"
                            >
                              <ThumbsUp size={13} /> Approve
                            </button>
                            <button
                              onClick={() => {
                                setRejectingKpi(item);
                                setManagerNoteInput(item.manager_notes || '');
                              }}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                            >
                              <ThumbsDown size={13} /> Reject
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL UPDATE PROGRES PRIBADI */}
      {editingKpi && (
        <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">Update Progres KPI</h3>
              <button onClick={() => setEditingKpi(null)} className="p-1 text-gray-400 hover:bg-gray-200 rounded-full">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveProgress} className="p-6 space-y-4">
              <div>
                <p className="font-bold text-gray-900 text-sm">{editingKpi.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Target: <strong>{editingKpi.target_value} {editingKpi.unit}</strong>
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                  Realisasi Saat Ini ({editingKpi.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={progressInput}
                  onChange={(e) => setProgressInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingKpi(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH TARGET TIM (MANAJER) */}
      {showTeamTargetModal && (
        <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Susun Target KPI Anggota Tim</h3>
              <button onClick={() => setShowTeamTargetModal(false)} className="p-1 bg-white/20 rounded-full">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddTeamTarget} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Anggota Tim</label>
                <select
                  required
                  value={teamForm.employee_id}
                  onChange={(e) => setTeamForm({ ...teamForm, employee_id: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"
                >
                  <option value="">-- Pilih Anggota --</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name} ({m.position})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Judul Target KPI</label>
                <input
                  required
                  type="text"
                  value={teamForm.title}
                  onChange={(e) => setTeamForm({ ...teamForm, title: e.target.value })}
                  placeholder="Contoh: Output Produksi Harian Tanpa Defect"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Target</label>
                  <input
                    required
                    type="number"
                    value={teamForm.target_value}
                    onChange={(e) => setTeamForm({ ...teamForm, target_value: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Satuan</label>
                  <input
                    required
                    type="text"
                    value={teamForm.unit}
                    onChange={(e) => setTeamForm({ ...teamForm, unit: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Bobot %</label>
                  <input
                    required
                    type="number"
                    value={teamForm.weight}
                    onChange={(e) => setTeamForm({ ...teamForm, weight: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowTeamTargetModal(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-xs font-bold">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold">
                  {saving ? 'Menyimpan...' : 'Simpan Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REJECT NOTE (MANAJER) */}
      {rejectingKpi && (
        <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-rose-600 text-sm">Tolak / Minta Revisi Realisasi KPI</h3>
            <p className="text-xs text-gray-600">{rejectingKpi.title}</p>
            <textarea
              rows={3}
              required
              value={managerNoteInput}
              onChange={(e) => setManagerNoteInput(e.target.value)}
              placeholder="Tuliskan alasan revisi untuk karyawan..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex gap-2">
              <button onClick={() => setRejectingKpi(null)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-xs font-bold">
                Batal
              </button>
              <button
                onClick={() => handleApproveReject(rejectingKpi, 'rejected', managerNoteInput)}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold"
              >
                Kirim Revisi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
