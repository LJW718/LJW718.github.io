import {
  fmt,
  fmtInt,
  COORD_MAX,
  COORD_DEFAULT_X,
  COORD_DEFAULT_Y,
} from "./sketch-defaults.js";

const COLORS = {
  desk: "#0d1420",
  paper: "#121a2b",
  grid: "rgba(122, 240, 200, 0.08)",
  gridMinor: "rgba(122, 240, 200, 0.04)",
  axisX: "#ff8e8e",
  axisY: "#2ee6a6",
  tick: "#8b9bb0",
  accent: "#7af0c8",
  point: "#4aa3ff",
  select: "#f0c674",
  mute: "#8b9bb0",
  line: "rgba(122, 240, 200, 0.22)",
  fill: "rgba(74, 163, 255, 0.12)",
  ink: "#eef4fc",
  paperStroke: "#fff",
};

function niceStep(span, target = 8) {
  if (span <= 0) return 50;
  const raw = span / Math.max(target, 1);
  const exp = Math.floor(Math.log10(raw));
  const base = 10 ** exp;
  for (const m of [1, 2, 5, 10]) {
    const step = m * base;
    if (step >= raw) return step;
  }
  return 10 * base;
}

function contentBBox(points) {
  const vals = Object.values(points);
  if (!vals.length) return [0, 0, 100, 100];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of vals) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
}

/** 轻量上取整，避免 niceCeil 把 726 抬到 1000 导致图形被压小 */
function softCeil(v) {
  if (!(v > 0)) return 1;
  const step = v < 50 ? 1 : v < 200 ? 5 : v < 1000 ? 10 : 50;
  return Math.ceil(v / step - 1e-9) * step;
}

function contentAxisExtent(bx1, by1, mode) {
  if (mode === "paper" || (bx1 < 1e-6 && by1 < 1e-6)) {
    return [
      Math.min(COORD_MAX, Math.max(bx1, COORD_DEFAULT_X)),
      Math.min(COORD_MAX, Math.max(by1, COORD_DEFAULT_Y)),
    ];
  }
  // 内容外留白：保证完整图形与点标注可见
  const pad = 0.08;
  const xRaw = Math.max(bx1 * (1 + pad), bx1 + Math.max(bx1 * 0.03, 4), 16);
  const yRaw = Math.max(by1 * (1 + pad), by1 + Math.max(by1 * 0.03, 4), 16);
  return [
    Math.min(COORD_MAX, softCeil(xRaw)),
    Math.min(COORD_MAX, softCeil(yRaw)),
  ];
}

export class CanvasView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.dpr = 1;
    this.mode = "coord"; // coord | sketch
    this.zoom = 1;
    /** @type {'fit'|'paper'} fit=按内容适配；paper=至少 1000×600 绘图区 */
    this.extentMode = "fit";
    this.pan = null; // {ox, oy} | null
    this.view = null;
    this.hitPoints = [];
    this.hitEdges = [];
    this._cssW = 0;
    this._cssH = 0;
  }

  resize(force = false) {
    const parent = this.canvas.parentElement;
    const cssW = Math.max(parent.clientWidth, 40);
    const cssH = Math.max(parent.clientHeight || 420, 320);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.floor(cssW * dpr);
    const bh = Math.floor(cssH * dpr);
    if (
      force ||
      this._cssW !== cssW ||
      this._cssH !== cssH ||
      this.dpr !== dpr ||
      this.canvas.width !== bw ||
      this.canvas.height !== bh
    ) {
      this.dpr = dpr;
      this._cssW = cssW;
      this._cssH = cssH;
      this.canvas.width = bw;
      this.canvas.height = bh;
      this.canvas.style.width = cssW + "px";
      this.canvas.style.height = cssH + "px";
    }
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    return { w: cssW, h: cssH };
  }

  resetView() {
    this.zoom = 1;
    this.pan = null;
    this.extentMode = "fit";
  }

  /** zoom=1：完整图形最大铺满；>1 会裁切，禁止 */
  static ZOOM_MIN = 0.25;
  static ZOOM_MAX = 1;
  static ZOOM_FACTOR = 1.25;

  clampZoom(z) {
    const n = Number(z);
    if (!Number.isFinite(n)) return 1;
    return Math.min(CanvasView.ZOOM_MAX, Math.max(CanvasView.ZOOM_MIN, n));
  }

  zoomIn() {
    this.zoom = this.clampZoom(
      Math.round(this.zoom * CanvasView.ZOOM_FACTOR * 1000) / 1000
    );
  }

  zoomOut() {
    this.zoom = this.clampZoom(
      Math.round((this.zoom / CanvasView.ZOOM_FACTOR) * 1000) / 1000
    );
  }

  fitContent() {
    this.extentMode = "fit";
    this.zoom = 1;
    this.pan = null;
  }

  usePaperExtent() {
    this.extentMode = "paper";
    this.zoom = 1;
    this.pan = null;
  }

  canZoomIn() {
    return this.zoom < CanvasView.ZOOM_MAX - 1e-9;
  }

  canZoomOut() {
    return this.zoom > CanvasView.ZOOM_MIN + 1e-9;
  }

  clampPan(ox, oy, scale, limits) {
    if (!limits) return { ox, oy };
    const { plotL, plotT, plotR, plotB, paperX1, paperY1 } = limits;
    const axisPadX = limits.axisPadX ?? limits.axisPad ?? 34;
    const axisPadY = limits.axisPadY ?? limits.axisPad ?? 34;
    const viewW = Math.max(plotR - plotL, 1);
    const viewH = Math.max(plotB - plotT, 1);
    const minVisX = Math.min(40, Math.max(paperX1 * 0.15, 1));
    const minVisY = Math.min(40, Math.max(paperY1 * 0.15, 1));
    let nx = ox;
    let ny = oy;
    const oxMax = plotL + axisPadX;
    if (viewW / scale >= paperX1 + axisPadX / scale) nx = plotL + axisPadX;
    else {
      const oxMin = plotL - (paperX1 - minVisX) * scale;
      nx = Math.min(oxMax, Math.max(oxMin, nx));
    }
    const oyMax = plotT + axisPadY;
    if (viewH / scale >= paperY1 + axisPadY / scale) ny = plotT + axisPadY;
    else {
      const oyMin = plotT - (paperY1 - minVisY) * scale;
      ny = Math.min(oyMax, Math.max(oyMin, ny));
    }
    return { ox: nx, oy: ny };
  }

  canvasToModel(px, py) {
    const v = this.view;
    if (!v || this.mode !== "coord") return null;
    return {
      x: (px - v.ox) / v.scale,
      y: (py - v.oy) / v.scale,
    };
  }

  hitPoint(px, py, r = 14) {
    let best = null;
    let bestD = r;
    for (const h of this.hitPoints) {
      const d = Math.hypot(px - h.cx, py - h.cy);
      if (d <= bestD) {
        bestD = d;
        best = h.name;
      }
    }
    return best;
  }

  hitEdge(px, py, thresh = 8) {
    let best = null;
    let bestD = thresh;
    for (const e of this.hitEdges) {
      const d = distToSeg(px, py, e.x0, e.y0, e.x1, e.y1);
      if (d <= bestD) {
        bestD = d;
        best = e.line;
      }
    }
    return best;
  }

  draw(state) {
    const { w, h } = this.resize();
    const ctx = this.ctx;
    ctx.fillStyle = this.mode === "sketch" ? "#ffffff" : COLORS.desk;
    ctx.fillRect(0, 0, w, h);
    this.hitPoints = [];
    this.hitEdges = [];
    if (this.mode === "sketch") {
      this.drawCad(state, w, h);
    } else {
      this.drawCoord(state, w, h);
    }
  }

  drawCoord(state, w, h) {
    const ctx = this.ctx;
    const { sketch, selection, linkAnchor } = state;
    const points = sketch.points;
    const lines = sketch.lines;

    const plotL = 58;
    const plotT = 12;
    const plotR = w - 18;
    const plotB = h - 18;
    if (plotR - plotL < 80 || plotB - plotT < 80) return;

    ctx.fillStyle = COLORS.desk;
    ctx.fillRect(plotL, plotT, plotR - plotL, plotB - plotT);
    ctx.strokeStyle = COLORS.line;
    ctx.strokeRect(plotL, plotT, plotR - plotL, plotB - plotT);

    if (!Object.keys(points).length) {
      ctx.fillStyle = COLORS.mute;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "14px IBM Plex Sans, Noto Sans SC, sans-serif";
      ctx.fillText("暂无点：在坐标系空白处点击添加", (plotL + plotR) / 2, (plotT + plotB) / 2);
      this.view = null;
      return;
    }

    let [, , bx1, by1] = contentBBox(points);
    bx1 = Math.max(bx1, 0);
    by1 = Math.max(by1, 0);
    let [x1, y1] = contentAxisExtent(bx1, by1, this.extentMode);
    // 刻度槽 + 点标注边距：保证完整图形可见、不被裁切
    const axisPadX = 56;
    const axisPadY = 36;
    const tipPad = 12;
    const labelPad = 28;
    const availW = Math.max(plotR - plotL - axisPadX - tipPad - labelPad, 1);
    const availH = Math.max(plotB - plotT - axisPadY - tipPad - labelPad, 1);
    // 等比例：zoom=1 为最大不裁切适配；缩小只降低 scale，坐标系整体变小，不强制拉满视口
    this.zoom = this.clampZoom(this.zoom);
    const fitScale = Math.min(
      availW / Math.max(x1, 1e-6),
      availH / Math.max(y1, 1e-6)
    );
    const scale = fitScale * this.zoom;
    const defaultOx = plotL + axisPadX;
    const defaultOy = plotT + axisPadY;
    const limits = {
      plotL,
      plotT,
      plotR,
      plotB,
      paperX1: x1,
      paperY1: y1,
      axisPad: axisPadX,
      axisPadX,
      axisPadY,
    };
    let ox, oy;
    if (!this.pan) {
      ox = defaultOx;
      oy = defaultOy;
    } else {
      ({ ox, oy } = this.clampPan(this.pan.ox, this.pan.oy, scale, limits));
      this.pan = { ox, oy };
    }
    this.view = { ox, oy, scale, fitScale, limits };

    const toC = (mx, my) => [ox + mx * scale, oy + my * scale];

    const visX0 = (plotL - ox) / scale;
    const visY0 = (plotT - oy) / scale;
    const visX1 = (plotR - ox) / scale;
    const visY1 = (plotB - oy) / scale;
    // Keep paper exactly at axis extent so the figure fills with no blank band
    const paperX1 = x1;
    const paperY1 = y1;

    const [p0x, p0y] = toC(0, 0);
    const [p1x, p1y] = toC(paperX1, paperY1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(plotL, plotT, plotR - plotL, plotB - plotT);
    ctx.clip();
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(
      Math.max(p0x, plotL),
      Math.max(p0y, plotT),
      Math.min(p1x, plotR) - Math.max(p0x, plotL),
      Math.min(p1y, plotB) - Math.max(p0y, plotT)
    );

    const span = Math.max(
      Math.min(paperX1, Math.max(visX1, x1)) - Math.max(0, visX0),
      Math.min(paperY1, Math.max(visY1, y1)) - Math.max(0, visY0),
      x1,
      y1,
      1e-6
    );
    const step = niceStep(span, 6);
    const minor = step / 5;
    const gridX0 = Math.max(0, Math.floor(Math.max(0, visX0) / step) * step);
    const gridY0 = Math.max(0, Math.floor(Math.max(0, visY0) / step) * step);
    const gridX1 = Math.min(paperX1, Math.max(x1, visX1) + step);
    const gridY1 = Math.min(paperY1, Math.max(y1, visY1) + step);

    const drawGrid = (s, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      for (let x = Math.floor(gridX0 / s) * s; x <= gridX1 + 1e-9; x += s) {
        if (x < 0) continue;
        const [px] = toC(x, 0);
        if (px < plotL || px > plotR) continue;
        const yTop = Math.max(toC(0, 0)[1], plotT);
        const yBot = Math.min(toC(0, paperY1)[1], plotB);
        if (yTop < yBot) {
          ctx.beginPath();
          ctx.moveTo(px, yTop);
          ctx.lineTo(px, yBot);
          ctx.stroke();
        }
      }
      for (let y = Math.floor(gridY0 / s) * s; y <= gridY1 + 1e-9; y += s) {
        if (y < 0) continue;
        const [, py] = toC(0, y);
        if (py < plotT || py > plotB) continue;
        const xLeft = Math.max(toC(0, 0)[0], plotL);
        const xRight = Math.min(toC(paperX1, 0)[0], plotR);
        if (xLeft < xRight) {
          ctx.beginPath();
          ctx.moveTo(xLeft, py);
          ctx.lineTo(xRight, py);
          ctx.stroke();
        }
      }
    };
    if (minor * scale >= 7) drawGrid(minor, COLORS.gridMinor);
    drawGrid(step, COLORS.grid);

    const [oxPx, oyPx] = toC(0, 0);
    // 轴线止于当前比例下的坐标范围（缩小后不再拉满视口）
    const axisX1 = Math.min(plotR - 2, toC(x1, 0)[0]);
    const axisY1 = Math.min(plotB - 2, toC(0, y1)[1]);
    if (oxPx >= plotL - 2 && oxPx <= plotR + 2 && oyPx >= plotT - 2 && oyPx <= plotB + 2) {
      strokeArrow(ctx, Math.max(oxPx, plotL), oyPx, axisX1, oyPx, COLORS.axisX, 2.2);
      strokeArrow(ctx, oxPx, Math.max(oyPx, plotT), oxPx, axisY1, COLORS.axisY, 2.2);
      ctx.fillStyle = COLORS.axisX;
      ctx.font = "bold 12px IBM Plex Sans, Noto Sans SC, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("X / mm", axisX1 - 4, oyPx - 10);
      ctx.fillStyle = COLORS.axisY;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Y / mm", oxPx + 12, axisY1 - 4);
      ctx.fillStyle = COLORS.ink;
      ctx.beginPath();
      ctx.arc(oxPx, oyPx, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "bold 11px IBM Plex Sans, Noto Sans SC, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText("O(0,0)", oxPx - 8, oyPx + 6);
    }

    // ticks + numeric labels (gutter placement + overlap culling)
    ctx.fillStyle = COLORS.tick;
    ctx.strokeStyle = COLORS.tick;
    ctx.font = "10px JetBrains Mono, IBM Plex Sans, monospace";
    ctx.lineWidth = 1;
    const xLabelTop = oyPx - 8;
    const yLabelRight = oxPx - 8;
    const xLabelMin = oxPx + 22;
    const xLabelMax = axisX1 - 52;
    const yLabelMin = oyPx + 18;
    const yLabelMax = axisY1 - 36;
    let lastXRight = -Infinity;
    for (
      let x = Math.max(step, Math.floor(gridX0 / step) * step);
      x <= Math.min(gridX1, paperX1) + 1e-9;
      x += step
    ) {
      const [px] = toC(x, 0);
      if (px < plotL + 8 || px > plotR - 8 || oyPx < plotT || oyPx > plotB) continue;
      ctx.beginPath();
      ctx.moveTo(px, oyPx - 5);
      ctx.lineTo(px, oyPx + 5);
      ctx.stroke();
      if (px < xLabelMin || px > xLabelMax || xLabelTop - 12 < plotT) continue;
      const label = fmt(x);
      const tw = ctx.measureText(label).width;
      const left = px - tw / 2;
      const right = px + tw / 2;
      if (left < lastXRight + 10) continue;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(label, px, xLabelTop);
      lastXRight = right;
    }
    let lastYBottom = -Infinity;
    for (
      let y = Math.max(step, Math.floor(gridY0 / step) * step);
      y <= Math.min(gridY1, paperY1) + 1e-9;
      y += step
    ) {
      const [, py] = toC(0, y);
      if (py < plotT + 8 || py > plotB - 8 || oxPx < plotL || oxPx > plotR) continue;
      ctx.beginPath();
      ctx.moveTo(oxPx - 5, py);
      ctx.lineTo(oxPx + 5, py);
      ctx.stroke();
      if (py < yLabelMin || py > yLabelMax || yLabelRight - 28 < plotL) continue;
      const label = fmt(y);
      const top = py - 6;
      const bottom = py + 6;
      if (top < lastYBottom + 8) continue;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(label, yLabelRight, py);
      lastYBottom = bottom;
    }

    const selectedPts = new Set(selection.points || []);
    const selectedLines = new Set(
      (selection.lines || []).map((ln) => canonical(ln, lines)).filter(Boolean)
    );

    for (const ln of lines) {
      if (ln.length < 2) continue;
      const a = ln[0];
      const b = ln[1];
      if (!(a in points) || !(b in points)) continue;
      const [x0, y0] = toC(...points[a]);
      const [x1c, y1c] = toC(...points[b]);
      this.hitEdges.push({ line: canonical(ln, lines) || ln, x0: x0, y0, x1: x1c, y1: y1c });
      const hi =
        selectedLines.has(canonical(ln, lines)) ||
        (selectedPts.has(a) && selectedPts.has(b) && !(selection.lines || []).length);
      ctx.strokeStyle = hi ? COLORS.select : COLORS.accent;
      ctx.lineWidth = hi ? 3.2 : 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1c, y1c);
      ctx.stroke();
    }

    const names = Object.keys(points).sort();
    const pointMarks = [];
    for (const name of names) {
      const [mx, my] = points[name];
      const [cx, cy] = toC(mx, my);
      this.hitPoints.push({ name, cx, cy });
      const selected = selectedPts.has(name);
      const anchoring = name === linkAnchor;
      const color = anchoring ? COLORS.select : selected ? COLORS.select : COLORS.point;
      const r = anchoring ? 7 : selected ? 6 : 4;
      if (anchoring || selected) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      pointMarks.push({
        name,
        cx,
        cy,
        r,
        color,
        coord: `(${fmt(mx)}, ${fmt(my)})`,
        priority: anchoring ? 2 : selected ? 1 : 0,
      });
    }
    drawPointLabels(ctx, pointMarks, {
      plotL,
      plotT,
      plotR,
      plotB,
      oxPx,
      oyPx,
    });

    
    const hover = state.hover;
    if (hover && Number.isFinite(hover.x) && Number.isFinite(hover.y)) {
      const [hx, hy] = toC(hover.x, hover.y);
      if (linkAnchor && linkAnchor in points) {
        const [ax, ay] = toC(...points[linkAnchor]);
        ctx.strokeStyle = "rgba(240, 198, 116, 0.7)";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = "rgba(74, 163, 255, 0.2)";
      ctx.strokeStyle = COLORS.point;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const label = hover.name
        ? `${hover.name}  (${fmt(hover.x)}, ${fmt(hover.y)})`
        : `(${fmt(hover.x)}, ${fmt(hover.y)})`;
      ctx.font = "11px JetBrains Mono, IBM Plex Sans, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      const tw = ctx.measureText(label).width;
      const pad = 4;
      let lx = hx + 12;
      let ly = hy - 8;
      if (lx + tw + pad * 2 > plotR) lx = hx - 12 - tw - pad * 2;
      if (ly - 14 < plotT) ly = hy + 18;
      ctx.fillStyle = "rgba(13, 20, 32, 0.82)";
      ctx.fillRect(lx, ly - 14, tw + pad * 2, 18);
      ctx.fillStyle = COLORS.ink;
      ctx.fillText(label, lx + pad, ly);
    }

ctx.restore();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(plotL + 0.5, plotT + 0.5, plotR - plotL - 1, plotB - plotT - 1);
  }

  drawCad(state, w, h) {
    const ctx = this.ctx;
    const { sketch, title } = state;
    const points = sketch.points;
    const lines = sketch.lines;
    // CAD 预览/导出：白底、细实线、GB 风格尺寸标注
    const ink = "#111111";
    const dimColor = "#9aa3ad";
    const mute = "#5a6572";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = ink;
    ctx.font = "bold 15px IBM Plex Sans, Microsoft YaHei UI, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(title || "平面尺寸图", 18, 14);
    ctx.fillStyle = mute;
    ctx.font = "12px IBM Plex Sans, Microsoft YaHei UI, sans-serif";
    ctx.fillText("CAD 草图  ·  单位：mm", 18, 36);

    const used = new Set();
    for (const ln of lines) {
      if (ln.length >= 2) {
        used.add(ln[0]);
        used.add(ln[1]);
      }
    }
    const pts = {};
    for (const n of used) {
      if (n in points) pts[n] = points[n];
    }
    if (!Object.keys(pts).length) {
      ctx.fillStyle = mute;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("暂无连线图形（请先在坐标系中连线）", w / 2, h / 2);
      return;
    }

    const [bx0, by0, bx1, by1] = contentBBox(pts);
    const pad = 120;
    const bw = Math.max(bx1 - bx0, 1);
    const bh = Math.max(by1 - by0, 1);
    const scale =
      Math.min((w - pad * 2) / bw, (h - pad * 2 - 36) / bh) * this.zoom;
    const ox = w / 2 - ((bx0 + bx1) / 2) * scale + (this.pan?.ox || 0);
    const oy = 54 + (h - 54) / 2 - ((by0 + by1) / 2) * scale + (this.pan?.oy || 0);
    const toC = (x, y) => [ox + x * scale, oy + y * scale];
    this.view = { ox, oy, scale, fitScale: scale / this.zoom, limits: null };

    const loops = findClosedLoops(pts, lines);
    for (const loop of loops) {
      if (loop.length < 3) continue;
      ctx.beginPath();
      loop.forEach((n, i) => {
        const [x, y] = toC(...pts[n]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(210, 222, 235, 0.45)";
      ctx.fill();
    }

    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const ln of lines) {
      if (ln.length < 2 || !(ln[0] in pts) || !(ln[1] in pts)) continue;
      const [x0, y0] = toC(...pts[ln[0]]);
      const [x1, y1] = toC(...pts[ln[1]]);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    const [tlx, tly] = toC(bx0, by0);
    const [trx, try_] = toC(bx1, by0);
    const [blx, bly] = toC(bx0, by1);
    const [brx, bry] = toC(bx1, by1);
    const cxc = (tlx + brx) / 2;
    const cyc = (tly + bry) / 2;

    const overallW = bx1 - bx0;
    const overallH = by1 - by0;
    const cadDims = buildCadDimensions(pts, lines, toC, {
      bx0,
      by0,
      bx1,
      by1,
      cxc,
      cyc,
      tlx,
      tly,
      trx,
      try_,
      blx,
      bly,
      overallW,
      overallH,
    });
    for (const d of cadDims) {
      drawCadLinearDim(ctx, d.x0, d.y0, d.x1, d.y1, d.label, {
        side: d.side,
        preferDir: d.preferDir,
        offset: d.offset,
        color: dimColor,
        bold: !!d.bold,
      });
    }

  }
}

/** 箭头朝 (dx,dy) 方向，尖端在 (x,y) */
function drawDimArrowHead(ctx, x, y, dx, dy, size = 7) {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - ux * size + px * size * 0.38, y - uy * size + py * size * 0.38);
  ctx.lineTo(x - ux * size - px * size * 0.38, y - uy * size - py * size * 0.38);
  ctx.closePath();
  ctx.fill();
}

function outwardSide(x0, y0, x1, y1, cx, cy) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  return nx * (mx - cx) + ny * (my - cy) >= 0 ? 1 : -1;
}

/**
 * 收集 CAD 尺寸：边长 + X/Y 链式分寸 + 外包络总宽/总高
 */
function buildCadDimensions(pts, lines, toC, box) {
  const {
    bx0,
    by0,
    bx1,
    by1,
    cxc,
    cyc,
    tlx,
    tly,
    trx,
    try_,
    blx,
    bly,
    overallW,
    overallH,
  } = box;
  const EPS = 1e-6;
  const dims = [];
  const covered = new Set();

  const keyOf = (mx0, my0, mx1, my1) => {
    const a = `${Math.round(mx0 * 1e3)},${Math.round(my0 * 1e3)}`;
    const b = `${Math.round(mx1 * 1e3)},${Math.round(my1 * 1e3)}`;
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  };
  const markCovered = (mx0, my0, mx1, my1) => {
    covered.add(keyOf(mx0, my0, mx1, my1));
  };
  const isCovered = (mx0, my0, mx1, my1) => covered.has(keyOf(mx0, my0, mx1, my1));

  // 1) 每条边的实长（跳过与总宽/总高完全重合的外轮廓边，留给总尺寸）
  for (const ln of lines) {
    if (ln.length < 2 || !(ln[0] in pts) || !(ln[1] in pts)) continue;
    const [mx0, my0] = pts[ln[0]];
    const [mx1, my1] = pts[ln[1]];
    const modelLen = Math.hypot(mx1 - mx0, my1 - my0);
    if (modelLen < EPS) continue;
    const horiz = Math.abs(my0 - my1) < EPS;
    const vert = Math.abs(mx0 - mx1) < EPS;
    const outerFull =
      (horiz &&
        Math.abs(modelLen - overallW) < EPS &&
        (Math.abs(my0 - by0) < EPS || Math.abs(my0 - by1) < EPS)) ||
      (vert &&
        Math.abs(modelLen - overallH) < EPS &&
        (Math.abs(mx0 - bx0) < EPS || Math.abs(mx0 - bx1) < EPS));
    if (outerFull) {
      markCovered(mx0, my0, mx1, my1);
      continue;
    }
    const [x0, y0] = toC(mx0, my0);
    const [x1, y1] = toC(mx1, my1);
    dims.push({
      x0,
      y0,
      x1,
      y1,
      label: fmtInt(modelLen),
      side: outwardSide(x0, y0, x1, y1, cxc, cyc),
      offset: 22,
      layer: "edge",
    });
    markCovered(mx0, my0, mx1, my1);
  }

  // 2) X 向链式分寸（相邻唯一 X 坐标差），画在图形下侧
  const xs = [
    ...new Set(
      Object.values(pts).map(([x]) => Math.round(x * 1000) / 1000)
    ),
  ].sort((a, b) => a - b);
  let chainX = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    const xA = xs[i];
    const xB = xs[i + 1];
    const gap = xB - xA;
    if (gap < EPS) continue;
    // 已有同跨度水平边则不再重复链式标注
    if (isCovered(xA, by1, xB, by1) || isCovered(xA, by0, xB, by0)) continue;
    let hasHorizEdge = false;
    for (const ln of lines) {
      if (ln.length < 2 || !(ln[0] in pts) || !(ln[1] in pts)) continue;
      const [ax, ay] = pts[ln[0]];
      const [bx, by] = pts[ln[1]];
      if (Math.abs(ay - by) > EPS) continue;
      const lo = Math.min(ax, bx);
      const hi = Math.max(ax, bx);
      if (Math.abs(lo - xA) < EPS && Math.abs(hi - xB) < EPS) {
        hasHorizEdge = true;
        break;
      }
    }
    if (hasHorizEdge) continue;
    const [x0, y0] = toC(xA, by1);
    const [x1, y1] = toC(xB, by1);
    dims.push({
      x0,
      y0,
      x1,
      y1,
      label: fmtInt(gap),
      preferDir: [0, 1],
      offset: 40 + (chainX % 3) * 16,
      layer: "chainX",
    });
    chainX += 1;
    markCovered(xA, by1, xB, by1);
  }

  // 3) Y 向链式分寸（相邻唯一 Y 坐标差），画在图形左侧
  const ys = [
    ...new Set(
      Object.values(pts).map(([, y]) => Math.round(y * 1000) / 1000)
    ),
  ].sort((a, b) => a - b);
  let chainY = 0;
  for (let i = 0; i < ys.length - 1; i++) {
    const yA = ys[i];
    const yB = ys[i + 1];
    const gap = yB - yA;
    if (gap < EPS) continue;
    if (isCovered(bx0, yA, bx0, yB) || isCovered(bx1, yA, bx1, yB)) continue;
    let hasVertEdge = false;
    for (const ln of lines) {
      if (ln.length < 2 || !(ln[0] in pts) || !(ln[1] in pts)) continue;
      const [ax, ay] = pts[ln[0]];
      const [bx, by] = pts[ln[1]];
      if (Math.abs(ax - bx) > EPS) continue;
      const lo = Math.min(ay, by);
      const hi = Math.max(ay, by);
      if (Math.abs(lo - yA) < EPS && Math.abs(hi - yB) < EPS) {
        hasVertEdge = true;
        break;
      }
    }
    if (hasVertEdge) continue;
    const [x0, y0] = toC(bx0, yA);
    const [x1, y1] = toC(bx0, yB);
    dims.push({
      x0,
      y0,
      x1,
      y1,
      label: fmtInt(gap),
      preferDir: [-1, 0],
      offset: 40 + (chainY % 3) * 16,
      layer: "chainY",
    });
    chainY += 1;
    markCovered(bx0, yA, bx0, yB);
  }

  // 4) 外包络总宽 / 总高（最外层）
  if (overallW > EPS) {
    dims.push({
      x0: tlx,
      y0: tly,
      x1: trx,
      y1: try_,
      label: fmtInt(overallW),
      preferDir: [0, -1],
      offset: 64,
      bold: true,
      layer: "overall",
    });
  }
  if (overallH > EPS) {
    dims.push({
      x0: tlx,
      y0: tly,
      x1: blx,
      y1: bly,
      label: fmtInt(overallH),
      preferDir: [-1, 0],
      offset: 64,
      bold: true,
      layer: "overall",
    });
  }
  return dims;
}

/**
 * CAD 线性尺寸：尺寸界线 + 尺寸线 + 两端箭头 + 尺寸数字
 * 短边改用外侧箭头 / 旁注，避免漏标
 */
function drawCadLinearDim(ctx, x0, y0, x1, y1, label, opts = {}) {
  const {
    side: sideOpt,
    preferDir = null,
    offset = 28,
    color = "#1a1a1a",
    bold = false,
    extGap = 3,
    extOver = 4,
    arrow = 7,
  } = opts;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 1.5) return;
  const ux = dx / len;
  const uy = dy / len;
  let nx = -uy;
  let ny = ux;
  let side = sideOpt == null ? 1 : sideOpt;
  if (preferDir) {
    const [px, py] = preferDir;
    side = nx * px + ny * py >= 0 ? 1 : -1;
  }
  nx *= side;
  ny *= side;

  const short = len < 34;
  const arrowSize = short ? Math.max(3.5, Math.min(arrow, len * 0.28)) : arrow;

  const a0x = x0 + nx * extGap;
  const a0y = y0 + ny * extGap;
  const a1x = x1 + nx * extGap;
  const a1y = y1 + ny * extGap;
  const d0x = x0 + nx * offset;
  const d0y = y0 + ny * offset;
  const d1x = x1 + nx * offset;
  const d1y = y1 + ny * offset;
  const e0x = x0 + nx * (offset + extOver);
  const e0y = y0 + ny * (offset + extOver);
  const e1x = x1 + nx * (offset + extOver);
  const e1y = y1 + ny * (offset + extOver);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;
  ctx.lineCap = "butt";
  // 尺寸界线
  ctx.beginPath();
  ctx.moveTo(a0x, a0y);
  ctx.lineTo(e0x, e0y);
  ctx.moveTo(a1x, a1y);
  ctx.lineTo(e1x, e1y);
  ctx.stroke();
  // 尺寸线
  ctx.beginPath();
  ctx.moveTo(d0x, d0y);
  ctx.lineTo(d1x, d1y);
  ctx.stroke();

  if (short) {
    // 短边：箭头朝外，避免挤在线段内看不见
    drawDimArrowHead(ctx, d0x, d0y, -ux, -uy, arrowSize);
    drawDimArrowHead(ctx, d1x, d1y, ux, uy, arrowSize);
    // 向两侧伸出一小段
    ctx.beginPath();
    ctx.moveTo(d0x, d0y);
    ctx.lineTo(d0x - ux * 10, d0y - uy * 10);
    ctx.moveTo(d1x, d1y);
    ctx.lineTo(d1x + ux * 10, d1y + uy * 10);
    ctx.stroke();
  } else {
    drawDimArrowHead(ctx, d0x, d0y, -ux, -uy, arrowSize);
    drawDimArrowHead(ctx, d1x, d1y, ux, uy, arrowSize);
  }

  // 尺寸文字：沿尺寸线方向，保持可读朝向
  const mx = (d0x + d1x) / 2 + nx * (short ? 12 : 9);
  const my = (d0y + d1y) / 2 + ny * (short ? 12 : 9);
  let ang = Math.atan2(uy, ux);
  if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
  ctx.translate(mx, my);
  ctx.rotate(ang);
  ctx.font = `${bold ? "bold " : ""}12px IBM Plex Sans, Microsoft YaHei UI, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const tw = ctx.measureText(String(label)).width;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-tw / 2 - 2, -13, tw + 4, 12);
  ctx.fillStyle = color;
  ctx.fillText(String(label), 0, -2);
  ctx.restore();
}

function rectsOverlap(a, b, pad = 3) {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function drawPointLabels(ctx, marks, box) {
  const { plotL, plotT, plotR, plotB, oxPx, oyPx } = box;
  const nameFont = "bold 12px IBM Plex Sans, Noto Sans SC, sans-serif";
  const coordFont = "10px JetBrains Mono, IBM Plex Sans, monospace";
  const gap = 8;
  const nameH = 13;
  const coordH = 12;
  const blockH = nameH + coordH + 2;
  const padX = 4;
  const padY = 3;

  const obstacles = [];
  // Keep labels clear of origin marker / O(0,0) corner
  if (Number.isFinite(oxPx) && Number.isFinite(oyPx)) {
    obstacles.push({ x: oxPx - 52, y: oyPx - 4, w: 56, h: 22 });
  }
  for (const m of marks) {
    const rr = m.r + 3;
    obstacles.push({ x: m.cx - rr, y: m.cy - rr, w: rr * 2, h: rr * 2 });
  }

  const ordered = [...marks].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
  const placed = [];

  for (const m of ordered) {
    ctx.font = nameFont;
    const nameW = ctx.measureText(m.name).width;
    ctx.font = coordFont;
    const coordW = ctx.measureText(m.coord).width;
    const contentW = Math.max(nameW, coordW);
    const bw = contentW + padX * 2;
    const bh = blockH + padY * 2;
    const clear = m.r + gap;

    const candidates = [
      [m.cx + clear, m.cy - bh * 0.55],
      [m.cx + clear, m.cy - bh - 2],
      [m.cx + clear, m.cy + 4],
      [m.cx - bw - clear, m.cy - bh * 0.55],
      [m.cx - bw - clear, m.cy - bh - 2],
      [m.cx - bw - clear, m.cy + 4],
      [m.cx - bw * 0.5, m.cy - clear - bh],
      [m.cx - bw * 0.5, m.cy + clear],
      [m.cx + clear + 10, m.cy - bh * 0.55 - 12],
      [m.cx + clear + 10, m.cy + 10],
      [m.cx - bw - clear - 10, m.cy - bh * 0.55 - 12],
      [m.cx - bw - clear - 10, m.cy + 10],
    ];

    let best = null;
    let bestScore = Infinity;
    for (const [lx, ly] of candidates) {
      const rect = {
        x: Math.max(plotL + 2, Math.min(lx, plotR - bw - 2)),
        y: Math.max(plotT + 2, Math.min(ly, plotB - bh - 2)),
        w: bw,
        h: bh,
      };
      let hits = 0;
      for (const o of obstacles) {
        if (rectsOverlap(rect, o)) hits += 1;
      }
      for (const p of placed) {
        if (rectsOverlap(rect, p.rect)) hits += 3;
      }
      // Prefer staying near the point
      const dist = Math.hypot(rect.x + bw / 2 - m.cx, rect.y + bh / 2 - m.cy);
      const score = hits * 1000 + dist;
      if (score < bestScore) {
        bestScore = score;
        best = rect;
        if (hits === 0) break;
      }
    }
    if (!best) continue;

    // Soft plate so labels stay readable over lines / grid
    ctx.fillStyle = "rgba(13, 20, 32, 0.78)";
    ctx.fillRect(best.x, best.y, best.w, best.h);
    ctx.strokeStyle = "rgba(122, 240, 200, 0.16)";
    ctx.lineWidth = 1;
    ctx.strokeRect(best.x + 0.5, best.y + 0.5, best.w - 1, best.h - 1);

    const tx = best.x + padX;
    ctx.font = nameFont;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = m.color;
    ctx.fillText(m.name, tx, best.y + padY);
    ctx.font = coordFont;
    ctx.fillStyle = COLORS.mute;
    ctx.fillText(m.coord, tx, best.y + padY + nameH + 1);

    placed.push({ rect: best });
    obstacles.push(best);
  }
}

function strokeArrow(ctx, x0, y0, x1, y1, color, lineWidth = 2) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const size = 8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(
    x1 - size * Math.cos(ang - 0.35),
    y1 - size * Math.sin(ang - 0.35)
  );
  ctx.lineTo(
    x1 - size * Math.cos(ang + 0.35),
    y1 - size * Math.sin(ang + 0.35)
  );
  ctx.closePath();
  ctx.fill();
}

function distToSeg(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return Math.hypot(px - x0, py - y0);
  let t = ((px - x0) * dx + (py - y0) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

function canonical(line, lines) {
  if (!line || line.length < 2) return null;
  if (lines.includes(line)) return line;
  const rev = line[1] + line[0];
  if (lines.includes(rev)) return rev;
  return line[0] < line[1] ? line[0] + line[1] : line[1] + line[0];
}

function findClosedLoops(pts, lines) {
  const adj = {};
  for (const n of Object.keys(pts)) adj[n] = new Set();
  for (const ln of lines) {
    if (ln.length < 2) continue;
    if (!(ln[0] in pts) || !(ln[1] in pts)) continue;
    adj[ln[0]].add(ln[1]);
    adj[ln[1]].add(ln[0]);
  }
  const loops = [];
  const seenEdge = new Set();
  for (const start of Object.keys(adj)) {
    for (const nxt of adj[start]) {
      const ek = start < nxt ? start + nxt : nxt + start;
      if (seenEdge.has(ek)) continue;
      // walk face greedily by always turning most left (for Q4 y-down: prefer smallest cross)
      const path = [start];
      let prev = start;
      let cur = nxt;
      let guard = 0;
      while (guard++ < 64) {
        path.push(cur);
        seenEdge.add(prev < cur ? prev + cur : cur + prev);
        if (cur === start) break;
        const candidates = [...adj[cur]].filter((n) => n !== prev);
        if (!candidates.length) break;
        // pick next by polar angle relative to incoming
        const [px, py] = pts[prev];
        const [cx, cy] = pts[cur];
        const inAng = Math.atan2(cy - py, cx - px);
        let best = null;
        let bestScore = -Infinity;
        for (const n of candidates) {
          const [nx, ny] = pts[n];
          let ang = Math.atan2(ny - cy, nx - cx) - inAng;
          while (ang <= -Math.PI) ang += Math.PI * 2;
          while (ang > Math.PI) ang -= Math.PI * 2;
          // prefer leftmost turn in y-down coords => largest ang
          if (ang > bestScore) {
            bestScore = ang;
            best = n;
          }
        }
        prev = cur;
        cur = best;
        if (!cur) break;
      }
      if (path.length >= 4 && path[path.length - 1] === start) {
        loops.push(path.slice(0, -1));
      }
    }
  }
  // unique by sorted join
  const uniq = [];
  const keys = new Set();
  for (const loop of loops) {
    const key = [...loop].sort().join("");
    if (keys.has(key)) continue;
    keys.add(key);
    uniq.push(loop);
  }
  return uniq;
}
