import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Hash, Building2, Wallet, Camera, Loader2, Mail, Calendar } from 'lucide-react';

export default function EmployeeProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || '');

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User tidak ditemukan");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload ke Storage 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Dapatkan URL Publik
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Simpan URL ke tabel employees
      const { error: updateError } = await supabase
        .from('employees')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 4. Perbarui tampilan layar
      setProfile({ ...profile, avatar_url: publicUrl });
      alert('Foto profil berhasil diperbarui!');
      
    } catch (error: any) {
      alert('Gagal mengunggah foto: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary-500" size={32} /></div>;
  }

  return (
    <div className="max-w-md mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Profile & Foto */}
      <div className="bg-primary-600 rounded-b-[2.5rem] p-8 pt-12 text-white shadow-lg text-center relative">
        <div className="relative inline-block mb-4">
          <div className="w-28 h-28 mx-auto bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white/30 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-white" />
            )}
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 p-2.5 bg-white text-primary-600 rounded-full shadow-lg hover:bg-gray-50 transition active:scale-95 disabled:opacity-70"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
          </button>
          
          {/* Input file tersembunyi */}
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={uploadPhoto} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        
        <h2 className="text-2xl font-bold">{profile?.full_name || 'Nama Karyawan'}</h2>
        <p className="text-primary-100">{profile?.position || 'Posisi/Jabatan'}</p>
      </div>

      {/* Informasi Identitas Karyawan */}
      <div className="px-6 -mt-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
          <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-2">Informasi Pekerjaan</h3>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500"><Hash size={20} /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">NIK (Nomor Induk Karyawan)</p>
              <p className="font-semibold text-gray-900">{profile?.nik || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500"><Mail size={20} /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Email Login</p>
              <p className="font-semibold text-gray-900">{email || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500"><Building2 size={20} /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Status Karyawan</p>
              <p className="font-semibold text-gray-900">{profile?.employment_type || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500"><Calendar size={20} /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Tanggal Bergabung</p>
              <p className="font-semibold text-gray-900">{profile?.joined_at || '-'}</p>
            </div>
          </div>

          <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-2 pt-4">Informasi Rekening</h3>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500"><Wallet size={20} /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Bank & No. Rekening</p>
              <p className="font-semibold text-gray-900">
                {profile?.bank_name ? `${profile.bank_name} • ${profile.bank_account_number}` : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
