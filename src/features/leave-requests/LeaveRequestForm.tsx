import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UploadCloud, Save, Loader2, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const leaveSchema = z.object({
  leave_type: z.enum(['personal', 'sick', 'annual', 'other']),
  start_date: z.string().min(1, 'Tanggal mulai wajib diisi'),
  end_date: z.string().min(1, 'Tanggal selesai wajib diisi'),
  reason: z.string().min(5, 'Berikan alasan yang jelas (min. 5 karakter)'),
});

type LeaveFormData = z.infer<typeof leaveSchema>;

export default function LeaveRequestForm({ session: _session }: { session?: any }) {

  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<LeaveFormData>({
    resolver: zodResolver(leaveSchema),
  });

  const onSubmit = async (data: LeaveFormData) => {
    setIsSubmitting(true);
    try {
      // PERBAIKAN: Mengambil ID Karyawan langsung dari Supabase agar tidak terjadi error UUID
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (authError || !userId) {
        throw new Error('Gagal memverifikasi sesi. Silakan muat ulang halaman.');
      }

      let attachmentUrl = null;

      // Upload file jika ada
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('leave_attachments')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        attachmentUrl = uploadData.path;
      }

      // Insert ke database menggunakan userId yang sudah divalidasi
      const { error: dbError } = await supabase.from('leave_requests').insert({
        employee_id: userId,
        leave_type: data.leave_type,
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason,
        attachment_url: attachmentUrl,
        status: 'pending'
      });

      if (dbError) throw dbError;
      
      alert('Pengajuan berhasil dikirim dan menunggu persetujuan HRD.');
      reset();
      setFile(null);
    } catch (error: any) {
      alert('Terjadi kesalahan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl bg-surface rounded-2xl p-6 shadow-soft">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Form Pengajuan Izin / Cuti</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Pengajuan</label>
          <select {...register('leave_type')} className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:ring-1 focus:ring-primary-500 outline-none">
            <option value="annual">Cuti Tahunan</option>
            <option value="sick">Sakit</option>
            <option value="personal">Izin Pribadi</option>
            <option value="other">Lainnya</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
            <input type="date" {...register('start_date')} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:ring-1 focus:ring-primary-500" />
            {errors.start_date && <span className="text-xs text-red-500">{errors.start_date.message}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
            <input type="date" {...register('end_date')} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:ring-1 focus:ring-primary-500" />
            {errors.end_date && <span className="text-xs text-red-500">{errors.end_date.message}</span>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alasan</label>
          <textarea {...register('reason')} rows={3} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:ring-1 focus:ring-primary-500" placeholder="Jelaskan alasan secara singkat..." />
          {errors.reason && <span className="text-xs text-red-500">{errors.reason.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lampiran (Opsional, Wajib untuk Sakit)</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <UploadCloud size={20} className="text-gray-500" />
              <span className="text-sm text-gray-600">Pilih File (JPG/PDF)</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            {file && (
              <span className="text-sm flex items-center gap-1 text-primary-600">
                <FileText size={16} /> {file.name}
              </span>
            )}
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-2 bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-soft font-medium">
          {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Kirim Pengajuan
        </button>
      </form>
    </div>
  );
}
