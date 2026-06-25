// FILE: src/components/VerseSelectorView.tsx

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Film, Search, Hash, RefreshCw } from 'lucide-react';
import { SurahItem, Reciter } from '../types';
import { IslamicStar, IslamicCornerOrnament, IslamicDivider } from './IslamicShapes';

import { QURAN_API_BASE_URL } from '../config/constants';

interface VerseSelectorViewProps {
  surah: SurahItem;
  reciters: Reciter[];
  selectedReciterId: number;
  setSelectedReciterId: (id: number) => void;
  onBack: () => void;
  onOpenStudio: (ayahFrom: number, ayahTo: number, reciterId: number) => void;
}

interface VerseData {
  number: number;
  text: string;
  translation: string;
}

const toArabicNumber = (n: number): string => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(n).split('').map(char => arabicDigits[parseInt(char, 10)]).join('');
};

export default function VerseSelectorView({ 
  surah, 
  reciters, 
  selectedReciterId, 
  setSelectedReciterId, 
  onBack, 
  onOpenStudio 
}: VerseSelectorViewProps) {
  const [verses, setVerses] = useState<VerseData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    async function loadVerses() {
      try {
        const arRes = await fetch(`${QURAN_API_BASE_URL}/verses/uthmani?chapter_number=${surah.id}`);
        const trRes = await fetch(`${QURAN_API_BASE_URL}/translations/20?chapter_number=${surah.id}`);
        if (!arRes.ok) throw new Error(`Verses request failed: ${arRes.status}`);
        if (!trRes.ok) throw new Error(`Translations request failed: ${trRes.status}`);
        const arJson = await arRes.json();
        const trJson = await trRes.json();

        if (active) {
          const compiled = (arJson.verses || []).map((v: any, i: number) => ({
            number: i + 1,
            text: v.text_uthmani || v.text || '',
            translation: (trJson.translations?.[i]?.text || '').replace(/<sup.*?<\/sup>/g, '').replace(/[\[\]]/g, '') || 'Translation unavailable'
          }));
          setVerses(compiled);
          setLoading(false);
        }
      } catch (err) {
        console.error('Verse load fail', err);
        if (active) {
          const fallback = Array.from({ length: surah.versesCount || 0 }, (_, i) => ({
            number: i + 1,
            text: `الآية الكريمة رقم ${i + 1} من سورة ${surah.nameAr}`,
            translation: `Verse ${i + 1} of Surah ${surah.nameEn}`
          }));
          setVerses(fallback);
          setLoading(false);
        }
      }
    }
    loadVerses();
    return () => { active = false; };
  }, [surah]);

  const handleSelectVerse = (id: number) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) updated.delete(id);
    else {
      if (updated.size >= 30) return alert('Maximum 30 verses allowed per generation.');
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const getSelectedRange = () => {
    if (selectedIds.size === 0) return { from: 1, to: 1 };
    const sorted = (Array.from(selectedIds) as number[]).sort((a, b) => a - b);
    return { from: sorted[0], to: sorted[sorted.length - 1] };
  };

  const { from, to } = getSelectedRange();

  const filteredVerses = verses.filter(v => 
    (v.text || '').includes(searchQuery) || 
    (v.translation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.number.toString() === searchQuery
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-12 md:py-20 animate-fade-in text-[var(--color-primary)]">
      {/* Header: Focused & Minimal */}
      <header className="border-b-2 border-[var(--color-primary)] pb-8 mb-12 flex flex-col md:flex-row justify-between items-end gap-6 relative">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 border-2 border-[var(--color-primary)] hover:bg-[var(--color-surface-dim)] transition-all shadow-[2px_2px_0px_0px_var(--color-primary)] active:shadow-none active:translate-y-[1px]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-40">Surah {String(surah.id).padStart(3, '0')}</span>
            <h1 className="font-serif italic text-4xl leading-none tracking-tight">{surah.nameAr} <span className="text-xl opacity-30 not-italic ml-2">/ {surah.nameEn}</span></h1>
          </div>
        </div>

        {/* Persistent Reciter dropdown selection */}
        {reciters.length > 0 && (
          <div className="flex flex-col gap-1 bg-[var(--color-surface-dim)] border border-[var(--color-primary)]/10 p-3 shadow-sm select-none shrink-0">
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] opacity-40">Recitation Sheikh</span>
            <select
              value={selectedReciterId}
              onChange={(e) => setSelectedReciterId(Number(e.target.value))}
              className="bg-white border border-[var(--color-primary)]/20 px-3 py-1.5 font-mono text-[11px] text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer min-w-[200px] font-bold"
            >
              {reciters.map(rec => (
                <option key={rec.id} value={rec.id}>
                  {rec.name_en} ({rec.name_ar})
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* Floating proceed bar at the bottom center when verses are selected */}
      {!loading && selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-6 animate-slide-up bg-white border-2 border-[var(--color-primary)] p-2.5 shadow-[6px_6px_0px_0px_var(--color-primary)]">
          <div className="text-right font-mono text-[9px] tracking-widest leading-tight px-4 select-none">
            <span className="opacity-40 block mb-1">SELECTED_RANGE</span>
            <span className="font-bold text-[var(--color-secondary)] underline decoration-2 underline-offset-4">AYAH {from} — {to}</span>
          </div>
          <button 
            onClick={() => onOpenStudio(from, to, selectedReciterId)} 
            className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-[var(--color-on-primary)] font-mono text-[11px] uppercase tracking-[0.25em] px-8 py-4 rounded-none flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm active:translate-y-[1px]"
          >
            <span>[PROCEED_TO_STUDIO]</span>
            <Film className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Metadata Bar */}
      {!loading && (
        <div className="flex flex-col md:flex-row items-center gap-6 mb-10 pb-6 border-b border-[var(--color-primary)]/10">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
            <input className="w-full bg-white border-2 border-[var(--color-primary)] pl-12 pr-4 py-3 font-mono text-xs text-[var(--color-primary)] focus:outline-none placeholder-[var(--color-primary)]/20 shadow-[2px_2px_0px_0px_var(--color-primary)]" placeholder="Search verses or keywords..." type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex items-center gap-4 bg-[var(--color-surface-dim)] border-2 border-[var(--color-primary)] px-6 py-2.5 font-mono text-[10px] uppercase tracking-widest font-bold">
            <Hash className="w-3.5 h-3.5" />
            <span>{surah.versesCount} TOTAL_VERSES</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-40">
          <RefreshCw className="w-10 h-10 animate-spin" />
          <p className="font-mono text-[10px] uppercase tracking-[0.4em]">Retrieving Manuscript Data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredVerses.map((ayah) => {
            const isSelected = selectedIds.has(ayah.number);
            return (
              <div key={ayah.number} onClick={() => handleSelectVerse(ayah.number)} className={`group p-8 border-2 transition-all cursor-pointer relative overflow-hidden flex items-start gap-8 ${isSelected ? 'bg-white border-[var(--color-primary)] shadow-[8px_8px_0px_0px_var(--color-primary)] scale-[1.01] z-10' : 'bg-[var(--color-surface-dim)] border-[var(--color-primary)]/10 hover:border-[var(--color-primary)]'}`}>
                {isSelected && <IslamicCornerOrnament position="top-right" className="w-32 h-32 -right-4 -top-4 opacity-[0.03]" />}
                
                <div className={`w-6 h-6 border-2 border-[var(--color-primary)] mt-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-[var(--color-primary)] text-white' : 'bg-white'}`}>
                  {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                </div>

                <div className="flex-1 flex flex-col gap-6">
                  <div className="flex justify-between items-start gap-10">
                    <p className="flex-1 text-right font-serif text-3xl sm:text-4xl leading-[1.8] text-[var(--color-primary)]" dir="rtl">{ayah.text}</p>
                    <span className="w-10 h-10 border-2 border-[var(--color-primary)] bg-white flex items-center justify-center font-mono text-xs font-bold shrink-0">{toArabicNumber(ayah.number)}</span>
                  </div>
                  <p className="font-sans text-[var(--color-primary)]/60 text-base leading-relaxed max-w-[80%] border-t border-[var(--color-primary)]/10 pt-4 italic">{ayah.translation}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
