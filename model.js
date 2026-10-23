class Hologram {
  constructor() {
    this.phase = 'hidden'; this.opacity = 0; this.gesture = 'wave';
    this.duration = 1450; this.start = 0; this.from = 0; this.target = 0;
  }
  show(now) { this.transition(1, now); }
  hide(now) { this.transition(0, now); }
  transition(target, now) {
    this.tick(now);
    if (target === this.target) return;
    this.from = this.opacity; this.target = target; this.start = now;
    this.phase = target ? 'appearing' : 'disappearing';
  }
  tick(now) {
    if (this.phase === 'hidden' || this.phase === 'visible') return;
    const t = Math.max(0, Math.min(1, (now - this.start) / this.duration));
    const eased = t * t * (3 - 2 * t);
    this.opacity = this.from + (this.target - this.from) * eased;
    if (t === 1) this.phase = this.target ? 'visible' : 'hidden';
  }
  setGesture(value) {
    if (['wave', 'point', 'think', 'talk'].includes(value)) this.gesture = value;
  }
}
if (typeof module !== 'undefined') module.exports = { Hologram };
else window.Hologram = Hologram;
