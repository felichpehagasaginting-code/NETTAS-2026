import { state } from './firebase';
import { PENTATONIC_SCALE } from './config';

export const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export const bgMusic = new Audio(
  'https://cdn.pixabay.com/audio/2022/03/24/audio_7306283b27.mp3',
);
bgMusic.loop = true;
bgMusic.volume = 0.4;
bgMusic.crossOrigin = 'anonymous';

// ─── Pre-cached audio buffers ────────────────────────────────────────────────
// Generate once on startup to avoid heavy per-tap allocations that cause GC spikes.

let _cachedNoiseBuffer: AudioBuffer | null = null;
let _cachedReverbBuffer: AudioBuffer | null = null;

function getNoiseBuffer(): AudioBuffer {
  if (_cachedNoiseBuffer) return _cachedNoiseBuffer;
  const bufferSize = Math.ceil(audioCtx.sampleRate * 0.008);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  _cachedNoiseBuffer = buffer;
  return buffer;
}

function getReverbBuffer(): AudioBuffer {
  if (_cachedReverbBuffer) return _cachedReverbBuffer;
  const reverbLen = Math.ceil(audioCtx.sampleRate * 0.12);
  const reverbBuffer = audioCtx.createBuffer(2, reverbLen, audioCtx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const channelData = reverbBuffer.getChannelData(ch);
    for (let i = 0; i < reverbLen; i++) {
      channelData[i] = (Math.random() * 2 - 1) * (1 - i / reverbLen);
    }
  }
  _cachedReverbBuffer = reverbBuffer;
  return reverbBuffer;
}

// ─── Visualizer ──────────────────────────────────────────────────────────────

let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;
let visualizerInited = false;

const vCanvas = document.getElementById('visualizer') as HTMLCanvasElement;
const vCtx = vCanvas?.getContext('2d');

// Persistent typed array — allocated once, reused every frame (avoids 60 GC/s)
let _vizDataArray: Uint8Array<ArrayBuffer> | null = null;
let _vizLastWidth = 0;

let noteIndex = 0;

export function initVisualizer(): void {
  if (!audioCtx || !vCanvas || !vCtx) return;
  source = audioCtx.createMediaElementSource(bgMusic);
  analyser = audioCtx.createAnalyser();
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  analyser.fftSize = 256;
  _vizDataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
  visualizerInited = true;
  drawVisualizer();
}

function drawVisualizer(): void {
  requestAnimationFrame(drawVisualizer);
  if (!analyser || !vCanvas || !vCtx || !_vizDataArray) return;

  // Guard: only update canvas dimensions when the actual viewport width changes —
  // previously this triggered a full layout recalculation on every single frame.
  const currentWidth = window.innerWidth;
  if (currentWidth !== _vizLastWidth) {
    vCanvas.width = currentWidth;
    vCanvas.height = 100;
    _vizLastWidth = currentWidth;
  }

  analyser.getByteFrequencyData(_vizDataArray);
  vCtx.clearRect(0, 0, vCanvas.width, vCanvas.height);

  const bufferLength = _vizDataArray.length;
  const barWidth = (vCanvas.width / bufferLength) * 2.5;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = _vizDataArray[i] / 2;
    // Pre-compute opacity once per bar — avoid template-literal string construction in tight loop
    const alpha = barHeight / 100;
    vCtx.fillStyle = `rgba(191,0,255,${alpha.toFixed(2)})`;
    vCtx.fillRect(x, vCanvas.height - barHeight, barWidth, barHeight);
    x += barWidth + 1;
  }
}

// ─── Audio control ───────────────────────────────────────────────────────────

export function resumeAudio(): void {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function toggleMusic(): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!visualizerInited) initVisualizer();

  if (bgMusic.paused) {
    bgMusic.play().catch((e) => console.error('Audio play failed:', e));
    document.getElementById('music-status')!.innerText = 'MUSIC: ON';
  } else {
    bgMusic.pause();
    document.getElementById('music-status')!.innerText = 'MUSIC: OFF';
  }
}

// ─── Tap sound (optimized) ────────────────────────────────────────────────────
// Critical hot path: called on every user tap. All heavy buffer allocations are
// now replaced with references to pre-cached buffers above.

export function playTapSound(clientX?: number, _clientY?: number): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const progress = state.currentProgressPercentage / 100;
  const panValue = clientX ? ((clientX / window.innerWidth) * 2 - 1) * 0.6 : 0;
  const scaleIndex = noteIndex % PENTATONIC_SCALE.length;
  const baseFreq = PENTATONIC_SCALE[scaleIndex];
  noteIndex++;

  const now = audioCtx.currentTime;

  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.3 + progress * 0.15, now);

  const panner = audioCtx.createStereoPanner();
  panner.pan.setValueAtTime(panValue, now);
  masterGain.connect(panner);
  panner.connect(audioCtx.destination);

  // Melody oscillator
  const oscMelody = audioCtx.createOscillator();
  const melodyGain = audioCtx.createGain();
  oscMelody.type = 'triangle';
  oscMelody.frequency.setValueAtTime(baseFreq, now);
  oscMelody.frequency.exponentialRampToValueAtTime(baseFreq * 1.08, now + 0.003);
  melodyGain.gain.setValueAtTime(0.35, now);
  melodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + progress * 0.04);
  oscMelody.connect(melodyGain);
  melodyGain.connect(masterGain);
  oscMelody.start(now);
  oscMelody.stop(now + 0.12);

  // White noise hit (now uses pre-cached buffer — zero allocation)
  const noise = audioCtx.createBufferSource();
  const noiseGain = audioCtx.createGain();
  const noiseFilter = audioCtx.createBiquadFilter();
  noise.buffer = getNoiseBuffer(); // cached
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(baseFreq * 0.9, now);
  noiseFilter.Q.setValueAtTime(4, now);
  noiseGain.gain.setValueAtTime(0.15, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start(now);

  // Bass oscillator
  const oscBass = audioCtx.createOscillator();
  const bassGain = audioCtx.createGain();
  oscBass.type = 'sine';
  const bassFreq = baseFreq * 0.5;
  oscBass.frequency.setValueAtTime(bassFreq, now);
  oscBass.frequency.exponentialRampToValueAtTime(bassFreq * 0.6, now + 0.04);
  bassGain.gain.setValueAtTime(0.12 + progress * 0.1, now);
  bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  oscBass.connect(bassGain);
  bassGain.connect(masterGain);
  oscBass.start(now);
  oscBass.stop(now + 0.06);

  // Harmony oscillator (sparse — only at high progress)
  if (progress > 0.5 && Math.random() > 0.7) {
    const oscHarmony = audioCtx.createOscillator();
    const harmGain = audioCtx.createGain();
    oscHarmony.type = 'sine';
    oscHarmony.frequency.setValueAtTime(baseFreq * 1.5, now);
    harmGain.gain.setValueAtTime(0, now);
    harmGain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    oscHarmony.connect(harmGain);
    harmGain.connect(masterGain);
    oscHarmony.start(now);
    oscHarmony.stop(now + 0.18);
  }

  // Reverb (now uses pre-cached buffer — zero allocation)
  const reverbGain = audioCtx.createGain();
  reverbGain.gain.setValueAtTime(0.1 + progress * 0.2, now);
  reverbGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  const dryGain = audioCtx.createGain();
  dryGain.gain.setValueAtTime(0.8, now);
  masterGain.connect(dryGain);
  dryGain.connect(panner);

  const reverb = audioCtx.createConvolver();
  reverb.buffer = getReverbBuffer(); // cached
  masterGain.connect(reverb);
  reverb.connect(reverbGain);
  reverbGain.connect(panner);
}

// ─── Milestone / success sounds ───────────────────────────────────────────────

export function playMilestoneSound(): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const notes = [261.63, 329.63, 392.0, 523.25];
  const now = audioCtx.currentTime;
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const panner = audioCtx.createStereoPanner();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.12);
    gain.gain.setValueAtTime(0, now + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
    panner.pan.setValueAtTime(Math.sin(i * 1.5) * 0.5, now + i * 0.12);
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(audioCtx.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.4);
  });
}

export function playSuccessSound(): void {
  const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
  const now = audioCtx.currentTime;
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const panner = audioCtx.createStereoPanner();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    gain.gain.setValueAtTime(0, now + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
    panner.pan.setValueAtTime(Math.sin(i * 0.8) * 0.7, now + i * 0.1);
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(audioCtx.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.5);
  });
}

export function playPartyHorn(): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const panner = audioCtx.createStereoPanner();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.5);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

  panner.pan.setValueAtTime(Math.random() * 0.8 - 0.4, now);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.8);
}
