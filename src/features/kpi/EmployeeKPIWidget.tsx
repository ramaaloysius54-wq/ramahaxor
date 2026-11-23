import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Target, BellRing, Users } from 'lucide-react';

export default function EmployeeKPIWidget() {
  const [score, setScore] = useState<number | null>(null);
  const [expected, setExpected] = useState(80);
  const [totalKpi, setTotalKpi] = useState(0);
  const [pendingTeamApprovals, setPendingTeamApprovals] = useState(0);
  const [isManager, setIsManager] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const { data: me } = await supabase
        .from('employees')
        .select('department, job_level, kpi_role')
        .eq('id', user.id)
        .single();

      const mgr =
        (me as any)?.job_level === 'Manager' ||
        (me as any)?.job_level === 'Director' ||
        (me as any)?.kpi_role === 'manager';
      setIsManager(mgr);

      const { data: cycle } = await supabase
        .from('kpi_cycles')
        .select('expected_score')
        .eq('period_month', month)
        .eq('period_year', year)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if ((cycle as any)?.expected_score) {
        setExpected(Number((cycle as any).expected_score));
      }

      const { data } = await supabase
        .from('employee_kpis')
        .select('target_value, current_value, weight')
        .eq('employee_id', user.id)
        .eq('period_month', month)
        .eq('period_year', year);

      const rows = (data as any[]) || [];
      setTotalKpi(rows.length);

      if (rows.length > 0) {
        const totalWeight = rows.reduce((sum, r) => sum + Number(r.weight || 0), 0);
        const weighted = rows.reduce((sum, r) => {
          const target = Number(r.target_value) || 1;
          const pct = Math.min(100, (Number(r.current_value || 0) / target) * 100);
          const ratio = totalWeight > 0 ? Number(r.weight) / totalWeight : 1 / rows.length;
          return sum + pct * ratio;
        }, 0);
        setScore(Math.round(weighted));
      } else {
        setScore(0);
      }

      if (mgr && (me as any)?.department) {
        const { data: subs } = await supabase
          .from('employees')
          .select('id')
          .eq('department', (me as any).department)
          .in('job_level', ['Staff', 'Supervisor']);
        const subIds = ((subs as any[]) || []).map((s) => s.id);
        if (subIds.length > 0) {
          const { count } = await supabase
            .from('employee_kpis')
            .select('*', { count: 'exact', head: true })
            .in('employee_id', subIds)
            .eq('approval_status', 'submitted');
          setPendingTeamApprovals(count || 0);
        }
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
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            {score === null ? '...' : `${score}%`}
          </span>
          {pendingTeamApprovals > 0 && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
              <BellRing size={9} /> {pendingTeamApprovals} Approve
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 space-y-2">
        <div>
          <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
            {isManager ? 'KPI & Tim' : 'KPI Saya'}
            {isManager && <Users size={13} className="text-indigo-500" />}
          </h4>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {totalKpi > 0 ? `${totalKpi} Target • Ekspektasi ${expected}%` : 'Target & 360° Review'}
          </p>
        </div>

        <div className="relative w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              (score || 0) >= expected ? 'bg-emerald-500' : 'bg-indigo-600'
            }`}
            style={{ width: `${score || 0}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400"
            style={{ left: `${Math.min(100, expected)}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
