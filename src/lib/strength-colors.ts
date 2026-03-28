// Shared campaign strength color system
// Red → amber → gold → teal → green (flowing, vacation-fresh)

const strengthStops: [number, [number, number, number]][] = [
  [1,  [220,  55,  50]],  // red
  [3,  [225,  65,  50]],  // red
  [4,  [230,  80,  50]],  // red-orange
  [5,  [240, 150,  40]],  // amber
  [6,  [245, 185,  45]],  // golden
  [7,  [ 80, 195, 145]],  // teal
  [8,  [ 50, 195, 135]],  // green-teal
  [10, [ 30, 190, 120]],  // green
];

function lerpColor(t: number): [number, number, number] {
  const s = Math.max(1, Math.min(10, t));
  let lo = strengthStops[0], hi = strengthStops[strengthStops.length - 1];
  for (let i = 0; i < strengthStops.length - 1; i++) {
    if (s >= strengthStops[i][0] && s <= strengthStops[i + 1][0]) {
      lo = strengthStops[i];
      hi = strengthStops[i + 1];
      break;
    }
  }
  const f = (s - lo[0]) / (hi[0] - lo[0] || 1);
  return [
    Math.round(lo[1][0] + (hi[1][0] - lo[1][0]) * f),
    Math.round(lo[1][1] + (hi[1][1] - lo[1][1]) * f),
    Math.round(lo[1][2] + (hi[1][2] - lo[1][2]) * f),
  ];
}

export function getStrengthColors(strength: number) {
  const [r, g, b] = lerpColor(strength);
  const [r2, g2, b2] = lerpColor(strength + 1.5);
  const mr = Math.round((r + r2) / 2);
  const mg = Math.round((g + g2) / 2);
  const mb = Math.round((b + b2) / 2);
  return {
    stroke0: `rgb(${r},${g},${b})`,
    stroke1: `rgb(${r2},${g2},${b2})`,
    barColor: `rgb(${mr},${mg},${mb})`,
    /** Full-opacity color for solid use */
    solid: `rgb(${mr},${mg},${mb})`,
    /** Stroke at 90% opacity */
    strokeStyle: `rgba(${mr},${mg},${mb},0.9)`,
    /** Fill at 35% opacity (hollow center) */
    fillStyle: `rgba(${mr},${mg},${mb},0.35)`,
    /** Light background tint */
    bgTint: `rgba(${mr},${mg},${mb},0.08)`,
  };
}
