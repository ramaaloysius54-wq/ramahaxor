import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js'; 
import { User, CreditCard, Building2, Wallet, Save, Loader2, ArrowLeft, Hash, Mail, Lock, ShieldCheck, Calendar } from 'lucide-react';

const employeeSchema = z.object({
  full_name: z.string().min(3, 'Nama minimal 3 karakter'),
  nik: z.string().min(5, 'NIK wajib diisi'),
  position: z.string().min(2, 'Jabatan wajib diisi'),
  employment_type: z.string().min(1, 'Status karyawan wajib dipilih'),
  joined_at: z.string().min(1, 'Tanggal bergabung wajib diisi'),
  base_salary: z.coerce.number().min(1000000, 'Gaji pokok minimal Rp 1.000.000'),
  bank_name: z.string().min(2, 'Nama Bank wajib diisi'),
  bank_account_number: z.string().min(5, 'Nomor Rekening wajib diisi'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  password: z.string().min(6, 'Password minimal 6 karakter').optional().or(z.literal('')),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

export default function EmployeeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema) as any,
  });

  const baseSalaryValue = watch('base_salary');

  const formatRp = (num: number) => new Intl.NumberFormat('id-ID').format(num);

  const parseRp = (value: string) => {
    const parsed = Number(value.replace(/\D/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    if (isEditMode) {
      const fetchEmployeeData = async () => {
        try {
          const { data: empData, error: empError } = await supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .single();
            
          if (empError) throw empError;
          
          let emailLama = '';
          if (empData) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', id)
              .single();
              
            if (profileData && (profileData as any).email) {
              emailLama = (profileData as any).email;
            }
          }
          
          if (empData) {
            const emp = empData as any;
            reset({
              full_name: emp.full_name || '',
              nik: emp.nik || '',
              position: emp.position || '',
              employment_type: emp.employment_type || '',
              joined_at: emp.joined_at || '',
              base_salary: emp.base_salary || 0,
              bank_name: emp.bank_name || '',
              bank_account_number: emp.bank_account_number || '',
              email: emailLama, 
              password: '' 
            });
          }
        } catch (error: any) {
          setErrorMsg('Gagal memuat data karyawan: ' + error.message);
        }
      };
      fetchEmployeeData();
    }
  }, [id, isEditMode, reset]);

  const onSubmit = async (data: EmployeeFormData) => {
    setLoading(true);
    setErrorMsg('');
    
    try {
      if (isEditMode) {
        const { error: updateError } = await supabase
          .from('employees')
          .update({
            full_name: data.full_name,
            nik: data.nik,
            position: data.position,
            employment_type: data.employment_type,
            joined_at: data.joined_at,
            base_salary: data.base_salary,
            bank_name: data.bank_name,
            bank_account_number: data.bank_account_number,
          })
          .eq('id', id);

        if (updateError) throw updateError;
        alert('Data karyawan berhasil diperbarui!');
        navigate('/hrd/employees');

      } else {
        if (!data.email || !data.password) {
          throw new Error('Email dan password wajib diisi untuk karyawan baru.');
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        const tempAuthClient = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false }
        });

        const { data: authData, error: authError } = await tempAuthClient.auth.signUp({
          email: data.email,
          password: data.password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Gagal membuat akun login.');

        const newUserId = authData.user.id;

        const { error: profileError } = await supabase.from('profiles').upsert([{ 
          id: newUserId, 
          role: 'employee',
          email: data.email 
        }]);

        if (profileError) throw profileError;

        const { error: empError } = await supabase
          .from('employees')
          .insert([{
            id: newUserId,
            full_name: data.full_name,
            nik: data.nik,
            position: data.position,
            employment_type: data.employment_type,
            joined_at: data.joined_at,
            base_salary: data.base_salary,
            bank_name: data.bank_name,
            bank_account_number: data.bank_account_number,
            is_active: true
          }]);

        if (empError) throw empError;
        
        alert('Berhasil! Karyawan dan akun loginnya telah terdaftar.');
        navigate('/hrd/employees');
      }
      
    } catch (error: any) {
      setErrorMsg(error.message || 'Terjadi kesalahan saat memproses data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-primary-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}</h2>
          <p className="text-sm text-gray-500">{isEditMode ? 'Perbarui informasi data karyawan.' : 'Buatkan akun login dan lengkapi data karyawan sekaligus.'}</p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {!isEditMode && (
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-3 flex items-center gap-2">
              <ShieldCheck className="text-blue-500" size={20} /> Buat Akun Karyawan
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Perusahaan</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><Mail size={18} /></div>
                  <input type="email" {...register('email')} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="budi@perusahaan.com" />
                </div>
                {errors.email && <span className="text-xs text-rose-500 mt-1 block">{errors.email.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password Sementara</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><Lock size={18} /></div>
                  <input type="password" {...register('password')} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Minimal 6 karakter" />
                </div>
                {errors.password && <span className="text-xs text-rose-500 mt-1 block">{errors.password.message}</span>}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-3 flex items-center gap-2">
            <User className="text-primary-500" size={20} /> Data Personal & Jabatan
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lengkap</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><User size={18} /></div>
                <input type="text" {...register('full_name')} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="Budi Santoso" />
              </div>
              {errors.full_name && <span className="text-xs text-rose-500 mt-1 block">{errors.full_name.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nomor Induk Karyawan (NIK)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><Hash size={18} /></div>
                <input type="text" {...register('nik')} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="EMP-001" />
              </div>
              {errors.nik && <span className="text-xs text-rose-500 mt-1 block">{errors.nik.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Jabatan</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><Building2 size={18} /></div>
                <input type="text" {...register('position')} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="Software Engineer" />
              </div>
              {errors.position && <span className="text-xs text-rose-500 mt-1 block">{errors.position.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Bergabung</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><Calendar size={18} /></div>
                <input type="date" {...register('joined_at')} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
              </div>
              {errors.joined_at && <span className="text-xs text-rose-500 mt-1 block">{errors.joined_at.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status Karyawan</label>
              <select {...register('employment_type')} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all cursor-pointer">
                <option value="">-- Pilih Status --</option>
                <option value="Karyawan Tetap">Karyawan Tetap</option>
                <option value="Karyawan Kontrak">Karyawan Kontrak</option>
                <option value="Magang">Magang</option>
              </select>
              {errors.employment_type && <span className="text-xs text-rose-500 mt-1 block">{errors.employment_type.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Gaji Pokok (Rp)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><Wallet size={18} /></div>
                <input type="hidden" {...register('base_salary')} />
                <input 
                  type="text" 
                  value={!baseSalaryValue ? '' : formatRp(baseSalaryValue)}
                  onChange={(e) => {
                    const parsedValue = parseRp(e.target.value);
                    setValue('base_salary', parsedValue, { shouldValidate: true });
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                  placeholder="8.000.000" 
                />
              </div>
              {errors.base_salary && <span className="text-xs text-rose-500 mt-1 block">{errors.base_salary.message}</span>}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-3 flex items-center gap-2">
            <CreditCard className="text-primary-500" size={20} /> Rekening Gaji
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Bank / E-Wallet</label>
              <input type="text" {...register('bank_name')} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="BCA, SeaBank, GoPay..." />
              {errors.bank_name && <span className="text-xs text-rose-500 mt-1 block">{errors.bank_name.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nomor Rekening / HP</label>
              <input type="text" {...register('bank_account_number')} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="1234567890" />
              {errors.bank_account_number && <span className="text-xs text-rose-500 mt-1 block">{errors.bank_account_number.message}</span>}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center gap-2 bg-primary-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-70 shadow-lg shadow-primary-500/30"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {loading ? 'Memproses...' : (isEditMode ? 'Simpan Perubahan' : 'Simpan & Buat Akun')}
          </button>
        </div>
      </form>
    </div>
  );
}
