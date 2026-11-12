import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  ReceiptText, Download, CalendarDays, AlertCircle, Loader2, ArrowRight
} from 'lucide-react';

export default function EmployeePayslips() {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

  useEffect(() => {
    async function fetchMyPayslips() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('payroll_records')
          .select(`
            *,
            payroll_periods (month, year)
          `)
          .eq('employee_id', user.id)
          .order('id', { ascending: false });

        if (error) throw error;
        setPayslips(data || []);
      } catch (error) {
        console.error('Gagal mengambil slip gaji:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMyPayslips();
  }, []);

  const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
  
  const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('id-ID', { month: 'long' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 space-y-6 pb-24 max-w-md mx-auto relative animate-in fade-in duration-500">
      
      {/* Header Premium */}
      <div className="bg-gradient-to-br from-gray-900 to-indigo-900 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden print:hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <ReceiptText size={20} className="text-blue-200" />
            </div>
            <h1 className="text-xl font-bold">Slip Gaji Anda</h1>
          </div>
          <p className="text-sm text-indigo-200 font-medium">Rekapitulasi penerimaan penghasilan dan potongan bulanan Anda.</p>
        </div>
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-20 -ml-10 -mb-10"></div>
      </div>

      {/* Konten Utama */}
      <div className="print:hidden">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4 px-1">
          <CalendarDays size={18} className="text-primary-600" /> Riwayat Bulan Ini
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Loader2 className="animate-spin mb-2" size={28} />
            <span className="text-sm">Menarik data dari sistem HRD...</span>
          </div>
        ) : payslips.length === 0 ? (
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center">
            <AlertCircle size={40} className="text-gray-300 mb-3" />
            <p className="font-bold text-gray-700">Belum Ada Riwayat Gaji</p>
            <p className="text-xs text-gray-500 mt-1">HRD belum mempublikasikan slip gaji Anda untuk periode apa pun.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payslips.map((slip) => (
              <div 
                key={slip.id} 
                onClick={() => setSelectedPayslip(slip)}
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:border-primary-300 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex flex-col relative overflow-hidden group"
              >
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                      {slip.payroll_periods?.month}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">Gaji {getMonthName(slip.payroll_periods?.month)} {slip.payroll_periods?.year}</h4>
                      <p className="text-[10px] font-semibold text-gray-400 mt-0.5 uppercase tracking-wider">Payroll ID: #{slip.id.slice(0, 5)}</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-gray-300 group-hover:text-primary-600 transition-colors" />
                </div>
                
                <div className="pt-3 mt-1 border-t border-dashed border-gray-100 flex justify-between items-center relative z-10">
                  <span className="text-xs text-gray-500 font-medium">Take Home Pay</span>
                  <span className="text-base font-extrabold text-gray-900">{formatRp(slip.net_salary)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POP-UP DETAIL SLIP GAJI */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] print:max-h-full print:shadow-none print:rounded-none">
            
            <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center print:hidden shrink-0">
              <button onClick={() => setSelectedPayslip(null)} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
                Tutup
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm">
                <Download size={16} /> Unduh PDF
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto font-mono text-xs text-gray-700 print:text-black print:overflow-visible">
              
              <div className="text-center mb-6 border-b-2 border-black pb-4">
                <h2 className="text-xl font-bold uppercase mb-1">STRUK GAJI KARYAWAN</h2>
                <p className="font-semibold">PERIODE: {getMonthName(selectedPayslip.payroll_periods?.month).toUpperCase()} {selectedPayslip.payroll_periods?.year}</p>
              </div>

              <div className="mb-4">
                <h3 className="font-bold border-b border-dashed border-gray-400 pb-1 mb-2 uppercase">I. PENERIMAAN (Pemasukan)</h3>
                <div className="space-y-1.5 pl-1">
                  <div className="flex justify-between"><span>Gaji Pokok Dasar</span><span>{formatRp(selectedPayslip.base_salary)}</span></div>
                  {selectedPayslip.overtime_pay > 0 && (
                    <div className="flex justify-between"><span>Lembur & Ekstra</span><span>{formatRp(selectedPayslip.overtime_pay)}</span></div>
                  )}
                  {selectedPayslip.total_allowance > 0 && (
                    <div className="flex justify-between"><span>Tunjangan Lainnya</span><span>{formatRp(selectedPayslip.total_allowance)}</span></div>
                  )}
                  <div className="flex justify-between font-bold pt-1 mt-1 border-t border-gray-200">
                    <span>Total Pendapatan Kotor</span>
                    <span>{formatRp(selectedPayslip.gross_salary)}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold border-b border-dashed border-gray-400 pb-1 mb-2 uppercase">II. PEMOTONGAN</h3>
                <div className="space-y-1.5 pl-1">
                  {selectedPayslip.late_deduction > 0 && (
                    <div className="flex justify-between text-red-600"><span>Potongan Sakit/Mangkir</span><span>- {formatRp(selectedPayslip.late_deduction)}</span></div>
                  )}
                  {selectedPayslip.bpjs_kes_employee > 0 && (
                    <div className="flex justify-between text-red-600"><span>Iuran BPJS Kesehatan</span><span>- {formatRp(selectedPayslip.bpjs_kes_employee)}</span></div>
                  )}
                  {selectedPayslip.bpjs_tk_employee > 0 && (
                    <div className="flex justify-between text-red-600"><span>Iuran BPJS Ketenagakerjaan</span><span>- {formatRp(selectedPayslip.bpjs_tk_employee)}</span></div>
                  )}
                  {selectedPayslip.pph21_ter > 0 && (
                    <div className="flex justify-between text-red-600"><span>Pajak PPh 21 (TER)</span><span>- {formatRp(selectedPayslip.pph21_ter)}</span></div>
                  )}
                  <div className="flex justify-between font-bold pt-1 mt-1 border-t border-gray-200">
                    <span>Total Pemotongan</span>
                    <span className="text-red-600">- {formatRp(selectedPayslip.total_deduction)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-100 border-2 border-black p-4 text-center">
                <p className="font-bold uppercase tracking-wider mb-1">TOTAL TAKE HOME PAY</p>
                <p className="text-xl sm:text-2xl font-extrabold">{formatRp(selectedPayslip.net_salary)}</p>
              </div>

              <div className="mt-8 text-center text-[10px] text-gray-500 italic">
                Slip gaji ini dihasilkan secara elektronik dan valid tanpa tanda tangan basah.
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
