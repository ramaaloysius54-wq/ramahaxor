import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, MapPin, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// PERBAIKAN: Hook Geolocation diintegrasikan ke sini agar mudah disetting Timeout & Anti Fake-GPS-nya
function useGeolocationWithAntiMock() {
  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    error: string | null;
    isMocked: boolean;
  }>({ latitude: null, longitude: null, accuracy: null, error: null, isMocked: false });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Browser tidak mendukung GPS.' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        let mocked = false;
        
        if (position.coords.accuracy <= 1.0) {
          mocked = true;
        }

        const timeDifference = Math.abs(Date.now() - position.timestamp);
        if (timeDifference > 60000) {
          mocked = true;
        }

        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          isMocked: mocked
        });
      },
      (error) => {
        let errorMsg = 'Gagal mengambil lokasi.';
        if (error.code === 1) errorMsg = 'Izin lokasi ditolak oleh Anda.';
        else if (error.code === 2) errorMsg = 'Lokasi tidak tersedia (Sinyal lemah).';
        else if (error.code === 3) errorMsg = 'Timeout: Sinyal GPS terlalu lama merespons.';
        
        setLocation(prev => ({ ...prev, error: errorMsg }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, 
        maximumAge: 0 
      }
    );
  }, []);

  return location;
}

export default function AttendanceCheckIn({ session }: { session: any }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const location = useGeolocationWithAntiMock();
  
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // ==========================================
  // FITUR BARU: STATE UNTUK MODE HADIR / PULANG
  // ==========================================
  const [attendanceMode, setAttendanceMode] = useState<'loading' | 'hadir' | 'pulang' | 'selesai'>('loading');
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);

  useEffect(() => {
    const checkAttendanceStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];

        // Cek data absen terakhir karyawan ini
        const { data, error } = await supabase
          .from('attendance_records')
          .select('id, date, check_in, check_out')
          .eq('employee_id', user.id)
          .order('check_in', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          if (!data.check_out) {
            // Jika ada data tapi jam keluar masih kosong -> Mode Pulang
            setAttendanceMode('pulang');
            setActiveRecordId(data.id);
          } else {
            // Jika sudah ada jam keluar, cek apakah itu absen hari ini
            if (data.date === today) {
              setAttendanceMode('selesai');
            } else {
              setAttendanceMode('hadir');
            }
          }
        } else {
          setAttendanceMode('hadir');
        }
      } catch (error) {
        setAttendanceMode('hadir'); // Fallback jika error/data belum ada
      }
    };
    checkAttendanceStatus();
  }, []);
  // ==========================================

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      alert('Gagal mengakses kamera. Pastikan izin telah diberikan.');
    }
  };

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhoto(dataUrl);
      
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  }, []);

  const resetPhoto = () => {
    setPhoto(null);
    startCamera();
  };

  const handleCheckIn = async () => {
    if (!photo) {
      alert('Foto selfie wajib ada sebelum Check-In.');
      return;
    }

    if (location.isMocked) {
      alert('PELANGGARAN: Sistem mendeteksi penggunaan Fake GPS / Lokasi Palsu. Absensi ditolak.');
      return;
    }

    // ==========================================
    // FITUR BARU: VALIDASI JAM KEHADIRAN & PULANG
    // ==========================================
    const currentHour = new Date().getHours();
    
    if (attendanceMode === 'hadir') {
      // Hadir: Boleh dari 06:00 sampai 09:59
      if (currentHour < 6 || currentHour > 9) {
        alert('❌ GAGAL: Waktu Absen Hadir hanya diperbolehkan mulai pukul 06:00 hingga 09:59 pagi.');
        return;
      }
    } else if (attendanceMode === 'pulang') {
      // Pulang: Boleh dari 17:00 sampai 06:59 (besok paginya)
      if (currentHour > 6 && currentHour < 17) {
        alert('❌ GAGAL: Waktu Absen Pulang hanya diperbolehkan mulai pukul 17:00 sore hingga 06:59 pagi.');
        return;
      }
    }
    // ==========================================

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Anda harus login terlebih dahulu.");
      
      const realUserId = user.id;

      // 1. Upload Foto
      const res = await fetch(photo);
      const blob = await res.blob();
      const fileName = `${realUserId}-${attendanceMode}-${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attendance_photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // 2. Simpan atau Update ke database tergantung Mode
      if (attendanceMode === 'hadir') {
        // INSERT (Membuat Data Baru untuk Absen Datang)
        const { error: dbError } = await supabase
          .from('attendance_records')
          .insert({
            employee_id: realUserId,
            date: new Date().toISOString().split('T')[0],
            check_in: new Date().toISOString(),
            photo_url: uploadData.path,
            latitude: location.latitude || null,
            longitude: location.longitude || null,
            gps_accuracy: location.accuracy || null,
            status: 'present'
          });

        if (dbError) throw dbError;

      } else if (attendanceMode === 'pulang') {
        // UPDATE (Memperbarui Data Tadi Pagi dengan Jam Pulang)
        const { error: dbError } = await supabase
          .from('attendance_records')
          .update({
            check_out: new Date().toISOString(),
            // Opsional: Jika tabel Anda punya kolom foto pulang, bisa dibuka komentar di bawah
            // photo_out_url: uploadData.path, 
          })
          .eq('id', activeRecordId);

        if (dbError) throw dbError;
      }

      // 3. Notifikasi WhatsApp
      try {
        const { data: empData } = await supabase.from('employees').select('full_name').eq('id', realUserId).single();
        const empName = empData?.full_name || 'Seorang Karyawan';

        const noWhatsappHRD = "088227142563"; 
        
        // Sesuaikan teks pesan WA dengan jenis absennya
        const statusTeks = attendanceMode === 'hadir' ? 'Check-In (Hadir)' : 'Check-Out (Pulang)';
        const pesanWA = `🚨 *NOTIFIKASI ABSENSI MASUK* 🚨\n\nNama: *${empName}*\nWaktu: ${new Date().toLocaleString('id-ID')}\nStatus: Berhasil ${statusTeks}.\n\nSilakan cek Dashboard HRD untuk melihat foto dan lokasi absensi.`;

        await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: {
            "Authorization": "W6WFTapyTqYoo5gMDa7V", 
          },
          body: new URLSearchParams({
            target: noWhatsappHRD,
            message: pesanWA,
            countryCode: "62" 
          }),
        });
      } catch (waError) {
        console.warn("Absensi berhasil, namun gagal kirim notif WA:", waError);
      }

      setSuccess(true);
    } catch (error: any) {
      // Penanganan Duplicate Constraint (Jika user menekan tombol berkali-kali)
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        alert('Anda sudah melakukan absensi untuk sesi ini.');
      } else {
        alert('Gagal Absensi: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Tampilan Jika Sedang Memuat Status Absen Awal
  if (attendanceMode === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center">
        <Loader2 size={40} className="animate-spin text-primary-600" />
        <p className="text-gray-500 font-medium">Memeriksa status absensi Anda...</p>
      </div>
    );
  }

  // Tampilan Jika Sudah Absen Keduanya (Hadir & Pulang) Hari Ini
  if (attendanceMode === 'selesai' || success) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 text-center bg-surface rounded-2xl shadow-soft">
        <CheckCircle size={64} className="text-green-500" />
        <h2 className="text-2xl font-bold text-gray-800">
          {success ? 'Absensi Berhasil!' : 'Selesai'}
        </h2>
        <p className="text-gray-500">
          {success 
            ? 'Waktu kehadiran Anda telah dicatat oleh sistem.' 
            : 'Anda sudah menyelesaikan absensi Hadir dan Pulang untuk hari ini. Selamat beristirahat!'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-surface rounded-3xl p-6 shadow-soft pb-24">
      <div className="text-center mb-6">
        {/* Teks Judul Menyesuaikan Mode */}
        <h2 className="text-2xl font-bold text-gray-800">
          {attendanceMode === 'hadir' ? 'Absensi Hadir' : 'Absensi Pulang'}
        </h2>
        <p className="text-sm text-gray-500">Ambil foto selfie di lokasi kerja</p>
      </div>

      {/* GPS Status Card */}
      <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${location.isMocked ? 'bg-red-50 text-red-700' : location.latitude ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
        {location.isMocked ? <AlertTriangle size={24} /> : <MapPin size={24} />}
        <div className="text-sm">
          {location.isMocked ? (
            <>
              <p className="font-bold text-red-600">Aplikasi Fake GPS Terdeteksi!</p>
              <p className="text-xs opacity-90">Harap matikan lokasi palsu Anda.</p>
            </>
          ) : location.error ? (
            <p className="font-semibold text-red-600">{location.error}</p>
          ) : location.latitude ? (
            <>
              <p className="font-semibold">Lokasi Terkunci</p>
              <p className="text-xs opacity-80">Akurasi: {Math.round(location.accuracy || 0)} meter</p>
            </>
          ) : (
            <p className="font-semibold">Mencari lokasi GPS...</p>
          )}
        </div>
      </div>

      {/* Camera / Photo Preview Area */}
      <div className="relative w-full aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden shadow-inner mb-6">
        {photo ? (
          <img src={photo} alt="Selfie Absensi" className="w-full h-full object-cover" />
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {!isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button onClick={startCamera} className="bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-transform hover:scale-105">
                  <Camera size={32} />
                </button>
              </div>
            )}
          </>
        )}
        {/* Hidden Canvas untuk merender gambar dari Video */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Action Buttons */}
      {photo ? (
        <div className="flex gap-4">
          <button onClick={resetPhoto} disabled={loading} className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
            Ulangi Foto
          </button>
          <button onClick={handleCheckIn} disabled={loading || location.isMocked} className={`flex-1 py-3 px-4 rounded-xl font-medium text-white ${attendanceMode === 'hadir' ? 'bg-primary-600 hover:bg-primary-700' : 'bg-orange-500 hover:bg-orange-600'} disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-soft`}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : (attendanceMode === 'hadir' ? 'Kirim Absen Hadir' : 'Kirim Absen Pulang')}
          </button>
        </div>
      ) : (
        <button 
          onClick={capturePhoto} 
          disabled={!isCameraActive || location.isMocked} 
          className="w-full py-4 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-soft"
        >
          Ambil Foto Selfie
        </button>
      )}
    </div>
  );
}
