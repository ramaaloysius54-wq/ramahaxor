import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Search, Edit, Key, Shield, User, X, Loader2, Save, FileText
} from 'lucide-react';

export default function ManageAccounts() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State untuk Modal Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    nik: '',
    new_password: ''
  });

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('id, full_name, nik, avatar_url, is_active')
      .order('full_name', { ascending: true });

    if (error) console.error('Gagal memuat karyawan:', error.message);
    if (data) setEmployees(data);
    setLoading(false);
  };
  
  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleOpenEdit = (emp: any) => {
    setSelectedEmp(emp);
    setFormData({
      full_name: emp.full_name || '',
      nik: emp.nik || '',
      new_password: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // 1. Update data identitas di tabel employees
      const { error: empError } = await supabase
        .from('employees')
        .update({ 
          full_name: formData.full_name, 
          nik: formData.nik 
        })
        .eq('id', selectedEmp.id);
        
      if (empError) throw empError;

      // 2. Update Password (Hanya dieksekusi jika field password diisi)
      if (formData.new_password.trim() !== '') {
        alert(`INFO: Memperbarui password untuk ${formData.full_name} membutuhkan otorisasi Admin Supabase (Service Role Key).`);
      }

      alert('Data akun berhasil diperbarui!');
      setIsModalOpen(false);
      fetchEmployees();

    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter pencarian
  const filteredEmployees = employees.filter(emp => 
    emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.nik?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Header Halaman */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"><Shield size={24} /></div>
            <h1 className="text-2xl font-bold">Kelola Akun Karyawan</h1>
          </div>
          <p className="text-purple-100 text-sm max-w-md">Atur identitas NIK, ubah nama, dan reset password login karyawan jika mereka lupa aksesnya.</p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-10 -mt-10"></div>
      </div>

      {/* Kontrol Tabel */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari nama atau NIK karyawan..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
          />
        </div>
        <div className="text-sm font-semibold text-gray-500">
          Total: <span className="text-purple-600">{filteredEmployees.length}</span> Akun
        </div>
      </div>

      {/* Tabel Karyawan */}
      <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold">Profil Karyawan</th>
                <th className="px-6 py-4 font-semibold">NIK</th>
                <th className="px-6 py-4 font-semibold">Status Akses</th>
                <th className="px-6 py-4 font-semibold text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-purple-500" />
                    Memuat data akun...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    Tidak ada karyawan yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                          {emp.avatar_url ? (
                            <img src={emp.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User size={18} className="text-gray-400" />
                          )}
                        </div>
                        <span className="font-bold text-gray-900">{emp.full_name || 'Tanpa Nama'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-600">{emp.nik || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        emp.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {emp.is_active !== false ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleOpenEdit(emp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-colors text-xs font-bold"
                      >
                        <Key size={14} /> Atur Akun
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POP-UP MODAL EDIT AKUN */}
      {isModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Edit size={18} className="text-purple-600" /> Edit Akun Karyawan
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Nama Lengkap</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" required
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Nomor Induk (NIK)</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" required
                    value={formData.nik}
                    onChange={(e) => setFormData({...formData, nik: e.target.value})}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100">
                <label className="block text-xs font-bold text-rose-500 uppercase tracking-wider mb-1">Reset Password Akses</label>
                <p className="text-xs text-gray-500 mb-2">Kosongkan jika tidak ingin mengubah password.</p>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Masukkan password baru..."
                    value={formData.new_password}
                    onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent placeholder:text-gray-300"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 mt-6 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSaving ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
