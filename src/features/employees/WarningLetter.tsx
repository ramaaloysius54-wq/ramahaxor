import { useRef } from 'react';
import { AlertOctagon, Download, FileEdit, Info } from 'lucide-react';

export default function WarningLetter() {
  const editorRef = useRef<HTMLDivElement>(null);

  // Fungsi untuk merubah HTML yang diedit menjadi file Microsoft Word (.doc)
  const exportToWord = () => {
    if (!editorRef.current) return;

    // Header khusus agar dikenali MS Word dengan rapi
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Surat Peringatan</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + editorRef.current.innerHTML + footer;

    // Convert ke format Blob Word (.doc)
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `Surat_Peringatan_PTRamaCintaSejati.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  const todayDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-5xl mx-auto px-2 sm:px-4">
      
      {/* Header Premium (Responsif: numpuk di HP, sejajar di PC) */}
      <div className="bg-gradient-to-r from-rose-700 to-red-600 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-lg relative overflow-hidden mb-6 sm:mb-8">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div className="w-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shrink-0"><AlertOctagon size={24} /></div>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">Surat Peringatan (Editor Word)</h1>
            </div>
            <p className="text-rose-100 text-xs sm:text-sm flex items-start sm:items-center gap-1.5 mt-2">
              <FileEdit size={16} className="shrink-0 mt-0.5 sm:mt-0" /> 
              Klik teks mana saja pada kertas di bawah untuk mengedit secara langsung.
            </p>
          </div>
          <button 
            onClick={exportToWord} 
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-white text-rose-600 px-6 py-3 rounded-xl font-bold hover:bg-rose-50 transition-colors shadow-md active:scale-95 shrink-0"
          >
            <Download size={18} /> Ekspor ke Word
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6 sm:mb-8 flex gap-3 text-blue-700 text-xs sm:text-sm">
        <Info size={20} className="shrink-0" />
        <p>
          <strong>Tips:</strong> Anda bisa memblok teks, menghapusnya, atau mengetik langsung layaknya Microsoft Word di HP maupun PC. Klik <b>Ekspor ke Word</b> jika sudah selesai.
        </p>
      </div>

      {/* KERTAS HVS VIRTUAL (Responsif & Bisa Diedit) */}
      <div className="bg-gray-100 p-3 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] border border-gray-200 overflow-x-auto shadow-inner flex justify-center w-full">
        
        <div 
          ref={editorRef}
          contentEditable={true}
          suppressContentEditableWarning={true} 
          // Penyesuaian class responsif: lebar 100% di HP, batas max ukuran A4 di PC, padding menyesuaikan layar
          className="bg-white p-6 sm:p-10 md:p-12 shadow-xl outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-4 rounded-sm transition-all w-full max-w-[21cm]"
          style={{ 
            minHeight: "29.7cm", // Tinggi minimal seperti A4
            fontFamily: "'Times New Roman', Times, serif", 
            color: "#000", 
            fontSize: "12pt", 
            lineHeight: "1.5",
            cursor: "text"
          }}
        >
          {/* Kop Surat PT Rama Cinta Sejati */}
          <div style={{ textAlign: "center", borderBottom: "3px solid #000", paddingBottom: "10px", marginBottom: "20px" }}>
            <h1 style={{ margin: "0", fontSize: "16pt", fontWeight: "bold", textTransform: "uppercase" }}>PT RAMA CINTA SEJATI</h1>
            <p style={{ margin: "0", fontSize: "11pt" }}>Jln Raya Timur Singaparna Kp Sindanglaya RT02/RW02</p>
            <p style={{ margin: "0", fontSize: "11pt" }}>Email: ramaaloysius12@ramahaxor.my.id</p>
          </div>

          {/* Judul Surat */}
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <h2 style={{ margin: "0", fontSize: "14pt", fontWeight: "bold", textDecoration: "underline", textTransform: "uppercase" }}>
              SURAT PERINGATAN I (PERTAMA)
            </h2>
            <p style={{ margin: "0", fontSize: "12pt" }}>Nomor: 001/HRD-SP/XI/2026</p>
          </div>

          {/* Isi Surat */}
          <div style={{ textAlign: "justify" }}>
            <p>Surat Peringatan ini ditujukan kepada:</p>
            
            <table style={{ width: "100%", marginBottom: "20px" }}>
              <tbody>
                <tr>
                  <td style={{ width: "90px", padding: "3px 0", verticalAlign: "top" }}>Nama</td>
                  <td style={{ width: "15px", verticalAlign: "top" }}>:</td>
                  <td><strong>[Ketik Nama Karyawan Di Sini]</strong></td>
                </tr>
                <tr>
                  <td style={{ padding: "3px 0", verticalAlign: "top" }}>NIK</td>
                  <td style={{ verticalAlign: "top" }}>:</td>
                  <td>[Ketik NIK]</td>
                </tr>
                <tr>
                  <td style={{ padding: "3px 0", verticalAlign: "top" }}>Jabatan</td>
                  <td style={{ verticalAlign: "top" }}>:</td>
                  <td>[Ketik Jabatan]</td>
                </tr>
              </tbody>
            </table>

            <p>
              Melalui surat ini, Perusahaan memberikan <strong>Surat Peringatan I (Pertama)</strong> kepada Saudara/i atas tindakan pelanggaran peraturan tata tertib perusahaan yang terjadi pada tanggal <strong>[Tanggal Pelanggaran]</strong>.
            </p>

            <p>Adapun bentuk pelanggaran yang Saudara/i lakukan adalah sebagai berikut:</p>
            
            {/* Area Deskripsi Pelanggaran */}
            <div style={{ padding: "10px", marginBottom: "20px", fontStyle: "italic", border: "1px solid transparent" }}>
              [Silakan hapus teks ini dan ketik alasan pelanggaran di sini. Contoh: Tidak masuk kerja selama 3 hari berturut-turut tanpa memberikan keterangan yang sah kepada pihak HRD maupun atasan langsung.]
            </div>

            <p>
              Surat peringatan ini diterbitkan sebagai bentuk teguran agar Saudara/i dapat memperbaiki kedisiplinan dan kinerja, serta tidak mengulangi kesalahan yang sama di masa mendatang. Apabila Saudara/i kembali melakukan pelanggaran, maka Perusahaan akan mengambil tindakan sanksi yang lebih tegas sesuai dengan peraturan yang berlaku, hingga berujung pada Pemutusan Hubungan Kerja (PHK).
            </p>

            <p>Demikian surat peringatan ini dibuat untuk dapat diperhatikan dan dilaksanakan sebagaimana mestinya.</p>
          </div>

          {/* Tanda Tangan - Diubah menjadi format Tabel agar tidak berantakan di MS Word & HP */}
          <table style={{ width: "100%", marginTop: "50px", textAlign: "center", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ width: "50%", paddingBottom: "70px", verticalAlign: "top" }}>
                  Penerima Peringatan,
                </td>
                <td style={{ width: "50%", paddingBottom: "70px", verticalAlign: "top" }}>
                  Tasikmalaya, {todayDate}
                  <br />
                  Yang Membuat,
                </td>
              </tr>
              <tr>
                <td style={{ verticalAlign: "bottom" }}>
                  <strong><u>[Nama Karyawan]</u></strong>
                  <br />Karyawan
                </td>
                <td style={{ verticalAlign: "bottom" }}>
                  <strong><u>[Nama HRD]</u></strong>
                  <br />HRD Department
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
      
    </div>
  );
}
