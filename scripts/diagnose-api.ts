import axios from 'axios';

async function diagnose() {
  try {
    const s1 = await axios.get('https://www.mp3quran.net/api/v3/ayat_timing?surah=1&read=118');
    const s2 = await axios.get('https://www.mp3quran.net/api/v3/ayat_timing?surah=2&read=118');
    
    const t1 = s1.data;
    const t2 = s2.data;

    console.log('Surah 1 (Al-Fatihah) first 3 ayahs:', t1.slice(0, 3).map((a: any) => a.ayah));
    console.log('Surah 2 (Al-Baqarah) first 3 ayahs:', t2.slice(0, 3).map((a: any) => a.ayah));
    
    // Check if Surah 1 has ayah 0, and if it has 7 ayahs total.
    console.log('Surah 1 total ayahs listed:', t1.length);
    console.log('Surah 1 last ayah number:', t1[t1.length - 1].ayah);
    
  } catch (err) {
    console.error(err);
  }
}
diagnose();
