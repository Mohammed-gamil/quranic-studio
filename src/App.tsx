// FILE: src/App.tsx

import React, { useState, useEffect } from 'react';
import { User, Settings, Globe, ShieldCheck, Database, Layers, CloudLightning, MessageSquare, Play, Video, Terminal } from 'lucide-react';
import { SurahItem, SURAH_LIST, Reciter } from './types';
import LibraryView from './components/LibraryView';
import VerseSelectorView from './components/VerseSelectorView';
import StudioView from './components/StudioView';
import { IslamicStar, IslamicPatternBackground, IslamicDivider } from './components/IslamicShapes';

import { QURAN_API_BASE_URL } from './config/constants';

type AppView = 'library' | 'selector' | 'studio';

export default function App() {
  const [view, setView] = useState<AppView>('library');
  const [selectedSurah, setSelectedSurah] = useState<SurahItem | null>(null);
  const [ayahFrom, setAyahFrom] = useState<number>(1);
  const [ayahTo, setAyahTo] = useState<number>(7);
  const [selectedReciterId, setSelectedReciterId] = useState<number>(7);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [chapters, setChapters] = useState<SurahItem[]>([]);
  const [loadingChapters, setLoadingChapters] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChapters() {
      try {
        const res = await fetch(`${QURAN_API_BASE_URL}/chapters?language=ar`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError("Oops, we haven't got JSON!");
        }
        const data = await res.json();
        if (data.chapters) {
          const mapped = data.chapters.map((ch: any) => ({
            id: ch.id,
            nameEn: ch.name_complex,
            nameAr: ch.name_arabic,
            versesCount: ch.verses_count,
            revelationPlace: ch.revelation_place
          }));
          setChapters(mapped);
        }
      } catch (err) {
        console.error('Failed to load chapters', err);
        setChapters(SURAH_LIST);
      } finally {
        setLoadingChapters(false);
      }
    }
    fetchChapters();
  }, []);

  useEffect(() => {
    async function fetchReciters() {
      try {
        const res = await fetch('/api/reciters');
        const json = await res.json();
        if (json.success) setReciters(json.data);
      } catch (e) {
        console.error('Failed to load reciters globally', e);
      }
    }
    fetchReciters();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleSelectSurah = (surah: SurahItem) => {
    setSelectedSurah(surah);
    setView('selector');
  };

  const handleOpenStudio = (from: number, to: number, reciterId: number) => {
    setAyahFrom(from);
    setAyahTo(to);
    setSelectedReciterId(reciterId);
    setView('studio');
  };

  const handleBackToLibrary = () => {
    setView('library');
    setSelectedSurah(null);
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-primary)] flex flex-col font-sans relative selection:bg-[var(--color-secondary)] selection:text-white antialiased overflow-x-hidden">
      <IslamicPatternBackground />
      
      {/* GLOBAL HEADER BAR: Sacred Minimalist Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b-2 border-[var(--color-primary)] bg-[var(--color-surface)]/90 backdrop-blur-md flex justify-between items-center px-6 sm:px-12 h-16 shadow-sm">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-4">
            <div className="p-2 border-2 border-[var(--color-primary)] bg-white shadow-[2px_2px_0px_0px_var(--color-primary)]">
              <IslamicStar className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <span 
              onClick={handleBackToLibrary}
              className="font-serif italic text-2xl font-bold hover:text-[var(--color-secondary)] transition-colors cursor-pointer select-none tracking-tight"
            >
              Quranic Studio
            </span>
          </div>
          
          <nav className="hidden md:flex gap-8">
            <button 
              onClick={handleBackToLibrary}
              className={`font-mono text-[10px] uppercase tracking-[0.25em] cursor-pointer transition-all hover:text-[var(--color-secondary)] ${view === 'library' ? 'font-bold text-[var(--color-secondary)]' : 'opacity-40'}`}
            >
              [LIBRARY]
            </button>
            <button 
              onClick={() => selectedSurah ? setView('selector') : triggerToast('Please select a Surah first.')}
              className={`font-mono text-[10px] uppercase tracking-[0.25em] cursor-pointer transition-all hover:text-[var(--color-secondary)] ${view === 'selector' ? 'font-bold text-[var(--color-secondary)]' : 'opacity-40'}`}
            >
              [EDITOR]
            </button>
            <button 
              onClick={() => selectedSurah ? setView('studio') : triggerToast('Please select verses first.')}
              className={`font-mono text-[10px] uppercase tracking-[0.25em] cursor-pointer transition-all hover:text-[var(--color-secondary)] ${view === 'studio' ? 'font-bold text-[var(--color-secondary)]' : 'opacity-40'}`}
            >
              [STUDIO]
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          {/* Global Sheikh Dropdown Selector */}
          {reciters.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-[var(--color-primary)] bg-white shadow-[2px_2px_0px_0px_var(--color-primary)]">
              <User className="w-3.5 h-3.5 opacity-60 text-[var(--color-primary)]" />
              <select
                value={selectedReciterId}
                onChange={(e) => setSelectedReciterId(Number(e.target.value))}
                className="bg-transparent border-none font-mono text-[10px] uppercase tracking-widest text-[var(--color-primary)] focus:outline-none cursor-pointer pr-4 font-bold"
              >
                {reciters.map(rec => (
                  <option key={rec.id} value={rec.id}>
                    {rec.name_en}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 border-2 border-[var(--color-primary)] bg-white font-mono text-[10px] uppercase tracking-widest shadow-[2px_2px_0px_0px_var(--color-primary)]">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Engine_Online</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => triggerToast('Global access mode enabled.')} className="hover:text-[var(--color-secondary)] transition-colors p-1"><Globe className="w-4 h-4" /></button>
            <button onClick={() => triggerToast('Parameters synchronization active.')} className="hover:text-[var(--color-secondary)] transition-colors p-1"><Settings className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {/* Main Fluid Viewport */}
      <main className="flex-1 mt-16 relative z-10">
        {view === 'library' && (
          <LibraryView 
            chapters={chapters} 
            loadingChapters={loadingChapters} 
            onSelectSurah={handleSelectSurah}
            onOpenImport={() => triggerToast('Custom import enabled.')}
          />
        )}

        {view === 'selector' && selectedSurah && (
          <VerseSelectorView 
            surah={selectedSurah} 
            reciters={reciters}
            selectedReciterId={selectedReciterId}
            setSelectedReciterId={setSelectedReciterId}
            onBack={handleBackToLibrary}
            onOpenStudio={handleOpenStudio}
          />
        )}

        {view === 'studio' && selectedSurah && (
          <StudioView 
            surah={selectedSurah}
            ayahFrom={ayahFrom}
            ayahTo={ayahTo}
            reciters={reciters}
            selectedReciterId={selectedReciterId}
            setSelectedReciterId={setSelectedReciterId}
            onBack={() => setView('selector')}
          />
        )}
      </main>

      {/* Persistent Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-slide-up">
          <div className="bg-[var(--color-primary)] text-[var(--color-on-primary)] px-8 py-3 rounded-none border-2 border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] flex items-center gap-4">
            <Layers className="w-4 h-4 text-[var(--color-secondary)]" />
            <p className="font-mono text-[11px] uppercase tracking-widest leading-relaxed text-center">{toastMsg}</p>
          </div>
        </div>
      )}

      {/* Global Branding Footer */}
      {view !== 'studio' && (
        <footer className="py-20 flex flex-col items-center gap-8 relative overflow-hidden">
          <IslamicDivider className="max-w-2xl mx-auto opacity-10" />
          <div className="flex flex-col items-center text-center gap-2 opacity-30 px-6">
            <p className="font-serif italic text-xl tracking-tight">Propagating the Eternal Word</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.4em]">Wazakkir Core • Divine Narrative Engine • v1.0.0</p>
          </div>
        </footer>
      )}
    </div>
  );
}
