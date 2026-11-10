import {
  DEFAULT_TITLE,
  ORIGIN_NAME,
  COORD_MAX,
  fmt,
  normalizeLine,
} from "./sketch-defaults.js";
import { SketchStore } from "./sketch-store.js";
import { CanvasView } from "./sketch-canvas.js";

const store = new SketchStore();
const canvas = document.getElementById("mainCanvas");
const view = new CanvasView(canvas);

const ui = {
  sketchSelect: document.getElementById("sketchSelect"),
  toolHint: document.getElementById("toolHint"),
  opHint: document.getElementById("opHint"),
  toolUndo: document.getElementById("toolUndo"),
  toolRedo: document.getElementById("toolRedo"),
  toolClear: document.getElementById("toolClear"),
  toolZoomOut: document.getElementById("toolZoomOut"),
  toolZoomIn: document.getElementById("toolZoomIn"),
  toolZoomFit: document.getElementById("toolZoomFit"),
  zoomPct: document.getElementById("zoomPct"),
  toolGroup: document.getElementById("toolGroup"),
  modeCoord: document.getElementById("modeCoord"),
  modeSketch: document.getElementById("modeSketch"),
  fileImport: document.getElementById("fileImport"),
};

const DEFAULT_TOOL_HINT = "空白加点 · 点点连线 · 拖点移动 · 右键删除 · Esc 取消 · 方向键微调";

const state = {
  tool: "arrow",
  selectedPoints: [],
  selectedLines: [],
  linkAnchor: null,
  press: null,
  moveDrag: null,
  hover: null,
  nudgeKey: null,
  paintRaf: 0,
  canvasRect: null,
};

let _statusTimer = 0;
function setStatus(msg) {
  if (!msg || !ui.toolHint) return;
  ui.toolHint.textContent = String(msg);
  if (_statusTimer) clearTimeout(_statusTimer);
  _statusTimer = setTimeout(() => {
    _statusTimer = 0;
    if (ui.toolHint) ui.toolHint.textContent = DEFAULT_TOOL_HINT;
  }, 2200);
}

/** 打开/切换图纸：按内容等比例适配并铺满预览 */
function autoFitActiveSketch() {
  view.fitContent();
}



function invalidateCanvasRect() { state.canvasRect = null; }

function paintCanvas() {
  if (ui.opHint) ui.opHint.textContent = headerHint();
  view.draw({
    sketch: store.active,
    title: store.active.title,
    selection: { points: state.selectedPoints, lines: state.selectedLines },
    linkAnchor: state.linkAnchor,
    hover: state.hover,
  });
}

function schedulePaint() {
  if (state.paintRaf) return;
  state.paintRaf = requestAnimationFrame(() => { state.paintRaf = 0; paintCanvas(); });
}

function selectionMode() {
  const lines = validSelectedLines();
  if (lines.length) return "line";
  if (state.selectedPoints.length) return "points";
  if (state.linkAnchor && state.linkAnchor in store.active.points) return "linking";
  return "none";
}

function validSelectedLines() {
  const sk = store.active;
  const out = [];
  for (const ln of state.selectedLines) {
    const key = canonicalLine(ln);
    if (key && !out.includes(key)) out.push(key);
  }
  state.selectedLines = out;
  return out;
}

function canonicalLine(line) {
  if (!line || line.length < 2) return null;
  if (store.active.lines.includes(line)) return line;
  const rev = line[1] + line[0];
  if (store.active.lines.includes(rev)) return rev;
  const n = normalizeLine(line[0], line[1]);
  return store.active.lines.find((ln) => normalizeLine(ln[0], ln[1]) === n) || null;
}

function refreshSketchSelect() {
  const sel = ui.sketchSelect;
  const active = store.activeId;
  sel.innerHTML = "";
  store.sketches.forEach((sk, i) => {
    const opt = document.createElement("option");
    opt.value = sk.id;
    opt.textContent = `${i + 1}. ${sk.title || DEFAULT_TITLE}`;
    sel.appendChild(opt);
  });
  if (active && [...sel.options].some((o) => o.value === active)) {
    sel.value = active;
  }
}

function isCoordMode() {
  return view.mode === "coord";
}

function syncPreviewModeButtons() {
  const coord = isCoordMode();
  if (ui.modeCoord) {
    ui.modeCoord.classList.toggle("on", coord);
    ui.modeCoord.setAttribute("aria-pressed", coord ? "true" : "false");
  }
  if (ui.modeSketch) {
    ui.modeSketch.classList.toggle("on", !coord);
    ui.modeSketch.setAttribute("aria-pressed", !coord ? "true" : "false");
  }
}

function setPreviewMode(mode) {
  const next = mode === "sketch" ? "sketch" : "coord";
  if (view.mode === next) {
    syncPreviewModeButtons();
    return;
  }
  view.mode = next;
  if (next === "coord") autoFitActiveSketch();
  else view.resetView();
  if (view.mode === "sketch") blurSelection();
  updateActionStates();
  redraw();
}

function updateActionStates() {
  const coord = isCoordMode();
  if (ui.toolGroup) ui.toolGroup.classList.toggle("is-cad-locked", !coord);
  syncPreviewModeButtons();
  const canUndo = coord && !!store.undoStack.length;
  const canRedo = coord && !!store.redoStack.length;
  const canClear = coord && !!store.baseline;
  if (ui.toolUndo) {
    ui.toolUndo.disabled = !canUndo;
    ui.toolUndo.classList.toggle("on", canUndo);
  }
  if (ui.toolRedo) {
    ui.toolRedo.disabled = !canRedo;
    ui.toolRedo.classList.toggle("on", canRedo);
  }
  if (ui.toolClear) {
    ui.toolClear.disabled = !canClear;
    ui.toolClear.classList.toggle("on", canClear);
  }
  if (ui.toolZoomOut) {
    ui.toolZoomOut.disabled = !coord || !view.canZoomOut();
  }
  if (ui.toolZoomIn) {
    ui.toolZoomIn.disabled = !coord || !view.canZoomIn();
  }
  if (ui.toolZoomFit) {
    ui.toolZoomFit.disabled = !coord;
    const fitted = coord && view.extentMode === "fit" && Math.abs(view.zoom - 1) < 1e-9 && !view.pan;
    ui.toolZoomFit.classList.toggle("on", fitted);
  }
  if (ui.zoomPct) {
    ui.zoomPct.textContent = `${Math.round(view.zoom * 100)}%`;
  }
}

function selectPointOnly(name) {
  state.selectedLines = [];
  state.selectedPoints = [name];
  state.linkAnchor = null;
}

function togglePoint(name) {
  state.selectedLines = [];
  state.linkAnchor = null;
  const i = state.selectedPoints.indexOf(name);
  if (i >= 0) state.selectedPoints.splice(i, 1);
  else state.selectedPoints.push(name);
}

function selectLineOnly(line) {
  const key = canonicalLine(line) || line;
  state.selectedPoints = [];
  state.linkAnchor = null;
  state.selectedLines = [key];
}

function toggleLine(line) {
  const key = canonicalLine(line) || line;
  state.selectedPoints = [];
  state.linkAnchor = null;
  const i = state.selectedLines.indexOf(key);
  if (i >= 0) state.selectedLines.splice(i, 1);
  else state.selectedLines.push(key);
}

function blurSelection() {
  state.selectedPoints = [];
  state.selectedLines = [];
  state.linkAnchor = null;
  updateActionStates();
  redraw();
  setStatus("已取消选中");
}

function headerHint() {
  const mode = selectionMode();
  if (mode === "linking") return `折线中：${state.linkAnchor} → …  · 空白续画 · Esc 结束`;
  if (mode === "line") {
    const lines = validSelectedLines();
    return lines.length === 1
      ? `线选 ${lines[0][0]}–${lines[0][1]} · Delete 删线`
      : `线选 ${lines.length} 条 · Delete 删线`;
  }
  if (mode === "points") {
    const sel = state.selectedPoints;
    if (state.linkAnchor && sel.length === 1)
      return `聚焦 ${sel[0]} · 空白/点点续折线 · Esc 结束`;
    if (sel.length > 1) return `点选 ${sel.length} 个：${sel.join(", ")}`;
    if (sel.length === 1) return `点选 ${sel[0]} · 再点一点或空白开始折线`;
  }
  return "空白连续折线 · Ctrl+空白独立点 · 右键删点/线 · Esc 结束";
}

function redraw(opts = {}) {
  const { actions = true } = opts;
  paintCanvas();
  if (actions) updateActionStates();
}

function afterEdit(msg) {
  store.save();
  redraw();
  if (msg) setStatus(msg);
}

function promptExportTitle() {
  const cur = String(store.active.title || DEFAULT_TITLE);
  const next = window.prompt("导出标题", cur);
  if (next == null) return null;
  const title = String(next).trim().slice(0, 80) || DEFAULT_TITLE;
  store.active.title = title;
  store.save(true);
  refreshSketchSelect();
  schedulePaint();
  return title;
}

function safeFileTitle(title) {
  return String(title || DEFAULT_TITLE).replace(/[\/:*?"<>|]/g, "_");
}

function addPointAt(x, y, { continueChain = true } = {}) {
  x = Math.max(0, Math.min(COORD_MAX, Math.round(x)));
  y = Math.max(0, Math.min(COORD_MAX, Math.round(y)));
  const name = store.nextLetter();
  if (!name) {
    setStatus("点位已满（A–Z，不含原点 O）");
    return;
  }
  if (store.pointAt(x, y)) {
    setStatus(`坐标 (${fmt(x)}, ${fmt(y)}) 已存在点`);
    return;
  }
  store.pushUndo(`添加点 ${name}`);
  store.active.points[name] = [x, y];
  const anchor =
    continueChain && state.linkAnchor in store.active.points
      ? state.linkAnchor
      : null;
  if (anchor && store.addEdge(anchor, name)) {
    selectPointOnly(name);
    state.linkAnchor = name;
    afterEdit(`已连接 ${anchor}–${name}，聚焦 ${name}`);
  } else {
    selectPointOnly(name);
    state.linkAnchor = continueChain ? name : null;
    afterEdit(
      continueChain
        ? `已添加 ${name}，聚焦为折线起点`
        : `已独立添加点 ${name}`
    );
  }
}

function edgeClosesCycle(a, b) {
  const skip = normalizeLine(a, b);
  if (!skip) return false;
  const queue = [a];
  const seen = new Set([a]);
  while (queue.length) {
    const cur = queue.shift();
    for (const n of store.neighbors(cur)) {
      if (normalizeLine(cur, n) === skip) continue;
      if (n === b) return true;
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return false;
}

function finishTwoPoint(a, b, created) {
  if (created && edgeClosesCycle(a, b)) {
    state.selectedPoints = [];
    state.selectedLines = [];
    state.linkAnchor = null;
    afterEdit(`已连接 ${a}–${b}，形成回路，已取消选中`);
    return;
  }
  selectPointOnly(b);
  state.linkAnchor = b;
  afterEdit(
    `${created ? "已连接" : "已有连线"} ${a}–${b}，聚焦 ${b}`
  );
}


if (ui.modeCoord) ui.modeCoord.addEventListener("click", () => setPreviewMode("coord"));
if (ui.modeSketch) ui.modeSketch.addEventListener("click", () => setPreviewMode("sketch"));

[
  [ui.modeCoord, "坐标系预览"],
  [ui.modeSketch, "CAD 草图预览"],
  [ui.toolUndo, "撤销  Ctrl+Z"],
  [ui.toolRedo, "还原  Ctrl+Y"],
  [ui.toolClear, "恢复原图"],
  [ui.toolZoomOut, "缩小视图"],
  [ui.toolZoomIn, "放大视图"],
  [ui.toolZoomFit, "完整适配"],
  [document.getElementById("btnNewSketch"), "新建图纸"],
  [document.getElementById("btnDelSketch"), "删除图纸"],
  [document.getElementById("btnImport"), "导入 JSON"],
  [document.getElementById("btnExport"), "导出 JSON"],
  [document.getElementById("btnSave"), "保存"],
  [document.getElementById("btnExportPng"), "导出 CAD 草图"],
].forEach(([el, text]) => {
  if (!el) return;
  el.addEventListener("mouseenter", () => {
    ui.toolHint.textContent = text;
  });
  el.addEventListener("mouseleave", () => {
    ui.toolHint.textContent = DEFAULT_TOOL_HINT;
  });
});


function performUndo() {
  if (!isCoordMode()) {
    setStatus("仅坐标系预览可操作");
    return;
  }
  if (!store.undoStack.length) {
    setStatus("没有可撤销的操作");
    updateActionStates();
    return;
  }
  const label = store.undo();
  state.linkAnchor = null;
  state.selectedLines = [];
  state.selectedPoints = [];
  redraw();
  setStatus(label ? `已撤销：${label}` : "已撤销上一步");
}

function performRedo() {
  if (!isCoordMode()) {
    setStatus("仅坐标系预览可操作");
    return;
  }
  if (!store.redoStack.length) {
    setStatus("没有可还原的操作");
    updateActionStates();
    return;
  }
  const label = store.redo();
  state.linkAnchor = null;
  state.selectedLines = [];
  state.selectedPoints = [];
  redraw();
  setStatus(label ? `已还原：${label}` : "已还原上一步");
}

function performClear() {
  if (!isCoordMode()) {
    setStatus("仅坐标系预览可操作");
    return;
  }
  if (!store.baseline) {
    setStatus("恢复原图");
    updateActionStates();
    return;
  }
  store.restoreBaseline();
  state.selectedPoints = [];
  state.selectedLines = [];
  state.linkAnchor = null;
  state.hover = null;
  refreshSketchSelect();
  redraw();
  setStatus("已恢复原图");
}

ui.toolUndo.addEventListener("click", () => performUndo());
ui.toolRedo.addEventListener("click", () => performRedo());
if (ui.toolClear) ui.toolClear.addEventListener("click", () => performClear());

function performZoomOut() {
  if (!isCoordMode()) return;
  view.zoomOut();
  redraw();
  setStatus(`缩放 ${Math.round(view.zoom * 100)}%`);
}

function performZoomIn() {
  if (!isCoordMode()) return;
  view.zoomIn();
  redraw();
  setStatus(`缩放 ${Math.round(view.zoom * 100)}%`);
}

function performZoomFit() {
  if (!isCoordMode()) return;
  view.fitContent();
  redraw();
  setStatus("已适配内容");
}

if (ui.toolZoomOut) ui.toolZoomOut.addEventListener("click", () => performZoomOut());
if (ui.toolZoomIn) ui.toolZoomIn.addEventListener("click", () => performZoomIn());
if (ui.toolZoomFit) ui.toolZoomFit.addEventListener("click", () => performZoomFit());

function deleteSelectedPoints() {
  const sel = [...state.selectedPoints].filter((n) => n in store.active.points);
  if (!sel.length) return;
  const removable = sel.filter((n) => n !== ORIGIN_NAME);
  if (!removable.length) {
    setStatus("原点 O 不可删除");
    return;
  }
  const doomed = new Set(removable);
  const orphans = store.orphansAfterDeleting(doomed);
  store.pushUndo(`删除点 ${removable.join(", ")}`);
  for (const name of [...removable, ...orphans]) store.deletePointRaw(name);
  store.ensureOrigin();
  state.selectedPoints = state.selectedPoints.filter(
    (n) => n === ORIGIN_NAME && n in store.active.points
  );
  if (!state.selectedPoints.length) state.selectedPoints = [];
  state.selectedLines = [];
  state.linkAnchor = null;
  const keptOrigin = sel.includes(ORIGIN_NAME);
  afterEdit(
    `已删除点 ${removable.join(", ")}` +
      (keptOrigin ? "（原点 O 已保留）" : "")
  );
}

function deleteSelectedLines() {
  const lines = validSelectedLines();
  if (lines.length) {
    store.pushUndo(
      lines.length === 1
        ? `删除连线 ${lines[0][0]}–${lines[0][1]}`
        : `删除 ${lines.length} 条连线`
    );
    const removed = [];
    const pts = [];
    for (const line of lines) {
      const { ok, pts: p } = store.deleteEdgeCascade(line[0], line[1]);
      if (ok) {
        removed.push(`${line[0]}–${line[1]}`);
        for (const x of p) if (!pts.includes(x)) pts.push(x);
      }
    }
    state.selectedLines = [];
    state.linkAnchor = null;
    afterEdit(
      removed.length
        ? `已删除连线 ${removed.join(", ")}` +
            (pts.length ? `；孤立点 ${pts.join(", ")}` : "")
        : "没有可删除的连线"
    );
    return;
  }
  const sel = state.selectedPoints;
  if (sel.length === 1) {
    const name = sel[0];
    const nbrs = store.neighbors(name);
    if (!nbrs.length) {
      setStatus(`点 ${name} 没有连线`);
      return;
    }
    store.pushUndo(`删除点 ${name} 的连线`);
    const removed = [];
    const pts = [];
    for (const other of [...nbrs]) {
      const { ok, pts: p } = store.deleteEdgeCascade(name, other);
      if (ok) {
        removed.push(`${name}–${other}`);
        for (const x of p) if (!pts.includes(x)) pts.push(x);
      }
    }
    afterEdit(`已删除连线 ${removed.join(", ")}`);
    return;
  }
  if (sel.length === 2) {
    const [a, b] = sel;
    if (!store.hasEdge(a, b)) {
      setStatus(`点 ${a} 与 ${b} 之间没有连线`);
      return;
    }
    store.pushUndo(`删除连线 ${a}–${b}`);
    const { ok, pts } = store.deleteEdgeCascade(a, b);
    afterEdit(ok ? `已删除连线 ${a}–${b}` : "删除失败");
    void pts;
    return;
  }
  if (sel.length > 2) {
    const pending = [];
    for (let i = 0; i < sel.length; i++) {
      for (let j = i + 1; j < sel.length; j++) {
        if (store.hasEdge(sel[i], sel[j])) pending.push([sel[i], sel[j]]);
      }
    }
    if (!pending.length) {
      setStatus("选中的点之间没有连线");
      return;
    }
    store.pushUndo("删除多点间连线");
    for (const [a, b] of pending) store.deleteEdgeCascade(a, b);
    afterEdit("已删除多点间连线");
    return;
  }
  setStatus("请先选中连线或有连线的点");
}

/* ── sketch management ───────────────────────── */
ui.sketchSelect.addEventListener("change", () => {
  store.switchTo(ui.sketchSelect.value);
  state.selectedPoints = [];
  state.selectedLines = [];
  state.linkAnchor = null;
  autoFitActiveSketch();
  
  refreshSketchSelect();
  redraw();
  setStatus("已切换图纸");
});

function createNewSketch(ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  try {
    const sk = store.newSketch();
    state.selectedPoints = ["O"];
    state.selectedLines = [];
    state.linkAnchor = null;
    state.nudgeKey = null;
    autoFitActiveSketch();
    view.mode = "coord";
    syncPreviewModeButtons();
    refreshSketchSelect();
    ui.sketchSelect.value = sk.id;
    redraw();
    setStatus(`已新建图纸：${sk.title}（原点 O(0,0) 左上）`);
    // 确保下拉可见选中项
    ui.sketchSelect.focus();
  } catch (err) {
    console.error(err);
    setStatus("新建失败：" + (err?.message || err));
    alert("新建图纸失败：\n" + (err?.message || err));
  }
}

window.__sketchNew = createNewSketch;
document.getElementById("btnNewSketch")?.addEventListener("click", createNewSketch);

document.getElementById("btnDelSketch").addEventListener("click", () => {
  if (store.sketches.length <= 1) {
    setStatus("至少保留一张图纸");
    return;
  }
  if (!confirm("删除当前图纸？")) return;
  store.deleteSketch();
  state.selectedPoints = [];
  state.selectedLines = [];
  state.linkAnchor = null;
  autoFitActiveSketch();
  
  refreshSketchSelect();
  redraw();
  setStatus("已删除图纸");
});

document.getElementById("btnSave").addEventListener("click", () => {
  store.save(true);
  setStatus("已保存到浏览器本地");
});


document.getElementById("btnExport").addEventListener("click", () => {
  const title = promptExportTitle();
  if (title == null) { setStatus("已取消导出"); return; }
  const data = store.exportJSON();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${safeFileTitle(title)}-图纸数据.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus("已导出 JSON");
});

document.getElementById("btnImport").addEventListener("click", () => {
  ui.fileImport.click();
});

ui.fileImport.addEventListener("change", async () => {
  const file = ui.fileImport.files?.[0];
  ui.fileImport.value = "";
  if (!file) return;
  try {
    const text = await file.text();
    store.importJSON(JSON.parse(text));
    state.selectedPoints = [];
    state.selectedLines = [];
    state.linkAnchor = null;
    autoFitActiveSketch();
    
    refreshSketchSelect();
    redraw();
    setStatus("已导入 JSON");
  } catch (err) {
    alert("导入失败：" + (err?.message || err));
  }
});

document.getElementById("btnExportPng").addEventListener("click", () => {
  const title = promptExportTitle();
  if (title == null) { setStatus("已取消导出"); return; }
  const prev = view.mode;
  view.mode = "sketch";
  view.resetView();
  redraw();
  requestAnimationFrame(() => {
    canvas.toBlob((blob) => {
      view.mode = prev;
      redraw();
      if (!blob) { setStatus("导出失败"); return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${safeFileTitle(title)}-CAD草图.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus("已导出 CAD 草图 PNG");
    });
  });
});


/* ── canvas interactions ───────────────────────── */
function eventPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function handlePointClick(hit, ctrl) {
  if (ctrl) {
    togglePoint(hit);
    setStatus(
      state.selectedPoints.length
        ? `已多选 ${state.selectedPoints.length} 个点`
        : "已取消点选中"
    );
    redraw();
    return;
  }

  if (!state.linkAnchor) {
    for (const line of [...validSelectedLines()].reverse()) {
      if (hit === line[0] || hit === line[1]) {
        selectPointOnly(hit);
        state.linkAnchor = hit;
        setStatus(`从端点 ${hit} 继续折线`);
        redraw();
        return;
      }
    }
  }

  if (state.linkAnchor && state.linkAnchor !== hit) {
    const a = state.linkAnchor;
    const b = hit;
    if (store.hasEdge(a, b)) {
      finishTwoPoint(a, b, false);
      return;
    }
    store.pushUndo(`连接 ${a}–${b}`);
    if (store.addEdge(a, b)) {
      finishTwoPoint(a, b, true);
      return;
    }
    store.undoStack.pop();
    selectPointOnly(hit);
    state.linkAnchor = hit;
    setStatus(`起点改为 ${hit}`);
    redraw();
    return;
  }

  selectPointOnly(hit);
  state.linkAnchor = hit;
  setStatus(`折线起点 ${hit}`);
  redraw();
}

function beginPointMove(hit, model) {
  if (hit === ORIGIN_NAME) {
    setStatus("原点 O 固定在 (0,0)");
    return;
  }
  let names =
    state.selectedPoints.includes(hit) && state.selectedPoints.length
      ? [...state.selectedPoints]
      : [hit];
  names = names.filter((n) => n in store.active.points && n !== ORIGIN_NAME);
  if (!names.includes(hit)) names = [hit];
  if (!names.length) {
    setStatus("?? O ??? (0,0)");
    return;
  }
  if (!state.selectedPoints.includes(hit) || state.selectedPoints.length !== names.length) {
    state.selectedPoints = [...names];
    state.selectedLines = [];
  }
  state.linkAnchor = null;
  state.nudgeKey = null;
  state.moveDrag = {
    names,
    lastModel: { x: model.x, y: model.y },
    moved: false,
    undoPushed: false,
  };
}

function applyPointMove(model) {
  const drag = state.moveDrag;
  if (!drag || !model) return;
  const dx = Math.round(model.x) - Math.round(drag.lastModel.x);
  const dy = Math.round(model.y) - Math.round(drag.lastModel.y);
  if (!dx && !dy) return;

  const proposed = {};
  for (const name of drag.names) {
    const cur = store.active.points[name];
    if (!cur) continue;
    const nx = cur[0] + dx;
    const ny = cur[1] + dy;
    if (nx < 0 || ny < 0 || nx > COORD_MAX || ny > COORD_MAX) {
      setStatus("已到边界（X、Y 须在 0–3000）");
      return;
    }
    proposed[name] = [nx, ny];
  }
  if (!Object.keys(proposed).length) return;

  const occupied = new Map();
  for (const [n, [px, py]] of Object.entries(store.active.points)) {
    if (n in proposed) continue;
    occupied.set(`${Math.round(px * 1e6)}_${Math.round(py * 1e6)}`, n);
  }
  const seen = new Set();
  for (const [nx, ny] of Object.values(proposed)) {
    const key = `${Math.round(nx * 1e6)}_${Math.round(ny * 1e6)}`;
    if (occupied.has(key) || seen.has(key)) {
      setStatus("无法移动：坐标重合");
      return;
    }
    seen.add(key);
  }

  if (!drag.undoPushed) {
    store.pushUndo(
      drag.names.length === 1
        ? `移动点 ${drag.names[0]}`
        : `移动点 ${drag.names.join(", ")}`
    );
    drag.undoPushed = true;
  }
  for (const [name, xy] of Object.entries(proposed)) {
    store.active.points[name] = xy;
  }
  drag.lastModel = { x: model.x, y: model.y };
  drag.moved = true;
  schedulePaint();
  updateActionStates();
  setStatus(`移动中 ${drag.names.join(", ")}`);
}

function setMouseHint(_text) {
  /* mouse coords UI removed */
}


canvas.addEventListener("pointerdown", (e) => {
  canvas.focus();
  invalidateCanvasRect();
  const { x, y } = eventPos(e);
  if (e.button !== 0) return;
  if (view.mode !== "coord") return;

  const hit = view.hitPoint(x, y);
  const ctrl = e.ctrlKey || e.metaKey;
  if (!hit) {
    const edge = view.hitEdge(x, y);
    if (edge) {
      if (ctrl) {
        toggleLine(edge);
        setStatus(
          state.selectedLines.length
            ? `已多选 ${state.selectedLines.length} 条直线`
            : "已取消线选中"
        );
      } else {
        selectLineOnly(edge);
        setStatus(`已选中直线 ${edge[0]}–${edge[1]}`);
      }
      redraw();
      return;
    }
    const model = view.canvasToModel(x, y);
    if (!model) return;
    addPointAt(model.x, model.y, { continueChain: !ctrl });
    return;
  }

  if (ctrl) {
    handlePointClick(hit, true);
    return;
  }

  state.press = { hit, x, y };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  const { x, y } = eventPos(e);

  if (state.press && !state.moveDrag) {
    if (Math.hypot(x - state.press.x, y - state.press.y) >= 5) {
      const model = view.canvasToModel(x, y);
      if (model) beginPointMove(state.press.hit, model);
    }
  }
  if (state.moveDrag) {
    if (state.hover) {
      state.hover = null;
    }
    const model = view.canvasToModel(x, y);
    if (model) applyPointMove(model);
    return;
  }

  if (view.mode !== "coord") {
    if (state.hover) {
      state.hover = null;
      schedulePaint();
    }
    setMouseHint("鼠标：—（CAD 草图模式）");
    return;
  }
  const model = view.canvasToModel(x, y);
  if (!model) {
    if (state.hover) {
      state.hover = null;
      schedulePaint();
    }
    setMouseHint("鼠标：—");
    return;
  }
  const mx = Math.max(0, Math.min(COORD_MAX, Math.round(model.x)));
  const my = Math.max(0, Math.min(COORD_MAX, Math.round(model.y)));
  const hit = view.hitPoint(x, y);
  if (hit) {
    if (state.hover) {
      state.hover = null;
      schedulePaint();
    }
    const [px, py] = store.active.points[hit] || [mx, my];
    setMouseHint(`点 ${hit}：X ${fmt(px)}   Y ${fmt(py)}  mm`);
    return;
  }
  const next = store.nextLetter();
  const nextHover = next ? { x: mx, y: my, name: next } : { x: mx, y: my, name: null };
  const prev = state.hover;
  if (!prev || prev.x !== nextHover.x || prev.y !== nextHover.y || prev.name !== nextHover.name) {
    state.hover = nextHover;
    schedulePaint();
  }
  setMouseHint(
    next
      ? `下一个点 ${next}：X ${fmt(mx)}   Y ${fmt(my)}  mm`
      : "下一个点：已满（不含 O）"
  );
});

canvas.addEventListener("pointerup", (e) => {
  if (state.moveDrag) {
    const moved = state.moveDrag.moved;
    const names = state.moveDrag.names;
    state.moveDrag = null;
    state.press = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
    if (moved) {
      store.save();
      redraw();
      setStatus(`已移动 ${names.join(", ")}`);
    } else if (names[0]) {
      handlePointClick(names[0], false);
    }
    return;
  }

  if (state.press) {
    const { hit } = state.press;
    state.press = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
    handlePointClick(hit, false);
  }
});

canvas.addEventListener("pointercancel", () => {
  state.press = null;
  state.moveDrag = null;
});
canvas.addEventListener("pointerleave", () => {
  if (document.activeElement === canvas) canvas.blur();
  if (state.hover) {
    state.hover = null;
    schedulePaint();
  }
  setMouseHint("鼠标：—");
});


canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (view.mode !== "coord") return;
  const { x, y } = eventPos(e);
  const hit = view.hitPoint(x, y);
  if (hit) {
    if (hit === ORIGIN_NAME) {
      setStatus("原点 O 不可删除");
      return;
    }
    if (state.selectedPoints.includes(hit) && state.selectedPoints.length > 1) {
      /* keep multi */
    } else selectPointOnly(hit);
    deleteSelectedPoints();
    return;
  }
  const edge = view.hitEdge(x, y);
  if (!edge) {
    setStatus("右键请点在要删除的点或连线上");
    return;
  }
  if (state.selectedLines.includes(canonicalLine(edge)) && state.selectedLines.length > 1) {
    /* keep multi */
  } else selectLineOnly(edge);
  deleteSelectedLines();
});


/* ── keyboard ───────────────────────── */
function isTypingTarget(el) {
  return (
    el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.isContentEditable)
  );
}

window.addEventListener("keydown", (e) => {
  if (isTypingTarget(e.target)) return;
  if (e.key === "Escape") {
    blurSelection();
    e.preventDefault();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
    if (isCoordMode()) performUndo();
    e.preventDefault();
    return;
  }
  if (
    ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
    ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
  ) {
    if (isCoordMode()) performRedo();
    e.preventDefault();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "0") {
    view.resetView();
    redraw();
    setStatus("已适配内容 100%");
    e.preventDefault();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
    if (isCoordMode()) performZoomIn();
    e.preventDefault();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "-") {
    if (isCoordMode()) performZoomOut();
    e.preventDefault();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "1") {
    if (isCoordMode()) {
      view.usePaperExtent();
      redraw();
      setStatus("已切换默认范围 1000×600");
    }
    e.preventDefault();
    return;
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    if (selectionMode() === "line") deleteSelectedLines();
    else if (state.selectedPoints.length) deleteSelectedPoints();
    e.preventDefault();
    return;
  }
  const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (map[e.key] && view.mode === "coord") {
    const [sx, sy] = map[e.key];
    const step = e.shiftKey ? 10 : 1;
    if (nudge(sx * step, sy * step)) e.preventDefault();
  }
});

function nudgeTargets() {
  if (selectionMode() === "line") {
    const names = [];
    const seen = new Set();
    for (const ln of validSelectedLines()) {
      for (const p of [ln[0], ln[1]]) {
        if (p in store.active.points && p !== ORIGIN_NAME && !seen.has(p)) {
          seen.add(p);
          names.push(p);
        }
      }
    }
    return names;
  }
  return state.selectedPoints.filter(
    (n) => n in store.active.points && n !== ORIGIN_NAME
  );
}

function nudge(dx, dy) {
  const sel = nudgeTargets();
  if (!sel.length) return false;
  const proposed = {};
  for (const name of sel) {
    const [x, y] = store.active.points[name];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx > COORD_MAX || ny > COORD_MAX) {
      setStatus("已到边界（X、Y 须在 0–3000）");
      return true;
    }
    proposed[name] = [nx, ny];
  }
  const occupied = new Map();
  for (const [n, [px, py]] of Object.entries(store.active.points)) {
    if (n in proposed) continue;
    occupied.set(`${Math.round(px * 1e6)}_${Math.round(py * 1e6)}`, n);
  }
  const seen = new Set();
  for (const [name, [nx, ny]] of Object.entries(proposed)) {
    const key = `${Math.round(nx * 1e6)}_${Math.round(ny * 1e6)}`;
    if (occupied.has(key) || seen.has(key)) {
      setStatus("无法移动：坐标重合");
      return true;
    }
    seen.add(key);
  }
  const idKey =
    (selectionMode() === "line" ? "L:" : "P:") + sel.join(",");
  const coalesce = state.nudgeKey && state.nudgeKey.startsWith(idKey + "|");
  if (!coalesce) {
    store.pushUndo(
      selectionMode() === "line"
        ? `移动直线端点 ${sel.join(", ")}`
        : `移动点 ${sel.join(", ")}`
    );
  }
  state.nudgeKey = `${idKey}|${dx},${dy}`;
  for (const [name, xy] of Object.entries(proposed)) {
    store.active.points[name] = xy;
  }
  afterEdit(`已移动 ${sel.join(", ")}`);
  return true;
}

/* ── boot ───────────────────────── */
function boot() {
  refreshSketchSelect();
  autoFitActiveSketch();
  redraw();
  setStatus("就绪");
}

let resizeTimer = 0;
function onViewportChange() {
  invalidateCanvasRect();
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeTimer = 0;
    if (view.resize) view.resize(true);
    schedulePaint();
  }, 80);
}
window.addEventListener("resize", onViewportChange);
if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
  new ResizeObserver(onViewportChange).observe(canvas.parentElement);
}
window.addEventListener("pagehide", () => store.flushSave && store.flushSave());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && store.flushSave) store.flushSave();
});
boot();
