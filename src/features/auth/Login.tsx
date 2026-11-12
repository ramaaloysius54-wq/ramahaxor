import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  LogIn, 
  Loader2, 
  AlertCircle, 
  Mail, 
  Lock, 
  Fingerprint, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Building2 
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setErrorMsg('');
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle(); 

      if (profileError) throw profileError;
      if (!profile) throw new Error('Akun valid, tetapi profil tidak ditemukan di database.');

      if (profile.role === 'hrd') {
        navigate('/hrd/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
      
    } catch (error: any) {
      setErrorMsg('Username/password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{
        // Gambar gedung kantor perusahaan modern beresolusi tinggi
        backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2070&q=80')`
      }}
    >
      {/* Overlay Gelap & Efek Blur Halus agar Form Menonjol */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-indigo-950/75 to-slate-900/90 backdrop-blur-[3px]"></div>

      {/* Dekorasi Cahaya (Ambient Glow) */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Kartu Utama Login */}
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.25rem] shadow-[0_25px_60px_rgba(0,0,0,0.45)] border border-white/40 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header & Ikon Utama */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-5 shadow-sm">
            <Building2 size={13} className="text-indigo-600" />
            <span>PT Rama Cinta Sejati</span>
          </div>

          <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-3xl rotate-6 opacity-20 animate-pulse"></div>
            <div className="relative w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-500/30 border border-white/20">
              <Fingerprint size={38} strokeWidth={2} />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Portal HRIS & Absensi
          </h1>
          <p className="text-gray-500 text-sm mt-1.5 font-medium">
            Silakan masuk menggunakan kredensial resmi Anda
          </p>
        </div>

        {/* Notifikasi Error */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-600 text-sm rounded-2xl flex items-center gap-3 border border-rose-200/80 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="p-1.5 bg-rose-100 rounded-xl shrink-0">
              <AlertCircle size={18} className="text-rose-600" />
            </div>
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 ml-1">
              Alamat Email
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <div className="p-1.5 rounded-xl bg-gray-100 text-gray-400 group-focus-within:bg-indigo-50 group-focus-within:text-indigo-600 transition-colors">
                  <Mail className="h-4 w-4" />
                </div>
              </div>
              <input 
                type="email" 
                {...register('email')} 
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 pl-12 pr-4 py-3.5 text-sm text-gray-900 font-medium outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-sm placeholder:text-gray-400" 
                placeholder="nama@perusahaan.com"
              />
            </div>
            {errors.email && (
              <span className="text-xs font-semibold text-rose-500 mt-1.5 ml-1 block">
                {errors.email.message}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 ml-1">
              Kata Sandi
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <div className="p-1.5 rounded-xl bg-gray-100 text-gray-400 group-focus-within:bg-indigo-50 group-focus-within:text-indigo-600 transition-colors">
                  <Lock className="h-4 w-4" />
                </div>
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                {...register('password')} 
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 pl-12 pr-12 py-3.5 text-sm text-gray-900 font-medium outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-sm placeholder:text-gray-400" 
                placeholder="••••••••"
              />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none"
              >
                <div className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </div>
              </button>
            </div>
            {errors.password && (
              <span className="text-xs font-semibold text-rose-500 mt-1.5 ml-1 block">
                {errors.password.message}
              </span>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex justify-center items-center gap-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white py-4 rounded-2xl hover:from-blue-700 hover:to-indigo-800 active:scale-[0.98] disabled:opacity-70 transition-all shadow-lg shadow-indigo-600/30 font-bold text-base mt-3"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
            {loading ? 'Memverifikasi Akses...' : 'Masuk ke Sistem'}
          </button>
        </form>

        {/* Footer Keamanan */}
        <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
          <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
          <span>Dilindungi Sistem Keamanan Geolocation & Anti-Mock</span>
        </div>

      </div>
    </div>
  );
}
