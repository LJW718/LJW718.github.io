import {
  DEFAULT_TITLE,
  ORIGIN_NAME,
  STORAGE_KEY,
  UNDO_LIMIT,
  makeSketch,
  normalizeLine,
  snapshotOf,
  clonePoints,
} from "./sketch-defaults.js";

export class SketchStore {
  constructor() {
    this.sketches = [];
    this.activeId = "";
    this.undoStack = [];
    this.redoStack = [];
    this.baseline = null;
    this.load();
  }

  get active() {
    return this.sketches.find((s) => s.id === this.activeId) || this.sketches[0];
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data?.sketches?.length) {
          this.sketches = data.sketches.map((s) =>
            makeSketch({
              id: s.id,
              title: s.title,
              points: s.points,
              lines: s.lines,
              notes: s.notes,
            })
          );
          this.activeId =
            data.active_id && this.sketches.some((s) => s.id === data.active_id)
              ? data.active_id
              : this.sketches[0].id;
          this.ensureOrigin();
          this.captureBaseline();
          this.clearHistory();
          return;
        }
      }
    } catch (_) {
      /* ignore */
    }
    const sk = makeSketch();
    this.sketches = [sk];
    this.activeId = sk.id;
    this.ensureOrigin();
    this.captureBaseline();
    this.clearHistory();
  }

  /** @param {boolean} [immediate] 立即写入；默认防抖，避免频繁编辑时卡顿 */
  save(immediate = false) {
    if (immediate) return this.flushSave();
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveTimer = 0;
      this.flushSave();
    }, 280);
    return null;
  }

  flushSave() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = 0;
    }
    const payload = {
      version: 2,
      active_id: this.activeId,
      sketches: this.sketches.map((s) => ({
        id: s.id,
        title: s.title,
        points: clonePoints(s.points),
        lines: [...s.lines],
        notes: s.notes || "",
      })),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn("localStorage 保存失败", err);
    }
    return payload;
  }

  exportJSON() {
    return this.flushSave();
  }

  importJSON(data) {
    if (!data || typeof data !== "object") throw new Error("无效 JSON");
    let sketches = [];
    if (Array.isArray(data.sketches) && data.sketches.length) {
      sketches = data.sketches.map((s) =>
        makeSketch({
          id: s.id,
          title: s.title,
          points: s.points,
          lines: s.lines,
          notes: s.notes,
        })
      );
    } else if (data.points) {
      sketches = [
        makeSketch({
          title: data.title || DEFAULT_TITLE,
          points: data.points,
          lines: data.lines || [],
          notes: data.notes || "",
        }),
      ];
    } else {
      throw new Error("未找到图纸数据");
    }
    this.sketches = sketches;
    this.activeId =
      data.active_id && sketches.some((s) => s.id === data.active_id)
        ? data.active_id
        : sketches[0].id;
    this.ensureOrigin();
    this.captureBaseline();
    this.clearHistory();
    this.save();
  }

  switchTo(id) {
    if (!this.sketches.some((s) => s.id === id)) return;
    this.activeId = id;
    this.ensureOrigin();
    this.captureBaseline();
    this.clearHistory();
    this.save();
  }

  nextNewTitle() {
    // 与桌面版一致：平面尺寸图2、3、4…（避开已占用标题）
    const used = new Set(this.sketches.map((s) => String(s.title || "")));
    let n = 2;
    while (used.has(`${DEFAULT_TITLE}${n}`)) n += 1;
    return `${DEFAULT_TITLE}${n}`;
  }

  newSketch() {
    const title = this.nextNewTitle();
    const sk = makeSketch({
      title,
      points: { O: [0, 0] },
      lines: [],
      notes: "",
    });
    this.sketches.push(sk);
    this.activeId = sk.id;
    this.ensureOrigin();
    this.captureBaseline();
    this.clearHistory();
    this.save();
    return sk;
  }

  deleteSketch() {
    if (this.sketches.length <= 1) return false;
    this.sketches = this.sketches.filter((s) => s.id !== this.activeId);
    this.activeId = this.sketches[0].id;
    this.ensureOrigin();
    this.captureBaseline();
    this.clearHistory();
    this.save();
    return true;
  }

  captureBaseline() {
    this.baseline = snapshotOf(this.active);
  }

  restoreBaseline() {
    if (!this.baseline) return;
    const sk = this.active;
    sk.title = this.baseline.title;
    sk.notes = this.baseline.notes;
    sk.points = clonePoints(this.baseline.points);
    sk.lines = [...this.baseline.lines];
    this.ensureOrigin();
    this.clearHistory();
    this.save();
  }

  clearHistory() {
    this.undoStack = [];
    this.redoStack = [];
  }

  pushUndo(label = "") {
    this.undoStack.push({ label, snap: snapshotOf(this.active) });
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.redoStack = [];
  }

  applySnap(snap) {
    const sk = this.active;
    sk.title = snap.title;
    sk.notes = snap.notes || "";
    sk.points = clonePoints(snap.points);
    sk.lines = [...(snap.lines || [])];
    this.ensureOrigin();
  }

  undo() {
    if (!this.undoStack.length) return null;
    const { label, snap } = this.undoStack.pop();
    this.redoStack.push({ label, snap: snapshotOf(this.active) });
    this.applySnap(snap);
    this.save();
    return label;
  }

  redo() {
    if (!this.redoStack.length) return null;
    const { label, snap } = this.redoStack.pop();
    this.undoStack.push({ label, snap: snapshotOf(this.active) });
    this.applySnap(snap);
    this.save();
    return label;
  }

  /** 保证原点 O(0,0) 始终存在 */
  ensureOrigin() {
    const sk = this.active;
    if (!sk) return;
    sk.points[ORIGIN_NAME] = [0, 0];
  }

  isOrigin(name) {
    return name === ORIGIN_NAME;
  }

  nextLetter() {
    // 原点占用 O；新增从 A 起，跳过 O
    this.ensureOrigin();
    const used = new Set(Object.keys(this.active.points));
    for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      if (ch === ORIGIN_NAME) continue;
      if (!used.has(ch)) return ch;
    }
    return null;
  }

  pointAt(x, y, exclude = null) {
    const rx = Math.round(x * 1e6) / 1e6;
    const ry = Math.round(y * 1e6) / 1e6;
    for (const [name, [px, py]] of Object.entries(this.active.points)) {
      if (name === exclude) continue;
      if (
        Math.round(px * 1e6) / 1e6 === rx &&
        Math.round(py * 1e6) / 1e6 === ry
      ) {
        return name;
      }
    }
    return null;
  }

  hasEdge(a, b) {
    const key = normalizeLine(a, b);
    if (!key) return false;
    return this.active.lines.some(
      (ln) => ln === key || ln === key[1] + key[0] || normalizeLine(ln[0], ln[1]) === key
    );
  }

  neighbors(name) {
    const out = new Set();
    for (const ln of this.active.lines) {
      if (ln.length < 2) continue;
      if (ln[0] === name) out.add(ln[1]);
      else if (ln[1] === name) out.add(ln[0]);
    }
    return [...out].sort();
  }

  addEdge(a, b) {
    const key = normalizeLine(a, b);
    if (!key || this.hasEdge(a, b)) return false;
    this.active.lines.push(key);
    return true;
  }

  removeEdge(a, b) {
    const key = normalizeLine(a, b);
    if (!key) return false;
    const before = this.active.lines.length;
    this.active.lines = this.active.lines.filter((ln) => {
      const n = normalizeLine(ln[0], ln[1]);
      return n !== key;
    });
    return this.active.lines.length < before;
  }

  degree(name) {
    return this.neighbors(name).length;
  }

  deleteEdgeCascade(a, b) {
    if (!this.removeEdge(a, b)) return { ok: false, pts: [] };
    const removed = [];
    for (const p of [a, b]) {
      if (p === ORIGIN_NAME) continue;
      if (p in this.active.points && this.degree(p) === 0) {
        delete this.active.points[p];
        removed.push(p);
      }
    }
    this.ensureOrigin();
    return { ok: true, pts: removed };
  }

  deletePointRaw(name) {
    if (name === ORIGIN_NAME) return false;
    if (!(name in this.active.points)) return false;
    delete this.active.points[name];
    this.active.lines = this.active.lines.filter(
      (ln) => ln.length >= 2 && ln[0] !== name && ln[1] !== name
    );
    this.ensureOrigin();
    return true;
  }

  orphansAfterDeleting(doomed) {
    const doom = new Set(doomed);
    doom.delete(ORIGIN_NAME);
    const remainLines = this.active.lines.filter(
      (ln) => ln.length >= 2 && !doom.has(ln[0]) && !doom.has(ln[1])
    );
    const deg = {};
    for (const n of Object.keys(this.active.points)) {
      if (!doom.has(n)) deg[n] = 0;
    }
    for (const ln of remainLines) {
      deg[ln[0]] = (deg[ln[0]] || 0) + 1;
      deg[ln[1]] = (deg[ln[1]] || 0) + 1;
    }
    // Points that only connected to doomed points become orphan if degree 0 after
    const orphans = [];
    for (const n of Object.keys(this.active.points)) {
      if (doom.has(n)) continue;
      let still = 0;
      for (const ln of this.active.lines) {
        if (ln.length < 2) continue;
        if (ln[0] === n && !doom.has(ln[1])) still++;
        if (ln[1] === n && !doom.has(ln[0])) still++;
      }
      // After deleting doomed, if this point had edges only to doomed and no other edges...
      // Actually orphan cascade in desktop: points that become isolated after deleting selected points
      if (n === ORIGIN_NAME) continue;
      const nbrs = this.neighbors(n);
      if (nbrs.length && nbrs.every((x) => doom.has(x))) {
        // will become isolated - but only if we also remove those edges by deleting doomed
        // After deletePointRaw on doomed, this point loses those edges; if no other edges, isolated
        const other = nbrs.filter((x) => !doom.has(x));
        if (other.length === 0) orphans.push(n);
      }
    }
    return orphans;
  }
}
