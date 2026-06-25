// FILE: packages/engine/src/validation/payloadSchema.ts

import { z } from 'zod';

export const PayloadSchema = z.object({
  surah:                    z.number().int().min(1).max(114),
  ayahFrom:                 z.number().int().min(1),
  ayahTo:                   z.number().int().min(1),
  reciterId:                z.number().int().min(1).max(10).default(7),
  backgroundQuery:          z.string().min(2).max(300).trim(),
  videoFormat:              z.enum(['vertical', 'horizontal']),
  
  // Custom Subtitle Styles
  subtitleFont:             z.string().optional().default('Amiri'),
  subtitleArabicColor:      z.string().optional().default('#FFFFFF'),
  subtitleTranslationColor: z.string().optional().default('#D0EADB'),
  subtitleOutlineColor:     z.string().optional().default('#000000'),
  subtitleOutlineWidth:     z.number().optional().default(2),
  subtitleShadowColor:      z.string().optional().default('#000000'),
  subtitleShadowWidth:      z.number().optional().default(0),
  subtitleShowTranslation:  z.boolean().optional().default(true),
  subtitleFontSize:         z.number().optional().default(44),

  // Custom Audio Effects
  audioEchoEnabled:         z.boolean().optional().default(true),
  audioEchoDelay:           z.number().optional().default(60),
  audioEchoDecay:           z.number().optional().default(0.4),
  audioAmbientTrack:        z.enum(['none', 'rain', 'waves', 'wind', 'soft']).optional().default('none'),
  audioAmbientVolume:       z.number().optional().default(0.15),

  // Custom Waveform Styles
  waveformEnabled:          z.boolean().optional().default(true),
  waveformColor:            z.string().optional().default('#FFFFFF'),
  waveformOpacity:          z.number().optional().default(0.5),
  waveformMode:             z.enum(['line', 'point', 'p2p', 'cline']).optional().default('line'),

  // Visual Video Filters
  videoFilter:              z.enum(['none', 'vintage', 'bnw', 'sepia', 'blur', 'warm', 'cool']).optional().default('none'),
  veilOpacity:              z.number().int().min(0).max(100).optional().default(40),

}).refine(
  d => d.ayahTo >= d.ayahFrom,
  { message: 'ayahTo must be >= ayahFrom', path: ['ayahTo'] }
).refine(
  d => (d.ayahTo - d.ayahFrom) <= 29,
  { message: 'Maximum 30 ayahs per video', path: ['ayahTo'] }
);

export type Payload = z.infer<typeof PayloadSchema>;
