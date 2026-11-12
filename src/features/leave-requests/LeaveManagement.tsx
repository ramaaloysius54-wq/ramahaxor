import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, ExternalLink } from 'lucide-react';

export default function LeaveManagement() {
  const [requests, setRequests] = useState<any[]>([]);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('leave_requests')
      .select('*, employees(full_name, nik)')
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDecision = async (id: string, status: 'approved' | 'rejected') => {
    const notes = prompt(`Masukkan catatan HRD untuk status: ${status.toUpperCase()} (Opsional)`);
    if (notes === null) return; // Batal jika klik Cancel

    // Update status di database (Ini otomatis akan memicu notifikasi real-time di layar karyawan)
    await supabase.from('leave_requests').update({ status, hr_notes: notes }).eq('id', id);
    fetchRequests(); // Refresh data tabel
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold text-gray-800">Manajemen Izin & Cuti</h2>
      
      {/* PERBAIKAN: Menambahkan overflow-x-auto di sini agar responsif di mobile */}
      <div className="bg-surface rounded-2xl shadow-soft overflow-x-auto w-full">
        {/* PERBAIKAN: Menambahkan whitespace-nowrap agar teks tidak hancur menumpuk saat di layar kecil */}
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-medium">Karyawan</th>
              <th className="px-6 py-4 font-medium">Jenis</th>
              <th className="px-6 py-4 font-medium">Tanggal</th>
              <th className="px-6 py-4 font-medium">Alasan</th>
              {/* KOLOM BARU: Lampiran Bukti Foto */}
              <th className="px-6 py-4 font-medium">Lampiran</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{req.employees?.full_name}</p>
                  <p className="text-xs text-gray-500">{req.employees?.nik}</p>
                </td>
                <td className="px-6 py-4 uppercase text-xs font-semibold text-gray-600">{req.leave_type}</td>
                <td className="px-6 py-4 text-gray-600">{req.start_date} s/d {req.end_date}</td>
                <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{req.reason}</td>
                
                {/* LOGIKA MENAMPILKAN TOMBOL BUKTI FOTO */}
                <td className="px-6 py-4">
                  {req.attachment_url ? (
                    <a 
                      href={supabase.storage.from('leave_attachments').getPublicUrl(req.attachment_url).data.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink size={14} /> Lihat File
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Tidak ada</span>
                  )}
                </td>

                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    req.status === 'approved' ? 'bg-green-100 text-green-700' :
                    req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {req.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {req.status === 'pending' && (
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handleDecision(req.id, 'approved')} 
                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-colors"
                        title="Setujui"
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        onClick={() => handleDecision(req.id, 'rejected')} 
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                        title="Tolak"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
