// FILE: src/components/StudioView.tsx

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Play, Pause, Save, Video, CheckSquare, Settings, Sliders, 
  Trash, Download, Search, AlertCircle, RefreshCw, Layers, Copy,
  Type, Volume2, Activity, Sparkles, SlidersHorizontal, Plus
} from 'lucide-react';
import { SurahItem, Reciter, GenerationHistoryRow } from '../types';
import { useGeneration } from '../hooks/useGeneration';
import { IslamicStar, IslamicCornerOrnament, IslamicDivider } from './IslamicShapes';
import { PlayerControls } from './PlayerControls';

import { QURAN_API_BASE_URL } from '../config/constants';

interface StudioViewProps {
  surah: SurahItem;
  ayahFrom: number;
  ayahTo: number;
  reciters: Reciter[];
  selectedReciterId: number;
  setSelectedReciterId: (id: number) => void;
  onBack: () => void;
}

const BACKGROUND_PRESETS = [
  {
    id: 'stars',
    query: 'starry sky',
    thumb: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=160&auto=format&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?fit=crop&w=1280&q=80'
  },
  {
    id: 'forest',
    query: 'misty pine forest',
    thumb: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=160&auto=format&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1511497584788-876760111969?fit=crop&w=1280&q=80'
  },
  {
    id: 'mountains',
    query: 'night mountains silhouette sky',
    thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=160&auto=format&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?fit=crop&w=1280&q=80'
  },
  {
    id: 'earth',
    query: 'earth space views city lights',
    thumb: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=160&auto=format&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?fit=crop&w=1280&q=80'
  }
];

const formatMsToMmSs = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const secs = s % 60;
  return `${m}:${secs.toString().padStart(2, '0')}`;
};

export default function StudioView({ 
  surah, 
  ayahFrom, 
  ayahTo, 
  reciters, 
  selectedReciterId, 
  setSelectedReciterId, 
  onBack 
}: StudioViewProps) {
  const { state: generationState, submit: submitGeneration, reset: resetGeneration } = useGeneration();
  const [aspectRatio, setAspectRatio] = useState<'vertical' | 'horizontal'>('vertical');
  const [fontSize, setFontSize] = useState<number>(64);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [veilOpacity, setVeilOpacity] = useState<number>(40);
  const [bgQuery, setBgQuery] = useState<string>('starry sky');
  const [activeBgIdx, setActiveBgIdx] = useState<number>(0);
  const [customBgUrl, setCustomBgUrl] = useState<string>('');
  const [copiedConfig, setCopiedConfig] = useState<boolean>(false);

  // Custom styling states
  const [subtitleFont, setSubtitleFont] = useState<string>('Tajawal');
  const [subtitleArabicColor, setSubtitleArabicColor] = useState<string>('#FFFFFF');
  const [subtitleTranslationColor, setSubtitleTranslationColor] = useState<string>('#D0EADB');
  const [subtitleOutlineColor, setSubtitleOutlineColor] = useState<string>('#000000');
  const [subtitleOutlineWidth, setSubtitleOutlineWidth] = useState<number>(2);
  const [subtitleShadowColor, setSubtitleShadowColor] = useState<string>('#000000');
  const [subtitleShadowWidth, setSubtitleShadowWidth] = useState<number>(1);

  // Audio Effects States
  const [audioEchoEnabled, setAudioEchoEnabled] = useState<boolean>(true);
  const [audioEchoDelay, setAudioEchoDelay] = useState<number>(60);
  const [audioEchoDecay, setAudioEchoDecay] = useState<number>(0.4);
  const [audioAmbientTrack, setAudioAmbientTrack] = useState<'none' | 'rain' | 'waves' | 'wind' | 'soft'>('none');
  const [audioAmbientVolume, setAudioAmbientVolume] = useState<number>(0.15);

  // Waveform States
  const [waveformEnabled, setWaveformEnabled] = useState<boolean>(true);
  const [waveformColor, setWaveformColor] = useState<string>('#FFFFFF');
  const [waveformOpacity, setWaveformOpacity] = useState<number>(0.5);
  const [waveformMode, setWaveformMode] = useState<'line' | 'point' | 'p2p' | 'cline'>('line');

  // Video Filter States
  const [videoFilter, setVideoFilter] = useState<'none' | 'vintage' | 'bnw' | 'sepia' | 'blur' | 'warm' | 'cool'>('none');

  // Sidebar navigation tab
  const [activeTab, setActiveTab] = useState<'text' | 'audio' | 'visuals' | 'waveform' | 'library'>('text');

  const [versesContent, setVersesContent] = useState<{ ayahNumber: number, text: string, translation: string, startMs: number, endMs: number }[]>([]);
  const [currVerseIdx, setCurrVerseIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [history, setHistory] = useState<GenerationHistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [bgSearchText, setBgSearchText] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [loadingAudio, setLoadingAudio] = useState<boolean>(false);
  const [timings, setTimings] = useState<any[]>([]);
  const [audioOffsetMs, setAudioOffsetMs] = useState<number>(0);
  const [totalDurationMs, setTotalDurationMs] = useState<number>(0);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);

  const [exporting, setExporting] = useState<boolean>(false);
  const [exported, setExported] = useState<boolean>(false);

  useEffect(() => {
    async function initStudio() {
      try {
        const histRes = await fetch('/api/history');
        const histJson = await histRes.json();
        if (histJson.success) setHistory(histJson.data);
      } catch (e) { console.error('Studio init fail', e); }
      finally { setLoadingHistory(false); }
    }
    initStudio();
  }, []);

  useEffect(() => {
    async function loadSyncedData() {
      setLoadingAudio(true);
      try {
        const syncRes = await fetch(`${QURAN_API_BASE_URL}/sync?surah=${surah.id}&from=${ayahFrom}&to=${ayahTo}&reciterId=${selectedReciterId}`);
        const syncJson = await syncRes.json();
        if (syncJson.success) {
          const data = syncJson.data;
          setAudioUrl(data.audioUrl);
          setAudioOffsetMs(data.audioOffsetMs ?? 0);
          setTotalDurationMs(data.totalDurationMs ?? 0);
          const mappedVerses = data.verses.map((v: any) => ({
            ayahNumber: v.number,
            text: v.text,
            translation: v.translation,
            startMs: v.startMs,
            endMs: v.endMs
          }));
          setVersesContent(mappedVerses);
          setTimings(mappedVerses);
          
          // Set progress to the offset initially for immediate visual feedback on the slider/highlighting,
          // but do NOT modify audioRef.current.currentTime here. That will be handled inside handleLoadedMetadata.
          setCurrentTimeMs(data.audioOffsetMs ?? 0);
        }
      } catch (e) { console.error('Unified Sync load fail', e); }
      finally { setLoadingAudio(false); }
    }
    loadSyncedData();
  }, [surah.id, selectedReciterId, ayahFrom, ayahTo]);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = audioOffsetMs / 1000;
      setCurrentTimeMs(audioOffsetMs);
    }
  };

  useEffect(() => {
    if (timings.length > 0 && audioRef.current) {
      setCurrVerseIdx(0);
    }
  }, [timings]);

  // Simulated real-time waveform animation loop
  useEffect(() => {
    if (!waveformEnabled || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    let frequencies = new Array(60).fill(0).map(() => Math.random() * 5);
    
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      
      ctx.strokeStyle = waveformColor;
      ctx.fillStyle = waveformColor;
      ctx.globalAlpha = waveformOpacity;
      ctx.lineWidth = 2.5;
      
      if (isPlaying) {
        frequencies = frequencies.map((f) => {
          const target = Math.random() * (height * 0.42);
          return f + (target - f) * 0.25;
        });
      } else {
        frequencies = frequencies.map((f) => f + (1.5 - f) * 0.12);
      }
      
      const sliceWidth = width / frequencies.length;
      let x = 0;
      
      if (waveformMode === 'line') {
        ctx.beginPath();
        for (let i = 0; i < frequencies.length; i++) {
          const y = centerY + (i % 2 === 0 ? frequencies[i] : -frequencies[i]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      } else if (waveformMode === 'point') {
        for (let i = 0; i < frequencies.length; i++) {
          const y1 = centerY + frequencies[i];
          const y2 = centerY - frequencies[i];
          ctx.beginPath();
          ctx.arc(x, y1, 2.5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y2, 2.5, 0, 2 * Math.PI);
          ctx.fill();
          x += sliceWidth;
        }
      } else if (waveformMode === 'p2p') {
        for (let i = 0; i < frequencies.length; i++) {
          const amp = frequencies[i];
          ctx.beginPath();
          ctx.moveTo(x, centerY - amp);
          ctx.lineTo(x, centerY + amp);
          ctx.stroke();
          x += sliceWidth;
        }
      } else if (waveformMode === 'cline') {
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        for (let i = 0; i < frequencies.length; i++) {
          const y = centerY + Math.sin(i * 0.4) * frequencies[i];
          ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      }
      
      animationId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [waveformEnabled, waveformColor, waveformOpacity, waveformMode, isPlaying]);

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current || versesContent.length === 0 || timings.length === 0) return;
    const curMs = audioRef.current.currentTime * 1000;
    setCurrentTimeMs(curMs);
    const lastSeg = timings[timings.length - 1];

    // End-of-range detection: pause and reset to the stored offset position
    if (lastSeg && curMs >= lastSeg.endMs) {
      audioRef.current.pause();
      setIsPlaying(false);
      audioRef.current.currentTime = audioOffsetMs / 1000;
      setCurrentTimeMs(audioOffsetMs);
      setCurrVerseIdx(0);
      return;
    }

    // Find which verse the current playback position falls within
    let matchedIdx = -1;
    for (let i = 0; i < versesContent.length; i++) {
      const verse = versesContent[i];
      if (curMs >= verse.startMs && curMs < verse.endMs) {
        matchedIdx = i;
        break;
      }
    }
    
    if (matchedIdx !== -1 && matchedIdx !== currVerseIdx) {
      setCurrVerseIdx(matchedIdx);
    }
  };

  const handleSelectVerseIdx = (idx: number) => {
    if (!audioRef.current || timings.length === 0) return;
    const verse = versesContent[idx];
    if (verse) {
      audioRef.current.currentTime = verse.startMs / 1000;
      setCurrentTimeMs(verse.startMs);
      setCurrVerseIdx(idx);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || timings.length === 0 || totalDurationMs === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    const targetMs = audioOffsetMs + ratio * totalDurationMs;
    audioRef.current.currentTime = targetMs / 1000;
    setCurrentTimeMs(targetMs);
  };

  const handleFinalizeExport = async () => {
    if (generationState.phase !== 'done') return;
    setExporting(true);
    try {
      const res = await fetch(`/api/export/${generationState.jobId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setExported(true);
        setTimeout(() => setExported(false), 3000);
        const histRes = await fetch('/api/history');
        const histJson = await histRes.json();
        if (histJson.success) setHistory(histJson.data);
      }
    } catch (e) { console.error('Export fail', e); }
    finally { setExporting(false); }
  };

  const handleTriggerGenerate = async () => {
    try {
      await submitGeneration({ 
        surah: surah.id, 
        ayahFrom, 
        ayahTo, 
        reciterId: selectedReciterId, 
        backgroundQuery: bgQuery, 
        videoFormat: aspectRatio,
        subtitleFont,
        subtitleFontSize: fontSize,
        subtitleArabicColor,
        subtitleTranslationColor,
        subtitleOutlineColor,
        subtitleOutlineWidth,
        subtitleShadowColor,
        subtitleShadowWidth,
        subtitleShowTranslation: showTranslation,
        audioEchoEnabled,
        audioEchoDelay,
        audioEchoDecay,
        audioAmbientTrack,
        audioAmbientVolume,
        waveformEnabled,
        waveformColor,
        waveformOpacity,
        waveformMode,
        videoFilter,
        veilOpacity
      });
      const histRes = await fetch('/api/history');
      const histJson = await histRes.json();
      if (histJson.success) setHistory(histJson.data);
    } catch (e) { console.error(e); }
  };

  const handleExportConfig = () => {
    const config = { 
      surah: surah.id, 
      ayahFrom, 
      ayahTo, 
      reciterId: selectedReciterId, 
      aspectRatio, 
      fontSize, 
      showTranslation, 
      veilOpacity, 
      bgQuery,
      subtitleFont,
      subtitleArabicColor,
      subtitleTranslationColor,
      subtitleOutlineColor,
      subtitleOutlineWidth,
      subtitleShadowColor,
      subtitleShadowWidth,
      audioEchoEnabled,
      audioEchoDelay,
      audioEchoDecay,
      audioAmbientTrack,
      audioAmbientVolume,
      waveformEnabled,
      waveformColor,
      waveformOpacity,
      waveformMode,
      videoFilter
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const handleDeleteId = async (id: string) => {
    try {
      const res = await fetch(`/api/generation/${id}`, { method: 'DELETE' });
      if (res.ok) setHistory(prev => prev.filter(h => h.id !== id));
    } catch (e) { console.error(e); }
  };

  const selectPresetIdx = (idx: number) => {
    setActiveBgIdx(idx);
    setBgQuery(BACKGROUND_PRESETS[idx].query);
    setCustomBgUrl('');
  };

  const handleCustomBgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryStr = bgSearchText.trim();
    if (queryStr.length > 1) {
      setBgQuery(queryStr);
      try {
        const res = await fetch(`/api/videos?query=${encodeURIComponent(queryStr)}&format=${aspectRatio}`);
        const data = await res.json();
        if (data.success && data.videoUrl) { setCustomBgUrl(data.videoUrl); setActiveBgIdx(-1); }
      } catch (err) { console.error(err); }
    }
  };

  const getActiveBgUrl = () => customBgUrl || BACKGROUND_PRESETS[activeBgIdx]?.full || BACKGROUND_PRESETS[0].full;

  // Visual filter class resolver for preview
  const getFilterClass = () => {
    switch (videoFilter) {
      case 'vintage':
        return 'contrast-[1.15] brightness-[0.88] sepia-[0.25] saturate-[0.85]';
      case 'bnw':
        return 'grayscale-[1.0] brightness-[0.9]';
      case 'sepia':
        return 'sepia-[0.88] hue-rotate-[-10deg] brightness-[0.85]';
      case 'blur':
        return 'blur-[5px] scale-[1.05] brightness-[0.8]';
      case 'warm':
        return 'saturate-[1.22] sepia-[0.14] brightness-[0.92] contrast-[0.98]';
      case 'cool':
        return 'saturate-[1.08] hue-rotate-[10deg] brightness-[0.92]';
      case 'none':
      default:
        return '';
    }
  };

  // Preview styling mapping for titles scaled to match final video resolution proportionally
  const getArabicSubtitleStyle = () => {
    const targetHeight = aspectRatio === 'vertical' ? 1920 : 1080;
    const sizeInCqh = (fontSize / targetHeight) * 100;
    const outlineInCqh = (subtitleOutlineWidth / targetHeight) * 100;
    const shadowInCqh = (subtitleShadowWidth / targetHeight) * 100;

    return {
      fontFamily: subtitleFont === 'Amiri' ? "'Amiri', serif" :
                  subtitleFont === 'Tajawal' ? "'Tajawal', sans-serif" :
                  subtitleFont === 'Noto Naskh' ? "'Noto Naskh Arabic', serif" :
                  subtitleFont === 'Lalezar' ? "'Lalezar', cursive" :
                  subtitleFont === 'Inter' ? "'Inter', sans-serif" :
                  subtitleFont,
      color: subtitleArabicColor,
      WebkitTextStroke: `${outlineInCqh}cqh ${subtitleOutlineColor}`,
      textShadow: subtitleShadowWidth > 0 ? `${shadowInCqh}cqh ${shadowInCqh}cqh 3px ${subtitleShadowColor}` : 'none',
      fontSize: `${sizeInCqh}cqh`
    };
  };

  const getTranslationSubtitleStyle = () => {
    const targetHeight = aspectRatio === 'vertical' ? 1920 : 1080;
    const arabicSizeInCqh = (fontSize / targetHeight) * 100;
    const translationSizeInCqh = arabicSizeInCqh * (aspectRatio === 'vertical' ? 26/50 : 28/54);
    const outlineInCqh = ((subtitleOutlineWidth * 0.6) / targetHeight) * 100;
    const shadowInCqh = (subtitleShadowWidth / targetHeight) * 100;

    return {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      color: subtitleTranslationColor,
      WebkitTextStroke: `${outlineInCqh}cqh ${subtitleOutlineColor}`,
      textShadow: subtitleShadowWidth > 0 ? `${shadowInCqh}cqh ${shadowInCqh}cqh 2px ${subtitleShadowColor}` : 'none',
      fontSize: `${translationSizeInCqh}cqh`
    };
  };

  const getBismillahSubtitleStyle = () => {
    const targetHeight = aspectRatio === 'vertical' ? 1920 : 1080;
    const arabicSizeInCqh = (fontSize / targetHeight) * 100;
    const outlineInCqh = (subtitleOutlineWidth / targetHeight) * 100;
    const shadowInCqh = (subtitleShadowWidth / targetHeight) * 100;

    return {
      fontFamily: subtitleFont === 'Amiri' ? "'Amiri', serif" :
                  subtitleFont === 'Tajawal' ? "'Tajawal', sans-serif" :
                  subtitleFont === 'Noto Naskh' ? "'Noto Naskh Arabic', serif" :
                  subtitleFont === 'Lalezar' ? "'Lalezar', cursive" :
                  subtitleFont === 'Inter' ? "'Inter', sans-serif" :
                  subtitleFont,
      color: '#FFFFFF',
      WebkitTextStroke: `${outlineInCqh}cqh ${subtitleOutlineColor}`,
      textShadow: subtitleShadowWidth > 0 ? `${shadowInCqh}cqh ${shadowInCqh}cqh 3px ${subtitleShadowColor}` : 'none',
      fontSize: `${arabicSizeInCqh * 0.9}cqh`
    };
  };

  // Check if playing the Bismillah preamble
  const isPreamblePlaying = () => {
    if (versesContent.length === 0 || timings.length === 0) return false;
    const firstSeg = timings[0];
    return firstSeg && currentTimeMs < firstSeg.startMs && ayahFrom === 1 && surah.id !== 1;
  };

  // Timeline percentage calculator
  const getTimelineProgressPercent = () => {
    if (totalDurationMs === 0) return 0;
    const relCurrent = Math.max(0, currentTimeMs - audioOffsetMs);
    return Math.min(100, (relCurrent / totalDurationMs) * 100);
  };

  return (
    <div className="w-full h-full md:h-[calc(100vh-64px)] overflow-hidden flex flex-col md:flex-row bg-[#0b0b0d] text-gray-200">
      <audio 
        ref={audioRef} 
        src={audioUrl || undefined} 
        preload="auto" 
        onTimeUpdate={handleAudioTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => { 
          setIsPlaying(false); 
          if (audioRef.current) audioRef.current.currentTime = audioOffsetMs / 1000; 
          setCurrentTimeMs(audioOffsetMs);
          setCurrVerseIdx(0); 
        }} 
      />
      
      {/* LEFT ACCORDION SETTINGS SIDEBAR */}
      <aside className="w-full md:w-[380px] bg-[#121215] flex flex-col h-full shrink-0 select-none overflow-y-auto border-r border-[#202025] custom-scrollbar">
        {/* Sidebar Header Tabs */}
        <div className="p-4 border-b border-[#202025] bg-[#18181d] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-[0.25em]">Studio_Controls</h2>
            <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest animate-pulse">[ONLINE]</span>
          </div>
          {/* Tab Selection Row */}
          <div className="grid grid-cols-5 gap-1 mt-2">
            <button 
              onClick={() => setActiveTab('text')} 
              className={`p-2 flex flex-col items-center justify-center border transition-all cursor-pointer ${activeTab === 'text' ? 'bg-[#22222a] border-emerald-500 text-emerald-400' : 'bg-[#151518] border-transparent text-gray-400 hover:text-white'}`}
              title="Typography & Subtitles"
            >
              <Type className="w-4 h-4" />
              <span className="text-[8px] font-mono mt-1 uppercase">Sub</span>
            </button>
            <button 
              onClick={() => setActiveTab('audio')} 
              className={`p-2 flex flex-col items-center justify-center border transition-all cursor-pointer ${activeTab === 'audio' ? 'bg-[#22222a] border-emerald-500 text-emerald-400' : 'bg-[#151518] border-transparent text-gray-400 hover:text-white'}`}
              title="Audio FX & Ambiance"
            >
              <Volume2 className="w-4 h-4" />
              <span className="text-[8px] font-mono mt-1 uppercase">Audio</span>
            </button>
            <button 
              onClick={() => setActiveTab('visuals')} 
              className={`p-2 flex flex-col items-center justify-center border transition-all cursor-pointer ${activeTab === 'visuals' ? 'bg-[#22222a] border-emerald-500 text-emerald-400' : 'bg-[#151518] border-transparent text-gray-400 hover:text-white'}`}
              title="Visual Filters & Canvas"
            >
              <Video className="w-4 h-4" />
              <span className="text-[8px] font-mono mt-1 uppercase">Filter</span>
            </button>
            <button 
              onClick={() => setActiveTab('waveform')} 
              className={`p-2 flex flex-col items-center justify-center border transition-all cursor-pointer ${activeTab === 'waveform' ? 'bg-[#22222a] border-emerald-500 text-emerald-400' : 'bg-[#151518] border-transparent text-gray-400 hover:text-white'}`}
              title="Waveform Overlay"
            >
              <Activity className="w-4 h-4" />
              <span className="text-[8px] font-mono mt-1 uppercase">Wave</span>
            </button>
            <button 
              onClick={() => setActiveTab('library')} 
              className={`p-2 flex flex-col items-center justify-center border transition-all cursor-pointer ${activeTab === 'library' ? 'bg-[#22222a] border-emerald-500 text-emerald-400' : 'bg-[#151518] border-transparent text-gray-400 hover:text-white'}`}
              title="Library History"
            >
              <Layers className="w-4 h-4" />
              <span className="text-[8px] font-mono mt-1 uppercase">Files</span>
            </button>
          </div>
        </div>

        {/* Tab Contents Panel */}
        <div className="flex-1 p-5 space-y-6">
          {/* TAB 1: SUBTITLES & TYPOGRAPHY */}
          {activeTab === 'text' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 border-b border-[#202025] pb-2">§ Subtitle Styles</h3>
              
              {/* Reciter Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-mono uppercase tracking-widest text-gray-400">Reciter Voice Link</label>
                <select 
                  value={selectedReciterId} 
                  onChange={(e) => setSelectedReciterId(Number(e.target.value))} 
                  className="w-full bg-[#1b1b22] border border-[#2d2d35] px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {reciters.map(rec => <option key={rec.id} value={rec.id}>{rec.name_en} ({rec.name_ar})</option>)}
                </select>
              </div>

              {/* Font face selector */}
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-mono uppercase tracking-widest text-gray-400">Arabic Subtitle Font</label>
                <select 
                  value={subtitleFont} 
                  onChange={(e) => setSubtitleFont(e.target.value)} 
                  className="w-full bg-[#1b1b22] border border-[#2d2d35] px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Tajawal">Tajawal (Elegant Modern)</option>
                  <option value="Amiri">Amiri (Sacred Classical)</option>
                  <option value="Noto Naskh">Noto Naskh (Traditional)</option>
                  <option value="Lalezar">Lalezar (Stylized Bold)</option>
                  <option value="Inter">Inter (Minimal Sans)</option>
                </select>
              </div>

              {/* Font Size Slider */}
              <div className="flex flex-col gap-2 bg-[#18181d] p-3 border border-[#202025]">
                <div className="flex justify-between items-center text-[9px] font-mono text-gray-400">
                  <span>Arabic Font Size</span>
                  <span className="text-emerald-400 font-bold">{fontSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="24" 
                  max="120" 
                  value={fontSize} 
                  onChange={(e) => setFontSize(Number(e.target.value))} 
                  className="w-full h-1 bg-[#2b2b35] rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                />
              </div>

              {/* Color Pickers Grid */}
              <div className="grid grid-cols-2 gap-3 bg-[#18181d] p-3 border border-[#202025]">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-mono uppercase text-gray-400">Arabic Text</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={subtitleArabicColor} 
                      onChange={(e) => setSubtitleArabicColor(e.target.value)} 
                      className="w-6 h-6 border-none bg-transparent cursor-pointer"
                    />
                    <span className="text-[9px] font-mono text-gray-300">{subtitleArabicColor.toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-mono uppercase text-gray-400">Translation</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={subtitleTranslationColor} 
                      onChange={(e) => setSubtitleTranslationColor(e.target.value)} 
                      className="w-6 h-6 border-none bg-transparent cursor-pointer"
                    />
                    <span className="text-[9px] font-mono text-gray-300">{subtitleTranslationColor.toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-[8px] font-mono uppercase text-gray-400">Outline</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={subtitleOutlineColor} 
                      onChange={(e) => setSubtitleOutlineColor(e.target.value)} 
                      className="w-6 h-6 border-none bg-transparent cursor-pointer"
                    />
                    <span className="text-[9px] font-mono text-gray-300">{subtitleOutlineColor.toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-[8px] font-mono uppercase text-gray-400">Shadow</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={subtitleShadowColor} 
                      onChange={(e) => setSubtitleShadowColor(e.target.value)} 
                      className="w-6 h-6 border-none bg-transparent cursor-pointer"
                    />
                    <span className="text-[9px] font-mono text-gray-300">{subtitleShadowColor.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Outline / Shadow Width Sliders */}
              <div className="space-y-3 bg-[#18181d] p-3 border border-[#202025]">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[9px] font-mono text-gray-400">
                    <span>Outline Thickness</span>
                    <span className="text-emerald-400 font-bold">{subtitleOutlineWidth}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="6" 
                    step="0.5"
                    value={subtitleOutlineWidth} 
                    onChange={(e) => setSubtitleOutlineWidth(Number(e.target.value))} 
                    className="w-full h-1 bg-[#2b2b35] rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                  />
                </div>
                <div className="flex flex-col gap-1.5 mt-2">
                  <div className="flex justify-between text-[9px] font-mono text-gray-400">
                    <span>Shadow Offset</span>
                    <span className="text-emerald-400 font-bold">{subtitleShadowWidth}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="6" 
                    value={subtitleShadowWidth} 
                    onChange={(e) => setSubtitleShadowWidth(Number(e.target.value))} 
                    className="w-full h-1 bg-[#2b2b35] rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                  />
                </div>
              </div>

              {/* Translation Toggle */}
              <div className="flex items-center justify-between bg-[#18181d] p-3 border border-[#202025]">
                <label className="text-[10px] font-mono uppercase tracking-wider text-gray-300 font-bold">Show translation layer</label>
                <div 
                  className={`w-10 h-6 border border-[#2d2d35] relative cursor-pointer transition-all ${showTranslation ? 'bg-emerald-500/20 border-emerald-500' : 'bg-[#151518]'}`} 
                  onClick={() => setShowTranslation(!showTranslation)}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-emerald-500 transition-all ${showTranslation ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIO EFFECTS & AMBIANCE */}
          {activeTab === 'audio' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 border-b border-[#202025] pb-2">§ Audio Effects (Echo & Ambient)</h3>
              
              {/* Echo Toggle */}
              <div className="flex items-center justify-between bg-[#18181d] p-3 border border-[#202025]">
                <label className="text-[10px] font-mono uppercase tracking-wider text-gray-300 font-bold">Reciter voice echo/reverb</label>
                <div 
                  className={`w-10 h-6 border border-[#2d2d35] relative cursor-pointer transition-all ${audioEchoEnabled ? 'bg-emerald-500/20 border-emerald-500' : 'bg-[#151518]'}`} 
                  onClick={() => setAudioEchoEnabled(!audioEchoEnabled)}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-emerald-500 transition-all ${audioEchoEnabled ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>

              {/* Echo Parameters */}
              {audioEchoEnabled && (
                <div className="space-y-4 bg-[#18181d] p-3 border border-[#202025] animate-fade-in">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[9px] font-mono text-gray-400">
                      <span>Echo Delay</span>
                      <span className="text-emerald-400 font-bold">{audioEchoDelay}ms</span>
                    </div>
                    <input 
                      type="range" 
                      min="20" 
                      max="300" 
                      step="10"
                      value={audioEchoDelay} 
                      onChange={(e) => setAudioEchoDelay(Number(e.target.value))} 
                      className="w-full h-1 bg-[#2b2b35] rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex justify-between text-[9px] font-mono text-gray-400">
                      <span>Echo Decay</span>
                      <span className="text-emerald-400 font-bold">{(audioEchoDecay * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="0.8" 
                      step="0.05"
                      value={audioEchoDecay} 
                      onChange={(e) => setAudioEchoDecay(Number(e.target.value))} 
                      className="w-full h-1 bg-[#2b2b35] rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                    />
                  </div>
                </div>
              )}

              {/* Ambient Audio Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-mono uppercase tracking-widest text-gray-400">Ambient Background Track</label>
                <select 
                  value={audioAmbientTrack} 
                  onChange={(e) => setAudioAmbientTrack(e.target.value as any)} 
                  className="w-full bg-[#1b1b22] border border-[#2d2d35] px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="none">None (Recitation Only)</option>
                  <option value="rain">Heavy Rainfall (Calming)</option>
                  <option value="waves">Ocean Sea Waves (Immersive)</option>
                  <option value="wind">Cold Howling Wind (Atmospheric)</option>
                  <option value="soft">Soft Ambient Synth (Harmonic)</option>
                </select>
              </div>

              {/* Ambient Volume */}
              {audioAmbientTrack !== 'none' && (
                <div className="flex flex-col gap-1.5 bg-[#18181d] p-3 border border-[#202025] animate-fade-in">
                  <div className="flex justify-between text-[9px] font-mono text-gray-400">
                    <span>Ambient Volume Level</span>
                    <span className="text-emerald-400 font-bold">{(audioAmbientVolume * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.05" 
                    max="0.5" 
                    step="0.02"
                    value={audioAmbientVolume} 
                    onChange={(e) => setAudioAmbientVolume(Number(e.target.value))} 
                    className="w-full h-1 bg-[#2b2b35] rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VISUAL FILTERS & CANVAS */}
          {activeTab === 'visuals' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 border-b border-[#202025] pb-2">§ Canvas visual styling</h3>
              
              {/* Aspect Ratio Picker */}
              <div className="space-y-2">
                <label className="text-[9px] font-mono uppercase tracking-widest text-gray-400">Canvas Dimensions</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setAspectRatio('vertical')} 
                    className={`flex flex-col items-center justify-center gap-1.5 py-3 border transition-all cursor-pointer ${aspectRatio === 'vertical' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-[#18181d] border-[#202025] text-gray-400 hover:border-gray-600'}`}
                  >
                    <Video className="w-4 h-4 rotate-90" />
                    <span className="text-[8px] font-bold font-mono">9:16 VERTICAL</span>
                  </button>
                  <button 
                    onClick={() => setAspectRatio('horizontal')} 
                    className={`flex flex-col items-center justify-center gap-1.5 py-3 border transition-all cursor-pointer ${aspectRatio === 'horizontal' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-[#18181d] border-[#202025] text-gray-400 hover:border-gray-600'}`}
                  >
                    <Video className="w-4 h-4" />
                    <span className="text-[8px] font-bold font-mono">16:9 CINEMATIC</span>
                  </button>
                </div>
              </div>

              {/* Video filter card selector */}
              <div className="space-y-2">
                <label className="text-[9px] font-mono uppercase tracking-widest text-gray-400">Atmospheric Video Filter</label>
                <div className="grid grid-cols-2 gap-2 text-center text-[9px] font-mono">
                  {[
                    { id: 'none', label: 'None (Raw)' },
                    { id: 'vintage', label: 'Vintage Nostalgia' },
                    { id: 'bnw', label: 'Black & White' },
                    { id: 'sepia', label: 'Warm Sepia' },
                    { id: 'blur', label: 'Dreamy Blur' },
                    { id: 'warm', label: 'Golden Warmth' },
                    { id: 'cool', label: 'Deep Cool' }
                  ].map(f => (
                    <button 
                      key={f.id}
                      onClick={() => setVideoFilter(f.id as any)}
                      className={`py-2 px-1 border transition-all cursor-pointer ${videoFilter === f.id ? 'bg-[#22222a] border-emerald-500 text-emerald-400' : 'bg-[#18181d] border-[#202025] text-gray-400 hover:border-gray-600'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Backdrop search */}
              <div className="space-y-3 bg-[#18181d] p-3 border border-[#202025]">
                <label className="text-[9px] font-mono uppercase tracking-widest text-gray-400">Backdrop Media Theme</label>
                <form onSubmit={handleCustomBgSubmit} className="relative">
                  <input 
                    className="w-full bg-[#131316] border border-[#2d2d35] pl-8 pr-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-500 font-mono" 
                    placeholder="search nature..." 
                    type="text" 
                    value={bgSearchText} 
                    onChange={(e) => setBgSearchText(e.target.value)} 
                  />
                  <button type="submit" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-400 cursor-pointer"><Search className="w-3.5 h-3.5" /></button>
                </form>
                <div className="grid grid-cols-4 gap-1.5">
                  {BACKGROUND_PRESETS.map((preset, idx) => (
                    <button 
                      key={preset.id} 
                      onClick={() => selectPresetIdx(idx)} 
                      className={`relative aspect-video border cursor-pointer transition-all ${activeBgIdx === idx && !customBgUrl ? 'border-emerald-500 scale-105 z-10' : 'border-[#2d2d35] hover:border-gray-400'}`}
                    >
                      <img src={preset.thumb} alt={preset.id} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Veil Opacity Slider */}
              <div className="flex flex-col gap-1.5 bg-[#18181d] p-3 border border-[#202025]">
                <div className="flex justify-between text-[9px] font-mono text-gray-400">
                  <span>Veil Shade Opacity</span>
                  <span className="text-emerald-400 font-bold">{veilOpacity}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={veilOpacity} 
                  onChange={(e) => setVeilOpacity(Number(e.target.value))} 
                  className="w-full h-1 bg-[#2b2b35] rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                />
              </div>
            </div>
          )}

          {/* TAB 4: WAVEFORM OVERLAY */}
          {activeTab === 'waveform' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 border-b border-[#202025] pb-2">§ Waveform Overlay</h3>
              
              {/* Enable Waveform Toggle */}
              <div className="flex items-center justify-between bg-[#18181d] p-3 border border-[#202025]">
                <label className="text-[10px] font-mono uppercase tracking-wider text-gray-300 font-bold">Overlay active waveform</label>
                <div 
                  className={`w-10 h-6 border border-[#2d2d35] relative cursor-pointer transition-all ${waveformEnabled ? 'bg-emerald-500/20 border-emerald-500' : 'bg-[#151518]'}`} 
                  onClick={() => setWaveformEnabled(!waveformEnabled)}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-emerald-500 transition-all ${waveformEnabled ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>

              {waveformEnabled && (
                <div className="space-y-4 animate-fade-in">
                  {/* Waveform Draw Mode */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-gray-400">Waveform Graphic Mode</label>
                    <select 
                      value={waveformMode} 
                      onChange={(e) => setWaveformMode(e.target.value as any)} 
                      className="w-full bg-[#1b1b22] border border-[#2d2d35] px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="line">Continuous Sine Line</option>
                      <option value="point">Dual Frequency Points</option>
                      <option value="p2p">Peak-to-Peak Bars</option>
                      <option value="cline">Modulated Wave line</option>
                    </select>
                  </div>

                  {/* Waveform Color Picker */}
                  <div className="flex flex-col gap-2 bg-[#18181d] p-3 border border-[#202025]">
                    <label className="text-[9px] font-mono uppercase text-gray-400">Waveform Tint Color</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={waveformColor} 
                        onChange={(e) => setWaveformColor(e.target.value)} 
                        className="w-7 h-7 border-none bg-transparent cursor-pointer"
                      />
                      <span className="text-xs font-mono text-gray-300">{waveformColor.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Waveform Opacity */}
                  <div className="flex flex-col gap-1.5 bg-[#18181d] p-3 border border-[#202025]">
                    <div className="flex justify-between text-[9px] font-mono text-gray-400">
                      <span>Waveform Opacity</span>
                      <span className="text-emerald-400 font-bold">{(waveformOpacity * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="1.0" 
                      step="0.05"
                      value={waveformOpacity} 
                      onChange={(e) => setWaveformOpacity(Number(e.target.value))} 
                      className="w-full h-1 bg-[#2b2b35] rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ARCHIVE LIBRARY HISTORY */}
          {activeTab === 'library' && (
            <div className="space-y-4 animate-fade-in h-full flex flex-col">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 border-b border-[#202025] pb-2">§ Archive Studio Library</h3>
              <div className="flex-1 overflow-y-auto max-h-[360px] pr-1 space-y-3 custom-scrollbar">
                {loadingHistory ? (
                  <div className="py-10 text-center text-[9px] text-gray-400 font-mono tracking-[0.3em] animate-pulse">SYNCHRONIZING_HISTORY...</div>
                ) : history.length === 0 ? (
                  <div className="py-10 text-center text-[9px] text-gray-500 font-mono tracking-[0.2em] italic border border-dashed border-[#202025]">NULL_RECORDS</div>
                ) : (
                  <div className="space-y-2">
                    {history.map((row) => (
                      <div key={row.id} className="p-3 bg-[#18181d] border border-[#202025] flex items-center justify-between text-left hover:border-gray-500 transition-all group">
                        <button onClick={() => handleDeleteId(row.id)} className="text-gray-500 hover:text-rose-400 transition-colors p-1 flex items-center justify-center cursor-pointer"><Trash className="w-3.5 h-3.5" /></button>
                        <div className="flex items-center gap-3">
                          {row.status === 'done' && (
                            <a href={`/api/download/${row.id}`} target="_blank" className="w-7 h-7 bg-[#222228] border border-[#2d2d35] flex items-center justify-center text-gray-300 hover:text-emerald-400 transition-all cursor-pointer">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {row.status === 'processing' && <div className="w-4 h-4 border border-emerald-500 border-t-transparent rounded-full animate-spin"></div>}
                          <div className="text-right flex-1 select-all" dir="rtl">
                            <p className="text-xs font-bold text-gray-200 font-serif italic mb-0.5">سورة {row.surah}</p>
                            <p className="text-[8px] text-gray-500 font-mono tracking-wider">{row.format === 'vertical' ? '9:16' : '16:9'} • {formatMsToMmSs(row.duration_ms || 0)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Queue/Export buttons at the bottom of the sidebar */}
        <div className="p-4 bg-[#18181d] border-t border-[#202025] space-y-2 mt-auto">
          {generationState.phase === 'queued' && (
            <div className="p-4 bg-[#151518] border border-[#2d2d35] text-center shadow-lg animate-fade-in">
              <div className="flex items-center justify-center gap-2.5 text-emerald-400 font-mono text-xs uppercase font-bold animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>[STATUS: ENQUEUED]</span>
              </div>
            </div>
          )}
          {generationState.phase === 'processing' && (
            <div className="p-4 bg-[#151518] border border-[#2d2d35] text-center space-y-3 shadow-lg animate-fade-in">
              <div className="flex items-center justify-center gap-2.5 text-emerald-400 font-mono text-xs uppercase font-bold">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>[STATUS: RENDERING]</span>
              </div>
              <div className="w-full h-2 bg-[#22222a] border border-[#2d2d35] overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full bg-emerald-500 animate-progress-simulate"></div>
              </div>
            </div>
          )}
          {generationState.phase === 'done' && (
            <div className="p-4 bg-[#151518] border border-[#2d2d35] text-center space-y-3 shadow-lg animate-fade-in">
              <p className="text-xs font-mono uppercase font-bold text-emerald-400 tracking-widest">✓ RENDER COMPLETE</p>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <a href={`/api/download/${generationState.jobId}`} target="_blank" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"><Download className="w-3.5 h-3.5" /> DOWNLOAD</a>
                  <button onClick={resetGeneration} className="px-3 border border-[#2d2d35] hover:bg-[#222228] text-gray-300 font-mono text-[9px] uppercase font-bold cursor-pointer">RESET</button>
                </div>
                <button 
                  onClick={handleFinalizeExport} 
                  disabled={exporting || exported} 
                  className={`w-full py-2.5 border font-mono text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${exported ? 'bg-teal-600 text-white border-teal-500' : 'bg-[#1b1b22] border-[#2d2d35] hover:bg-[#222228] text-gray-300'}`}
                >
                  {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : exported ? <CheckSquare className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{exporting ? 'EXPORTING...' : exported ? 'SAVED_TO_LIBRARY' : '[FINALIZE TO STUDIO]'}</span>
                </button>
              </div>
            </div>
          )}
          {generationState.phase === 'error' && (
            <div className="p-4 bg-rose-950/20 border border-rose-900/50 text-center space-y-3 shadow-lg animate-fade-in">
              <div className="flex items-center justify-center gap-2.5 text-rose-400 font-mono text-xs uppercase font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>[RENDER ERROR]</span>
              </div>
              <button onClick={handleTriggerGenerate} className="w-full py-2 bg-rose-600 text-white hover:bg-rose-500 text-[9px] font-mono font-bold uppercase transition-all tracking-wider">RETRY GENERATION</button>
            </div>
          )}
          {generationState.phase === 'idle' && (
            <button 
              onClick={handleTriggerGenerate} 
              className="w-full bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500 py-3.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 group"
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
              <span>[RENDER MP4 VIDEO]</span>
            </button>
          )}
          <button 
            onClick={handleExportConfig} 
            className="w-full bg-[#18181d] text-gray-400 hover:text-white border border-[#202025] hover:border-gray-600 py-2 font-mono text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
            title="Copy settings to clipboard as JSON"
          >
            <Copy className="w-3 h-3" />
            <span>{copiedConfig ? '✓ COPIED SETTINGS' : '[COPY METADATA]'}</span>
          </button>
        </div>
      </aside>
      
      {/* MAIN RENDER ENGINE VIEWPORT & TIMELINE */}
      <main className="flex-1 flex flex-col bg-[#0b0b0d] relative h-full">
        {/* Viewport Header */}
        <header className="flex justify-between items-center px-6 py-4 border-b border-[#202025] bg-[#121215]">
          <div className="flex items-center gap-4 text-right" dir="rtl">
            <button onClick={onBack} className="text-gray-400 hover:text-white p-1.5 border border-transparent hover:border-[#2d2d35] transition-all cursor-pointer font-mono text-[10px] uppercase">
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
            <div className="flex flex-col text-right">
              <h1 className="font-serif italic text-lg text-emerald-400">سورة {surah.nameAr}</h1>
              <span className="font-mono text-[8px] text-gray-500 uppercase tracking-widest">[Verses {ayahFrom} to {ayahTo}]</span>
            </div>
          </div>
          <button onClick={onBack} className="px-4 py-2 border border-[#2d2d35] text-gray-300 bg-[#18181d] hover:bg-[#222228] transition-all font-mono text-[9px] uppercase font-bold flex items-center gap-2 cursor-pointer shadow-md">
            <ArrowLeft className="w-3 h-3" /> [EXIT TO DESK]
          </button>
        </header>

        {/* Viewport Render Stage */}
        <div className="flex-grow flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#0e0e11] select-none">
          <IslamicCornerOrnament position="top-left" className="w-44 h-44 -left-4 -top-4 opacity-[0.02] text-emerald-500 pointer-events-none" />
          <IslamicCornerOrnament position="top-right" className="w-44 h-44 -right-4 -top-4 opacity-[0.02] text-emerald-500 pointer-events-none" />
          <IslamicCornerOrnament position="bottom-left" className="w-44 h-44 -left-4 -bottom-4 opacity-[0.02] text-emerald-500 pointer-events-none" />
          <IslamicCornerOrnament position="bottom-right" className="w-44 h-44 -right-4 -bottom-4 opacity-[0.02] text-emerald-500 pointer-events-none" />
          
          {/* Dynamic Video Viewport Container */}
          <div 
            style={{ containerType: 'size' }}
            className={`relative bg-black overflow-hidden transition-all duration-300 border border-[#2c2c35] shadow-2xl flex items-center justify-center ${aspectRatio === 'vertical' ? 'w-[280px] h-[498px] sm:w-[320px] sm:h-[569px]' : 'w-[100%] max-w-[680px] aspect-video'}`}
          >
            {/* Visual background video or image with CSS filter classes applied in real-time */}
            {(() => {
              const bgUrl = getActiveBgUrl();
              const isVideo = bgUrl.match(/\.(mp4|mov|webm|ogv)$/i) || bgUrl.includes('mixkit.co/videos');
              return isVideo ? (
                <video 
                  key={bgUrl} 
                  src={bgUrl} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className={`absolute inset-0 w-full h-full object-cover opacity-70 transition-all duration-500 pointer-events-none ${getFilterClass()}`}
                />
              ) : (
                <img 
                  key={bgUrl} 
                  src={bgUrl} 
                  alt="Background preview" 
                  className={`absolute inset-0 w-full h-full object-cover opacity-70 transition-all duration-500 pointer-events-none ${getFilterClass()}`}
                />
              );
            })()}
            {/* Veil Shade Opacity */}
            <div className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300" style={{ opacity: veilOpacity / 100 }} />
            
            {/* Text Overlay Stage */}
            <div className="relative z-10 p-6 flex flex-col items-center justify-center text-center gap-6 w-full h-full">
              {versesContent.length > 0 && (
                <>
                  {isPreamblePlaying() ? (
                    <div className="animate-fade-in flex flex-col gap-4">
                      <p className="font-serif leading-[1.6] select-none drop-shadow-xl font-normal" dir="rtl" style={getBismillahSubtitleStyle()}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</p>
                      {showTranslation && <p className="font-sans font-medium leading-relaxed select-none drop-shadow-lg italic" style={getTranslationSubtitleStyle()}>In the name of Allah, the Beneficent, the Merciful</p>}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <p className="font-serif leading-[1.6] select-none transition-all duration-300" dir="rtl" style={getArabicSubtitleStyle()}>{versesContent[currVerseIdx]?.text}</p>
                      {showTranslation && <p className="font-sans font-medium leading-relaxed max-w-[90%] select-none transition-all duration-300 italic mx-auto" style={getTranslationSubtitleStyle()}>{versesContent[currVerseIdx]?.translation}</p>}
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Real-time Waveform Canvas Overlay */}
            {waveformEnabled && (
              <canvas 
                ref={canvasRef} 
                className="absolute bottom-4 left-0 w-full h-[60px] pointer-events-none z-20"
                width={aspectRatio === 'vertical' ? 320 : 680}
                height={60}
              />
            )}
            
            <div className="absolute top-4 left-4 bg-black/60 border border-[#2d2d35] text-emerald-400 px-2.5 py-1 rounded-none font-mono text-[9px] tracking-wider uppercase font-bold">
              {isPreamblePlaying() ? 'PREAMBLE' : `VERSE ${currVerseIdx + 1}/${versesContent.length}`}
            </div>
          </div>

          {/* Simple controls overlay directly under stage */}
          <div className="w-full max-w-[680px] mt-4 flex items-center justify-between">
            <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest select-none">
              Playhead Time: <span className="text-emerald-400 font-bold">{formatMsToMmSs(currentTimeMs)}</span> / {formatMsToMmSs(totalDurationMs)}
            </span>
            <PlayerControls
              currVerseIdx={currVerseIdx}
              totalVerses={versesContent.length}
              isPlaying={isPlaying}
              loadingAudio={loadingAudio}
              onPrev={() => handleSelectVerseIdx(currVerseIdx > 0 ? currVerseIdx - 1 : versesContent.length - 1)}
              onNext={() => handleSelectVerseIdx(currVerseIdx < versesContent.length - 1 ? currVerseIdx + 1 : 0)}
              onTogglePlay={() => { setIsPlaying(!isPlaying); if(!isPlaying) audioRef.current?.play(); else audioRef.current?.pause(); }}
            />
          </div>
        </div>

        {/* BOTTOM HORIZONTAL TIMELINE TRACK */}
        <div className="h-32 bg-[#121215] border-t border-[#202025] flex flex-col p-3 w-full select-none">
          <div className="flex justify-between items-center text-[9px] font-mono text-gray-400 mb-1 px-1">
            <span className="uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1"><SlidersHorizontal className="w-3.5 h-3.5" /> Studio Timeline tracks</span>
            <span className="text-gray-500">Seek Offset: {formatMsToMmSs(audioOffsetMs)} • Reciter: {reciters.find(r => r.id === selectedReciterId)?.name_en || 'Selected'}</span>
          </div>
          
          {/* Timeline Scrollable Track Area */}
          <div 
            onClick={handleTimelineClick} 
            className="flex-1 bg-[#0b0b0d] border border-[#202025] relative cursor-pointer flex items-center overflow-hidden h-14"
          >
            {/* Playhead Progress Overlay */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 border-r-2 border-emerald-500 z-10 pointer-events-none transition-all duration-75"
              style={{ width: `${getTimelineProgressPercent()}%` }}
            />
            
            {/* Verse Segment blocks */}
            {versesContent.map((verse, idx) => {
              // Calculate segment width ratio relative to total timeline duration
              const duration = verse.endMs - verse.startMs;
              const widthPct = totalDurationMs > 0 ? (duration / totalDurationMs) * 100 : 100 / versesContent.length;
              const isActive = idx === currVerseIdx && !isPreamblePlaying();
              
              return (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation(); // prevent triggering timeline click
                    handleSelectVerseIdx(idx);
                  }}
                  style={{ width: `${widthPct}%` }}
                  className={`h-full border-r border-[#202025] flex flex-col justify-center px-3 text-right overflow-hidden transition-colors cursor-pointer select-none font-serif italic ${isActive ? 'bg-[#22222c] text-emerald-400' : 'bg-transparent text-gray-500 hover:bg-[#15151b] hover:text-gray-300'}`}
                >
                  <span className="text-[10px] block truncate text-ellipsis">آية {verse.ayahNumber}</span>
                  <span className="text-[7px] font-mono font-bold tracking-tighter mt-0.5 uppercase block">{formatMsToMmSs(verse.startMs - audioOffsetMs)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
