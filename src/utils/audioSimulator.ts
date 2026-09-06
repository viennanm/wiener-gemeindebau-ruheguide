let audioCtx: AudioContext | null = null;
let currentSourceNodes: { stop: () => void }[] = [];
let isPlayingType: 'traffic' | 'courtyard' | null = null;

export function getPlayingAudioType(): 'traffic' | 'courtyard' | null {
  return isPlayingType;
}

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function stopAudio() {
  currentSourceNodes.forEach((node) => {
    try {
      node.stop();
    } catch {
      // already stopped
    }
  });
  currentSourceNodes = [];
  isPlayingType = null;
}

// 72 dB(A) Verkehrslärm & Straßenbahnlinie 38 (Grinzinger Allee 54)
export function playStreetTraffic() {
  stopAudio();
  const ctx = initAudioContext();
  isPlayingType = 'traffic';

  // 1. Brown/Pink Noise for heavy traffic rumble
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    output[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = output[i];
    output[i] *= 3.5; // gain
  }

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;
  whiteNoise.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(280, ctx.currentTime);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.35, ctx.currentTime);

  whiteNoise.connect(lowpass);
  lowpass.connect(masterGain);
  masterGain.connect(ctx.destination);
  whiteNoise.start();
  currentSourceNodes.push(whiteNoise);

  // 2. Periodic Tram metal wheel screech (high-pitched resonant filter)
  const tramScreech = () => {
    if (isPlayingType !== 'traffic') return;
    const osc = ctx.createOscillator();
    const screechGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400 + Math.random() * 800, ctx.currentTime);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, ctx.currentTime);
    filter.Q.setValueAtTime(12, ctx.currentTime);

    screechGain.gain.setValueAtTime(0.01, ctx.currentTime);
    screechGain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.3);
    screechGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(filter);
    filter.connect(screechGain);
    screechGain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.3);

    const nextTime = 2000 + Math.random() * 3000;
    setTimeout(tramScreech, nextTime);
  };

  tramScreech();
}

// 42 dB(A) Sanfter Park-Innenhof mit Blätterrauschen & Vögeln (Hugo-Breitner / Karl-Marx-Hof)
export function playQuietCourtyard() {
  stopAudio();
  const ctx = initAudioContext();
  isPlayingType = 'courtyard';

  // 1. Soft wind / rustling leaves (very gentle bandpass noise)
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * 0.05;
  }

  const windSource = ctx.createBufferSource();
  windSource.buffer = noiseBuffer;
  windSource.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(450, ctx.currentTime);
  bandpass.Q.setValueAtTime(1.5, ctx.currentTime);

  const windGain = ctx.createGain();
  windGain.gain.setValueAtTime(0.12, ctx.currentTime);

  windSource.connect(bandpass);
  bandpass.connect(windGain);
  windGain.connect(ctx.destination);
  windSource.start();
  currentSourceNodes.push(windSource);

  // 2. Gentle pleasant bird chirping
  const birdChirp = () => {
    if (isPlayingType !== 'courtyard') return;
    const osc = ctx.createOscillator();
    const chirpGain = ctx.createGain();

    osc.type = 'sine';
    const startFreq = 2600 + Math.random() * 600;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(startFreq + 500, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(startFreq - 200, ctx.currentTime + 0.18);

    chirpGain.gain.setValueAtTime(0.001, ctx.currentTime);
    chirpGain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.04);
    chirpGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);

    osc.connect(chirpGain);
    chirpGain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);

    const nextTime = 1800 + Math.random() * 3200;
    setTimeout(birdChirp, nextTime);
  };

  birdChirp();
}
