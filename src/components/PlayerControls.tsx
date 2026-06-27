import React from 'react';
import { Play, Pause, RefreshCw } from 'lucide-react';

interface PlayerControlsProps {
  currVerseIdx: number;
  totalVerses: number;
  isPlaying: boolean;
  loadingAudio: boolean;
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
}

export function PlayerControls({
  currVerseIdx,
  totalVerses,
  isPlaying,
  loadingAudio,
  onPrev,
  onNext,
  onTogglePlay
}: PlayerControlsProps) {
  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-[var(--color-surface)] px-6 py-3 rounded-none border-2 border-[var(--color-primary)] shadow-[6px_6px_0px_0px_var(--color-primary)] z-20">
      <button onClick={onPrev} className="text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors p-2" title="Previous Verse">
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6L18 18V6z"/></svg>
      </button>
      <button onClick={onTogglePlay} className="flex items-center gap-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] px-8 py-2 rounded-none font-mono text-xs uppercase tracking-[0.15em] font-bold hover:bg-[var(--color-secondary)] transition-all active:translate-y-[1px] cursor-pointer">
        {loadingAudio ? <RefreshCw className="w-4 h-4 animate-spin" /> : isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        <span>{loadingAudio ? 'LOADING' : isPlaying ? 'PAUSE' : 'PLAY'}</span>
      </button>
      <button onClick={onNext} className="text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors p-2" title="Next Verse">
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6zm10-12h2v12h-2z"/></svg>
      </button>
    </div>
  );
}
