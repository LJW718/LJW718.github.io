(() => {
  "use strict";

  const APP_NAME = "略亏少赚不被套交易计算器";
  const EXPORT_BASENAME = "trading_calculator";
  const TITLE_SUFFIX = "补货价格和卖出价格";
  const MAX_PRODUCTS = 3;
  const STORAGE_KEY = "trading_calculator_web_v1";
  const STORAGE_KEY_LEGACY = [
    "交易计算器_web_v1",
    "restock_table_web_v1",
  ];
  const AUTOSAVE_MS = 400;

  const HEADERS = ["操作", "买入", "数量", "总价", "盈/亏", "卖出", "收益"];
  const COL = {
    OP: 0,
    PRICE: 1,
    QTY: 2,
    TOTAL: 3,
    MARGIN: 4,
    SELL: 5,
    PROFIT: 6,
  };

  const QTY_STEP = 100;
  const PRICE_STEP = 0.01;
  const MARGIN_STEP = 0.1;

  // A股常见手续费（全佣近似）：佣金万分之2.5起5元、过户费万0.01双向、印花税万5仅卖出
  const COMMISSION_RATE = 0.00025;
  const COMMISSION_MIN = 5;
  const TRANSFER_RATE = 0.00001;
  const STAMP_DUTY_RATE = 0.0005;

  const RESTOCK_QTY_RATIOS = {
    补货1: 0.3,
    补货2: 0.4,
    补货3: 0.3,
  };

  const DEFAULT_ROWS = [
    { op: "进货", price: "0", qty: "3000", margin: "3.6", sign: "+" },
    { op: "补货1", price: "", qty: "", margin: "3.0", sign: "-" },
    { op: "补货2", price: "", qty: "", margin: "4.0", sign: "-" },
    { op: "补货3", price: "", qty: "", margin: "3.0", sign: "-" },
  ];

  const PLUS_RGB = [211, 47, 47];
  const MINUS_RGB = [46, 125, 50];

  /** @type {{ id: string, name: string, rows: object[] }[]} */
  let products = [];
  let saveTimer = 0;

  const els = {
    products: document.getElementById("products"),
    btnAdd: document.getElementById("btn-add"),
    btnDel: document.getElementById("btn-del"),
    btnExport: document.getElementById("btn-export"),
  };

  function defaultName(index) {
    return `商品${index + 1}`;
  }

  function parseNumber(text) {
    const s = String(text ?? "")
      .trim()
      .replace(/,/g, "");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function ceil2(value) {
    return Math.ceil(value * 100 - 1e-12) / 100;
  }

  function ceilQty(value, step = QTY_STEP) {
    if (value <= 0) return 0;
    return Math.ceil(value / step - 1e-12) * step;
  }

  function fmtPrice(value) {
    return ceil2(value).toFixed(2);
  }

  function fmtMoney(value) {
    const rounded = ceil2(value);
    if (Math.abs(rounded - Math.round(rounded)) < 1e-9) {
      return String(Math.round(rounded));
    }
    return rounded.toFixed(2);
  }

  function round2(value) {
    return Math.round(value * 100 + 1e-10) / 100;
  }

  /** 单边成交手续费：买入加在成本上，卖出从回款中扣。 */
  function tradeFee(amount, { sell = false } = {}) {
    if (amount == null || amount <= 0) return 0;
    let commission = amount * COMMISSION_RATE;
    commission =
      commission < COMMISSION_MIN ? COMMISSION_MIN : round2(commission);
    const transfer = round2(amount * TRANSFER_RATE);
    const stamp = sell ? round2(amount * STAMP_DUTY_RATE) : 0;
    return round2(commission + transfer + stamp);
  }

  function fmtMargin(value) {
    return Math.abs(value).toFixed(1);
  }

  function isRestock(op) {
    return String(op).trim().startsWith("补货");
  }

  function signForOp(op) {
    return isRestock(op) ? "-" : "+";
  }

  function cloneDefaultRows() {
    return DEFAULT_ROWS.map((r) => ({
      op: r.op,
      price: r.price,
      qty: r.qty,
      total: "",
      margin: r.margin,
      sign: r.sign,
      sell: "",
      profit: "",
    }));
  }

  function makeProduct(index, data) {
    const name =
      String(data?.product_name || data?.name || defaultName(index)).trim() ||
      defaultName(index);
    let rows;
    if (Array.isArray(data?.rows) && data.rows.length) {
      rows = data.rows.map((item, i) => {
        const def = DEFAULT_ROWS[i] || DEFAULT_ROWS[0];
        const op = String(item.op || def.op);
        let margin = String(item.margin ?? def.margin);
        margin = margin.replace(/%/g, "").replace(/[＋+−-]/g, "").trim();
        return {
          op,
          price: String(item.price ?? (isRestock(op) ? "" : def.price)),
          qty: String(item.qty ?? (isRestock(op) ? "" : def.qty)),
          total: "",
          margin: margin || def.margin,
          sign: item.sign || signForOp(op),
          sell: "",
          profit: "",
        };
      });
      while (rows.length < DEFAULT_ROWS.length) {
        const def = DEFAULT_ROWS[rows.length];
        rows.push({
          op: def.op,
          price: def.price,
          qty: def.qty,
          total: "",
          margin: def.margin,
          sign: def.sign,
          sell: "",
          profit: "",
        });
      }
    } else {
      rows = cloneDefaultRows();
    }
    return {
      id: `p-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      rows,
    };
  }

  function recalcProduct(product) {
    const rows = product.rows;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const restock = isRestock(row.op);
      const marginNum = parseNumber(row.margin);
      const marginAbs =
        marginNum == null ? null : Math.abs(marginNum) / 100;

      let price = null;
      let qty = null;

      if (restock) {
        const inQty = parseNumber(rows[0].qty);
        const ratio = RESTOCK_QTY_RATIOS[row.op];
        if (inQty != null && ratio != null) {
          row.qty = String(ceilQty(inQty * ratio));
        } else {
          row.qty = "";
        }
        qty = parseNumber(row.qty);
        const base = i > 0 ? parseNumber(rows[i - 1].price) : null;
        if (base != null && marginAbs != null) {
          price = ceil2(base * (1 - marginAbs));
          row.price = fmtPrice(price);
        } else {
          row.price = "";
          price = null;
        }
      } else {
        qty = parseNumber(row.qty);
        const raw = parseNumber(row.price);
        price = raw != null ? ceil2(raw) : null;
      }

      if (price != null && marginAbs != null) {
        const sell = ceil2(price * (1 + marginAbs));
        row.sell = fmtPrice(sell);
      } else {
        row.sell = "";
      }

      const sell = parseNumber(row.sell);
      if (price != null && qty != null) {
        const buyAmt = price * qty;
        const buyFee = tradeFee(buyAmt, { sell: false });
        // 总价 = 买入成交额 + 买入手续费
        row.total = fmtMoney(buyAmt + buyFee);
        if (sell != null) {
          const sellAmt = sell * qty;
          const sellFee = tradeFee(sellAmt, { sell: true });
          // 收益 = 卖出回款(扣费后) − 买入成本(含费)
          row.profit = fmtMoney(sellAmt - sellFee - buyAmt - buyFee);
        } else {
          row.profit = "";
        }
      } else {
        row.total = "";
        row.profit = "";
      }
    }
  }

  function sumProfit(product) {
    let total = 0;
    let any = false;
    for (const row of product.rows) {
      const v = parseNumber(row.profit);
      if (v != null) {
        total += v;
        any = true;
      }
    }
    return any ? total : null;
  }

  function isDefaultProduct(product, index) {
    if ((product.name || "").trim() !== defaultName(index)) return false;
    for (let i = 0; i < DEFAULT_ROWS.length; i++) {
      const row = product.rows[i];
      const def = DEFAULT_ROWS[i];
      if (!row || row.op !== def.op) return false;
      if (row.margin !== def.margin) return false;
      if (!isRestock(def.op)) {
        if (String(row.price).trim() !== def.price) return false;
        if (String(row.qty).trim() !== def.qty) return false;
      }
    }
    return true;
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, AUTOSAVE_MS);
  }

  function saveState() {
    const payload = {
      products: products.map((p) => ({
        product_name: p.name,
        rows: p.rows.map((r) => ({
          op: r.op,
          price: r.price,
          qty: r.qty,
          margin: r.margin,
          sign: r.sign,
        })),
      })),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota */
    }
  }

  function loadState() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        for (const key of STORAGE_KEY_LEGACY) {
          raw = localStorage.getItem(key);
          if (raw) break;
        }
      }
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!Array.isArray(data?.products) || !data.products.length) return null;
      return data.products.slice(0, MAX_PRODUCTS);
    } catch {
      return null;
    }
  }

  function updateTitle() {
    const names = products.map(
      (p, i) => p.name.trim() || defaultName(i)
    );
    document.title = names.length
      ? `${APP_NAME} — ${names.join(" / ")}`
      : APP_NAME;
  }

  function updateToolbar() {
    els.btnAdd.disabled = products.length >= MAX_PRODUCTS;
    els.btnDel.disabled = products.length <= 1;
  }

  function stepperHtml({
    value,
    editable,
    kind,
    sign,
  }) {
    const disabled = editable ? "" : "disabled";
    const marginClass =
      kind === "margin"
        ? ` margin-stepper ${sign === "-" ? "is-minus" : "is-plus"}`
        : "";
    const roClass = editable ? "" : " is-readonly";
    const valAlign = kind === "margin" ? ' style="text-align:right"' : "";
    const pct =
      kind === "margin"
        ? `<span class="margin-pct" aria-hidden="true">%</span>`
        : "";
    return `<div class="stepper${marginClass}${roClass}" data-kind="${kind}">
      <button type="button" class="step-btn" data-dir="-1" ${disabled} aria-label="减少">−</button>
      <input class="step-val" type="text" inputmode="decimal" value="${escapeAttr(
        value
      )}" ${disabled}${valAlign} />
      ${pct}
      <button type="button" class="step-btn" data-dir="1" ${disabled} aria-label="增加">+</button>
    </div>`;
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderProduct(product, index) {
    recalcProduct(product);
    const total = sumProfit(product);
    let expectedText = "预期收益：—";
    let expectedClass = "expected";
    if (total != null) {
      expectedText = `预期收益：${fmtMoney(total)}`;
      expectedClass += total < 0 ? " is-minus" : " is-plus";
    }
    const placeholder =
      product.name.trim() === defaultName(index) ? " is-placeholder" : "";

    const body = product.rows
      .map((row, ri) => {
        const restock = isRestock(row.op);
        return `<tr data-row="${ri}">
          <td class="op">${escapeHtml(row.op)}</td>
          <td class="${restock ? "emph-ro" : ""}">${stepperHtml({
            value: row.price,
            editable: !restock,
            kind: "price",
          })}</td>
          <td class="${restock ? "emph-ro" : ""}">${stepperHtml({
            value: row.qty,
            editable: !restock,
            kind: "qty",
          })}</td>
          <td class="ro">${escapeHtml(row.total)}</td>
          <td>${stepperHtml({
            value: row.margin,
            editable: true,
            kind: "margin",
            sign: row.sign,
          })}</td>
          <td class="emph-ro">${escapeHtml(row.sell)}</td>
          <td class="ro">${escapeHtml(row.profit)}</td>
        </tr>`;
      })
      .join("");

    return `<section class="product" data-id="${product.id}" data-index="${index}">
      <div class="product-head">
        <div class="name-cluster">
          <input class="name-input${placeholder}" type="text" maxlength="32"
            value="${escapeAttr(product.name)}" aria-label="商品名称" />
          <span class="title-suffix">${TITLE_SUFFIX}</span>
        </div>
        <div class="${expectedClass}">${escapeHtml(expectedText)}</div>
      </div>
      <div class="table-wrap">
        <table class="sheet">
          <thead><tr>${HEADERS.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </section>`;
  }

  function renderAll() {
    products.forEach((p) => recalcProduct(p));
    els.products.innerHTML = products
      .map((p, i) => renderProduct(p, i))
      .join("");
    updateToolbar();
    updateTitle();
  }

  function refreshProductDom(index) {
    const product = products[index];
    if (!product) return;
    const old = els.products.querySelector(`.product[data-index="${index}"]`);
    const wrap = document.createElement("div");
    wrap.innerHTML = renderProduct(product, index);
    const next = wrap.firstElementChild;
    if (old && next) old.replaceWith(next);
    else renderAll();
    updateToolbar();
    updateTitle();
  }

  function productIndexFromEl(el) {
    const section = el.closest(".product");
    if (!section) return -1;
    return Number(section.dataset.index);
  }

  function applyStep(kind, row, dir) {
    if (kind === "price") {
      if (isRestock(row.op)) return;
      let cur = parseNumber(row.price);
      if (cur == null) cur = 0;
      row.price = fmtPrice(Math.max(0, cur + dir * PRICE_STEP));
    } else if (kind === "qty") {
      if (isRestock(row.op)) return;
      let cur = parseNumber(row.qty);
      if (cur == null) cur = 0;
      const base = ceilQty(cur);
      row.qty = String(Math.max(0, base + dir * QTY_STEP));
    } else if (kind === "margin") {
      let cur = parseNumber(row.margin);
      if (cur == null) cur = 0;
      row.margin = fmtMargin(Math.max(0, cur + dir * MARGIN_STEP));
    }
  }

  function onProductsClick(e) {
    const btn = e.target.closest(".step-btn");
    if (!btn || btn.disabled) return;
    const section = btn.closest(".product");
    const tr = btn.closest("tr");
    const stepper = btn.closest(".stepper");
    if (!section || !tr || !stepper) return;
    const pi = Number(section.dataset.index);
    const ri = Number(tr.dataset.row);
    const dir = Number(btn.dataset.dir);
    const kind = stepper.dataset.kind;
    const product = products[pi];
    if (!product || !product.rows[ri]) return;
    applyStep(kind, product.rows[ri], dir);
    refreshProductDom(pi);
    scheduleSave();
  }

  function onProductsInput(e) {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    const section = t.closest(".product");
    if (!section) return;
    const pi = Number(section.dataset.index);
    const product = products[pi];
    if (!product) return;

    if (t.classList.contains("name-input")) {
      product.name = t.value.replace(/[\r\n]/g, "");
      const def = defaultName(pi);
      t.classList.toggle("is-placeholder", product.name.trim() === def);
      updateTitle();
      scheduleSave();
      return;
    }

    if (!t.classList.contains("step-val")) return;
    const tr = t.closest("tr");
    const stepper = t.closest(".stepper");
    if (!tr || !stepper) return;
    const ri = Number(tr.dataset.row);
    const row = product.rows[ri];
    if (!row) return;
    const kind = stepper.dataset.kind;
    if (kind === "price" && !isRestock(row.op)) {
      row.price = t.value;
    } else if (kind === "qty" && !isRestock(row.op)) {
      row.qty = t.value;
    } else if (kind === "margin") {
      row.margin = t.value.replace(/[＋+−%-]/g, "");
      t.value = row.margin;
    }
    // live recalc without full re-render to keep focus
    recalcProduct(product);
    syncReadonlyCells(section, product);
    updateExpected(section, product);
    updateTitle();
    scheduleSave();
  }

  function syncReadonlyCells(section, product) {
    product.rows.forEach((row, ri) => {
      const tr = section.querySelector(`tr[data-row="${ri}"]`);
      if (!tr) return;
      const cells = tr.children;
      if (isRestock(row.op)) {
        const priceInput = cells[COL.PRICE].querySelector(".step-val");
        const qtyInput = cells[COL.QTY].querySelector(".step-val");
        if (priceInput && document.activeElement !== priceInput) {
          priceInput.value = row.price;
        }
        if (qtyInput && document.activeElement !== qtyInput) {
          qtyInput.value = row.qty;
        }
      }
      cells[COL.TOTAL].textContent = row.total;
      cells[COL.SELL].textContent = row.sell;
      cells[COL.PROFIT].textContent = row.profit;
    });
  }

  function updateExpected(section, product) {
    const el = section.querySelector(".expected");
    if (!el) return;
    const total = sumProfit(product);
    el.classList.remove("is-plus", "is-minus");
    if (total == null) {
      el.textContent = "预期收益：—";
      return;
    }
    el.textContent = `预期收益：${fmtMoney(total)}`;
    el.classList.add(total < 0 ? "is-minus" : "is-plus");
  }

  function onProductsFocusOut(e) {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || !t.classList.contains("step-val")) {
      return;
    }
    const section = t.closest(".product");
    const tr = t.closest("tr");
    const stepper = t.closest(".stepper");
    if (!section || !tr || !stepper) return;
    const pi = Number(section.dataset.index);
    const ri = Number(tr.dataset.row);
    const product = products[pi];
    const row = product?.rows[ri];
    if (!row) return;
    const kind = stepper.dataset.kind;
    if (kind === "price" && !isRestock(row.op)) {
      const raw = parseNumber(t.value);
      row.price = raw == null ? "" : fmtPrice(raw);
    } else if (kind === "qty" && !isRestock(row.op)) {
      const raw = parseNumber(t.value);
      row.qty = raw == null ? "" : String(ceilQty(raw));
    } else if (kind === "margin") {
      const raw = parseNumber(t.value);
      if (raw != null) row.margin = fmtMargin(raw);
    }
    refreshProductDom(pi);
    scheduleSave();
  }

  function onProductsKeyDown(e) {
    if (e.key !== "Enter") return;
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (
      t.classList.contains("step-val") ||
      t.classList.contains("name-input")
    ) {
      e.preventDefault();
      t.blur();
    }
  }

  function addProduct() {
    if (products.length >= MAX_PRODUCTS) {
      alert(`最多支持 ${MAX_PRODUCTS} 个商品。`);
      return;
    }
    const index = products.length;
    products.push(makeProduct(index));
    renderAll();
    scheduleSave();
  }

  function delProduct() {
    if (products.length <= 1) {
      alert("至少保留 1 个商品。");
      return;
    }
    const index = products.length - 1;
    const product = products[index];
    if (!isDefaultProduct(product, index)) {
      const name = product.name.trim() || defaultName(index);
      if (!confirm(`「${name}」已修改，确定删除？`)) return;
    }
    products.pop();
    renderAll();
    scheduleSave();
  }

  function safeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, "_").trim() || "export";
  }

  function collectExportData() {
    return products.map((p, i) => {
      recalcProduct(p);
      const name = p.name.trim() || defaultName(i);
      const title = `${name}${TITLE_SUFFIX}`;
      const rows = p.rows.map((r) => [
        r.op,
        r.price,
        r.qty,
        r.total,
        `${r.margin}%`,
        r.sell,
        r.profit,
      ]);
      const signs = p.rows.map((r) => r.sign);
      const total = sumProfit(p);
      const summary =
        total != null ? `预期收益：${fmtMoney(total)}` : null;
      return { title, headers: HEADERS, rows, signs, summary };
    });
  }

  function loadFont(size, weight = "400") {
    // Prefer system Chinese UI fonts already available in browser canvas
    return `${weight} ${size}px "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif`;
  }

  function measureText(ctx, text, font) {
    ctx.font = font;
    const m = ctx.measureText(text || " ");
    const w = m.width;
    const asc = m.actualBoundingBoxAscent ?? sizeFromFont(font) * 0.8;
    const desc = m.actualBoundingBoxDescent ?? sizeFromFont(font) * 0.2;
    return { w, h: asc + desc, asc, desc };
  }

  function sizeFromFont(font) {
    const m = /(\d+(?:\.\d+)?)px/.exec(font);
    return m ? Number(m[1]) : 16;
  }

  function renderTableCanvas(item) {
    const cellFont = loadFont(28);
    const titleFont = loadFont(40, "700");
    const headerFont = loadFont(26, "700");
    const summaryFont = loadFont(30, "700");

    const marginX = 52;
    const marginY = 44;
    const titleGap = 28;
    const padX = 26;
    const padY = 18;
    const titleRowGap = 48;

    const table = [item.headers, ...item.rows];
    const probe = document.createElement("canvas").getContext("2d");
    const colW = new Array(item.headers.length).fill(0);
    let rowH = 0;
    table.forEach((row, rI) => {
      const font = rI === 0 ? headerFont : cellFont;
      row.forEach((cell, cI) => {
        const m = measureText(probe, cell || " ", font);
        colW[cI] = Math.max(colW[cI], Math.ceil(m.w + padX * 2));
        rowH = Math.max(rowH, Math.ceil(m.h + padY * 2));
      });
    });
    rowH = Math.max(rowH, 56);

    const titleM = measureText(probe, item.title || " ", titleFont);
    let summaryW = 0;
    let summaryH = 0;
    if (item.summary) {
      const sm = measureText(probe, item.summary, summaryFont);
      summaryW = sm.w;
      summaryH = sm.h;
    }
    const tableW = colW.reduce((a, b) => a + b, 0);
    const tableH = rowH * table.length;
    const titleRowW =
      titleM.w + (item.summary ? titleRowGap + summaryW : 0);
    const titleRowH = Math.max(titleM.h, summaryH);
    const imgW = Math.max(tableW, titleRowW) + marginX * 2;
    const imgH = marginY + titleRowH + titleGap + tableH + marginY;

    const canvas = document.createElement("canvas");
    canvas.width = imgW;
    canvas.height = imgH;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, imgW, imgH);

    const tableX = marginX;
    const contentRight = tableX + Math.max(tableW, titleRowW);
    ctx.fillStyle = "#1e3a5f";
    ctx.font = titleFont;
    ctx.textBaseline = "top";
    const titleY = marginY + (titleRowH - titleM.h) / 2;
    ctx.fillText(item.title, tableX, titleY);

    if (item.summary) {
      const num = parseNumber(
        item.summary.replace("预期收益：", "").trim()
      );
      ctx.fillStyle =
        num != null && num < 0
          ? `rgb(${MINUS_RGB.join(",")})`
          : `rgb(${PLUS_RGB.join(",")})`;
      ctx.font = summaryFont;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(
        item.summary,
        contentRight,
        marginY + titleRowH / 2
      );
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }

    const y0 = marginY + titleRowH + titleGap;
    ctx.fillStyle = "#1e3a5f";
    ctx.fillRect(tableX, y0, tableW, rowH);

    let y = y0;
    table.forEach((row, rI) => {
      let x = tableX;
      row.forEach((cell, cI) => {
        const font = rI === 0 ? headerFont : cellFont;
        let fill = rI === 0 ? "#ffffff" : "#000000";
        if (rI > 0 && (cI === COL.PRICE || cI === COL.QTY || cI === COL.SELL)) {
          ctx.fillStyle = "#e8f3ff";
          ctx.fillRect(x, y, colW[cI], rowH);
          fill = "#0b4f8a";
        } else if (rI > 0 && cI === COL.MARGIN) {
          const sign = item.signs?.[rI - 1] || "+";
          fill =
            sign === "-"
              ? `rgb(${MINUS_RGB.join(",")})`
              : `rgb(${PLUS_RGB.join(",")})`;
        }
        ctx.fillStyle = fill;
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cell || "", x + colW[cI] / 2, y + rowH / 2);
        x += colW[cI];
      });
      y += rowH;
    });

    ctx.strokeStyle = "#d0d0d0";
    ctx.lineWidth = 1;
    ctx.strokeRect(tableX + 0.5, y0 + 0.5, tableW - 1, tableH - 1);
    let gx = tableX;
    for (let i = 0; i < colW.length - 1; i++) {
      gx += colW[i];
      ctx.beginPath();
      ctx.moveTo(gx + 0.5, y0);
      ctx.lineTo(gx + 0.5, y0 + tableH);
      ctx.stroke();
    }
    for (let i = 1; i < table.length; i++) {
      const yy = y0 + i * rowH;
      ctx.beginPath();
      ctx.moveTo(tableX, yy + 0.5);
      ctx.lineTo(tableX + tableW, yy + 0.5);
      ctx.stroke();
    }

    return canvas;
  }

  function stackCanvases(canvases) {
    const gap = 72;
    const width = Math.max(...canvases.map((c) => c.width));
    const height =
      canvases.reduce((s, c) => s + c.height, 0) +
      gap * (canvases.length - 1);
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const ctx = out.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    let y = 0;
    for (const c of canvases) {
      const x = Math.floor((width - c.width) / 2);
      ctx.drawImage(c, x, y);
      y += c.height + gap;
    }
    return out;
  }

  async function exportPng() {
    document.activeElement?.blur?.();
    const items = collectExportData();
    if (!items.length) {
      alert("没有可导出的数据。");
      return;
    }
    // wait a tick so fonts are ready
    await document.fonts?.ready?.catch?.(() => {});
    const canvases = items.map(renderTableCanvas);
    const out = stackCanvases(canvases);
    let filename;
    if (items.length === 1) {
      const part = items[0].title.replace(TITLE_SUFFIX, "").trim();
      filename = `${part}-${EXPORT_BASENAME}.png`;
    } else {
      filename = `${EXPORT_BASENAME}-全部商品.png`;
    }
    filename = safeFilename(filename);

    out.toBlob((blob) => {
      if (!blob) {
        alert("导出失败");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, "image/png");
  }

  function init() {
    const saved = loadState();
    if (saved?.length) {
      products = saved.map((p, i) => makeProduct(i, p));
    } else {
      products = [makeProduct(0)];
    }
    renderAll();

    els.btnAdd.addEventListener("click", addProduct);
    els.btnDel.addEventListener("click", delProduct);
    els.btnExport.addEventListener("click", () => {
      exportPng().catch((err) => alert(String(err?.message || err)));
    });
    els.products.addEventListener("click", onProductsClick);
    els.products.addEventListener("input", onProductsInput);
    els.products.addEventListener("focusout", onProductsFocusOut);
    els.products.addEventListener("keydown", onProductsKeyDown);
  }

  init();
})();
