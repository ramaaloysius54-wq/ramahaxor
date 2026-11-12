import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
// IMPORT ENGINE PAYROLL ANDA DI SINI
// Sesuaikan path-nya jika file Anda berada di folder yang berbeda
import { calculateBPJS, calculatePPh21TER, calculateOvertime } from '../../lib/payrollEngine'; 

interface PayrollRealtimeRowProps {
  record: any;
  onUpdateSuccess: () => void;
}

export default function PayrollRealtimeRow({ record, onUpdateSuccess: _onUpdateSuccess }: { record: any; onUpdateSuccess?: () => void }) {
  
  const emp = record.employees;
  const WORK_DAYS = 22; // Asumsi hari kerja sebulan

  // -- STATE INPUT --
  const [baseSalary, setBaseSalary] = useState(record.base_salary || 0);
  const [overtimeHours, setOvertimeHours] = useState(0); 
  const [performanceAllowance, setPerformanceAllowance] = useState(0); 
  const [sickDays, setSickDays] = useState(0); 
  const [otherDeductions, setOtherDeductions] = useState(0);

  // -- STATE HASIL KALKULASI --
  const [calculated, setCalculated] = useState({
    overtime_pay: 0,
    gross_salary: 0,
    bpjs_kes: 0, 
    bpjs_tk: 0,  
    pph21: 0, // Tambahan PPh 21
    sick_deduction: 0,
    total_deduction: 0,
    net_salary: 0,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // --- ENGINE KALKULASI UTAMA (Menggunakan Rumus Resmi Anda) ---
  useEffect(() => {
    // 1. Hitung Lembur pakai rumus (Base / 173 * jam) dari Engine Anda
    const overtimeTotal = calculateOvertime(baseSalary, overtimeHours);

    // 2. Hitung Potongan Ketidakhadiran (Sakit/Mangkir)
    const dailyRate = Math.round(baseSalary / WORK_DAYS);
    const sickDeductionTotal = sickDays * dailyRate;

    // 3. Gaji Bruto
    const gross = baseSalary + overtimeTotal + performanceAllowance - sickDeductionTotal;

    // 4. Hitung BPJS pakai batasan nilai (Cap) dari Engine Anda
    const { bpjsKesehatan, bpjsTK } = calculateBPJS(baseSalary);

    // 5. Hitung Pajak PPh 21 TER pakai tabel dari Engine Anda
    const pph21Tax = calculatePPh21TER(gross);

    // 6. Total Potongan
    const totalDeduct = bpjsKesehatan + bpjsTK + pph21Tax + otherDeductions;

    // 7. Net Take Home Pay
    const net = gross - totalDeduct;

    setCalculated({
      overtime_pay: overtimeTotal,
      sick_deduction: sickDeductionTotal,
      gross_salary: gross > 0 ? gross : 0,
      bpjs_kes: bpjsKesehatan,
      bpjs_tk: bpjsTK,
      pph21: pph21Tax,
      total_deduction: totalDeduct,
      net_salary: net > 0 ? net : 0, 
    });
    
    setSaveStatus('idle');

  }, [baseSalary, overtimeHours, performanceAllowance, sickDays, otherDeductions]);

  // -- FUNGSI PENYIMPANAN KE SUPABASE --
  const saveToDatabase = async () => {
    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const { error } = await supabase
        .from('payroll_records')
        .update({
          base_salary: baseSalary,
          overtime_pay: calculated.overtime_pay,
          total_allowance: performanceAllowance,
          late_deduction: calculated.sick_deduction + otherDeductions, 
          bpjs_kes_employee: calculated.bpjs_kes,
          bpjs_tk_employee: calculated.bpjs_tk,
          pph21_ter: calculated.pph21, // Simpan pajak ke database
          gross_salary: calculated.gross_salary,
          total_deduction: calculated.total_deduction,
          net_salary: calculated.net_salary,
        })
        .eq('id', record.id);

      if (error) throw error;
      setSaveStatus('success');
      
      setTimeout(() => setSaveStatus('idle'), 2000);
      
    } catch (error) {
      console.error(error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- FUNGSI FORMAT ANGKA (TAMBAHAN) ---
  const formatRp = (num: number) => new Intl.NumberFormat('id-ID').format(num);

  const parseRp = (value: string) => {
    const parsed = Number(value.replace(/\D/g, '')); 
    return isNaN(parsed) ? 0 : parsed;
  };

  return (
    <tr className="hover:bg-indigo-50/30 transition-colors group">
      
      {/* Kolom 1: Info Dasar */}
      <td className="px-5 py-4 align-top">
        <div className="font-bold text-gray-900">{emp?.full_name}</div>
        <div className="text-[10px] font-mono text-gray-500 mb-2">{emp?.nik} • {emp?.position}</div>
        
        <label className="block text-[10px] font-semibold text-gray-500 uppercase">Gaji Pokok Dasar</label>
        <div className="relative mt-1">
          <span className="absolute left-2.5 top-2 text-gray-400 font-medium">Rp</span>
          {/* PERUBAHAN: Input text dengan format otomatis */}
          <input 
            type="text"
            value={baseSalary === 0 ? '' : formatRp(baseSalary)}
            onChange={(e) => setBaseSalary(parseRp(e.target.value))}
            className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-2 py-1.5 font-bold text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none"
            placeholder="0"
          />
        </div>
      </td>

      {/* Kolom 2: Form Input Dinamis */}
      <td className="px-5 py-4 align-top bg-blue-50/20 border-x border-gray-50">
        <div className="space-y-3">
          
          {/* Hitung Lembur Otomatis */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Total Jam Lembur</label>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={overtimeHours === 0 ? '' : overtimeHours}
                onChange={(e) => setOvertimeHours(Number(e.target.value))}
                className="w-16 bg-white border border-gray-200 rounded-md px-2 py-1 text-center font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                placeholder="Jam" 
              />
              <span className="text-[10px] text-gray-500">Jam (Otomatis Base/173)</span>
              <span className="text-blue-600 font-bold ml-1">+Rp {formatRp(calculated.overtime_pay)}</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Tunjangan Kinerja</label>
            {/* PERUBAHAN: Input text dengan format otomatis */}
            <input 
              type="text" 
              value={performanceAllowance === 0 ? '' : formatRp(performanceAllowance)}
              onChange={(e) => setPerformanceAllowance(parseRp(e.target.value))}
              className="w-full max-w-[200px] bg-white border border-gray-200 rounded-md px-2 py-1 font-semibold focus:ring-1 focus:ring-primary-500 outline-none"
              placeholder="0"
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className="block text-[10px] font-semibold text-rose-500 uppercase mb-1">Potongan Mangkir/Sakit</label>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={sickDays === 0 ? '' : sickDays}
                onChange={(e) => setSickDays(Number(e.target.value))}
                className="w-16 bg-white border border-rose-200 rounded-md px-2 py-1 text-center font-bold text-rose-600 focus:ring-1 focus:ring-rose-500 outline-none"
                placeholder="Hari"
              />
              <span className="text-[10px] text-gray-500">Hari Tanpa Gaji</span>
              {calculated.sick_deduction > 0 && (
                <span className="text-rose-600 font-bold ml-1">-Rp {formatRp(calculated.sick_deduction)}</span>
              )}
            </div>
          </div>

        </div>
      </td>

      {/* Kolom 3: Rincian Potongan Lengkap dengan Pajak */}
      <td className="px-5 py-4 align-top">
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between items-center text-gray-800 font-medium">
            <span>Gaji Bruto:</span>
            <span className="font-bold">Rp {formatRp(calculated.gross_salary)}</span>
          </div>
          
          <div className="w-full border-t border-dashed border-gray-200 my-1"></div>
          
          <div className="flex justify-between items-center text-gray-500">
            <span>BPJS Kes (Max limit):</span>
            <span className="text-rose-500">- Rp {formatRp(calculated.bpjs_kes)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-500">
            <span>BPJS TK JHT+JP:</span>
            <span className="text-rose-500">- Rp {formatRp(calculated.bpjs_tk)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-500">
            <span>PPh 21 (TER):</span>
            <span className="text-rose-500">- Rp {formatRp(calculated.pph21)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-500">
            <span>Lain-lain:</span>
            {/* PERUBAHAN: Input text dengan format otomatis */}
            <input 
              type="text"
              value={otherDeductions === 0 ? '' : formatRp(otherDeductions)}
              onChange={(e) => setOtherDeductions(parseRp(e.target.value))}
              className="w-20 bg-gray-50 border border-gray-200 rounded text-right px-1 text-rose-500 outline-none focus:ring-1 focus:ring-rose-500"
              placeholder="0"
            />
          </div>
          
          <div className="w-full border-t border-dashed border-gray-200 my-1"></div>
          
          <div className="flex justify-between items-center text-gray-800">
            <span>Total Potongan:</span>
            <span className="font-bold text-rose-600">Rp {formatRp(calculated.total_deduction)}</span>
          </div>
        </div>
      </td>

      {/* Kolom 4: Hasil Take Home Pay */}
      <td className="px-5 py-4 align-middle text-right bg-emerald-50/20 rounded-r-2xl">
        <div className="text-[10px] font-semibold text-emerald-600 uppercase mb-1">Take Home Pay</div>
        <div className="text-xl font-extrabold text-gray-900 mb-3">
          Rp {formatRp(calculated.net_salary)}
        </div>
        
        <button 
          onClick={saveToDatabase}
          disabled={isSaving}
          className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all w-full
            ${saveStatus === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 
              saveStatus === 'error' ? 'bg-rose-500 text-white' : 
              'bg-gray-900 text-white hover:bg-primary-600 shadow-md'
            }
          `}
        >
          {saveStatus === 'saving' ? <Loader2 className="animate-spin" size={14} /> : 
           saveStatus === 'success' ? <CheckCircle2 size={14} /> : 
           saveStatus === 'error' ? <AlertCircle size={14} /> : 
           <Save size={14} />}
           
          {saveStatus === 'success' ? 'Tersimpan!' : 'Simpan Data'}
        </button>
      </td>
    </tr>
  );
}
