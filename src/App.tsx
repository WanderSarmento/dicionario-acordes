/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Harmonia - Caderno Didático & Visualizador de Acordes do Campo Harmônico
 * Interface didática interativa inspirada em fichas e cadernos de aprendizagem,
 * reunindo síntese de áudio realista, 12 tonalidades, graus em números naturais,
 * inversões, dedilhado recomendado, missões de fixação e exportação de fichas didáticas em PNG.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Music,
  Download,
  Search,
  Sparkles,
  BookOpen,
  Info,
  Layers,
  Hand,
  ListMusic,
  ArrowRight,
  Hash,
  Maximize2,
  ZoomIn,
  MoveHorizontal,
  ChevronDown,
  ChevronUp,
  Smartphone,
  WifiOff,
  CheckCircle2,
  CheckSquare,
  Square,
  HelpCircle,
  Lightbulb,
  Paperclip,
  Star,
  Award,
  Trophy,
  Compass,
  RotateCcw,
  Headphones,
  Check
} from 'lucide-react';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useOnlineStatus } from './hooks/useOnlineStatus';

/* =====================================================================
   1. SINTETIZADOR DE PIANO COM WEB AUDIO API (Sons realistas com harmônicos)
   ===================================================================== */
class PianoSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  public isMuted: boolean = false;
  public volume: number = 0.85;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public playNote(freq: number, duration: number = 1.6, velocity: number = 0.8) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const noteGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(12000, freq * 5), now);
    filter.Q.setValueAtTime(1.2, now);

    const harmonics = [
      { mult: 1, gain: 1.0 },
      { mult: 2, gain: 0.45 },
      { mult: 3, gain: 0.22 },
      { mult: 4, gain: 0.12 },
      { mult: 5, gain: 0.06 },
      { mult: 6, gain: 0.03 }
    ];

    harmonics.forEach(({ mult, gain: hGain }) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = mult % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq * mult, now);
      oscGain.gain.setValueAtTime(hGain * velocity, now);

      osc.connect(oscGain);
      oscGain.connect(noteGain);

      osc.start(now);
      osc.stop(now + duration + 0.1);
    });

    // Curva de envelope ADSR de piano
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.exponentialRampToValueAtTime(velocity * 0.9, now + 0.008);
    noteGain.gain.exponentialRampToValueAtTime(velocity * 0.45, now + 0.12);
    noteGain.gain.exponentialRampToValueAtTime(velocity * 0.15, now + 0.7);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noteGain.connect(filter);
    filter.connect(this.masterGain);
  }

  public playChord(frequencies: number[], duration: number = 2.2) {
    frequencies.forEach((freq, idx) => {
      // Arpejo milimétrico humanizado de piano
      const humanDelay = idx * 0.024;
      setTimeout(() => {
        this.playNote(freq, duration - humanDelay, 0.75 + Math.random() * 0.1);
      }, humanDelay * 1000);
    });
  }

  public playCelebration() {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playNote(freq, 0.6, 0.85);
      }, idx * 120);
    });
  }
}

const synth = new PianoSynth();

/* =====================================================================
   2. DADOS E MODELOS TEÓRICOS DE MÚSICA & HARMONIA
   ===================================================================== */
export const CHROMATIC_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const CHROMATIC_PT: Record<string, string> = {
  'C': 'Dó',
  'C#': 'Dó sustenido',
  'Db': 'Ré bemol',
  'D': 'Ré',
  'D#': 'Ré sustenido',
  'Eb': 'Mi bemol',
  'E': 'Mi',
  'F': 'Fá',
  'F#': 'Fá sustenido',
  'Gb': 'Sol bemol',
  'G': 'Sol',
  'G#': 'Sol sustenido',
  'Ab': 'Lá bemol',
  'A': 'Lá',
  'A#': 'Lá sustenido',
  'Bb': 'Si bemol',
  'B': 'Si'
};

export interface TonalityInfo {
  root: string;
  namePt: string;
  accidentals: string;
  type: 'major' | 'minor';
  rootChromaticIndex: number;
}

export const TONALITIES: TonalityInfo[] = [
  // 12 Tonalidades Maiores
  { root: 'C', namePt: 'Dó Maior', accidentals: 'Natural (sem sustenidos ou bemóis)', type: 'major', rootChromaticIndex: 0 },
  { root: 'G', namePt: 'Sol Maior', accidentals: '1 sustenido (F#)', type: 'major', rootChromaticIndex: 7 },
  { root: 'D', namePt: 'Ré Maior', accidentals: '2 sustenidos (F#, C#)', type: 'major', rootChromaticIndex: 2 },
  { root: 'A', namePt: 'Lá Maior', accidentals: '3 sustenidos (F#, C#, G#)', type: 'major', rootChromaticIndex: 9 },
  { root: 'E', namePt: 'Mi Maior', accidentals: '4 sustenidos (F#, C#, G#, D#)', type: 'major', rootChromaticIndex: 4 },
  { root: 'B', namePt: 'Si Maior', accidentals: '5 sustenidos (F#, C#, G#, D#, A#)', type: 'major', rootChromaticIndex: 11 },
  { root: 'F#', namePt: 'Fá# Maior', accidentals: '6 sustenidos (F#, C#, G#, D#, A#, E#)', type: 'major', rootChromaticIndex: 6 },
  { root: 'F', namePt: 'Fá Maior', accidentals: '1 bemol (Bb)', type: 'major', rootChromaticIndex: 5 },
  { root: 'Bb', namePt: 'Si bemol Maior', accidentals: '2 bemóis (Bb, Eb)', type: 'major', rootChromaticIndex: 10 },
  { root: 'Eb', namePt: 'Mi bemol Maior', accidentals: '3 bemóis (Bb, Eb, Ab)', type: 'major', rootChromaticIndex: 3 },
  { root: 'Ab', namePt: 'Lá bemol Maior', accidentals: '4 bemóis (Bb, Eb, Ab, Db)', type: 'major', rootChromaticIndex: 8 },
  { root: 'Db', namePt: 'Ré bemol Maior', accidentals: '5 bemóis (Bb, Eb, Ab, Db, Gb)', type: 'major', rootChromaticIndex: 1 },

  // 12 Tonalidades Menores
  { root: 'Am', namePt: 'Lá menor', accidentals: 'Relativa de Dó Maior (sem alterações)', type: 'minor', rootChromaticIndex: 9 },
  { root: 'Em', namePt: 'Mi menor', accidentals: '1 sustenido (F#)', type: 'minor', rootChromaticIndex: 4 },
  { root: 'Bm', namePt: 'Si menor', accidentals: '2 sustenidos (F#, C#)', type: 'minor', rootChromaticIndex: 11 },
  { root: 'F#m', namePt: 'Fá# menor', accidentals: '3 sustenidos (F#, C#, G#)', type: 'minor', rootChromaticIndex: 6 },
  { root: 'C#m', namePt: 'Dó# menor', accidentals: '4 sustenidos (F#, C#, G#, D#)', type: 'minor', rootChromaticIndex: 1 },
  { root: 'G#m', namePt: 'Sol# menor', accidentals: '5 sustenidos (F#, C#, G#, D#, A#)', type: 'minor', rootChromaticIndex: 8 },
  { root: 'D#m', namePt: 'Ré# menor', accidentals: '6 sustenidos', type: 'minor', rootChromaticIndex: 3 },
  { root: 'Bbm', namePt: 'Si bemol menor', accidentals: '5 bemóis (Bb, Eb, Ab, Db, Gb)', type: 'minor', rootChromaticIndex: 10 },
  { root: 'Fm', namePt: 'Fá menor', accidentals: '4 bemóis (Bb, Eb, Ab, Db)', type: 'minor', rootChromaticIndex: 5 },
  { root: 'Cm', namePt: 'Dó menor', accidentals: '3 bemóis (Bb, Eb, Ab)', type: 'minor', rootChromaticIndex: 0 },
  { root: 'Gm', namePt: 'Sol menor', accidentals: '2 bemóis (Bb, Eb)', type: 'minor', rootChromaticIndex: 7 },
  { root: 'Dm', namePt: 'Ré menor', accidentals: '1 bemol (Bb)', type: 'minor', rootChromaticIndex: 2 }
];

export interface ScaleDegreePattern {
  degreeNumber: number;
  roman: string;
  name: string;
  triadSuffix: string;
  tetradSuffix: string;
  triadFormula: string;
  tetradFormula: string;
  semitoneOffset: number;
  triadIntervals: number[];
  tetradIntervals: number[];
  intervalNamesTriad: string[];
  intervalNamesTetrad: string[];
  function: 'tonica' | 'subdominante' | 'dominante';
  functionDesc: string;
  didacticTip: string;
}

// Campo Harmônico Maior com Graus em Números Naturais (1 a 7)
export const MAJOR_DEGREES: ScaleDegreePattern[] = [
  {
    degreeNumber: 1,
    roman: '1º',
    name: '1º Grau (Tônica)',
    triadSuffix: '',
    tetradSuffix: '7M',
    triadFormula: 'T - 3M - 5J',
    tetradFormula: 'T - 3M - 5J - 7M',
    semitoneOffset: 0,
    triadIntervals: [0, 4, 7],
    tetradIntervals: [0, 4, 7, 11],
    intervalNamesTriad: ['Tônica', '3ª Maior', '5ª Justa'],
    intervalNamesTetrad: ['Tônica', '3ª Maior', '5ª Justa', '7ª Maior'],
    function: 'tonica',
    functionDesc: 'Estabilidade máxima. É o centro gravitacional da música, o lugar de repouso ("o lar").',
    didacticTip: 'Use para começar e finalizar suas músicas. Transmite clareza, repouso e certeza.'
  },
  {
    degreeNumber: 2,
    roman: '2º',
    name: '2º Grau (Sobretônica)',
    triadSuffix: 'm',
    tetradSuffix: 'm7',
    triadFormula: 'T - 3m - 5J',
    tetradFormula: 'T - 3m - 5J - 7m',
    semitoneOffset: 2,
    triadIntervals: [0, 3, 7],
    tetradIntervals: [0, 3, 7, 10],
    intervalNamesTriad: ['Tônica', '3ª menor', '5ª Justa'],
    intervalNamesTetrad: ['Tônica', '3ª menor', '5ª Justa', '7ª menor'],
    function: 'subdominante',
    functionDesc: 'Afastamento suave. Prepara perfeitamente o caminho para o 5º grau na famosa cadência 2-5-1.',
    didacticTip: 'O acorde mais usado no jazz, bossa nova e MPB como ponte para o dominante.'
  },
  {
    degreeNumber: 3,
    roman: '3º',
    name: '3º Grau (Mediante)',
    triadSuffix: 'm',
    tetradSuffix: 'm7',
    triadFormula: 'T - 3m - 5J',
    tetradFormula: 'T - 3m - 5J - 7m',
    semitoneOffset: 4,
    triadIntervals: [0, 3, 7],
    tetradIntervals: [0, 3, 7, 10],
    intervalNamesTriad: ['Tônica', '3ª menor', '5ª Justa'],
    intervalNamesTetrad: ['Tônica', '3ª menor', '5ª Justa', '7ª menor'],
    function: 'tonica',
    functionDesc: 'Função de tônica com nuance suave. Possui notas em comum com o 1º e com o 5º grau.',
    didacticTip: 'Excelente para substituir o 1º grau quando você quer um clima mais reflexivo e suave.'
  },
  {
    degreeNumber: 4,
    roman: '4º',
    name: '4º Grau (Subdominante)',
    triadSuffix: '',
    tetradSuffix: '7M',
    triadFormula: 'T - 3M - 5J',
    tetradFormula: 'T - 3M - 5J - 7M',
    semitoneOffset: 5,
    triadIntervals: [0, 4, 7],
    tetradIntervals: [0, 4, 7, 11],
    intervalNamesTriad: ['Tônica', '3ª Maior', '5ª Justa'],
    intervalNamesTetrad: ['Tônica', '3ª Maior', '5ª Justa', '7ª Maior'],
    function: 'subdominante',
    functionDesc: 'Sensação de viagem e expansão. Não gera a tensão extrema do 5º grau, mas convida ao movimento.',
    didacticTip: 'O acorde heróico das baladas pop. A passagem do 1º para o 4º grau sempre soa grandiosa.'
  },
  {
    degreeNumber: 5,
    roman: '5º',
    name: '5º Grau (Dominante)',
    triadSuffix: '',
    tetradSuffix: '7',
    triadFormula: 'T - 3M - 5J',
    tetradFormula: 'T - 3M - 5J - 7m',
    semitoneOffset: 7,
    triadIntervals: [0, 4, 7],
    tetradIntervals: [0, 4, 7, 10],
    intervalNamesTriad: ['Tônica', '3ª Maior', '5ª Justa'],
    intervalNamesTetrad: ['Tônica', '3ª Maior', '5ª Justa', '7ª menor'],
    function: 'dominante',
    functionDesc: 'Tensão máxima! Na tétrade com 7ª, contém o famoso Trítono, que anseia pela resolução no 1º grau.',
    didacticTip: 'Ao tocar o 5º grau, sinta como os ouvidos pedem imediatamente para voltar para o 1º grau!'
  },
  {
    degreeNumber: 6,
    roman: '6º',
    name: '6º Grau (Relativa Menor)',
    triadSuffix: 'm',
    tetradSuffix: 'm7',
    triadFormula: 'T - 3m - 5J',
    tetradFormula: 'T - 3m - 5J - 7m',
    semitoneOffset: 9,
    triadIntervals: [0, 3, 7],
    tetradIntervals: [0, 3, 7, 10],
    intervalNamesTriad: ['Tônica', '3ª menor', '5ª Justa'],
    intervalNamesTetrad: ['Tônica', '3ª menor', '5ª Justa', '7ª menor'],
    function: 'tonica',
    functionDesc: 'A Relativa Menor da tonalidade. Compartilha notas com o 1º grau e traz tom acolhedor e emotivo.',
    didacticTip: 'A alma de progressões pop como 1 - 5 - 6 - 4. Traz toda a emoção das canções.'
  },
  {
    degreeNumber: 7,
    roman: '7º',
    name: '7º Grau (Sensível)',
    triadSuffix: '°',
    tetradSuffix: 'm7(b5)',
    triadFormula: 'T - 3m - 5dim',
    tetradFormula: 'T - 3m - 5dim - 7m',
    semitoneOffset: 11,
    triadIntervals: [0, 3, 6],
    tetradIntervals: [0, 3, 6, 10],
    intervalNamesTriad: ['Tônica', '3ª menor', '5ª diminuta'],
    intervalNamesTetrad: ['Tônica', '3ª menor', '5ª diminuta', '7ª menor'],
    function: 'dominante',
    functionDesc: 'Acorde diminuto / meio-diminuto. Altamente instável por conter a sensível e a 5ª diminuta.',
    didacticTip: 'Muito usado em preparações 2-5 de acordes menores, no samba, choro e jazz.'
  }
];

// Campo Harmônico Menor Natural com Graus em Números Naturais (1 a 7)
export const MINOR_DEGREES: ScaleDegreePattern[] = [
  {
    degreeNumber: 1,
    roman: '1º',
    name: '1º Grau (Tônica Menor)',
    triadSuffix: 'm',
    tetradSuffix: 'm7',
    triadFormula: 'T - 3m - 5J',
    tetradFormula: 'T - 3m - 5J - 7m',
    semitoneOffset: 0,
    triadIntervals: [0, 3, 7],
    tetradIntervals: [0, 3, 7, 10],
    intervalNamesTriad: ['Tônica', '3ª menor', '5ª Justa'],
    intervalNamesTetrad: ['Tônica', '3ª menor', '5ª Justa', '7ª menor'],
    function: 'tonica',
    functionDesc: 'O centro do tom menor. Clima denso, introspectivo, reflexivo ou dramático.',
    didacticTip: 'Base para o rock, música clássica dramática, pop melancólico e ritmos latinos.'
  },
  {
    degreeNumber: 2,
    roman: '2º',
    name: '2º Grau (Meio-diminuto)',
    triadSuffix: '°',
    tetradSuffix: 'm7(b5)',
    triadFormula: 'T - 3m - 5dim',
    tetradFormula: 'T - 3m - 5dim - 7m',
    semitoneOffset: 2,
    triadIntervals: [0, 3, 6],
    tetradIntervals: [0, 3, 6, 10],
    intervalNamesTriad: ['Tônica', '3ª menor', '5ª diminuta'],
    intervalNamesTetrad: ['Tônica', '3ª menor', '5ª diminuta', '7ª menor'],
    function: 'subdominante',
    functionDesc: 'Subdominante no tom menor. Na tétrade, forma o clássico 2º grau meio-diminuto na cadência 2-5-1.',
    didacticTip: 'Toque o grau 2 seguido do grau 5 e grau 1 para sentir a cadência mais famosa da música brasileira!'
  },
  {
    degreeNumber: 3,
    roman: '3º',
    name: '3º Grau (Relativa Maior)',
    triadSuffix: '',
    tetradSuffix: '7M',
    triadFormula: 'T - 3M - 5J',
    tetradFormula: 'T - 3M - 5J - 7M',
    semitoneOffset: 3,
    triadIntervals: [0, 4, 7],
    tetradIntervals: [0, 4, 7, 11],
    intervalNamesTriad: ['Tônica', '3ª Maior', '5ª Justa'],
    intervalNamesTetrad: ['Tônica', '3ª Maior', '5ª Justa', '7ª Maior'],
    function: 'tonica',
    functionDesc: 'A Relativa Maior do tom menor. Dá um sopro de esperança e claridade dentro da tonalidade menor.',
    didacticTip: 'Muitas canções alternam entre o tom do 1º grau e seu 3º grau para contrastar estrofe e refrão.'
  },
  {
    degreeNumber: 4,
    roman: '4º',
    name: '4º Grau (Subdominante)',
    triadSuffix: 'm',
    tetradSuffix: 'm7',
    triadFormula: 'T - 3m - 5J',
    tetradFormula: 'T - 3m - 5J - 7m',
    semitoneOffset: 5,
    triadIntervals: [0, 3, 7],
    tetradIntervals: [0, 3, 7, 10],
    intervalNamesTriad: ['Tônica', '3ª menor', '5ª Justa'],
    intervalNamesTetrad: ['Tônica', '3ª menor', '5ª Justa', '7ª menor'],
    function: 'subdominante',
    functionDesc: 'Movimento escuro e profundo que conduz harmoniosamente para o dominante ou de volta para o 1º grau.',
    didacticTip: 'O 4º grau menor tem som nostálgico muito característico do blues, rock clássico e boleros.'
  },
  {
    degreeNumber: 5,
    roman: '5º',
    name: '5º Grau (Dominante)',
    triadSuffix: 'm',
    tetradSuffix: '7',
    triadFormula: 'T - 3m - 5J (ou 5 maior)',
    tetradFormula: 'T - 3M - 5J - 7m (Dominante)',
    semitoneOffset: 7,
    triadIntervals: [0, 4, 7],
    tetradIntervals: [0, 4, 7, 10],
    intervalNamesTriad: ['Tônica', '3ª Maior', '5ª Justa'],
    intervalNamesTetrad: ['Tônica', '3ª Maior', '5ª Justa', '7ª menor'],
    function: 'dominante',
    functionDesc: 'Na prática musical, o 5º grau do tom menor é tocado MAIOR (com 7ª) para criar atração harmônica.',
    didacticTip: 'Na escala menor natural ele seria menor, mas elevamos a terça para criar o acorde dominante 5.'
  },
  {
    degreeNumber: 6,
    roman: '6º',
    name: '6º Grau (Subdominante Maior)',
    triadSuffix: '',
    tetradSuffix: '7M',
    triadFormula: 'T - 3M - 5J',
    tetradFormula: 'T - 3M - 5J - 7M',
    semitoneOffset: 8,
    triadIntervals: [0, 4, 7],
    tetradIntervals: [0, 4, 7, 11],
    intervalNamesTriad: ['Tônica', '3ª Maior', '5ª Justa'],
    intervalNamesTetrad: ['Tônica', '3ª Maior', '5ª Justa', '7ª Maior'],
    function: 'subdominante',
    functionDesc: 'Acorde épico! Traz uma sensação heroica muito comum em trilhas sonoras de cinema e videogame.',
    didacticTip: 'A famosa cadência 1 - 6 - 7 - 1 é a assinatura sonora do rock e de temas de fantasia.'
  },
  {
    degreeNumber: 7,
    roman: '7º',
    name: '7º Grau (Subtônica)',
    triadSuffix: '',
    tetradSuffix: '7',
    triadFormula: 'T - 3M - 5J',
    tetradFormula: 'T - 3M - 5J - 7m',
    semitoneOffset: 10,
    triadIntervals: [0, 4, 7],
    tetradIntervals: [0, 4, 7, 10],
    intervalNamesTriad: ['Tônica', '3ª Maior', '5ª Justa'],
    intervalNamesTetrad: ['Tônica', '3ª Maior', '5ª Justa', '7ª menor'],
    function: 'dominante',
    functionDesc: 'No tom menor natural, este acorde maior prepara o retorno à tônica menor ou conduz para a relativa.',
    didacticTip: 'Muito usado no pop moderno para transições suaves e esperançosas.'
  }
];

export interface ChordTypeDefinition {
  suffix: string;
  namePt: string;
  formula: string;
  intervals: number[];
  intervalNames: string[];
}

export const CHORD_TYPES_DICTIONARY: ChordTypeDefinition[] = [
  { suffix: '', namePt: 'Maior (Tríade)', formula: 'T - 3M - 5J', intervals: [0, 4, 7], intervalNames: ['Tônica', '3ª Maior', '5ª Justa'] },
  { suffix: 'm', namePt: 'Menor (Tríade)', formula: 'T - 3m - 5J', intervals: [0, 3, 7], intervalNames: ['Tônica', '3ª menor', '5ª Justa'] },
  { suffix: '7M', namePt: 'Maior com Sétima Maior', formula: 'T - 3M - 5J - 7M', intervals: [0, 4, 7, 11], intervalNames: ['Tônica', '3ª Maior', '5ª Justa', '7ª Maior'] },
  { suffix: '7', namePt: 'Dominante (7ª menor)', formula: 'T - 3M - 5J - 7m', intervals: [0, 4, 7, 10], intervalNames: ['Tônica', '3ª Maior', '5ª Justa', '7ª menor'] },
  { suffix: 'm7', namePt: 'Menor com Sétima', formula: 'T - 3m - 5J - 7m', intervals: [0, 3, 7, 10], intervalNames: ['Tônica', '3ª menor', '5ª Justa', '7ª menor'] },
  { suffix: 'm7(b5)', namePt: 'Meio-Diminuto', formula: 'T - 3m - 5dim - 7m', intervals: [0, 3, 6, 10], intervalNames: ['Tônica', '3ª menor', '5ª diminuta', '7ª menor'] },
  { suffix: '°', namePt: 'Diminuto', formula: 'T - 3m - 5dim - 7dim', intervals: [0, 3, 6, 9], intervalNames: ['Tônica', '3ª menor', '5ª diminuta', '7ª diminuta'] },
  { suffix: 'sus4', namePt: 'Suspenso 4', formula: 'T - 4J - 5J', intervals: [0, 5, 7], intervalNames: ['Tônica', '4ª Justa', '5ª Justa'] },
  { suffix: 'add9', namePt: 'Com Nona Adicionada', formula: 'T - 3M - 5J - 9M', intervals: [0, 4, 7, 14], intervalNames: ['Tônica', '3ª Maior', '5ª Justa', '9ª Maior'] },
  { suffix: '6', namePt: 'Sexta Maior', formula: 'T - 3M - 5J - 6M', intervals: [0, 4, 7, 9], intervalNames: ['Tônica', '3ª Maior', '5ª Justa', '6ª Maior'] },
  { suffix: 'm6', namePt: 'Menor com Sexta', formula: 'T - 3m - 5J - 6M', intervals: [0, 3, 7, 9], intervalNames: ['Tônica', '3ª menor', '5ª Justa', '6ª Maior'] },
  { suffix: 'aug', namePt: 'Aumentado', formula: 'T - 3M - 5aum', intervals: [0, 4, 8], intervalNames: ['Tônica', '3ª Maior', '5ª Aumentada'] }
];

export interface KeyDef {
  midi: number;
  noteName: string;
  pitchClass: number;
  isBlack: boolean;
  octave: number;
  keyIndex: number;
}

export const OCTAVE_START_MIDI = 48; // C3
export const TOTAL_KEYS = 25; // C3 a C5 (2 oitavas completas + C final)

export const KEYBOARD_KEYS: KeyDef[] = Array.from({ length: TOTAL_KEYS }, (_, i) => {
  const midi = OCTAVE_START_MIDI + i;
  const pitchClass = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  const noteLetter = CHROMATIC_NAMES_SHARP[pitchClass];
  const isBlack = [1, 3, 6, 8, 10].includes(pitchClass);

  return {
    midi,
    noteName: `${noteLetter}${octave}`,
    pitchClass,
    isBlack,
    octave,
    keyIndex: i
  };
});

export const FINGER_RECOMMENDATIONS: Record<string, { right: number[]; left: number[] }> = {
  'triad_0': { right: [1, 3, 5], left: [5, 3, 1] },
  'triad_1': { right: [1, 2, 5], left: [5, 3, 1] },
  'triad_2': { right: [1, 3, 5], left: [5, 2, 1] },
  'tetrad_0': { right: [1, 2, 3, 5], left: [5, 4, 2, 1] },
  'tetrad_1': { right: [1, 2, 3, 5], left: [5, 3, 2, 1] },
  'tetrad_2': { right: [1, 2, 4, 5], left: [5, 3, 2, 1] },
  'tetrad_3': { right: [1, 2, 4, 5], left: [5, 4, 2, 1] }
};

export interface CadencePreset {
  id: string;
  name: string;
  tag: string;
  description: string;
  degrees: number[];
}

export const FAMOUS_CADENCES: CadencePreset[] = [
  {
    id: 'pop',
    name: 'Os 4 Acordes Mais Famosos do Pop',
    tag: 'Pop / Rock',
    description: 'A progressão usada em sucessos mundiais (Let It Be, Someone Like You, Don\'t Stop Believin\').',
    degrees: [0, 4, 5, 3]
  },
  {
    id: 'perfeita',
    name: 'Cadência Clássica Perfeita',
    tag: 'Clássico',
    description: 'Movimento equilibrado: sai da Tônica, viaja pela Subdominante, gera tensão no Dominante e repousa.',
    degrees: [0, 3, 4, 0]
  },
  {
    id: 'jazz',
    name: 'O Lendário 2 - 5 - 1',
    tag: 'Bossa / Jazz',
    description: 'A cadência definitiva da harmonia moderna. Prepara a tônica de forma sofisticada e elegante.',
    degrees: [1, 4, 0]
  },
  {
    id: 'emotiva',
    name: 'Balada Emotiva',
    tag: 'Cinema / Balada',
    description: 'Inicia na relativa menor, gerando introspecção, e caminha de volta para a luz da tonalidade.',
    degrees: [5, 3, 0, 4]
  }
];

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/* =====================================================================
   3. COMPONENTE PRINCIPAL (Caderno Didático Interativo)
   ===================================================================== */
export default function App() {
  const [selectedTonalityRoot, setSelectedTonalityRoot] = useState<string>('C');
  const [isTetradMode, setIsTetradMode] = useState<boolean>(false);
  const [selectedDegreeIndex, setSelectedDegreeIndex] = useState<number>(0);
  const [inversionIndex, setInversionIndex] = useState<number>(0);
  const [selectedHand, setSelectedHand] = useState<'right' | 'left'>('right');

  // Modo de Enquadramento no Teclado: 'fit', 'zoom', 'scroll'
  const [keyboardViewMode, setKeyboardViewMode] = useState<'fit' | 'zoom' | 'scroll'>('fit');
  const [isTonalityDrawerOpen, setIsTonalityDrawerOpen] = useState<boolean>(false);

  // Busca e Dicionário Livre
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customChordMode, setCustomChordMode] = useState<boolean>(false);
  const [customRootIndex, setCustomRootIndex] = useState<number>(0);
  const [customTypeIndex, setCustomTypeIndex] = useState<number>(0);

  // Áudio & Reprodução
  const [isPlayingProgression, setIsPlayingProgression] = useState<boolean>(false);
  const [activePlayingIndex, setActivePlayingIndex] = useState<number | null>(null);
  const [lastPressedKey, setLastPressedKey] = useState<number | null>(null);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Navegação do Caderno (Abas Didáticas)
  const [activeTab, setActiveTab] = useState<'campo' | 'desafios' | 'cadencias' | 'dicionario' | 'guia'>('campo');

  // Checklist interativo de aprendizagem do aluno
  const [checklist, setChecklist] = useState({
    grau1: true,
    dominante: false,
    inversao: false,
    cadencia: false
  });

  // Desafios Didáticos Práticos (Quiz)
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizAnswerFeedback, setQuizAnswerFeedback] = useState<string | null>(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);

  // Exportação PNG
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // PWA (Progressive Web App) & Offline State
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  const currentTonality = useMemo(() => {
    return TONALITIES.find(t => t.root === selectedTonalityRoot) || TONALITIES[0];
  }, [selectedTonalityRoot]);

  const activeDegreeList = useMemo(() => {
    return currentTonality.type === 'major' ? MAJOR_DEGREES : MINOR_DEGREES;
  }, [currentTonality]);

  const currentDegree = activeDegreeList[selectedDegreeIndex] || activeDegreeList[0];

  const currentChordData = useMemo(() => {
    if (customChordMode) {
      const chordType = CHORD_TYPES_DICTIONARY[customTypeIndex] || CHORD_TYPES_DICTIONARY[0];
      const rootChromatic = customRootIndex;
      const rootName = CHROMATIC_NAMES_SHARP[rootChromatic];
      const chordName = `${rootName}${chordType.suffix}`;
      const intervals = chordType.intervals;
      const intervalNames = chordType.intervalNames;
      const formula = chordType.formula;

      return {
        chordName,
        rootName,
        suffix: chordType.suffix,
        formula,
        intervals,
        intervalNames,
        rootChromatic,
        degreeRoman: 'Avulso',
        degreeName: chordType.namePt,
        functionType: 'tonica' as const,
        functionDesc: 'Acorde selecionado livremente no dicionário.',
        didacticTip: 'Explore as inversões e veja como o dedilhado se adapta no teclado.',
        numNotes: intervals.length
      };
    } else {
      const rootChromatic = (currentTonality.rootChromaticIndex + currentDegree.semitoneOffset) % 12;
      const rootName = CHROMATIC_NAMES_SHARP[rootChromatic];
      const suffix = isTetradMode ? currentDegree.tetradSuffix : currentDegree.triadSuffix;
      const chordName = `${rootName}${suffix}`;
      const intervals = isTetradMode ? currentDegree.tetradIntervals : currentDegree.triadIntervals;
      const intervalNames = isTetradMode ? currentDegree.intervalNamesTetrad : currentDegree.intervalNamesTriad;
      const formula = isTetradMode ? currentDegree.tetradFormula : currentDegree.triadFormula;

      return {
        chordName,
        rootName,
        suffix,
        formula,
        intervals,
        intervalNames,
        rootChromatic,
        degreeRoman: currentDegree.roman,
        degreeName: currentDegree.name,
        functionType: currentDegree.function,
        functionDesc: currentDegree.functionDesc,
        didacticTip: currentDegree.didacticTip,
        numNotes: intervals.length
      };
    }
  }, [customChordMode, customRootIndex, customTypeIndex, currentTonality, currentDegree, isTetradMode]);

  // Cálculo das notas com a inversão selecionada
  const invertedIntervals = useMemo(() => {
    const orig = [...currentChordData.intervals];
    const n = orig.length;
    const inv = inversionIndex % n;

    if (inv === 0) return orig;

    const shifted = orig.map((interval, i) => {
      if (i < inv) {
        return interval + 12;
      }
      return interval;
    });

    return shifted.sort((a, b) => a - b);
  }, [currentChordData.intervals, inversionIndex]);

  // Dedilhado recomendado
  const fingerArray = useMemo(() => {
    const isTetrad = currentChordData.numNotes >= 4;
    const key = `${isTetrad ? 'tetrad' : 'triad'}_${inversionIndex % (isTetrad ? 4 : 3)}`;
    const rec = FINGER_RECOMMENDATIONS[key] || FINGER_RECOMMENDATIONS['triad_0'];
    return selectedHand === 'right' ? rec.right : rec.left;
  }, [currentChordData.numNotes, inversionIndex, selectedHand]);

  // Mapeamento das notas no teclado de 2 oitavas
  const chordKeysMapping = useMemo(() => {
    const rootChrom = currentChordData.rootChromatic;
    const lowestNoteMidi = OCTAVE_START_MIDI + rootChrom;
    let baseMidi = lowestNoteMidi;

    const maxShift = Math.max(...invertedIntervals);
    if (baseMidi + maxShift > OCTAVE_START_MIDI + 24) {
      baseMidi -= 12;
    }

    return invertedIntervals.map((interval, idx) => {
      const midi = baseMidi + interval;
      const keyIndex = midi - OCTAVE_START_MIDI;
      const isBass = idx === 0;
      const isRoot = (midi % 12) === rootChrom;
      const cleanInterval = interval % 12;
      const origIntervalIdx = currentChordData.intervals.indexOf(cleanInterval);
      const intervalName = origIntervalIdx !== -1 ? currentChordData.intervalNames[origIntervalIdx] : 'Nota';
      const finger = fingerArray[idx] || (idx + 1);
      const keyDef = KEYBOARD_KEYS.find(k => k.midi === midi);
      const noteName = keyDef ? keyDef.noteName : `${CHROMATIC_NAMES_SHARP[midi % 12]}`;

      return {
        midi,
        keyIndex,
        isBass,
        isRoot,
        intervalName,
        finger,
        noteName,
        isBlack: keyDef ? keyDef.isBlack : false
      };
    }).filter(item => item.keyIndex >= 0 && item.keyIndex < TOTAL_KEYS);
  }, [invertedIntervals, currentChordData, fingerArray]);

  const activeKeyIndices = useMemo(() => {
    return new Set(chordKeysMapping.map(k => k.keyIndex));
  }, [chordKeysMapping]);

  const activeMidiFrequencies = useMemo(() => {
    return chordKeysMapping.map(k => midiToFreq(k.midi));
  }, [chordKeysMapping]);

  // Auto tocar acorde
  const handlePlayChord = () => {
    if (activeMidiFrequencies.length > 0) {
      synth.playChord(activeMidiFrequencies, 2.2);
    }
    // Marcar no checklist
    if (currentDegree.degreeNumber === 1) {
      setChecklist(prev => ({ ...prev, grau1: true }));
    } else if (currentDegree.degreeNumber === 5) {
      setChecklist(prev => ({ ...prev, dominante: true }));
    }
  };

  // Tocar arpejo
  const handlePlayArpeggio = () => {
    chordKeysMapping.forEach((item, index) => {
      setTimeout(() => {
        synth.playNote(midiToFreq(item.midi), 1.6, 0.85);
        setLastPressedKey(item.keyIndex);
        setTimeout(() => setLastPressedKey(null), 300);
      }, index * 260);
    });
  };

  // Tocar tecla individual
  const handleKeyClick = (keyDef: KeyDef) => {
    synth.playNote(midiToFreq(keyDef.midi), 1.2, 0.85);
    setLastPressedKey(keyDef.keyIndex);
    setTimeout(() => setLastPressedKey(null), 250);
  };

  // Tocar sequência de acordes de uma cadência
  const handlePlayProgression = (degrees: number[]) => {
    if (isPlayingProgression) return;
    setIsPlayingProgression(true);
    setChecklist(prev => ({ ...prev, cadencia: true }));

    degrees.forEach((degIdx, i) => {
      setTimeout(() => {
        setActivePlayingIndex(degIdx);
        const deg = activeDegreeList[degIdx] || activeDegreeList[0];
        const rootChrom = (currentTonality.rootChromaticIndex + deg.semitoneOffset) % 12;
        const intervals = isTetradMode ? deg.tetradIntervals : deg.triadIntervals;

        const freqs = intervals.map(inter => {
          let midi = OCTAVE_START_MIDI + rootChrom + inter;
          if (midi > OCTAVE_START_MIDI + 24) midi -= 12;
          return midiToFreq(midi);
        });

        synth.playChord(freqs, 1.8);

        if (i === degrees.length - 1) {
          setTimeout(() => {
            setIsPlayingProgression(false);
            setActivePlayingIndex(null);
          }, 1800);
        }
      }, i * 1600);
    });
  };

  // Busca rápida de acordes
  const filteredChords = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.trim().toLowerCase();
    const results: Array<{ rootIndex: number; typeIndex: number; chordName: string; label: string }> = [];

    CHROMATIC_NAMES_SHARP.forEach((root, rIdx) => {
      CHORD_TYPES_DICTIONARY.forEach((type, tIdx) => {
        const fullChord = `${root}${type.suffix}`;
        const ptFull = `${CHROMATIC_PT[root] || root} ${type.namePt}`;

        if (
          fullChord.toLowerCase().includes(query) ||
          ptFull.toLowerCase().includes(query) ||
          (query === 'c' && root === 'C') ||
          (query === 'g' && root === 'G')
        ) {
          results.push({
            rootIndex: rIdx,
            typeIndex: tIdx,
            chordName: fullChord,
            label: ptFull
          });
        }
      });
    });

    return results.slice(0, 8);
  }, [searchQuery]);

  // Exportar Ficha Didática em PNG
  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    setIsExporting(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1100;
    const height = 740;
    const scale = 2; // Alta resolução para impressão
    canvas.width = width * scale;
    canvas.height = height * scale;

    ctx.scale(scale, scale);

    // Fundo papel de caderno didático
    ctx.fillStyle = '#fefcf9';
    ctx.fillRect(0, 0, width, height);

    // Borda do caderno
    ctx.strokeStyle = '#e2d9cc';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Faixa amarela de marca texto no topo
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.roundRect(50, 45, 340, 32, 6);
    ctx.fill();

    ctx.fillStyle = '#854d0e';
    ctx.font = 'bold 13px "Outfit", sans-serif';
    ctx.fillText('FICHA DIDÁTICA DE HARMONIA & PIANO', 65, 66);

    // Título do Acorde
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 46px "Outfit", sans-serif';
    ctx.fillText(currentChordData.chordName, 50, 130);

    ctx.fillStyle = '#475569';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    const ptFullName = `${CHROMATIC_PT[currentChordData.rootName] || currentChordData.rootName} ${currentChordData.degreeName}`;
    ctx.fillText(ptFullName, 50, 160);

    // Pílulas de Informações Didáticas
    const infoPills = [
      `Tonalidade: ${currentTonality.namePt}`,
      currentChordData.degreeRoman === 'Avulso' ? 'Grau: Avulso' : `Grau: ${currentChordData.degreeRoman} Grau`,
      `Função: ${currentChordData.functionType.toUpperCase()}`,
      `Inversão: ${inversionIndex === 0 ? 'Fundamental' : `${inversionIndex}ª Inversão`}`,
      `Fórmula: ${currentChordData.formula}`
    ];

    let pillX = 50;
    infoPills.forEach((pillText) => {
      ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
      const textWidth = ctx.measureText(pillText).width;

      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(pillX, 185, textWidth + 20, 28, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.fillText(pillText, pillX + 10, 204);

      pillX += textWidth + 28;
    });

    // Notas do Acorde
    ctx.fillStyle = '#334155';
    ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('NOTAS NO TECLADO:', 50, 252);

    let noteBadgeX = 210;
    chordKeysMapping.forEach((item) => {
      const cleanNoteName = item.noteName.replace(/[0-9]/g, '');
      const badgeText = `${cleanNoteName} (${item.intervalName})`;
      ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
      const w = ctx.measureText(badgeText).width;

      ctx.fillStyle = item.isRoot ? '#fef08a' : '#bae6fd';
      ctx.beginPath();
      ctx.roundRect(noteBadgeX, 235, w + 18, 26, 6);
      ctx.fill();

      ctx.fillStyle = item.isRoot ? '#854d0e' : '#0369a1';
      ctx.fillText(badgeText, noteBadgeX + 9, 253);

      noteBadgeX += w + 24;
    });

    // Teclado Realista
    const kbX = 50;
    const kbY = 285;
    const kbW = width - 100;
    const kbH = 260;

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(kbX - 6, kbY - 12, kbW + 12, kbH + 24, 8);
    ctx.fill();

    // Faixa de feltro vermelho
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(kbX, kbY - 4, kbW, 5);

    const whiteKeysIndices = KEYBOARD_KEYS.filter(k => !k.isBlack).map(k => k.keyIndex);
    const numWhiteKeys = whiteKeysIndices.length;
    const whiteKeyWidth = kbW / numWhiteKeys;
    const whiteKeyHeight = kbH;

    const keyPositionsX: Record<number, { x: number; isBlack: boolean }> = {};

    let whiteCount = 0;
    KEYBOARD_KEYS.forEach((keyDef) => {
      if (!keyDef.isBlack) {
        const x = kbX + whiteCount * whiteKeyWidth;
        keyPositionsX[keyDef.keyIndex] = { x, isBlack: false };
        whiteCount++;
      }
    });

    KEYBOARD_KEYS.forEach((keyDef) => {
      if (keyDef.isBlack) {
        const prevWhite = keyPositionsX[keyDef.keyIndex - 1];
        if (prevWhite) {
          const x = prevWhite.x + whiteKeyWidth * 0.7;
          keyPositionsX[keyDef.keyIndex] = { x, isBlack: true };
        }
      }
    });

    // Desenhar teclas brancas
    KEYBOARD_KEYS.filter(k => !k.isBlack).forEach((keyDef) => {
      const pos = keyPositionsX[keyDef.keyIndex];
      const isChordKey = activeKeyIndices.has(keyDef.keyIndex);
      const chordKeyInfo = chordKeysMapping.find(k => k.keyIndex === keyDef.keyIndex);

      ctx.fillStyle = isChordKey ? (chordKeyInfo?.isRoot ? '#fef08a' : '#bae6fd') : '#ffffff';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(pos.x, kbY, whiteKeyWidth - 1, whiteKeyHeight, [0, 0, 5, 5]);
      ctx.fill();
      ctx.stroke();

      if (isChordKey && chordKeyInfo) {
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(pos.x + whiteKeyWidth / 2 - 0.5, kbY + whiteKeyHeight - 45, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`D${chordKeyInfo.finger}`, pos.x + whiteKeyWidth / 2 - 0.5, kbY + whiteKeyHeight - 41);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(keyDef.noteName.replace(/[0-9]/g, ''), pos.x + whiteKeyWidth / 2 - 0.5, kbY + whiteKeyHeight - 16);
        ctx.textAlign = 'left';
      }
    });

    // Desenhar teclas pretas
    const blackKeyWidth = whiteKeyWidth * 0.62;
    const blackKeyHeight = whiteKeyHeight * 0.62;

    KEYBOARD_KEYS.filter(k => k.isBlack).forEach((keyDef) => {
      const pos = keyPositionsX[keyDef.keyIndex];
      if (!pos) return;
      const isChordKey = activeKeyIndices.has(keyDef.keyIndex);
      const chordKeyInfo = chordKeysMapping.find(k => k.keyIndex === keyDef.keyIndex);

      ctx.fillStyle = isChordKey ? (chordKeyInfo?.isRoot ? '#f59e0b' : '#0284c7') : '#18181b';
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(pos.x, kbY, blackKeyWidth, blackKeyHeight, [0, 0, 4, 4]);
      ctx.fill();
      ctx.stroke();

      if (isChordKey && chordKeyInfo) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pos.x + blackKeyWidth / 2, kbY + blackKeyHeight - 24, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`D${chordKeyInfo.finger}`, pos.x + blackKeyWidth / 2, kbY + blackKeyHeight - 20);
        ctx.textAlign = 'left';
      }
    });

    // Cartão Post-it Inferior
    const postItY = 575;
    ctx.fillStyle = '#fef9c3';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(50, postItY, width - 100, 100, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#854d0e';
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('💡 DICA DIDÁTICA DO PROFESSOR:', 70, postItY + 32);

    ctx.fillStyle = '#713f12';
    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(currentChordData.functionDesc, 70, postItY + 58);
    ctx.fillText(`Prática: ${currentChordData.didacticTip}`, 70, postItY + 80);

    // Rodapé
    ctx.fillStyle = '#64748b';
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Harmonia · Caderno Didático · Desenvolvido por Tio Wander 🎹', 50, 715);

    setTimeout(() => {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Ficha_${currentChordData.chordName}_Harmonia.png`;
      link.href = dataUrl;
      link.click();
      setIsExporting(false);
    }, 200);
  };

  // Desafios Didáticos Interativos (Quizzes de Fixação)
  const QUIZ_QUESTIONS = [
    {
      id: 1,
      title: 'Desafio 1: Tônica & Centro',
      question: 'Qual é o Grau 1 (Tônica) no campo harmônico de Dó Maior (C)?',
      options: ['C (Dó Maior)', 'G (Sol Maior)', 'Am (Lá menor)', 'F (Fá Maior)'],
      correctIndex: 0,
      tip: 'A tônica é sempre o 1º grau que dá nome à tonalidade!'
    },
    {
      id: 2,
      title: 'Desafio 2: Tensão Máxima',
      question: 'No tom de Dó Maior, qual acorde é o 5º Grau (Dominante) que pede resolução imediata?',
      options: ['Dm7', 'Em7', 'G7 (Sol com Sétima)', 'F7M'],
      correctIndex: 2,
      tip: 'O 5º grau fica 7 semitons acima da tônica e contém o trítono!'
    },
    {
      id: 3,
      title: 'Desafio 3: Segredo das Inversões',
      question: 'O que acontece ao tocar um acorde na 1ª Inversão?',
      options: [
        'O acorde muda de nome e vira menor',
        'A terça do acorde passa a ser a nota mais grave (no baixo)',
        'Todas as notas sobem uma oitava inteira',
        'O acorde perde a sua função'
      ],
      correctIndex: 1,
      tip: 'Inverter significa mudar a ordem das notas, colocando a terça ou a quinta no baixo!'
    },
    {
      id: 4,
      title: 'Desafio 4: A Fórmula do Pop',
      question: 'Qual é a progressão de graus mais famosa da história do Pop mundial?',
      options: [
        'Grau 1 - Grau 5 - Grau 6 - Grau 4',
        'Grau 7 - Grau 3 - Grau 2 - Grau 1',
        'Grau 2 - Grau 2 - Grau 2 - Grau 2',
        'Grau 4 - Grau 4 - Grau 5 - Grau 5'
      ],
      correctIndex: 0,
      tip: 'Usada em Let It Be, Someone Like You e centenas de sucessos!'
    }
  ];

  const handleAnswerQuiz = (selectedOptIdx: number) => {
    const q = QUIZ_QUESTIONS[currentQuizIndex];
    if (selectedOptIdx === q.correctIndex) {
      synth.playCelebration();
      setQuizScore(prev => prev + 1);
      setQuizAnswerFeedback('correto');
    } else {
      synth.playChord([261.63, 277.18], 0.6); // tom dissonante didático
      setQuizAnswerFeedback('incorreto');
    }
  };

  const completedChecklistCount = Object.values(checklist).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#f4efe6] text-slate-800 flex flex-col font-sans selection:bg-amber-200 selection:text-amber-950">
      {/* Canvas escondido para renderização PNG em alta resolução */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ===================================================================
          BARRA DE NAVEGAÇÃO SUPERIOR DO CADERNO DIDÁTICO
          =================================================================== */}
      <header className="sticky top-0 z-40 bg-[#fefcf8]/95 backdrop-blur-md border-b-2 border-[#e8dfd1] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-xs">
        {/* Marca / Identidade */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-lg shadow-xs rotate-[-2deg]">
            🎹
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg text-[#1e3a8a] tracking-tight">
              Harmonia
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md rotate-[-1deg]">
              Caderno Didático
            </span>
          </div>
        </div>

        {/* Abas Superiores Rápidas (Desktop / Tablet) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#f3ede2] p-1 rounded-xl border border-[#ded5c6]">
          <button
            onClick={() => setActiveTab('campo')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'campo'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#eae1d0]'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            Teclado & Acordes
          </button>
          <button
            onClick={() => setActiveTab('desafios')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'desafios'
                ? 'bg-amber-500 text-amber-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#eae1d0]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Missões Práticas
          </button>
          <button
            onClick={() => setActiveTab('cadencias')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'cadencias'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#eae1d0]'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            Cadências Pop
          </button>
          <button
            onClick={() => setActiveTab('dicionario')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'dicionario'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#eae1d0]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Dicionário
          </button>
          <button
            onClick={() => setActiveTab('guia')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'guia'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#eae1d0]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Apostila
          </button>
        </nav>

        {/* Controles de Som & Ações */}
        <div className="flex items-center gap-2">
          {/* Som / Volume */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#f3ede2] border border-[#ded5c6]">
            <button
              onClick={() => {
                const muted = synth.toggleMute();
                setIsMuted(muted);
              }}
              title={isMuted ? 'Desmutar' : 'Mutar áudio'}
              className="text-slate-600 hover:text-slate-900 transition-colors p-1"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-sky-600" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                synth.setVolume(val);
                if (isMuted) setIsMuted(false);
              }}
              className="hidden sm:inline-block w-14 sm:w-16 h-1.5 accent-amber-500 bg-slate-300 rounded-lg cursor-pointer"
              title="Volume do Piano"
            />
          </div>

          {/* Botão de Instalação PWA */}
          {!isInstalled && (isInstallable || isIOS) && (
            <button
              onClick={() => {
                if (isInstallable) {
                  install();
                } else if (isIOS) {
                  setShowIOSModal(true);
                }
              }}
              className="px-2.5 py-1.5 text-xs font-bold text-sky-950 bg-sky-200 hover:bg-sky-300 border border-sky-300 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Instalar na tela inicial"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}

          {/* Exportar PNG Ficha Didática */}
          <button
            onClick={handleExportPNG}
            disabled={isExporting}
            className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 active:scale-95 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Exportar ficha em imagem PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isExporting ? 'Baixando...' : 'Ficha PNG'}</span>
            <span className="sm:hidden">PNG</span>
          </button>
        </div>
      </header>

      {/* Alerta de Modo Offline PWA */}
      {!isOnline && (
        <div className="bg-amber-300 text-amber-950 px-4 py-1.5 text-xs font-bold text-center flex items-center justify-center gap-2 border-b border-amber-400">
          <WifiOff className="w-4 h-4" />
          <span>Modo Offline Ativo — O sintetizador de piano e o caderno funcionam sem conexão.</span>
        </div>
      )}

      {/* Modal para iOS Safari */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#fefdfb] border-2 border-amber-300 p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-lg">
                📲
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Instalar no seu iPhone</h3>
                <p className="text-xs text-slate-500">Pratique piano como app nativo</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-slate-700 bg-[#f9f5eb] p-3 rounded-xl border border-[#e6decf]">
              <p>1. Toque no ícone de <strong>Compartilhar</strong> (quadrado com seta).</p>
              <p>2. Role até <strong>Adicionar à Tela de Início</strong>.</p>
              <p>3. Toque em <strong>Adicionar</strong> no topo direito!</p>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold rounded-xl text-xs transition-colors"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================
          CORPO PRINCIPAL: CADERNO DIDÁTICO ILUSTRADO
          =================================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-7 space-y-5 pb-24 md:pb-12">

        {/* =================================================================
            HERO CARD DIDÁTICO (Inspirado diretamente na imagem de estudo)
            ================================================================= */}
        <section className="bg-[#fefdfb] border-2 border-[#e8dfd1] rounded-3xl p-4 sm:p-6 lg:p-8 shadow-md relative overflow-hidden notebook-paper">
          
          {/* Efeito espiral do caderno no topo/lado */}
          <div className="absolute top-2 left-6 right-6 hidden sm:flex justify-between items-center opacity-40 pointer-events-none select-none">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="w-2.5 h-4 bg-slate-400 rounded-sm shadow-inner" />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center pt-2 sm:pt-4">
            
            {/* Lado Esquerdo: Título Didático e Explicação Amigável */}
            <div className="lg:col-span-8 space-y-3.5">
              
              {/* Etiqueta de Marca-Texto Amarelo */}
              <div className="inline-block bg-amber-300 text-amber-950 font-black text-xs sm:text-sm px-3.5 py-1 rounded-md shadow-xs rotate-[-1.5deg] border border-amber-400">
                CADERNO PRÁTICO DE MÚSICA & HARMONIA
              </div>

              {/* Título Principal com Letras Grandes e Amigáveis */}
              <h1 className="text-3xl sm:text-5xl font-black text-[#1e3a8a] tracking-tight leading-tight">
                CAMPO HARMÔNICO & PIANO
              </h1>

              {/* Pílula com o Lema Didático */}
              <div className="inline-flex items-center gap-2 bg-sky-100 border border-sky-300 text-sky-950 text-xs sm:text-sm font-bold px-3.5 py-1 rounded-full">
                <span>Comprove o que você aprende tocando de verdade! 🎶</span>
              </div>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">
                Descubra por que certas notas combinam perfeitamente. Toque os <strong className="text-sky-900 bg-sky-100 px-1 rounded">7 Graus Naturais</strong>, veja o dedilhado correto das mãos e domine os acordes que formam as músicas mais famosas do mundo.
              </p>

              {/* Os 4 Quadrados Didáticos Coloridos da Ficha */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 space-y-1">
                  <div className="w-7 h-7 rounded-lg bg-sky-200 text-sky-800 flex items-center justify-center font-bold text-xs">
                    01
                  </div>
                  <h4 className="font-extrabold text-xs">7 Graus Naturais</h4>
                  <p className="text-[11px] text-sky-800 leading-tight">1º ao 7º em números fáceis.</p>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                  <div className="w-7 h-7 rounded-lg bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    02
                  </div>
                  <h4 className="font-extrabold text-xs">3 Funções</h4>
                  <p className="text-[11px] text-emerald-800 leading-tight">Tônica, Subdominante e Dominante.</p>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                  <div className="w-7 h-7 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-xs">
                    03
                  </div>
                  <h4 className="font-extrabold text-xs">Dedilhado 1 a 5</h4>
                  <p className="text-[11px] text-amber-800 leading-tight">Polegar ao mínimo sem dor.</p>
                </div>

                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 space-y-1">
                  <div className="w-7 h-7 rounded-lg bg-purple-200 text-purple-800 flex items-center justify-center font-bold text-xs">
                    04
                  </div>
                  <h4 className="font-extrabold text-xs">Inversões</h4>
                  <p className="text-[11px] text-purple-800 leading-tight">Mude os acordes sem pular a mão.</p>
                </div>
              </div>
            </div>

            {/* Lado Direito: Ilustração da Aluna com Checklist Interativo */}
            <div className="lg:col-span-4 flex flex-col items-center">
              <div className="w-full bg-[#f9f5eb] border-2 border-amber-200/90 rounded-2xl p-4 shadow-sm relative">
                
                {/* Imagem do Mascote / Aluna com bloco de notas */}
                <div className="flex items-center gap-3 pb-3 border-b border-amber-200/70">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-300 shadow-xs shrink-0">
                    <img
                      src="/src/assets/images/mascot_student_piano_1794361003971.jpg"
                      alt="Aluna estudante de piano e harmonia"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Checklist do Aluno</h3>
                    <p className="text-[11px] text-slate-600 font-medium">
                      {completedChecklistCount} de 4 metas concluídas ⭐
                    </p>
                  </div>
                </div>

                {/* Lista Interativa com Checkboxes */}
                <div className="space-y-2 pt-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-950 select-none">
                    <input
                      type="checkbox"
                      checked={checklist.grau1}
                      onChange={(e) => setChecklist(prev => ({ ...prev, grau1: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-600 accent-amber-500 cursor-pointer"
                    />
                    <span className={checklist.grau1 ? 'line-through text-slate-400 font-medium' : 'font-semibold'}>
                      Tocar o Grau 1 da tonalidade
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-950 select-none">
                    <input
                      type="checkbox"
                      checked={checklist.dominante}
                      onChange={(e) => setChecklist(prev => ({ ...prev, dominante: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-600 accent-amber-500 cursor-pointer"
                    />
                    <span className={checklist.dominante ? 'line-through text-slate-400 font-medium' : 'font-semibold'}>
                      Sentir a tensão do Grau 5
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-950 select-none">
                    <input
                      type="checkbox"
                      checked={checklist.inversao}
                      onChange={(e) => setChecklist(prev => ({ ...prev, inversao: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-600 accent-amber-500 cursor-pointer"
                    />
                    <span className={checklist.inversao ? 'line-through text-slate-400 font-medium' : 'font-semibold'}>
                      Testar a 1ª Inversão no teclado
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-950 select-none">
                    <input
                      type="checkbox"
                      checked={checklist.cadencia}
                      onChange={(e) => setChecklist(prev => ({ ...prev, cadencia: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-600 accent-amber-500 cursor-pointer"
                    />
                    <span className={checklist.cadencia ? 'line-through text-slate-400 font-medium' : 'font-semibold'}>
                      Ouvir a Cadência Pop (1-5-6-4)
                    </span>
                  </label>
                </div>

                {/* Barra de Progresso com Estrelas */}
                <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] font-bold text-amber-800">
                  <span>Progresso do Caderno:</span>
                  <div className="flex gap-1 text-amber-500">
                    {[1, 2, 3, 4].map(s => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${s <= completedChecklistCount ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`}
                      />
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Post-it "Ideia Central" no Rodapé do Hero */}
          <div className="mt-5 pt-4 border-t-2 border-dashed border-[#e6decf]">
            <div className="bg-[#fef9c3] border border-amber-300 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-start sm:items-center gap-3 rotate-[-0.6deg]">
              <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                <strong>Ideia Central:</strong> No tom Maior, os <strong>Graus 1, 4 e 5</strong> são sempre MAIORES e felizes. Os <strong>Graus 2, 3 e 6</strong> são MENORES e emotivos. O <strong>Grau 7</strong> é tenso e resolve de volta no <strong>Grau 1</strong>!
              </div>
            </div>
          </div>

        </section>

        {/* =================================================================
            ABAS DE CONTEÚDO (Visualizador, Desafios, Cadências, Dicionário, Guia)
            ================================================================= */}
        {activeTab === 'campo' && (
          <div className="space-y-5 animate-fadeIn">
            
            {/* SELETOR DE TONALIDADE E TRÍADES / TÉTRADES */}
            <div className="bg-[#fefdfb] border-2 border-[#e8dfd1] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                
                {/* Tonalidade Atual */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-900 flex items-center justify-center font-bold text-sm">
                    🎼
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      Tonalidade: <span className="text-[#1e3a8a]">{currentTonality.namePt}</span>
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {currentTonality.accidentals}
                    </p>
                  </div>
                </div>

                {/* Alternador Tríades vs Tétrades */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-bold text-slate-600">Complexidade:</span>
                  <div className="flex items-center bg-[#f3ede2] p-1 rounded-xl border border-[#ded5c6]">
                    <button
                      onClick={() => setIsTetradMode(false)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        !isTetradMode
                          ? 'bg-[#1e3a8a] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      Tríades (3 notas)
                    </button>
                    <button
                      onClick={() => setIsTetradMode(true)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        isTetradMode
                          ? 'bg-[#1e3a8a] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      Tétrades (com 7ª)
                    </button>
                  </div>
                </div>
              </div>

              {/* Botão Gaveta de Tonalidades no Mobile */}
              <div className="block sm:hidden">
                <button
                  onClick={() => setIsTonalityDrawerOpen(!isTonalityDrawerOpen)}
                  className="w-full py-2 px-3 bg-[#f3ede2] hover:bg-[#eae1d0] text-slate-800 font-bold text-xs rounded-xl border border-[#ded5c6] flex items-center justify-between"
                >
                  <span>Trocar Tonalidade (12 Maiores e 12 Menores)</span>
                  {isTonalityDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Grid Completo de Tonalidades */}
              <div className={`${isTonalityDrawerOpen ? 'block' : 'hidden'} sm:block space-y-3 pt-2`}>
                <div>
                  <div className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>☀️ 12 Tonalidades Maiores:</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                    {TONALITIES.filter(t => t.type === 'major').map((ton) => (
                      <button
                        key={ton.root}
                        onClick={() => {
                          setSelectedTonalityRoot(ton.root);
                          setCustomChordMode(false);
                          setIsTonalityDrawerOpen(false);
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                          selectedTonalityRoot === ton.root && !customChordMode
                            ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-xs'
                            : 'bg-[#fcfaf5] text-slate-700 border-[#e5dcce] hover:bg-[#f3ece0]'
                        }`}
                      >
                        {ton.root}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-sky-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>🌙 12 Tonalidades Menores:</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                    {TONALITIES.filter(t => t.type === 'minor').map((ton) => (
                      <button
                        key={ton.root}
                        onClick={() => {
                          setSelectedTonalityRoot(ton.root);
                          setCustomChordMode(false);
                          setIsTonalityDrawerOpen(false);
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                          selectedTonalityRoot === ton.root && !customChordMode
                            ? 'bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-xs'
                            : 'bg-[#fcfaf5] text-slate-700 border-[#e5dcce] hover:bg-[#f3ece0]'
                        }`}
                      >
                        {ton.root}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SELETOR DOS 7 GRAUS NATURAIS (COM NÚMEROS NATURAIS EM DESTAQUE) */}
              <div className="pt-2 border-t border-[#e8dfd1]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-800">
                    Os 7 Graus da Família {currentTonality.namePt}:
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Toque em um grau para ouvir e visualizar
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {activeDegreeList.map((deg, idx) => {
                    const rootChrom = (currentTonality.rootChromaticIndex + deg.semitoneOffset) % 12;
                    const rootName = CHROMATIC_NAMES_SHARP[rootChrom];
                    const suffix = isTetradMode ? deg.tetradSuffix : deg.triadSuffix;
                    const chordLabel = `${rootName}${suffix}`;
                    const isSelected = selectedDegreeIndex === idx && !customChordMode;

                    // Cores pedagógicas suaves para as funções
                    const funcBadge = deg.function === 'tonica'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : deg.function === 'subdominante'
                      ? 'bg-sky-100 text-sky-900 border-sky-300'
                      : 'bg-amber-100 text-amber-950 border-amber-300';

                    return (
                      <button
                        key={deg.degreeNumber}
                        onClick={() => {
                          setSelectedDegreeIndex(idx);
                          setCustomChordMode(false);
                          setInversionIndex(0);

                          const intervals = isTetradMode ? deg.tetradIntervals : deg.triadIntervals;
                          const freqs = intervals.map(inter => {
                            let midi = OCTAVE_START_MIDI + rootChrom + inter;
                            if (midi > OCTAVE_START_MIDI + 24) midi -= 12;
                            return midiToFreq(midi);
                          });
                          synth.playChord(freqs, 1.8);
                        }}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[72px] ${
                          isSelected
                            ? 'bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-md scale-[1.02]'
                            : 'bg-[#fefdfb] hover:bg-[#f6f0e4] border-[#e2d8c7] text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={`text-[11px] font-black ${isSelected ? 'text-amber-300' : 'text-slate-600'}`}>
                            Grau {deg.degreeNumber}
                          </span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${funcBadge}`}>
                            {deg.function === 'tonica' ? 'T' : deg.function === 'subdominante' ? 'S' : 'D'}
                          </span>
                        </div>

                        <div className={`text-lg font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {chordLabel}
                        </div>

                        <div className={`text-[10px] truncate ${isSelected ? 'text-sky-200' : 'text-slate-500'}`}>
                          {CHROMATIC_PT[rootName] || rootName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* VISUALIZADOR REALISTA DE TECLADO DE PIANO COM DEDILHADO */}
            <div className="bg-[#fefdfb] border-2 border-[#e8dfd1] rounded-3xl p-4 sm:p-6 shadow-md space-y-4">
              
              {/* Header do Acorde em Destaque */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-[#e8dfd1]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-black text-[#1e3a8a] tracking-tight">
                      {currentChordData.chordName}
                    </span>
                    <span className="text-sm font-bold text-slate-600">
                      {CHROMATIC_PT[currentChordData.rootName] || currentChordData.rootName} {currentChordData.degreeName}
                    </span>
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                      currentChordData.functionType === 'tonica'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : currentChordData.functionType === 'subdominante'
                        ? 'bg-sky-100 text-sky-900 border-sky-300'
                        : 'bg-amber-100 text-amber-950 border-amber-300'
                    }`}>
                      {currentChordData.functionType === 'tonica' ? '🟢 TÔNICA (REPOUSO)' : currentChordData.functionType === 'subdominante' ? '🔵 SUBDOMINANTE (VIAGEM)' : '🔴 DOMINANTE (TENSÃO)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                    <span>Fórmula: <strong className="text-slate-900 font-mono">{currentChordData.formula}</strong></span>
                    <span>·</span>
                    <span>Notas: {chordKeysMapping.map(k => (
                      <strong key={k.noteName} className="text-[#1e3a8a] font-mono ml-1">
                        {k.noteName.replace(/[0-9]/g, '')}
                      </strong>
                    ))}</span>
                    <span>·</span>
                    <span>Baixo: <strong className="text-amber-800 font-mono">
                      {chordKeysMapping.find(k => k.isBass)?.noteName.replace(/[0-9]/g, '')}
                    </strong></span>
                  </div>
                </div>

                {/* Botões de Ação de Áudio */}
                <div className="grid grid-cols-2 gap-2 shrink-0">
                  <button
                    onClick={handlePlayChord}
                    className="py-2.5 px-4 bg-[#1e3a8a] hover:bg-blue-900 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer min-h-[44px]"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Tocar Acorde</span>
                  </button>

                  <button
                    onClick={handlePlayArpeggio}
                    className="py-2.5 px-3.5 bg-[#f3ede2] hover:bg-[#eae1d0] active:scale-95 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-[#ded5c6] shadow-xs cursor-pointer min-h-[44px]"
                  >
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Ouvir Arpejo</span>
                  </button>
                </div>
              </div>

              {/* Barra de Ajuste de Visualização (Enquadrado / Zoom / Rolagem) */}
              <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                <span className="font-bold text-slate-600">Visualização do Teclado:</span>
                <div className="flex items-center gap-1 bg-[#f3ede2] p-1 rounded-xl border border-[#ded5c6]">
                  <button
                    onClick={() => setKeyboardViewMode('fit')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      keyboardViewMode === 'fit' ? 'bg-[#1e3a8a] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Maximize2 className="w-3 h-3" />
                    Enquadrar
                  </button>
                  <button
                    onClick={() => setKeyboardViewMode('zoom')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      keyboardViewMode === 'zoom' ? 'bg-[#1e3a8a] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ZoomIn className="w-3 h-3" />
                    Foco
                  </button>
                  <button
                    onClick={() => setKeyboardViewMode('scroll')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      keyboardViewMode === 'scroll' ? 'bg-[#1e3a8a] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MoveHorizontal className="w-3 h-3" />
                    Rolar
                  </button>
                </div>
              </div>

              {/* TECLADO DE PIANO REALISTA */}
              <div className={`w-full overflow-x-auto pb-2 ${keyboardViewMode === 'fit' ? 'overflow-x-hidden' : ''}`}>
                <div
                  className={`relative select-none mx-auto bg-slate-900 p-2 sm:p-3 rounded-2xl shadow-xl ${
                    keyboardViewMode === 'fit' ? 'w-full max-w-full' : keyboardViewMode === 'zoom' ? 'w-[780px]' : 'w-[880px]'
                  }`}
                  style={{ height: '210px' }}
                >
                  {/* Feltro vermelho clássico no topo */}
                  <div className="w-full h-1.5 bg-red-600 mb-1 rounded-t-sm" />

                  {/* Teclas Brancas */}
                  <div className="flex w-full h-[190px]">
                    {KEYBOARD_KEYS.filter(k => !k.isBlack).map((keyDef) => {
                      const isChordKey = activeKeyIndices.has(keyDef.keyIndex);
                      const chordKeyInfo = chordKeysMapping.find(k => k.keyIndex === keyDef.keyIndex);
                      const isPressed = lastPressedKey === keyDef.keyIndex;

                      return (
                        <button
                          key={keyDef.midi}
                          onClick={() => handleKeyClick(keyDef)}
                          className={`piano-white-key flex-1 h-full rounded-b-md relative flex flex-col justify-end items-center pb-2 border-r border-slate-300 last:border-r-0 cursor-pointer ${
                            isChordKey
                              ? chordKeyInfo?.isRoot
                                ? 'bg-amber-100 ring-2 ring-amber-400'
                                : 'bg-sky-100 ring-2 ring-sky-400'
                              : ''
                          } ${isPressed ? 'is-pressed' : ''}`}
                        >
                          {isChordKey && chordKeyInfo && (
                            <div className="flex flex-col items-center gap-1 mb-1">
                              {/* Círculo do Dedo Recomendado */}
                              <div className="w-6 h-6 rounded-full bg-[#1e3a8a] text-white font-black text-[11px] flex items-center justify-center shadow-xs">
                                {chordKeyInfo.finger}
                              </div>
                              <span className="text-[10px] font-black text-slate-800">
                                {keyDef.noteName.replace(/[0-9]/g, '')}
                              </span>
                            </div>
                          )}
                          {!isChordKey && (
                            <span className="text-[9px] font-bold text-slate-400">
                              {keyDef.noteName.replace(/[0-9]/g, '')}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Teclas Pretas Sobrepostas */}
                  <div className="absolute top-[16px] left-[8px] right-[8px] h-[115px] pointer-events-none flex">
                    {KEYBOARD_KEYS.filter(k => !k.isBlack).map((whiteKey, idx) => {
                      const blackKeyDef = KEYBOARD_KEYS.find(k => k.isBlack && k.keyIndex === whiteKey.keyIndex + 1);
                      if (!blackKeyDef) {
                        return <div key={`spacer-${idx}`} className="flex-1" />;
                      }

                      const isChordKey = activeKeyIndices.has(blackKeyDef.keyIndex);
                      const chordKeyInfo = chordKeysMapping.find(k => k.keyIndex === blackKeyDef.keyIndex);
                      const isPressed = lastPressedKey === blackKeyDef.keyIndex;

                      return (
                        <div key={`container-${blackKeyDef.midi}`} className="flex-1 relative">
                          <button
                            onClick={() => handleKeyClick(blackKeyDef)}
                            className={`piano-black-key absolute right-[-24%] top-0 w-[48%] h-full rounded-b-md z-10 pointer-events-auto flex flex-col justify-end items-center pb-1.5 cursor-pointer ${
                              isChordKey
                                ? chordKeyInfo?.isRoot
                                  ? 'bg-amber-500 ring-2 ring-amber-300'
                                  : 'bg-sky-600 ring-2 ring-sky-300'
                                : ''
                            } ${isPressed ? 'is-pressed' : ''}`}
                          >
                            {isChordKey && chordKeyInfo && (
                              <div className="flex flex-col items-center gap-0.5 mb-1">
                                <div className="w-5 h-5 rounded-full bg-white text-slate-900 font-black text-[10px] flex items-center justify-center shadow-xs">
                                  {chordKeyInfo.finger}
                                </div>
                                <span className="text-[9px] font-extrabold text-white">
                                  {blackKeyDef.noteName.replace(/[0-9]/g, '')}
                                </span>
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* CONTROLES DE INVERSÃO E MÃO RECOMENDADA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[#e8dfd1]">
                
                {/* Seletor de Inversão */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Inversão do Acorde:</span>
                    <span className="text-[11px] font-semibold text-amber-800">
                      {inversionIndex === 0 ? 'Estado Fundamental' : `${inversionIndex}ª Inversão`}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['Fundam.', '1ª Inv.', '2ª Inv.', '3ª Inv.'].slice(0, currentChordData.numNotes).map((label, invIdx) => (
                      <button
                        key={invIdx}
                        onClick={() => {
                          setInversionIndex(invIdx);
                          setChecklist(prev => ({ ...prev, inversao: true }));
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                          inversionIndex === invIdx
                            ? 'bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-xs'
                            : 'bg-[#fcfaf5] text-slate-700 border-[#ded5c6] hover:bg-[#f3ede2]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seletor de Mão (Direita / Esquerda) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Mão do Teclado:</span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Polegar (1) ao Mínimo (5)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setSelectedHand('right')}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        selectedHand === 'right'
                          ? 'bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-xs'
                          : 'bg-[#fcfaf5] text-slate-700 border-[#ded5c6] hover:bg-[#f3ede2]'
                      }`}
                    >
                      <Hand className="w-3.5 h-3.5" />
                      Mão Direita (MD)
                    </button>
                    <button
                      onClick={() => setSelectedHand('left')}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        selectedHand === 'left'
                          ? 'bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-xs'
                          : 'bg-[#fcfaf5] text-slate-700 border-[#ded5c6] hover:bg-[#f3ede2]'
                      }`}
                    >
                      <Hand className="w-3.5 h-3.5 scale-x-[-1]" />
                      Mão Esquerda (ME)
                    </button>
                  </div>
                </div>

              </div>

              {/* Post-it Didático do Acorde Selecionado */}
              <div className="p-3.5 rounded-2xl bg-[#fef9c3] border border-amber-300 text-amber-950 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>📌 Dica Didática para {currentChordData.chordName}:</span>
                </div>
                <p className="leading-relaxed">
                  {currentChordData.functionDesc}
                </p>
                <p className="font-semibold text-amber-900">
                  Prática: {currentChordData.didacticTip}
                </p>
              </div>

            </div>

          </div>
        )}

        {/* =================================================================
            ABA 2: MISSÕES PRÁTICAS & QUIZ (Comprovar Aprendizagem)
            ================================================================= */}
        {activeTab === 'desafios' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-[#fefdfb] border-2 border-[#e8dfd1] rounded-3xl p-5 sm:p-7 shadow-md space-y-5 notebook-paper">
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-[#e8dfd1]">
                <div>
                  <div className="inline-block bg-amber-300 text-amber-950 font-black text-xs px-2.5 py-0.5 rounded-md rotate-[-1deg] mb-1">
                    ATIVIDADE DE FIXAÇÃO
                  </div>
                  <h2 className="text-2xl font-black text-[#1e3a8a]">
                    Missões de Aprendizagem & Desafios
                  </h2>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Responda às perguntas práticas e ouça o resultado no teclado!
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-amber-100 border border-amber-300 px-3.5 py-2 rounded-2xl text-amber-950 font-bold text-xs self-start sm:self-auto">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Pontuação: {quizScore} acertos ⭐</span>
                </div>
              </div>

              {/* Pergunta Atual */}
              {(() => {
                const q = QUIZ_QUESTIONS[currentQuizIndex];
                return (
                  <div className="space-y-4 max-w-2xl mx-auto py-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>{q.title}</span>
                      <span>Desafio {currentQuizIndex + 1} de {QUIZ_QUESTIONS.length}</span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                      {q.question}
                    </h3>

                    {/* Opções de Resposta */}
                    <div className="space-y-2.5 pt-2">
                      {q.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          onClick={() => handleAnswerQuiz(optIdx)}
                          className="w-full p-3.5 rounded-2xl border-2 border-[#e2d8c7] bg-[#fcfaf5] hover:bg-amber-50 hover:border-amber-300 font-bold text-slate-800 text-xs sm:text-sm text-left transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span>{opt}</span>
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Feedback da Resposta */}
                    {quizAnswerFeedback && (
                      <div className={`p-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between animate-fadeIn ${
                        quizAnswerFeedback === 'correto'
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                          : 'bg-rose-100 text-rose-950 border-rose-300'
                      }`}>
                        <div>
                          {quizAnswerFeedback === 'correto'
                            ? '🎉 Resposta Exata! Você dominou o conceito!'
                            : '🤔 Quase lá! Lembre-se: ' + q.tip}
                        </div>
                        <button
                          onClick={() => {
                            setQuizAnswerFeedback(null);
                            setCurrentQuizIndex((prev) => (prev + 1) % QUIZ_QUESTIONS.length);
                          }}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Próximo Desafio →
                        </button>
                      </div>
                    )}

                    {/* Dica do Professor */}
                    <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <span><strong>Dica Didática:</strong> {q.tip}</span>
                    </div>

                  </div>
                );
              })()}

            </div>
          </div>
        )}

        {/* =================================================================
            ABA 3: LABORATÓRIO DE CADÊNCIAS POPULARES
            ================================================================= */}
        {activeTab === 'cadencias' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-[#fefdfb] border-2 border-[#e8dfd1] rounded-3xl p-5 sm:p-7 shadow-md space-y-5 notebook-paper">
              
              <div>
                <div className="inline-block bg-sky-200 text-sky-950 font-black text-xs px-2.5 py-0.5 rounded-md rotate-[-1deg] mb-1">
                  CADÊNCIAS QUE MUDARAM A MÚSICA
                </div>
                <h2 className="text-2xl font-black text-[#1e3a8a]">
                  Laboratório de Cadências Populares
                </h2>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Ouça como os acordes se conectam e criam a magia das músicas de sucesso.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FAMOUS_CADENCES.map((cad) => {
                  const cadenceChords = cad.degrees.map(degIdx => {
                    const deg = activeDegreeList[degIdx] || activeDegreeList[0];
                    const rootChrom = (currentTonality.rootChromaticIndex + deg.semitoneOffset) % 12;
                    const rootName = CHROMATIC_NAMES_SHARP[rootChrom];
                    const suffix = isTetradMode ? deg.tetradSuffix : deg.triadSuffix;
                    return `${rootName}${suffix}`;
                  });

                  return (
                    <div
                      key={cad.id}
                      className="p-4 rounded-2xl bg-[#fcfaf5] border-2 border-[#e2d8c7] flex flex-col justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-black text-sm text-[#1e3a8a]">{cad.name}</span>
                          <span className="text-[10px] text-amber-900 font-black px-2 py-0.5 rounded-full bg-amber-200/80 border border-amber-300">
                            {cad.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          {cad.description}
                        </p>

                        {/* Sequência de Graus e Cifras com Números Naturais */}
                        <div className="flex items-center gap-2 mt-3 font-mono text-xs overflow-x-auto no-scrollbar pb-1">
                          {cadenceChords.map((ch, i) => {
                            const degNum = activeDegreeList[cad.degrees[i]]?.degreeNumber || (cad.degrees[i] + 1);
                            return (
                              <React.Fragment key={i}>
                                <div className="flex flex-col items-center shrink-0">
                                  <span className="text-[10px] text-slate-500 font-sans font-bold mb-1">
                                    Grau {degNum}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-xl bg-[#1e3a8a] text-white font-black shadow-xs">
                                    {ch}
                                  </span>
                                </div>
                                {i < cadenceChords.length - 1 && (
                                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 self-center mt-3" />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => handlePlayProgression(cad.degrees)}
                        disabled={isPlayingProgression}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-amber-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50 min-h-[40px]"
                      >
                        <Play className="w-4 h-4 fill-amber-950" />
                        <span>Ouvir Cadência no Tom {currentTonality.namePt}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}

        {/* =================================================================
            ABA 4: BUSCA LIVRE & DICIONÁRIO DE CIFRAS
            ================================================================= */}
        {activeTab === 'dicionario' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-[#fefdfb] border-2 border-[#e8dfd1] rounded-3xl p-5 sm:p-7 shadow-md space-y-5 notebook-paper">
              
              <div>
                <div className="inline-block bg-purple-200 text-purple-950 font-black text-xs px-2.5 py-0.5 rounded-md rotate-[-1deg] mb-1">
                  CONSULTA RÁPIDA
                </div>
                <h2 className="text-2xl font-black text-[#1e3a8a]">
                  Dicionário Livre de Cifras
                </h2>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Consulte qualquer acorde avulso para tirar dúvidas imediatas de notas e dedilhado.
                </p>
              </div>

              {/* Input de Busca */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Digite uma cifra: C, Dm7, G7, F#m, Bb7M, C°..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-8 py-3 bg-[#fcfaf5] border-2 border-[#ded5c6] rounded-2xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1e3a8a]"
                />
              </div>

              {/* Atalhos Rápidos */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="font-bold text-slate-500">Exemplos:</span>
                {['C', 'G7', 'Am7', 'Dm7', 'F7M', 'E7', 'Bø'].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setSearchQuery(chip)}
                    className="px-2.5 py-1 bg-[#f3ede2] hover:bg-[#eae1d0] border border-[#ded5c6] rounded-lg text-slate-800 font-bold transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Resultados */}
              {searchQuery.trim().length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  {filteredChords.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCustomRootIndex(item.rootIndex);
                        setCustomTypeIndex(item.typeIndex);
                        setCustomChordMode(true);
                        setInversionIndex(0);
                        setActiveTab('campo');
                      }}
                      className="p-3 bg-[#fcfaf5] hover:bg-amber-100/60 border-2 border-[#e2d8c7] rounded-2xl text-left transition-all cursor-pointer group"
                    >
                      <div className="font-black text-base text-[#1e3a8a] group-hover:text-blue-900">
                        {item.chordName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                        {item.label}
                      </div>
                    </button>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}

        {/* =================================================================
            ABA 5: APOSTILA & DICAS RÁPIDAS
            ================================================================= */}
        {activeTab === 'guia' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-[#fefdfb] border-2 border-[#e8dfd1] rounded-3xl p-5 sm:p-7 shadow-md space-y-5 notebook-paper">
              
              <div>
                <div className="inline-block bg-amber-300 text-amber-950 font-black text-xs px-2.5 py-0.5 rounded-md rotate-[-1deg] mb-1">
                  APOSTILA DIDÁTICA
                </div>
                <h2 className="text-2xl font-black text-[#1e3a8a]">
                  Resumo de Teoria para Iniciantes
                </h2>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Conceitos explicados sem complicação.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#fcfaf5] border-2 border-[#e2d8c7] space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-200 text-emerald-950 flex items-center justify-center font-black text-xs">
                    01
                  </div>
                  <h3 className="font-black text-sm text-slate-900">O que é Campo Harmônico?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    É a família de acordes gerada a partir das 7 notas da escala. Tocar músicas dentro do mesmo tom garante que todos os acordes combinem perfeitamente.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#fcfaf5] border-2 border-[#e2d8c7] space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-200 text-sky-950 flex items-center justify-center font-black text-xs">
                    02
                  </div>
                  <h3 className="font-black text-sm text-slate-900">As 3 Emoções Musicais</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    🟢 <strong>Tônica (Graus 1, 6 e 3):</strong> Repouso e paz.<br />
                    🔵 <strong>Subdominante (Graus 4 e 2):</strong> Viagem e balanço.<br />
                    🔴 <strong>Dominante (Graus 5 e 7):</strong> Tensão que pede resolução!
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#fcfaf5] border-2 border-[#e2d8c7] space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-200 text-purple-950 flex items-center justify-center font-black text-xs">
                    03
                  </div>
                  <h3 className="font-black text-sm text-slate-900">Por que Inverter os Acordes?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Inverter permite trocar de um acorde para outro movimentando apenas um ou dois dedos, mantendo a mão relaxada e sem saltos pelo teclado.
                  </p>
                </div>
              </div>

              {/* Cartão de Instalação PWA */}
              <div className="p-4 rounded-2xl bg-amber-100/70 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-amber-950 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-amber-700" />
                    Aplicativo Progressivo (PWA) 100% Offline
                  </h3>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Você pode instalar o Harmonia no seu celular ou computador. Ele funciona completamente sem internet, com o sintetizador de piano integrado para suas aulas e estudos.
                  </p>
                </div>
                {!isInstalled && (isInstallable || isIOS) && (
                  <button
                    onClick={() => {
                      if (isInstallable) install();
                      else if (isIOS) setShowIOSModal(true);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 font-black rounded-xl text-xs whitespace-nowrap cursor-pointer shadow-xs"
                  >
                    Instalar Agora
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Rodapé Didático com Créditos de Desenvolvimento */}
        <div className="pt-6 pb-2 text-center border-t border-[#e8dfd1] space-y-1">
          <p className="text-xs sm:text-sm font-extrabold text-[#1e3a8a] flex items-center justify-center gap-1.5 flex-wrap">
            <span>Desenvolvido com carinho por</span>
            <span className="bg-amber-300 text-amber-950 px-2.5 py-0.5 rounded-md rotate-[-1deg] border border-amber-400 font-black shadow-xs">
              Tio Wander
            </span>
            <span>🎹</span>
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            Harmonia · Caderno Didático Interativo de Música & Teclado
          </p>
        </div>

      </main>

      {/* ===================================================================
          BARRA DE NAVEGAÇÃO INFERIOR PARA MOBILE (Ergonomia de toque)
          =================================================================== */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#fefcf8]/95 backdrop-blur-md border-t-2 border-[#e8dfd1] px-2 py-2 flex items-center justify-around md:hidden pb-safe">
        <button
          onClick={() => setActiveTab('campo')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'campo' ? 'text-[#1e3a8a] font-extrabold' : 'text-slate-500 font-semibold'
          }`}
        >
          <Music className="w-5 h-5" />
          <span className="text-[10px]">Teclado</span>
        </button>

        <button
          onClick={() => setActiveTab('desafios')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'desafios' ? 'text-amber-600 font-extrabold' : 'text-slate-500 font-semibold'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px]">Missões</span>
        </button>

        <button
          onClick={() => setActiveTab('cadencias')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'cadencias' ? 'text-[#1e3a8a] font-extrabold' : 'text-slate-500 font-semibold'
          }`}
        >
          <ListMusic className="w-5 h-5" />
          <span className="text-[10px]">Cadências</span>
        </button>

        <button
          onClick={() => setActiveTab('dicionario')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dicionario' ? 'text-[#1e3a8a] font-extrabold' : 'text-slate-500 font-semibold'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px]">Busca</span>
        </button>

        <button
          onClick={() => setActiveTab('guia')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'guia' ? 'text-[#1e3a8a] font-extrabold' : 'text-slate-500 font-semibold'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px]">Apostila</span>
        </button>
      </footer>
    </div>
  );
}
