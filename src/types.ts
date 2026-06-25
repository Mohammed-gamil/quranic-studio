// FILE: src/types.ts

export interface SurahItem {
  id: number;
  nameEn: string;
  nameAr: string;
  versesCount: number;
}

export interface Reciter {
  id: number;
  name_ar: string;
  name_en: string;
  mp3quran_id: number;
  moshaf_type: string;
}

export interface GenerationHistoryRow {
  id: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  reciter_id: number;
  format: 'vertical' | 'horizontal';
  background_query: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  output_path: string | null;
  preview_url?: string | null;
  error_msg: string | null;
  duration_ms: number | null;
  file_size_bytes: number | null;
  created_at: string;
  updated_at: string;
}

export const SURAH_LIST: SurahItem[] = [
  { id: 1, nameEn: 'Al-Fatihah', nameAr: 'الفاتحة', versesCount: 7 },
  { id: 2, nameEn: 'Al-Baqarah', nameAr: 'البقرة', versesCount: 286 },
  { id: 3, nameEn: 'Ali \'Imran', nameAr: 'آل عمران', versesCount: 200 },
  { id: 4, nameEn: 'An-Nisa', nameAr: 'النساء', versesCount: 176 },
  { id: 5, nameEn: 'Al-Ma\'idah', nameAr: 'المائدة', versesCount: 120 },
  { id: 6, nameEn: 'Al-An\'am', nameAr: 'الأنعام', versesCount: 165 },
  { id: 7, nameEn: 'Al-A\'raf', nameAr: 'الأعراف', versesCount: 206 },
  { id: 8, nameEn: 'Al-Anfal', nameAr: 'الأنفال', versesCount: 75 },
  { id: 9, nameEn: 'At-Tawbah', nameAr: 'التوبة', versesCount: 129 },
  { id: 10, nameEn: 'Yunus', nameAr: 'يونس', versesCount: 109 },
  { id: 12, nameEn: 'Yusuf', nameAr: 'يوسف', versesCount: 111 },
  { id: 18, nameEn: 'Al-Kahf', nameAr: 'الكهف', versesCount: 110 },
  { id: 19, nameEn: 'Maryam', nameAr: 'مريم', versesCount: 98 },
  { id: 20, nameEn: 'Taha', nameAr: 'طه', versesCount: 135 },
  { id: 36, nameEn: 'Yaseen', nameAr: 'يس', versesCount: 83 },
  { id: 55, nameEn: 'Ar-Rahman', nameAr: 'الرحمن', versesCount: 78 },
  { id: 56, nameEn: 'Al-Waqi\'ah', nameAr: 'الواقعة', versesCount: 96 },
  { id: 67, nameEn: 'Al-Mulk', nameAr: 'الملك', versesCount: 30 },
  { id: 78, nameEn: 'An-Naba', nameAr: 'النبأ', versesCount: 40 },
  { id: 112, nameEn: 'Al-Ikhlas', nameAr: 'الإخلاص', versesCount: 4 },
  { id: 113, nameEn: 'Al-Falaq', nameAr: 'الفلق', versesCount: 5 },
  { id: 114, nameEn: 'An-Nas', nameAr: 'الناس', versesCount: 6 }
];
