import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UploadCloud, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const announcementSchema = z.object({
  title: z.string().min(5, 'Judul minimal 5 karakter'),
  category: z.string().min(2, 'Kategori wajib diisi'),
  content: z.string().min(10, 'Isi berita terlalu singkat'),
  is_published: z.boolean(),
  is_important: z.boolean(),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

export default function AnnouncementForm({ session }: { session?: any }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { is_published: false, is_important: false }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const onSubmit = async (data: AnnouncementFormData) => {
    setIsSubmitting(true);
    try {
      let bannerUrl = null;

      // 1. Upload Banner ke Storage jika ada
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('announcement_banners')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        // Ambil Public URL
        const { data: publicUrlData } = supabase.storage
          .from('announcement_banners')
          .getPublicUrl(uploadData.path);
          
        bannerUrl = publicUrlData.publicUrl;
      }

      // 2. Simpan ke database
      const { error: dbError } = await supabase.from('announcements').insert({
        title: data.title,
        category: data.category,
        content: data.content,
        is_published: data.is_published,
        is_important: data.is_important,
        banner_url: bannerUrl,
        author_id: session?.user?.id || null // Opsional, sesuaikan dengan sesi auth
      });

      if (dbError) throw dbError;
      
      alert('Pengumuman berhasil disimpan!');
      reset();
      setFile(null);
      setPreview(null);
    } catch (error: any) {
      alert('Gagal menyimpan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl bg-surface rounded-2xl p-6 shadow-soft space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Buat Pengumuman Baru</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Pengumuman</label>
            <input {...register('title')} className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:ring-1 focus:ring-primary-500 outline-none" placeholder="Misal: Libur Nasional..." />
            {errors.title && <span className="text-xs text-red-500">{errors.title.message}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select {...register('category')} className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:ring-1 focus:ring-primary-500 outline-none">
              <option value="Umum">Umum</option>
              <option value="Kebijakan">Kebijakan Baru</option>
              <option value="Event">Event Perusahaan</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Banner Gambar (Opsional)</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <UploadCloud size={20} className="text-gray-500" />
              <span className="text-sm text-gray-600">Upload Banner</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          {preview && (
            <div className="mt-4 rounded-xl overflow-hidden border border-gray-100 relative h-48 w-full">
              <img src={preview} alt="Preview" className="object-cover w-full h-full" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Isi Berita</label>
          <textarea {...register('content')} rows={6} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:ring-1 focus:ring-primary-500" placeholder="Tulis isi pengumuman di sini..." />
          {errors.content && <span className="text-xs text-red-500">{errors.content.message}</span>}
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" {...register('is_important')} className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4" />
            Tandai Penting (Highlight)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" {...register('is_published')} className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4" />
            Langsung Publikasikan
          </label>
        </div>

        <button type="submit" disabled={isSubmitting} className="flex justify-center items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-soft font-medium">
          {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Simpan Berita
        </button>
      </form>
    </div>
  );
}
