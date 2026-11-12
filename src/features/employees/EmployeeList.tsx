import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Search, 
  Loader2, 
  Building2, 
  Wallet,
  Calendar,
  Edit2 
} from 'lucide-react';

// Definisi tipe data karyawan
type Employee = {
  id: string;
  full_name: string;
  nik: string;
  position: string;
  employment_type: string;
  joined_at: string;
  base_salary: number;
};

export default function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Ambil Data Karyawan dari Database
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Gagal mengambil data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // 2. Fungsi Hapus Karyawan Total (Akun & Biodata)
  const handleDelete = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus TOTAL data dan akun login karyawan: ${name}? \n\nAkun ini tidak akan bisa login lagi.`);
    if (!confirmDelete) return;

    try {
      // Memanggil fungsi admin di database untuk menghapus sampai ke akarnya
      const { error } = await supabase.rpc('hapus_karyawan_total', { uid: id });
      
      if (error) throw error;

      // Hapus dari tampilan layar tanpa perlu refresh
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
      alert(`Berhasil menghapus TOTAL ${name} (beserta akun loginnya) dari sistem.`);
      
    } catch (error: any) {
      alert('Gagal menghapus karyawan: ' + error.message);
    }
  };

  // 3. Filter Pencarian
  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.nik.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header & Tombol Tambah */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-primary-600" /> Manajemen Karyawan
          </h2>
          <p className="text-sm text-gray-500 mt-1">Kelola data, jabatan, dan status karyawan perusahaan.</p>
        </div>
        
        <Link 
          to="/hrd/employees/new" 
          className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-sm active:scale-95"
        >
          <UserPlus size={18} /> Tambah Karyawan
        </Link>
      </div>

      {/* Card Tabel */}
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Cari nama atau NIK..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Memuat data karyawan...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Users size={48} className="text-gray-300 mb-3" />
            <p className="font-medium text-gray-900">Belum ada data karyawan</p>
            <p className="text-sm">Data karyawan yang ditambahkan akan muncul di sini.</p>
          </div>
        ) : (
          /* Tabel Data */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-sm text-gray-500">
                  <th className="px-6 py-4 font-semibold">Nama Karyawan & NIK</th>
                  <th className="px-6 py-4 font-semibold">Jabatan</th>
                  <th className="px-6 py-4 font-semibold">Status & Tanggal Masuk</th>
                  <th className="px-6 py-4 font-semibold">Gaji Pokok</th>
                  <th className="px-6 py-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                    
                    {/* Kolom Nama & NIK */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{emp.full_name}</div>
                      <div className="text-sm text-gray-500 font-mono mt-0.5">{emp.nik}</div>
                    </td>
                    
                    {/* Kolom Jabatan */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Building2 size={16} className="text-gray-400" /> {emp.position}
                      </div>
                    </td>
                    
                    {/* Kolom Status & Tanggal (Telah Diperbaiki Warnanya) */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        emp.employment_type === 'Karyawan Tetap' ? 'bg-green-100 text-green-700' : 
                        emp.employment_type === 'Karyawan Kontrak' ? 'bg-blue-100 text-blue-700' : 
                        emp.employment_type === 'Magang' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {emp.employment_type}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1.5">
                        <Calendar size={14} /> {emp.joined_at}
                      </div>
                    </td>
                    
                    {/* Kolom Gaji */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <Wallet size={16} className="text-gray-400" />
                        Rp {emp.base_salary?.toLocaleString('id-ID') || 0}
                      </div>
                    </td>
                    
                    {/* Kolom Aksi (Tombol Edit & Hapus) */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/hrd/employees/edit/${emp.id}`}
                          className="inline-flex items-center justify-center p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          title="Edit Karyawan"
                        >
                          <Edit2 size={18} />
                        </Link>

                        <button
                          onClick={() => handleDelete(emp.id, emp.full_name)}
                          className="inline-flex items-center justify-center p-2 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-500 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                          title="Hapus Karyawan"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
