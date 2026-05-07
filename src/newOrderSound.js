let _playing=false;
export const playNewOrderSound = () => {
  if(_playing) return;
  _playing=true;
  setTimeout(()=>_playing=false,8000);
  let count=0;
  const bip = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playBeep = (freq, start, duration, vol) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'triangle';
      gain.gain.setValueAtTime(vol, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.05);
    };
    playBeep(523, 0,    0.35, 0.8);
    playBeep(659, 0.4,  0.35, 0.8);
    playBeep(784, 0.8,  0.5,  0.9);
    count++;
    if(count < 4) setTimeout(bip, 1800);
  };
  bip();
};
