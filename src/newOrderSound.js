let _playing=false;
export const playNewOrderSound = () => {
  if(_playing) return;
  _playing=true;
  setTimeout(()=>_playing=false,5000);
  let count=0;
  const bip = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playBeep = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    playBeep(880, 0, 0.12);
    playBeep(1100, 0.15, 0.12);
    playBeep(1320, 0.3, 0.2);
    count++;
    if(count < 3) setTimeout(bip, 800);
  };
  bip();
};
