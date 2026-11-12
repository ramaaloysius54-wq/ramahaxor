// 1. Hitung Iuran BPJS Karyawan
export function calculateBPJS(baseSalary: number) {
  const bpjsKesehatan = Math.round(Math.min(baseSalary, 12000000) * 0.01);
  const bpjsTK = Math.round(baseSalary * 0.02) + Math.round(Math.min(baseSalary, 10042300) * 0.01);
  return { bpjsKesehatan, bpjsTK };
}

// 2. Hitung PPh 21 TER
export function calculatePPh21TER(grossSalary: number): number {
  // Buat "Tabel Tarif" berurutan dari yang terkecil
  const terRates = [
    { max: 5400000, rate: 0 },
    { max: 5650000, rate: 0.0025 },
    { max: 5950000, rate: 0.005 },
    { max: 6300000, rate: 0.0075 },
    { max: 6750000, rate: 0.01 },
    { max: 7500000, rate: 0.0125 },
    { max: 8550000, rate: 0.015 },
    { max: 9650000, rate: 0.02 },
    { max: 10050000, rate: 0.0225 },
    { max: 10350000, rate: 0.025 },
    { max: 10700000, rate: 0.03 },
    { max: 12500000, rate: 0.04 }
  ];

  // Cari tarif pertama yang cocok (grossSalary lebih kecil/sama dengan max)
  const matchedTier = terRates.find(tier => grossSalary <= tier.max);
  
  // Jika ketemu pakai ratenya, jika gajinya di atas 12,5jt (tidak ketemu), pakai 5% (0.05)
  const finalRate = matchedTier ? matchedTier.rate : 0.05;

  return Math.round(grossSalary * finalRate);
}

// 3. Hitung Lembur
export function calculateOvertime(baseSalary: number, totalOvertimeHours: number): number {
  return Math.round(totalOvertimeHours * (baseSalary / 173));
}
