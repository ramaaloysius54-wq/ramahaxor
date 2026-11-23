import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Target, ChevronRight, Award, Loader2 } from 'lucide-react';

export default function EmployeeKPIWidget() {
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [totalKpi, setTotalKpi] = useState(0);
  const [achievedKpi, setAchievedKpi] = useState(0);

  const fetchSummary = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const { data } = await supabase
        .from('employee_kpis')
        .select('target_value, current_value, weight')
        .eq('employee_id', user.id)
        .eq('period_month', now.getMonth() + 1)
        .eq('period_year', now.getFullYear());

      const rows = (data as any[]) || [];
      setTotalKpi(rows.length);

      if (rows.length > 0) {
        const totalWeight = rows.reduce((sum, r) => sum + Number(r.weight || 0), 0);
        let achieved = 0;

        const weighted = rows.reduce((sum, r) => {
          const target = Number(r.target_value) || 1;
          const pct = Math.min(100, (Number(r.current_value || 0) / target) * 100);
          if (pct >= 100) achieved++;
          const ratio = totalWeight > 0 ? Number(r.weight) / totalWeight : 1 / rows.length;
          return sum + pct * ratio;
        }, 0);

        setScore(Math.round(weighted));
        setAchievedKpi(achieved);
      } else {
        setScore(0);
        setAchievedKpi(0);
      }
    } catch (err) {
      console.error('Gagal memuat ringkasan KPI:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();

    const channel = supabase
      .channel('realtime-employee-kpi-widget')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employee_kpis' },
        () => {
          fetchSummary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSummary]);

  return (
    <Link
      to="/employee/kpi"
      className="block bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.99] group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Target size={22} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Performa KPI Bulan Ini</h3>
            <p className="text-xs text-gray-500">
              {loading ? 'Memuat...' : totalKpi > 0 ? `${achievedKpi} dari ${totalKpi} target tercapai` : 'Belum ada target bulan ini'}
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
          <Loader2 size={14} className="animate-spin" /> Menghitung skor...
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-indigo-600">
              <Award size={13} /> Skor Kinerja
            </span>
            <span className="font-extrabold text-gray-900">{score}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}
