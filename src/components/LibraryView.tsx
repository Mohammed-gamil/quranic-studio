// FILE: src/components/LibraryView.tsx

import React, { useState } from 'react';
import { Search, Play, UploadCloud, RefreshCw } from 'lucide-react';
import { SurahItem } from '../types';
import { IslamicStar, IslamicCornerOrnament, IslamicDivider } from './IslamicShapes';

interface LibraryViewProps {
  chapters: SurahItem[];
  loadingChapters: boolean;
  onSelectSurah: (surah: SurahItem) => void;
  onOpenImport: () => void;
}

export default function LibraryView({ chapters, loadingChapters, onSelectSurah, onOpenImport }: LibraryViewProps) {
  const [search, setSearch] = useState('');

  const filteredSuwar = chapters.filter(s =>
    s.nameEn.toLowerCase().includes(search.toLowerCase()) ||
    s.nameAr.includes(search)
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 md:py-20 animate-fade-in text-[var(--color-primary)]">
      {/* Header Section */}
      <header className="border-b-2 border-[var(--color-primary)] pb-6 md:pb-8 mb-8 md:mb-16 flex flex-col gap-4 relative">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-40">Divine Narrative Engine // v1.0.0</span>
          <h1 className="font-serif italic text-4xl md:text-5xl leading-none tracking-tight">Library Archive</h1>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] opacity-50 flex items-center gap-2">
            {loadingChapters ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-[var(--color-secondary)]" />
                <span>SYNCHRONIZING_SUWAR...</span>
              </>
            ) : (
              'ENGINE_READY'
            )}
          </div>
          
          <div className="relative w-full md:w-80">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-primary)]/40">
              <Search className="w-4 h-4" />
            </span>
            <input
              className="w-full bg-white border-2 border-[var(--color-primary)] py-3 px-4 pl-11 text-[var(--color-primary)] focus:outline-none font-mono text-xs placeholder-[var(--color-primary)]/30 shadow-[2px_2px_0px_0px_var(--color-primary)]"
              placeholder="Search chapters..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Featured Recitations & Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 mb-10 md:mb-20">
        
        <div className="lg:col-span-2">
          <h2 className="font-serif italic text-sm uppercase tracking-widest mb-4 md:mb-6 opacity-60 border-b border-[var(--color-primary)]/10 pb-2">§ Featured Recitations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            
            {/* Featured Item 1: Ar-Rahman */}
            <div 
              onClick={() => {
                const s = chapters.find(s => s.id === 55) || chapters[0];
                if (s) onSelectSurah(s);
              }}
              className="bg-white border-2 border-[var(--color-primary)] p-5 md:p-6 shadow-[6px_6px_0px_0px_rgba(20,20,20,0.1)] hover:shadow-[8px_8px_0px_0px_var(--color-primary)] hover:translate-y-[-2px] transition-all cursor-pointer group flex flex-col justify-between h-40 md:h-48 relative overflow-hidden"
            >
              <IslamicCornerOrnament position="top-right" className="w-24 h-24 -right-4 -top-4 opacity-[0.05]" />
              <div className="flex justify-between items-start w-full relative z-10">
                <div className="p-2.5 md:p-3 border-2 border-[var(--color-primary)] bg-[var(--color-surface-dim)] group-hover:bg-[var(--color-secondary)] group-hover:text-white transition-colors">
                  <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest border-2 border-[var(--color-primary)] bg-[var(--color-surface-dim)] px-2 py-1">04:32</span>
              </div>
              <div className="text-right relative z-10">
                <h3 className="text-xl md:text-2xl font-bold font-serif italic leading-none mb-1">سورة الرحمن</h3>
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">Mishary Alafasy</p>
              </div>
            </div>

            {/* Featured Item 2: Al-Kahf */}
            <div 
              onClick={() => {
                const s = chapters.find(s => s.id === 18) || chapters[0];
                if (s) onSelectSurah(s);
              }}
              className="bg-white border-2 border-[var(--color-primary)] p-5 md:p-6 shadow-[6px_6px_0px_0px_rgba(20,20,20,0.1)] hover:shadow-[8px_8px_0px_0px_var(--color-primary)] hover:translate-y-[-2px] transition-all cursor-pointer group flex flex-col justify-between h-40 md:h-48 relative overflow-hidden"
            >
              <IslamicCornerOrnament position="top-right" className="w-24 h-24 -right-4 -top-4 opacity-[0.05]" />
              <div className="flex justify-between items-start w-full relative z-10">
                <div className="p-2.5 md:p-3 border-2 border-[var(--color-primary)] bg-[var(--color-surface-dim)] group-hover:bg-[var(--color-secondary)] group-hover:text-white transition-colors">
                  <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest border-2 border-[var(--color-primary)] bg-[var(--color-surface-dim)] px-2 py-1">02:15</span>
              </div>
              <div className="text-right relative z-10">
                <h3 className="text-xl md:text-2xl font-bold font-serif italic leading-none mb-1">سورة الكهف</h3>
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">Verses 1-10</p>
              </div>
            </div>

          </div>
        </div>

        {/* Import Action Card */}
        <div className="lg:col-span-1">
          <h2 className="font-serif italic text-sm uppercase tracking-widest mb-4 md:mb-6 opacity-0 lg:block hidden">_</h2>
          <div 
            onClick={onOpenImport}
            className="h-36 lg:h-[calc(100%-48px)] bg-[var(--color-surface-dim)] border-2 border-dashed border-[var(--color-primary)] p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(20,20,20,0.05)] hover:shadow-[8px_8px_0px_0px_var(--color-primary)] hover:bg-white transition-all flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden"
          >
            <IslamicStar className="w-32 h-32 absolute -bottom-8 -left-8 opacity-[0.03] group-hover:rotate-45 transition-transform duration-700" />
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white border-2 border-[var(--color-primary)] flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform relative z-10 shadow-[4px_4px_0px_0px_var(--color-primary)]">
              <UploadCloud className="w-6 h-6 md:w-8 md:h-8 text-[var(--color-primary)]" />
            </div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] font-mono relative z-10">[IMPORT_STREAMS]</h3>
            <p className="text-[9px] font-mono uppercase tracking-widest opacity-40 text-center max-w-[160px] mt-2 relative z-10">Upload custom recitation files</p>
          </div>
        </div>

      </div>

      <IslamicDivider className="my-8 md:my-16 opacity-10" />

      {/* Grid of All Chapters */}
      <section className="w-full relative">
        <h2 className="font-serif italic text-sm uppercase tracking-widest mb-6 md:mb-8 opacity-60 border-b border-[var(--color-primary)]/10 pb-2">§ Index Database</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
          {filteredSuwar.map((surah) => (
            <div
              key={surah.id}
              onClick={() => onSelectSurah(surah)}
              className="bg-white border-2 border-[var(--color-primary)] p-4 md:p-5 hover:bg-[var(--color-surface-dim)] transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden shadow-[2px_2px_0px_0px_rgba(20,20,20,0.05)] hover:shadow-[4px_4px_0px_0px_var(--color-primary)] active:translate-y-[1px] active:shadow-none"
            >
              <IslamicStar className="w-12 h-12 absolute -right-2 -bottom-2 text-[var(--color-primary)] opacity-[0.03] pointer-events-none z-0 group-hover:scale-150 group-hover:rotate-12 transition-transform duration-500" />
              <div className="flex items-center gap-3 md:gap-4 text-left relative z-10">
                <div className="w-8 h-8 md:w-9 md:h-9 font-mono text-[10px] border-2 border-[var(--color-primary)] flex items-center justify-center shrink-0 bg-[var(--color-surface-dim)] font-bold">
                  {String(surah.id).padStart(2, '0')}
                </div>
                <div className="flex flex-col gap-0.5">
                  <h4 className="text-[11px] font-bold font-mono uppercase tracking-wider leading-none">{surah.nameEn}</h4>
                  <p className="text-[9px] opacity-40 font-mono tracking-tighter">{surah.versesCount} VERSES</p>
                </div>
              </div>
              <span className="font-serif italic text-xl md:text-2xl text-[var(--color-primary)] text-right pr-1 relative z-10">
                {surah.nameAr}
              </span>
            </div>
          ))}
          {filteredSuwar.length === 0 && (
            <div className="col-span-full py-20 text-center font-mono text-[10px] uppercase tracking-[0.4em] opacity-40 border-2 border-dashed border-[var(--color-primary)]/20">
              NO_RECORDS_MATCH_QUERY
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
