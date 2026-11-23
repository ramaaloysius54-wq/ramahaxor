import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Target, CheckCircle2, Clock } from 'lucide-react';

export default function EmployeeKPIWidget() {
  const [score, setScore] = useState<number | null>(null);
  const [totalKpi, setTotalKpi] = useState(0);
  const [ratedCount, setRatedCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);

  const fetchSummary = useCallback(async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const { data } = await supabase
        .from('employee_kpis')
        .select('target_value, current_value, weight, hrd_score, approval_status')
        .eq('employee_id', user.id)
        .eq('period_month', now.getMonth() + 1)
        .eq('period_year', now.getFullYear());

      const rows = (data as any[]) || [];
      setTotalKpi(rows.length);
      setRatedCount(rows.filter((r) => r.approval_status === 'approved' || r.hrd_score !== null).length);
      setWaitingCount(rows.filter((r) => r.approval_status === 'submitted').length);

      if (rows.length > 0) {
        const totalWeight = rows.reduce((sum, r) => sum + Number(r.weight || 0), 0);
        const weighted = rows.reduce((sum, r) => {
          const itemScore =
            r.hrd_score !== null && r.hrd_score !== undefined
              ? Math.min(100, Math.max(0, Number(r.hrd_score)))
              : Math.min(100, (Number(r.current_value || 0) / (Number(r.target_value) || 1)) * 100);
          const ratio = totalWeight > 0 ? Number(r.weight) / totalWeight : 1 / rows.length;
          return sum + itemScore * ratio;
        }, 0);
        setScore(Math.round(weighted));
      } else {
        setScore(0);
      }
    } catch (err) {
      console.error('Gagal memuat widget KPI:', err);
    }
  }, []);

  useEffect(() => {
    fetchSummary();

    const channel = supabase
      .channel('realtime-employee-kpi-tile')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_kpis' }, () => {
        fetchSummary();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSummary]);

  return (
    <Link
      to="/employee/kpi"
      className="group relative overflow-hidden bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 hover:border-indigo-300 hover:shadow-md active:scale-[0.98] transition-all flex flex-col justify-between"
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-50 to-transparent rounded-full -mr-6 -mt-6 pointer-events-none" />

      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
          <Target size={22} />
        </div>
        <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
          {score === null ? '...' : `${score}%`}
        </span>
      </div>

      <div className="relative z-10 space-y-2">
        <div>
          <h4 className="font-bold text-gray-900 text-sm">KPI Saya</h4>
          <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
            {totalKpi === 0 ? (
              'Input & Ajukan ke HRD'
            ) : waitingCount > 0 ? (
              <>
                <Clock size={11} className="text-amber-500" /> {waitingCount} menunggu HRD
              </>
            ) : (
              <>
                <CheckCircle2 size={11} className="text-emerald-500" /> {ratedCount}/{totalKpi} dinilai HRD
              </>
            )}
          </p>
        </div>

        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${score || 0}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
