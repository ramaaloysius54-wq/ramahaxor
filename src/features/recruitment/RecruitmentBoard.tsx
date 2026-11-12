import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  FileSearch, UserPlus, CheckCircle, Clock, 
  MessageCircle, XCircle, Link as LinkIcon, 
  MoreVertical, UploadCloud, Cpu, Sparkles, Building2, User
} from 'lucide-react';

export default function RecruitmentBoard() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // State untuk form tambah kandidat
  const [newCandidate, setNewCandidate] = useState({
    full_name: '', email: '', phone: '', position: '', expected_keywords: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Real-time subscription
    const channel = supabase.channel('candidates_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => {
        fetchCandidates();
      })
      .subscribe();

    fetchCandidates();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchCandidates = async () => {
    const { data } = await supabase.from('candidates').select('*, cv_screening_results(*)');
    if (data) setCandidates(data);
  };

  // 1. Fungsi Simulasi AI Screening (Mencocokkan Keyword)
  const simulateScreening = async (candidateId: string) => {
    const mockScore = Math.floor(Math.random() * (100 - 40 + 1)) + 40; 
    
    await supabase.from('cv_screening_results').upsert({
      candidate_id: candidateId,
      match_score: mockScore,
      matched_skills: 'React, Node.js, Problem Solving',
      missing_skills: 'Docker, CI/CD',
      ai_analysis_status: 'completed'
    });

    const newStage = mockScore > 70 ? 'passed_screening' : 'rejected';
    await supabase.from('candidates').update({ stage: newStage }).eq('id', candidateId);
  };

  // 2. Fungsi Pindah Status (Hire / Tolak)
  const updateCandidateStage = async (id: string, stage: string) => {
    const confirmMsg = stage === 'hired' ? 'Apakah Anda yakin ingin MENERIMA kandidat ini?' : 'Tolak kandidat ini?';
    if (!window.confirm(confirmMsg)) return;

    await supabase.from('candidates').update({ stage }).eq('id', id);
  };

  // 3. Fungsi Chat WhatsApp
  const openWhatsApp = (phone: string, name: string) => {
    if (!phone) {
      alert('Kandidat ini belum mencantumkan nomor HP.');
      return;
    }
    // Ubah 08 menjadi 628
    const formattedPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;
    const text = encodeURIComponent(`Halo ${name}, kami dari HRD PT Rama Cinta Sejati. Mengenai lamaran kerja Anda...`);
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  // 4. Copy URL Pendaftaran
  const copyFormLink = () => {
    // Anggap Anda akan membuat halaman rute /apply nanti
    const url = window.location.origin + '/apply';
    navigator.clipboard.writeText(url);
    alert('Link Formulir Pendaftaran berhasil disalin!\n\n' + url + '\n\nSilakan bagikan link ini ke sosmed atau pelamar.');
  };

  // 5. Tambah Kandidat Manual
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('candidates').insert({
        full_name: newCandidate.full_name,
        email: newCandidate.email,
        phone: newCandidate.phone,
        position: newCandidate.position,
        stage: 'applied'
      });
      
      if (error) throw error;
      
      setShowAddModal(false);
      setNewCandidate({ full_name: '', email: '', phone: '', position: '', expected_keywords: '' });
      fetchCandidates();
    } catch (error: any) {
      alert('Gagal menambah: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 flex flex-col h-[calc(100vh-100px)]">
      
      {/* Header Premium */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Cpu className="text-primary-600" /> ATS Recruitment
          </h2>
          <p className="text-sm text-gray-500 mt-1">Kelola jalur pelamar dengan AI Screening & WhatsApp Terintegrasi.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button onClick={copyFormLink} className="flex-1 lg:flex-none items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-gray-200 flex">
            <LinkIcon size={16} /> Salin URL Pendaftaran
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex-1 lg:flex-none items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-primary-500/20 active:scale-95 flex">
            <UploadCloud size={18} /> Upload CV / Tambah
          </button>
        </div>
      </div>

      {/* KANBAN BOARD AREA */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max h-full items-start px-1">
          
          {/* KOLOM 1: LAMARAN BARU */}
          <div className="w-80 flex flex-col bg-gray-50/80 rounded-2xl border border-gray-200/60 h-full max-h-full">
            <div className="p-4 border-b border-gray-200/60 bg-gray-100/50 rounded-t-2xl">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Clock size={16} className="text-blue-500" /> Lamaran Masuk 
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full ml-auto">
                  {candidates.filter(c => c.stage === 'applied').length}
                </span>
              </h3>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">
              {candidates.filter(c => c.stage === 'applied').map(cand => (
                <div key={cand.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900 text-sm leading-tight">{cand.full_name}</h4>
                    <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-1 rounded-md">{cand.position || 'Pelamar'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">{cand.email}</p>
                  
                  <button onClick={() => simulateScreening(cand.id)} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-600 border border-indigo-100 text-xs py-2 rounded-lg hover:from-blue-100 hover:to-indigo-100 font-bold transition-colors">
                    <Sparkles size={14} /> AI Screening CV
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* KOLOM 2: LOLOS SCREENING */}
          <div className="w-80 flex flex-col bg-amber-50/40 rounded-2xl border border-amber-100 h-full max-h-full">
            <div className="p-4 border-b border-amber-100 bg-amber-50/60 rounded-t-2xl">
              <h3 className="font-bold text-amber-800 flex items-center gap-2">
                <CheckCircle size={16} className="text-amber-500" /> Lolos Screening
                <span className="bg-amber-200/50 text-amber-700 text-xs px-2 py-0.5 rounded-full ml-auto">
                  {candidates.filter(c => c.stage === 'passed_screening').length}
                </span>
              </h3>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">
              {candidates.filter(c => c.stage === 'passed_screening').map(cand => (
                <div key={cand.id} className="bg-white p-4 rounded-xl shadow-sm border border-amber-200 hover:shadow-md transition-all relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                  
                  <h4 className="font-bold text-gray-900 text-sm leading-tight mb-1">{cand.full_name}</h4>
                  <p className="text-xs text-gray-500 mb-3">{cand.position || 'Pelamar'}</p>
                  
                  {cand.cv_screening_results?.[0] && (
                    <div className="bg-green-50 border border-green-100 rounded-lg p-2 mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-green-700 uppercase">Match Score</span>
                        <span className="text-xs font-extrabold text-green-600">{cand.cv_screening_results[0].match_score}%</span>
                      </div>
                      <p className="text-[10px] text-gray-600 line-clamp-1">✅ {cand.cv_screening_results[0].matched_skills}</p>
                    </div>
                  )}
                  
                  {/* Tombol Aksi Lanjutan */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={() => updateCandidateStage(cand.id, 'hired')} className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 border border-emerald-100 text-[11px] py-1.5 rounded-lg font-bold transition-colors">
                      <CheckCircle size={12} /> Hire
                    </button>
                    <button onClick={() => updateCandidateStage(cand.id, 'rejected')} className="flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 border border-rose-100 text-[11px] py-1.5 rounded-lg font-bold transition-colors">
                      <XCircle size={12} /> Tolak
                    </button>
                  </div>
                  
                  <button onClick={() => openWhatsApp(cand.phone, cand.full_name)} className="w-full flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-[11px] py-1.5 rounded-lg font-bold transition-colors shadow-sm">
                    <MessageCircle size={12} /> Chat via WhatsApp
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* KOLOM 3: DITERIMA (HIRED) */}
          <div className="w-80 flex flex-col bg-emerald-50/40 rounded-2xl border border-emerald-100 h-full max-h-full">
            <div className="p-4 border-b border-emerald-100 bg-emerald-50/60 rounded-t-2xl">
              <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                <Building2 size={16} className="text-emerald-500" /> Diterima (Hired)
                <span className="bg-emerald-200/50 text-emerald-700 text-xs px-2 py-0.5 rounded-full ml-auto">
                  {candidates.filter(c => c.stage === 'hired').length}
                </span>
              </h3>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">
              {candidates.filter(c => c.stage === 'hired').map(cand => (
                <div key={cand.id} className="bg-white p-4 rounded-xl shadow-sm border border-emerald-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <h4 className="font-bold text-gray-900 text-sm leading-tight">{cand.full_name}</h4>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">Siap Onboarding</p>
                </div>
              ))}
            </div>
          </div>

          {/* KOLOM 4: DITOLAK */}
          <div className="w-80 flex flex-col bg-red-50/40 rounded-2xl border border-red-100 h-full max-h-full">
            <div className="p-4 border-b border-red-100 bg-red-50/60 rounded-t-2xl">
              <h3 className="font-bold text-red-800 flex items-center gap-2">
                <XCircle size={16} className="text-red-500" /> Ditolak
                <span className="bg-red-200/50 text-red-700 text-xs px-2 py-0.5 rounded-full ml-auto">
                  {candidates.filter(c => c.stage === 'rejected').length}
                </span>
              </h3>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">
              {candidates.filter(c => c.stage === 'rejected').map(cand => (
                <div key={cand.id} className="bg-white p-3 rounded-xl shadow-sm border border-red-100 opacity-60">
                  <h4 className="font-bold text-gray-600 text-sm leading-tight">{cand.full_name}</h4>
                  <p className="text-[10px] text-red-500 mt-1">Tidak memenuhi kriteria</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL TAMBAH KANDIDAT & UPLOAD CV */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Input Data Pelamar</h3>
                <p className="text-blue-100 text-xs mt-1">Tambahkan profil kandidat dan upload CV</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
                <XCircle size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddCandidate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Nama Lengkap</label>
                  <input required type="text" value={newCandidate.full_name} onChange={e => setNewCandidate({...newCandidate, full_name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Budi Santoso" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Posisi / Lowongan</label>
                  <input required type="text" value={newCandidate.position} onChange={e => setNewCandidate({...newCandidate, position: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Frontend Dev" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Email</label>
                  <input required type="email" value={newCandidate.email} onChange={e => setNewCandidate({...newCandidate, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="budi@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">No. WhatsApp</label>
                  <input required type="text" value={newCandidate.phone} onChange={e => setNewCandidate({...newCandidate, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="081234..." />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Upload Berkas CV (PDF)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer relative">
                  <UploadCloud size={32} className="mb-2 text-blue-500" />
                  <p className="text-sm font-semibold">Klik untuk memilih file CV</p>
                  <p className="text-xs">Maksimal 5MB (PDF)</p>
                  {/* File input (hanya visual UI untuk MVP) */}
                  <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Target Keyword (Untuk AI Screening)</label>
                <input type="text" value={newCandidate.expected_keywords} onChange={e => setNewCandidate({...newCandidate, expected_keywords: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Contoh: React, TypeScript, API" />
              </div>

              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Pelamar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
