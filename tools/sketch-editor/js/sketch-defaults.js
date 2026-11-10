export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const UNDO_LIMIT = 50;
export const STORAGE_KEY = "sketch_editor_web_v1";
export const COORD_MAX = 3000;
export const COORD_DEFAULT_X = 1000;
export const COORD_DEFAULT_Y = 600;
/** 坐标系原点点名，不可删除、不可移出 (0,0) */
export const ORIGIN_NAME = "O";

export const DEFAULT_TITLE = "平面尺寸图";

export const DEFAULT_POINTS = {
  O: [0, 0],
  B: [600, 0],
  C: [600, 472],
  D: [0, 472],
  E: [170, 28],
  F: [430, 28],
  G: [430, 146],
  H: [450, 146],
  I: [450, 402],
  J: [150, 402],
  K: [150, 146],
  L: [170, 146],
};

export const DEFAULT_LINES = [
  "OB", "BC", "CD", "DO",
  "EF", "FG", "GH", "HI", "IJ", "JK", "KL", "LE",
];

export function uid() {
  return Math.random().toString(16).slice(2, 14);
}

export function fmt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return String(Math.round(n * 1000) / 1000);
}

/** CAD 尺寸标注：四舍五入为整数，不显示小数点 */
export function fmtInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return String(Math.round(n));
}

export function normalizeLine(a, b) {
  if (!a || !b || a === b) return null;
  return a < b ? a + b : b + a;
}

export function clonePoints(points) {
  const out = {};
  for (const [k, v] of Object.entries(points || {})) {
    out[k] = [Number(v[0]), Number(v[1])];
  }
  return out;
}

export function makeSketch({
  id = uid(),
  title = DEFAULT_TITLE,
  points = DEFAULT_POINTS,
  lines = DEFAULT_LINES,
  notes = "",
} = {}) {
  return {
    id,
    title: String(title || DEFAULT_TITLE),
    points: clonePoints(points),
    lines: [...(lines || [])],
    notes: String(notes || ""),
  };
}

export function snapshotOf(sketch) {
  return {
    title: sketch.title,
    notes: sketch.notes || "",
    points: clonePoints(sketch.points),
    lines: [...(sketch.lines || [])],
  };
}
