import { state } from './firebase';
import { PENTATONIC_SCALE } from './config';

export const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export const bgMusic = new Audio(
  'https://cdn.pixabay.com/audio/2022/03/24/audio_7306283b27.mp3',
);
bgMusic.loop = true;
bgMusic.volume = 0.4;
bgMusic.crossOrigin = 'anonymous';

let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;
let visualizerInited = false;

const vCanvas = document.getElementById('visualizer') as HTMLCanvasElement;
const vCtx = vCanvas?.getContext('2d');

let noteIndex = 0;

export function initVisualizer(): void {
  if (!audioCtx || !vCanvas || !vCtx) return;
  source = audioCtx.createMediaElementSource(bgMusic);
  analyser = audioCtx.createAnalyser();
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  analyser.fftSize = 256;
  visualizerInited = true;
  drawVisualizer();
}

function drawVisualizer(): void {
  requestAnimationFrame(drawVisualizer);
  if (!analyser || !vCanvas || !vCtx) return;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  vCanvas.width = window.innerWidth;
  vCanvas.height = 100;
  vCtx.clearRect(0, 0, vCanvas.width, vCanvas.height);

  const barWidth = (vCanvas.width / bufferLength) * 2.5;
  let barHeight: number;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    barHeight = dataArray[i] / 2;
    vCtx.fillStyle = `rgba(191, 0, 255, ${barHeight / 100})`;
    vCtx.fillRect(x, vCanvas.height - barHeight, barWidth, barHeight);
    x += barWidth + 1;
  }
}

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

export function playTapSound(clientX?: number, _clientY?: number): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const progress = state.currentProgressPercentage / 100;
  const panValue = clientX ? ((clientX / window.innerWidth) * 2 - 1) * 0.6 : 0;
  const scaleIndex = noteIndex % PENTATONIC_SCALE.length;
  const baseFreq = PENTATONIC_SCALE[scaleIndex];
  noteIndex++;

  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.3 + progress * 0.15, audioCtx.currentTime);

  const panner = audioCtx.createStereoPanner();
  panner.pan.setValueAtTime(panValue, audioCtx.currentTime);
  masterGain.connect(panner);
  panner.connect(audioCtx.destination);

  const oscMelody = audioCtx.createOscillator();
  const melodyGain = audioCtx.createGain();
  oscMelody.type = 'triangle';
  oscMelody.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
  oscMelody.frequency.exponentialRampToValueAtTime(baseFreq * 1.08, audioCtx.currentTime + 0.003);
  melodyGain.gain.setValueAtTime(0.35, audioCtx.currentTime);
  melodyGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08 + progress * 0.04);
  oscMelody.connect(melodyGain);
  melodyGain.connect(masterGain);
  oscMelody.start();
  oscMelody.stop(audioCtx.currentTime + 0.12);

  const noise = audioCtx.createBufferSource();
  const noiseGain = audioCtx.createGain();
  const noiseFilter = audioCtx.createBiquadFilter();
  const bufferSize = audioCtx.sampleRate * 0.008;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(baseFreq * 0.9, audioCtx.currentTime);
  noiseFilter.Q.setValueAtTime(4, audioCtx.currentTime);
  noiseGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.006);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start();

  const oscBass = audioCtx.createOscillator();
  const bassGain = audioCtx.createGain();
  oscBass.type = 'sine';
  const bassFreq = baseFreq * 0.5;
  oscBass.frequency.setValueAtTime(bassFreq, audioCtx.currentTime);
  oscBass.frequency.exponentialRampToValueAtTime(bassFreq * 0.6, audioCtx.currentTime + 0.04);
  bassGain.gain.setValueAtTime(0.12 + progress * 0.1, audioCtx.currentTime);
  bassGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  oscBass.connect(bassGain);
  bassGain.connect(masterGain);
  oscBass.start();
  oscBass.stop(audioCtx.currentTime + 0.06);

  if (progress > 0.5 && Math.random() > 0.7) {
    const oscHarmony = audioCtx.createOscillator();
    const harmGain = audioCtx.createGain();
    oscHarmony.type = 'sine';
    oscHarmony.frequency.setValueAtTime(baseFreq * 1.5, audioCtx.currentTime);
    harmGain.gain.setValueAtTime(0, audioCtx.currentTime);
    harmGain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.02);
    harmGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    oscHarmony.connect(harmGain);
    harmGain.connect(masterGain);
    oscHarmony.start();
    oscHarmony.stop(audioCtx.currentTime + 0.18);
  }

  const reverbGain = audioCtx.createGain();
  reverbGain.gain.setValueAtTime(0.1 + progress * 0.2, audioCtx.currentTime);
  reverbGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  const dryGain = audioCtx.createGain();
  dryGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
  masterGain.connect(dryGain);
  dryGain.connect(panner);

  const reverbLen = audioCtx.sampleRate * 0.12;
  const reverbBuffer = audioCtx.createBuffer(2, reverbLen, audioCtx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const channelData = reverbBuffer.getChannelData(ch);
    for (let i = 0; i < reverbLen; i++) {
      channelData[i] = (Math.random() * 2 - 1) * (1 - i / reverbLen);
    }
  }
  const reverb = audioCtx.createConvolver();
  reverb.buffer = reverbBuffer;
  masterGain.connect(reverb);
  reverb.connect(reverbGain);
  reverbGain.connect(panner);
}

export function playMilestoneSound(): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const notes = [261.63, 329.63, 392.0, 523.25];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const panner = audioCtx.createStereoPanner();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.12);
    gain.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + i * 0.12 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.12 + 0.4);
    panner.pan.setValueAtTime(Math.sin(i * 1.5) * 0.5, audioCtx.currentTime + i * 0.12);
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + i * 0.12);
    osc.stop(audioCtx.currentTime + i * 0.12 + 0.4);
  });
}

export function playSuccessSound(): void {
  const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const panner = audioCtx.createStereoPanner();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
    gain.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + i * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.1 + 0.5);
    panner.pan.setValueAtTime(Math.sin(i * 0.8) * 0.7, audioCtx.currentTime + i * 0.1);
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + i * 0.1);
    osc.stop(audioCtx.currentTime + i * 0.1 + 0.5);
  });
}

export function playPartyHorn(): void {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const panner = audioCtx.createStereoPanner();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
  osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.5);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, audioCtx.currentTime);

  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

  panner.pan.setValueAtTime(Math.random() * 0.8 - 0.4, audioCtx.currentTime);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.8);
}
