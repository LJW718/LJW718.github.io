/**
 * 交易计算器（单页脚本，逻辑分区）
 * 1) 费率/格式化  2) 行与补货  3) 成交历史与清仓
 * 4) 动画结算     5) 持久化备份  6) DOM 渲染与交互
 * 7) PNG 导出
 */
(() => {
  "use strict";

  const APP_NAME = "略亏少赚不被套交易计算器";
  const EXPORT_BASENAME = "trading_calculator";
  const TITLE_SUFFIX = "补仓价格和卖出价格";
  const OP_ENTRY = "建仓";
  const OP_RESTOCK_PREFIX = "补仓";
  const OP_MARK = "当前价格";
  const MAX_PRODUCTS = 10;
  const STORAGE_KEY = "trading_calculator_web_v2";
  const STORAGE_KEY_LEGACY = [
    "trading_calculator_web_v1",
    "交易计算器_web_v1",
    "restock_table_web_v1",
  ];
  const AUTOSAVE_MS = 400;

  // 买入侧：下跌 / 买入 / 数量 / 金额；卖出侧：上涨 / 卖出 / 收益 / 成交
  const HEADERS = ["操作", "下跌", "买入", "数量", "金额", "上涨", "卖出", "收益", "成交"];
  const COL = {
    OP: 0,
    LOSS: 1,
    PRICE: 2,
    QTY: 3,
    TOTAL: 4,
    GAIN: 5,
    SELL: 6,
    PROFIT: 7,
    DONE: 8,
  };
  const COL_CLASS = [
    "col-op",
    "col-loss",
    "col-buy",
    "col-qty",
    "col-total",
    "col-gain",
    "col-sell",
    "col-profit",
    "col-done",
  ];
  const COL_LABELS = [
    "操作",
    "下跌",
    "买入价",
    "数量",
    "金额",
    "上涨",
    "卖出价",
    "收益",
    "成交",
  ];
  const QTY_STEP = 100;
  const PRICE_STEP = 0.01;
  // 补仓相对建仓数量比例循环：30% / 40% / 30%
  const RESTOCK_QTY_RATIO_CYCLE = [0.3, 0.4, 0.3];
  // 补仓默认跌/涨幅循环：3% / 4% / 3%；第 4 档起下跌固定 5%
  const RESTOCK_RATE_CYCLE = [0.03, 0.04, 0.03];
  const RESTOCK_LOSS_AFTER = 0.05;
  const RESTOCK_LOSS_AFTER_N = 3;
  const ENTRY_GAIN_RATE = 0.036;
  // 期望收益：建仓金额的区间比例
  const EXPECTED_RATE_LOW = 0.03;
  const EXPECTED_RATE_HIGH = 0.05;
  // 相对建仓价累计下跌超过该比例则禁止继续补仓
  const MAX_DROP_FROM_ENTRY = 0.2;
  const DEFAULT_BUDGET = "50000";
  const SETTLED_PROFIT_LABEL = "成交收益（价差）";

  // A股常见手续费（全佣近似）：佣金万分之2.5起5元、过户费万0.01双向、印花税万5仅卖出
  const COMMISSION_RATE = 0.00025;
  const COMMISSION_MIN = 5;
  const TRANSFER_RATE = 0.00001;
  const STAMP_DUTY_RATE = 0.0005;

  const DEFAULT_ROWS = [
    { op: OP_ENTRY, price: "0.00", qty: "0" },
    { op: `${OP_RESTOCK_PREFIX}1`, price: "", qty: "0" },
    { op: `${OP_RESTOCK_PREFIX}2`, price: "", qty: "0" },
    { op: `${OP_RESTOCK_PREFIX}3`, price: "", qty: "0" },
  ];
  const PRICE_ZERO = "0.00";

  const PLUS_RGB = [211, 47, 47];
  const MINUS_RGB = [46, 125, 50];
  const WM_LINE_1 = "宁愿空仓";
  const WM_LINE_2 = "绝不满仓";

  /** @type {{ id: string, name: string, rows: object[] }[]} */
  let products = [];
  let saveTimer = 0;

  const els = {
    products: document.getElementById("products"),
    btnAdd: document.getElementById("btn-add"),
    btnExport: document.getElementById("btn-export"),
    btnExportData: document.getElementById("btn-export-data"),
    btnImportData: document.getElementById("btn-import-data"),
    importFile: document.getElementById("import-file"),
    skipSettle: document.getElementById("tc-skip-settle"),
    delModal: document.getElementById("tc-del-modal"),
    delTitle: document.getElementById("tc-del-title"),
    delMsg: document.getElementById("tc-del-msg"),
    delExtra: document.getElementById("tc-del-extra"),
    clearPrice: document.getElementById("tc-clear-price"),
    clearPreview: document.getElementById("tc-clear-preview"),
    delConfirm: document.getElementById("tc-del-confirm"),
  };

  /** @type {number} */
  let pendingDeleteIndex = -1;
  /** @type {null | { type: 'clear-history', index: number }} */
  let pendingConfirm = null;
  /** @type {Set<string>} */
  const settlingKeys = new Set();
  /** 成交动画是否被用户跳过 */
  let settleAbort = false;
  /** @type {null | (() => void)} */
  let settleSkipResolve = null;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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

  /** 买卖价：向上取整到分（2 位小数） */
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

  /** 收益金额：四舍五入到分，亏损按真实幅度计入 */
  function fmtProfit(value) {
    const rounded = round2(value);
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

  function fmtPct(value) {
    return (Math.round(Number(value) * 100 + 1e-10) / 100).toFixed(2);
  }

  /** 兼容旧存档：进货→建仓、补货N→补仓N */
  function normalizeOp(op) {
    const s = String(op || "").trim();
    if (s === "进货" || s === OP_ENTRY) return OP_ENTRY;
    if (s === OP_MARK || s === "现价" || s === "現价" || s === "現價") {
      return OP_MARK;
    }
    const m = /^(?:补货|补仓)(\d+)$/.exec(s);
    if (m) return `${OP_RESTOCK_PREFIX}${m[1]}`;
    return s;
  }

  function isRestock(op) {
    const s = String(op).trim();
    return s.startsWith(OP_RESTOCK_PREFIX) || s.startsWith("补货");
  }

  function isEntry(op) {
    const s = String(op).trim();
    return s === OP_ENTRY || s === "进货";
  }

  function isMark(op) {
    const s = String(op || "").trim();
    return s === OP_MARK || s === "现价" || s === "現价" || s === "現價";
  }

  /** 建仓/补仓持仓行（不含误存的现价行） */
  function isHolding(op) {
    return isEntry(op) || isRestock(op);
  }

  function holdingRows(product) {
    return (product?.rows || []).filter((r) => isHolding(r.op));
  }

  /** 旧表内「现价」行迁到标题旁字段，并从表中移除 */
  function migrateMarkRowToField(product) {
    if (!Array.isArray(product.rows)) product.rows = [];
    const markRows = product.rows.filter((r) => isMark(r.op));
    if (markRows.length) {
      const fromRow = markRows[0]?.price;
      if (
        (product.markPrice == null || product.markPrice === "") &&
        fromRow != null &&
        String(fromRow).trim() !== ""
      ) {
        product.markPrice = String(fromRow);
      }
      product.rows = product.rows.filter((r) => !isMark(r.op));
    }
    if (product.markPrice == null) product.markPrice = "";
  }

  /** 价格表只剩建仓一行时，成交列改为「清仓」 */
  function onlyEntryLeft(product) {
    const holds = holdingRows(product);
    return holds.length === 1 && isEntry(holds[0].op);
  }

  function settleActionLabel(product) {
    return onlyEntryLeft(product) ? "清仓" : "成交";
  }

  function restockSeq(op) {
    const m = /^(?:补仓|补货)(\d+)$/.exec(String(op).trim());
    return m ? Number(m[1]) : null;
  }

  function restockCount(product) {
    return product.rows.filter((r) => isRestock(r.op)).length;
  }

  function lossRateFor(op) {
    const n = restockSeq(op);
    if (n == null || n < 1) return null;
    if (n > RESTOCK_LOSS_AFTER_N) return RESTOCK_LOSS_AFTER;
    return RESTOCK_RATE_CYCLE[(n - 1) % RESTOCK_RATE_CYCLE.length];
  }

  function gainRateFor(op) {
    if (isEntry(op)) return ENTRY_GAIN_RATE;
    const n = restockSeq(op);
    if (n == null || n < 1) return null;
    return RESTOCK_RATE_CYCLE[(n - 1) % RESTOCK_RATE_CYCLE.length];
  }

  function qtyRatioFor(op) {
    const n = restockSeq(op);
    if (n == null || n < 1) return null;
    return RESTOCK_QTY_RATIO_CYCLE[(n - 1) % RESTOCK_QTY_RATIO_CYCLE.length];
  }

  function defaultRestockQty(product, op) {
    const entryRow = product.rows.find((r) => isEntry(r.op)) || product.rows[0];
    const entryQty = parseNumber(entryRow?.qty);
    const ratio = qtyRatioFor(op);
    if (entryQty == null || ratio == null) return "";
    return String(ceilQty(entryQty * ratio));
  }

  /** 进货数量变化时，按比例循环同步各档补货数量（已成交行不动）。 */
  function syncRestockQtyFromEntry(product) {
    for (const row of product.rows) {
      if (!isRestock(row.op) || row.done) continue;
      row.qty = defaultRestockQty(product, row.op);
    }
  }

  function entryBuyPrice(product) {
    const row = product.rows.find((r) => isEntry(r.op)) || product.rows[0];
    return parseNumber(row?.price);
  }

  /**
   * 补货买入基准：往前找最近一档「未成交」的买入价；
   * 若上方全部已成交，则回退为最近一档买入价。
   */
  function prevUnachievedBuy(rows, beforeIndex) {
    for (let i = beforeIndex - 1; i >= 0; i--) {
      if (isMark(rows[i].op) || rows[i].done) continue;
      const p = parseNumber(rows[i].price);
      if (p != null) return p;
    }
    for (let i = beforeIndex - 1; i >= 0; i--) {
      if (isMark(rows[i].op)) continue;
      const p = parseNumber(rows[i].price);
      if (p != null) return p;
    }
    return null;
  }

  function nextRestockAnchor(product) {
    return prevUnachievedBuy(product.rows || [], (product.rows || []).length);
  }

  function previewNextRestockPrice(product) {
    const prev = nextRestockAnchor(product);
    if (prev == null || prev <= 0) return null;
    const n = restockCount(product) + 1;
    const loss = lossRateFor(`${OP_RESTOCK_PREFIX}${n}`);
    if (loss == null) return null;
    return parseNumber(fmtPrice(round2(prev * (1 - loss))));
  }

  /**
   * 补仓限制：建仓价有效、跌幅≤20%、未超总预算、
   * 剩余资金够下一档约需金额。
   */
  function restockGuard(product) {
    const entry = entryBuyPrice(product);
    if (entry == null || entry <= 0) {
      return {
        ok: false,
        reason: "请先填写有效的建仓买入价，再进行补仓。",
      };
    }
    const preview = nextRestockPreview(product);
    if (preview.price == null) {
      return {
        ok: false,
        reason: "无法推算下一档补仓价，请检查买入价格。",
      };
    }
    const drop = (entry - preview.price) / entry;
    if (drop > MAX_DROP_FROM_ENTRY + 1e-12) {
      const pct = (Math.round(drop * 1000) / 10).toFixed(1);
      return {
        ok: false,
        reason: `相对建仓价再补将下跌约 ${pct}%（超过 20%），禁止补仓，避免越套越深。`,
      };
    }
    const budget = parseNumber(product.budget);
    if (budget != null && budget > 0) {
      const used = positionCapital(product).cost;
      const remain = budget - used;
      if (used > budget + 1e-9) {
        return {
          ok: false,
          reason: `已用 ${fmtMoney(used)} 已超过总预算 ${fmtMoney(
            budget
          )}，禁止补仓。`,
        };
      }
      if (preview.amount != null && remain + 1e-9 < preview.amount) {
        return {
          ok: false,
          reason: `剩余 ${fmtMoney(remain)} 不足下一档约需 ${fmtMoney(
            preview.amount
          )}，禁止补仓。`,
        };
      }
    }
    return { ok: true, reason: "" };
  }

  function addRestockRow(product) {
    migrateMarkRowToField(product);
    const n = restockCount(product) + 1;
    const op = `${OP_RESTOCK_PREFIX}${n}`;
    product.rows.push(
      emptyRowState({
        op,
        price: "",
        qty: defaultRestockQty(product, op),
      })
    );
  }

  /** 末档补仓行（从后往前找） */
  function lastRestockInfo(product) {
    const rows = product?.rows || [];
    for (let i = rows.length - 1; i >= 0; i--) {
      if (isRestock(rows[i].op)) return { index: i, row: rows[i] };
    }
    return null;
  }

  function restockRowHasUserData(row) {
    if (!row) return false;
    if (parseNumber(row.price) != null && !isZeroPriceText(row.price)) return true;
    if (parseNumber(row.sell) != null) return true;
    return false;
  }

  function delRestockRow(product) {
    const info = lastRestockInfo(product);
    if (!info) return false;
    product.rows.splice(info.index, 1);
    renumberRestocks(product);
    return true;
  }

  function canDelRestock(product) {
    return !!lastRestockInfo(product);
  }

  function delRestockLabel(product) {
    const info = lastRestockInfo(product);
    if (!info) return "没有可删除的补仓行";
    return `删除末档「${info.row.op}」`;
  }

  function emptyRowState(def) {
    return {
      op: normalizeOp(def.op),
      price: def.price,
      qty: def.qty,
      total: "",
      lossPct: "",
      sell: "",
      gainPct: "",
      done: false,
      profit: "",
      priceManual: false,
      sellManual: false,
    };
  }

  function newHistoryId() {
    return `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatHistoryTime(ts) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "—";
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
      d.getHours()
    )}:${p(d.getMinutes())}`;
  }

  function snapshotDeal(row, extra = {}) {
    return {
      id: newHistoryId(),
      at: Date.now(),
      op: row.op,
      price: row.price || "",
      qty: row.qty || "",
      sell: row.sell || "",
      profit: row.profit || "",
      gainPct: row.gainPct || "",
      lossPct: row.lossPct || "",
      ...extra,
    };
  }

  /** 本轮成本基数：首笔成交时锁定进货金额，供累计收益率使用 */
  function ensureRoundCostBase(product) {
    if (
      typeof product.roundCostBase === "number" &&
      Number.isFinite(product.roundCostBase) &&
      product.roundCostBase > 0
    ) {
      return;
    }
    const amt = entryAmount(product);
    if (amt != null && amt > 0) product.roundCostBase = amt;
  }

  function clearRoundCostBase(product) {
    product.roundCostBase = null;
  }

  function roundCostBaseOf(product) {
    if (
      typeof product.roundCostBase === "number" &&
      Number.isFinite(product.roundCostBase) &&
      product.roundCostBase > 0
    ) {
      return product.roundCostBase;
    }
    // 尚未锁定时：按当前表内总投入（含未成交补仓）
    const invested = positionCapital(product).cost;
    if (invested > 0) return invested;
    return entryAmount(product);
  }

  function isClearHistoryItem(item) {
    return item?.kind === "clear" || String(item?.op || "").trim() === "清仓";
  }

  /** 汇总成交明细收益（含亏损） */
  function sumDealProfits(items) {
    let sum = 0;
    let any = false;
    for (const item of items || []) {
      const v = parseNumber(item?.profit);
      if (v == null) continue;
      sum += v;
      any = true;
    }
    return { sum, any };
  }

  /** 将成交历史按清仓切成轮次（时间正序） */
  function splitHistoryRounds(list) {
    const rounds = [];
    let buf = [];
    for (const item of list || []) {
      buf.push(item);
      if (isClearHistoryItem(item)) {
        rounds.push(buf);
        buf = [];
      }
    }
    if (buf.length) rounds.push(buf);
    return rounds;
  }

  /** 当前未清仓轮次的成交明细 */
  function currentRoundItems(product) {
    const rounds = splitHistoryRounds(product?.history);
    if (!rounds.length) return [];
    const last = rounds[rounds.length - 1];
    if (last.some(isClearHistoryItem)) return [];
    return last;
  }

  /** 已成交收益（当前轮次历史，含亏损） */
  function settledProfit(product) {
    const { sum, any } = sumDealProfits(currentRoundItems(product));
    return any ? sum : null;
  }

  /** 现价：标题旁填写；未填时回退末档持仓买入价 */
  function markBuyPrice(product) {
    const marked = parseNumber(product?.markPrice);
    if (marked != null && marked > 0) return marked;
    const rows = holdingRows(product);
    for (let i = rows.length - 1; i >= 0; i--) {
      const p = parseNumber(rows[i].price);
      if (p != null) return p;
    }
    return null;
  }

  function markPriceDropInfo(product) {
    const mark = parseNumber(product?.markPrice);
    const entry = entryBuyPrice(product);
    if (mark == null || entry == null || !(entry > 0)) {
      return { text: "", tone: "" };
    }
    const loss = ((entry - mark) / entry) * 100;
    const down = loss >= -1e-12;
    return {
      text: `相对建仓 ${down ? "−" : "+"}${fmtPct(Math.abs(loss))}%`,
      tone: down ? "is-minus" : "is-plus",
    };
  }

  function syncMarkPriceDropEl(section, product) {
    const dropEl = section?.querySelector(".mark-price-drop");
    if (!dropEl) return;
    const info = markPriceDropInfo(product);
    dropEl.textContent = info.text;
    dropEl.classList.remove("is-plus", "is-minus");
    if (info.tone) dropEl.classList.add(info.tone);
    dropEl.hidden = !info.text;
  }

  /** 当前表内持仓：数量、含买入费用成本、成本价（不含现价行） */
  function positionHoldings(product) {
    let qty = 0;
    let cost = 0;
    let any = false;
    for (const row of holdingRows(product)) {
      const q = parseNumber(row.qty);
      const t = parseNumber(row.total);
      if (q != null && q > 0) {
        qty += q;
        any = true;
      }
      if (t != null) cost += t;
    }
    return {
      any,
      qty,
      cost,
      costPrice: qty > 0 && cost > 0 ? cost / qty : null,
    };
  }

  /**
   * 浮动盈亏（东财持仓盈亏口径）：
   * (现价 - 成本价) × 数量 = 现价市值 - 含买费成本；
   * 不含预估卖出佣金/印花税（卖出费用只在实际成交或一键清仓时计入）。
   * 现价取末档买入价；已做「4.9 卖出 / 4.88 买入」这类换仓时，
   * 卖出部分进成交收益，剩余+新买按新成本价浮动。
   */
  function unrealizedByDrop(product) {
    const mark = markBuyPrice(product);
    if (mark == null || !(mark > 0)) return null;
    const h = positionHoldings(product);
    if (!h.any || !(h.qty > 0) || !(h.cost > 0)) return null;
    return round2(mark * h.qty - h.cost);
  }

  /** 按历史明细回写已成交累计 */
  function syncRealizedFromHistory(product) {
    const sum = settledProfit(product);
    product.realizedProfit = sum == null ? 0 : sum;
    product.realizedAny = sum != null;
    return sum;
  }

  function pushDealHistory(product, row, extra = {}) {
    if (!Array.isArray(product.history)) product.history = [];
    ensureRoundCostBase(product);
    product.history.push(snapshotDeal(row, extra));
    syncRealizedFromHistory(product);
  }

  function formatDealProfitLabel(sum, pct, label = SETTLED_PROFIT_LABEL) {
    const pctText = pct == null ? "—" : fmtPct(pct);
    return `${label}：${fmtProfit(sum)}（${pctText}%）`;
  }

  function formatHistoryCumulative(item) {
    const cum =
      typeof item.cumulative === "number" && Number.isFinite(item.cumulative)
        ? item.cumulative
        : parseNumber(item.cumulative);
    if (cum == null) return "";
    const pct =
      typeof item.cumulativePct === "number" &&
      Number.isFinite(item.cumulativePct)
        ? item.cumulativePct
        : parseNumber(item.cumulativePct);
    return formatDealProfitLabel(cum, pct);
  }

  /** 金额为 0 或无效时不可成交；现价行不可成交 */
  function canSettleRow(row) {
    if (isMark(row?.op)) return false;
    const total = parseNumber(row?.total);
    return total != null && total > 0;
  }

  function retainedProfitOf(product) {
    if (!product?.retainedAny) return 0;
    const v = product.retainedProfit;
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  }

  function clearRetainedProfit(product) {
    product.retainedProfit = 0;
    product.retainedAny = false;
  }

  /** 清空历史时把已计入累计的成交收益并入保留值，避免累计收益被清掉 */
  function absorbSettledIntoRetained(product) {
    const settled = settledProfit(product);
    if (settled == null) return;
    product.retainedProfit = retainedProfitOf(product) + settled;
    product.retainedAny = true;
  }

  /**
   * 累计收益（对齐 A 股 / 东财口径）：
   * - 浮动：现价市值 − 含买费持仓成本（不含预估卖出费）
   * - 已成交：卖出净回款 − 对应买入成本（含买卖两侧真实费用）
   * - 换仓（如 4.9 卖 6600、4.88 买 6700）：卖出进成交收益，新仓按新成本浮动
   * - 清空历史后保留值仍计入
   */
  function cumulativeProfit(product) {
    syncRealizedFromHistory(product);
    const settled = settledProfit(product);
    const unrealized = unrealizedByDrop(product);
    const retained = retainedProfitOf(product);
    const hasRetained = !!product.retainedAny;
    if (settled == null && unrealized == null && !hasRetained) return null;
    return round2(
      (settled == null ? 0 : settled) +
        (unrealized == null ? 0 : unrealized) +
        retained
    );
  }

  /** 累计收益率分母：优先当前持仓含费成本（与东财「盈亏/成本」一致） */
  function cumulativeCostBase(product) {
    const held = positionHoldings(product).cost;
    if (held > 0) return held;
    return roundCostBaseOf(product);
  }

  function profitPctFor(sum, product) {
    const base = cumulativeCostBase(product);
    if (sum == null || base == null || base <= 0) return null;
    return (sum / base) * 100;
  }

  /** 累计收益相对持仓成本的百分比 */
  function cumulativeProfitPct(product) {
    return profitPctFor(cumulativeProfit(product), product);
  }

  function dealItemHtml(item) {
    const profitNum = parseNumber(item.profit);
    let profitClass = "";
    if (profitNum != null) {
      profitClass = profitNum < 0 ? " is-minus" : " is-plus";
    }
    const clear = isClearHistoryItem(item);
    return `<li class="deal-history-item${clear ? " is-clear" : ""}">
      <span class="deal-time">${escapeHtml(formatHistoryTime(item.at))}</span>
      <span class="deal-op">${escapeHtml(clear ? "清仓" : item.op)}</span>
      <span class="deal-pair">买 ${escapeHtml(item.price || "—")} → 卖 ${escapeHtml(item.sell || "—")}</span>
      <span class="deal-qty">×${escapeHtml(item.qty || "—")}</span>
      <span class="deal-profit${profitClass}">${escapeHtml(item.profit || "—")}</span>
    </li>`;
  }

  function formatCumulativeMetric(product, label = "累计收益") {
    const settledOnly = label === SETTLED_PROFIT_LABEL;
    const sum = settledOnly ? settledProfit(product) : cumulativeProfit(product);
    const pct = settledOnly
      ? profitPctFor(sum, product)
      : cumulativeProfitPct(product);
    const sumText = sum == null ? "—" : fmtProfit(sum);
    const pctText = pct == null ? "—" : fmtPct(pct);
    return `${label}：${sumText}（${pctText}%）`;
  }

  function cumulativeMetricClass(product) {
    const sum = cumulativeProfit(product);
    let cls = "metric cumulative";
    if (sum == null) return cls;
    return cls + (sum < 0 ? " is-minus" : " is-plus");
  }

  function historyHtml(product) {
    const list = Array.isArray(product.history) ? product.history : [];
    const n = list.length;
    const sum = settledProfit(product);
    const sumTone = sum == null ? "" : sum < 0 ? " is-minus" : " is-plus";
    const rounds = splitHistoryRounds(list);
    let body;
    if (n === 0) {
      body = `<li class="deal-history-empty">暂无成交记录，勾选「成交」后记入历史并从价格表移除</li>`;
      body = `<ul class="deal-history-list">${body}</ul>`;
    } else {
      body = [...rounds]
        .reverse()
        .map((items, idx) => {
          const roundNo = rounds.length - idx;
          const clearItem = items.find(isClearHistoryItem);
          const ongoing = !clearItem;
          const roundProfit = sumDealProfits(items);
          let cumText = "进行中";
          let cumTone = "";
          if (!ongoing && roundProfit.any) {
            const storedPct =
              typeof clearItem.cumulativePct === "number" &&
              Number.isFinite(clearItem.cumulativePct)
                ? clearItem.cumulativePct
                : parseNumber(clearItem.cumulativePct);
            cumText = formatDealProfitLabel(roundProfit.sum, storedPct);
            cumTone = roundProfit.sum < 0 ? " is-minus" : " is-plus";
            if (clearItem) {
              clearItem.cumulative = roundProfit.sum;
              if (storedPct != null) clearItem.cumulativePct = storedPct;
            }
          } else if (!ongoing && clearItem) {
            cumText =
              formatHistoryCumulative(clearItem) || `${SETTLED_PROFIT_LABEL}：—`;
            const c =
              typeof clearItem.cumulative === "number"
                ? clearItem.cumulative
                : parseNumber(clearItem.cumulative);
            if (c != null) cumTone = c < 0 ? " is-minus" : " is-plus";
          }
          return `<details class="deal-round"${ongoing ? " open" : ""}>
            <summary>
              <span class="deal-round-title">第 ${roundNo} 轮（${
                items.length
              }）</span>
              <span class="deal-round-sum${cumTone}">${escapeHtml(cumText)}</span>
            </summary>
            <ul class="deal-history-list">${[...items]
              .reverse()
              .map(dealItemHtml)
              .join("")}</ul>
          </details>`;
        })
        .join("");
    }
    return `<details class="deal-history" open>
      <summary>
        <span class="deal-history-title">成交历史（${n}）</span>
        <span class="deal-history-sum${sumTone}">${escapeHtml(
          formatCumulativeMetric(product, SETTLED_PROFIT_LABEL)
        )}</span>
      </summary>
      <div class="deal-history-panel">
        <div class="deal-history-meta">
          <button type="button" class="tool-btn btn-clear-history"${
            n ? "" : " disabled"
          }>清空历史</button>
        </div>
        <div class="deal-rounds">${body}</div>
      </div>
    </details>`;
  }

  function cloneDefaultRows() {
    return DEFAULT_ROWS.map((r) => emptyRowState(r));
  }

  function makeProduct(index, data) {
    const name =
      String(data?.product_name || data?.name || defaultName(index)).trim() ||
      defaultName(index);
    let rows;
    if (Array.isArray(data?.rows) && data.rows.length) {
      rows = data.rows.map((item, i) => {
        const def = DEFAULT_ROWS[i] || DEFAULT_ROWS[0];
        const op = normalizeOp(item.op || def.op);
        const hasPrice = item.price != null && String(item.price).trim() !== "";
        const hasSell = item.sell != null && String(item.sell).trim() !== "";
        let price = String(item.price ?? (isRestock(op) ? "" : def.price));
        if (hasPrice && isZeroPriceText(price)) price = PRICE_ZERO;
        return {
          op,
          price,
          qty: String(item.qty ?? def.qty),
          total: "",
          lossPct: "",
          sell: hasSell ? String(item.sell) : "",
          gainPct: "",
          done: item.done === true,
          profit: "",
          // 显式标记优先；旧存档有值则锁定，避免被默认比例覆盖
          priceManual:
            item.priceManual === true ||
            (item.priceManual == null && hasPrice && isRestock(op)),
          sellManual:
            item.sellManual === true || (item.sellManual == null && hasSell),
        };
      });
      // 保证至少有进货行；补货行数量以存档为准，不强制补满
      if (!rows.some((r) => isEntry(r.op))) {
        rows.unshift(emptyRowState(DEFAULT_ROWS[0]));
      }
    } else {
      rows = cloneDefaultRows();
    }
    const mapDeal = (h) => {
      const item = {
        id: String(h.id || newHistoryId()),
        at: Number(h.at) || Date.now(),
        op: normalizeOp(h.op || ""),
        price: String(h.price ?? ""),
        qty: String(h.qty ?? ""),
        sell: String(h.sell ?? ""),
        profit: String(h.profit ?? ""),
        gainPct: String(h.gainPct ?? ""),
        lossPct: String(h.lossPct ?? ""),
      };
      if (h.kind === "clear" || item.op === "清仓") item.kind = "clear";
      if (
        typeof h.cumulative === "number" &&
        Number.isFinite(h.cumulative)
      ) {
        item.cumulative = h.cumulative;
      }
      if (
        typeof h.cumulativePct === "number" &&
        Number.isFinite(h.cumulativePct)
      ) {
        item.cumulativePct = h.cumulativePct;
      }
      return item;
    };
    // 旧「上期成交」archives 并入成交历史明细
    const legacyArchiveItems = Array.isArray(data?.archives)
      ? data.archives.flatMap((a) =>
          Array.isArray(a?.items) ? a.items.map(mapDeal).filter((h) => h.op) : []
        )
      : [];
    const history = [
      ...legacyArchiveItems,
      ...(Array.isArray(data?.history)
        ? data.history.map(mapDeal).filter((h) => h.op)
        : []),
    ];
    // 累计收益一律按当前轮次历史重算（含亏损），不信任旧存档增量值
    const realized = sumDealProfits(
      (() => {
        const rounds = splitHistoryRounds(history);
        if (!rounds.length) return [];
        const last = rounds[rounds.length - 1];
        return last.some(isClearHistoryItem) ? [] : last;
      })()
    );
    const realizedProfit = realized.any ? realized.sum : 0;
    const realizedAny = realized.any;
    let retainedProfit = 0;
    let retainedAny = false;
    if (
      typeof data?.retainedProfit === "number" &&
      Number.isFinite(data.retainedProfit)
    ) {
      retainedProfit = data.retainedProfit;
      retainedAny = data.retainedAny !== false;
    }
    let roundCostBase = null;
    if (
      typeof data?.roundCostBase === "number" &&
      Number.isFinite(data.roundCostBase) &&
      data.roundCostBase > 0
    ) {
      roundCostBase = data.roundCostBase;
    }
    const budget =
      data?.budget == null || data?.budget === ""
        ? DEFAULT_BUDGET
        : String(data.budget);
    let markPrice =
      data?.markPrice == null || data?.markPrice === ""
        ? ""
        : String(data.markPrice);
    const product = {
      id: `p-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      rows,
      history,
      realizedProfit,
      realizedAny,
      retainedProfit,
      retainedAny,
      roundCostBase,
      budget,
      markPrice,
    };
    migrateMarkRowToField(product);
    return product;
  }

  /**
   * 按默认亏损/盈利比例填充尚未手工锁定的买卖价（已成交行不动）。
   * 补货买入：相对最近一档「未成交」买入价按下跌比例重算。
   */
  function applyDefaultPrices(product) {
    const rows = product.rows;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (isMark(row.op)) continue;
      const lossRate = lossRateFor(row.op);
      const gainRate = gainRateFor(row.op);

      if (!row.done && isRestock(row.op) && !row.priceManual) {
        const anchor = prevUnachievedBuy(rows, i);
        if (anchor != null && lossRate != null) {
          row.price = fmtPrice(round2(anchor * (1 - lossRate)));
        } else {
          row.price = "";
        }
      }

      const price = parseNumber(row.price);
      // 卖出价向上取整到分，保证实际上涨% ≥ 默认目标
      if (!row.done && !row.sellManual && price != null && gainRate != null) {
        row.sell = fmtPrice(price * (1 + gainRate));
      } else if (!row.done && !row.sellManual && price == null) {
        row.sell = "";
      }
    }
  }

  /** 当前表内持仓：数量与含费成本（不含现价行） */
  function positionCapital(product) {
    let qty = 0;
    let cost = 0;
    let entryQty = 0;
    let restockQty = 0;
    let entryCost = 0;
    let restockCost = 0;
    let any = false;
    for (const row of holdingRows(product)) {
      const q = parseNumber(row.qty);
      const t = parseNumber(row.total);
      if (q != null) {
        qty += q;
        any = true;
        if (isEntry(row.op)) entryQty += q;
        else if (isRestock(row.op)) restockQty += q;
      }
      if (t != null) {
        cost += t;
        if (isEntry(row.op)) entryCost += t;
        else if (isRestock(row.op)) restockCost += t;
      }
    }
    return { any, qty, cost, entryQty, restockQty, entryCost, restockCost };
  }

  /** 含卖出手续费的保本卖出价（二分逼近） */
  function breakEvenSellPrice(totalCost, qty) {
    if (!(totalCost > 0) || !(qty > 0)) return null;
    let lo = totalCost / qty;
    let hi = lo * 1.08;
    for (let i = 0; i < 48; i++) {
      const mid = (lo + hi) / 2;
      const amt = mid * qty;
      const net = amt - tradeFee(amt, { sell: true });
      if (net >= totalCost - 1e-9) hi = mid;
      else lo = mid;
    }
    return parseNumber(fmtPrice(hi));
  }

  function positionStats(product) {
    const cap = positionCapital(product);
    if (!cap.any) {
      return {
        text: "仓位：—",
        sum: null,
        entry: null,
        restock: null,
        ratio: null,
      };
    }
    const ratio =
      cap.entryQty > 0 ? (cap.restockQty / cap.entryQty) * 100 : null;
    const ratioText =
      ratio == null ? "—" : `${(Math.round(ratio * 10) / 10).toFixed(1)}%`;
    const text = `仓位 ${Math.round(cap.qty)}｜建仓 ${Math.round(
      cap.entryQty
    )}｜补仓 ${Math.round(cap.restockQty)}（补仓比 ${ratioText}）｜投入 ${fmtMoney(
      cap.cost
    )}`;
    return {
      text,
      sum: cap.qty,
      entry: cap.entryQty,
      restock: cap.restockQty,
      ratio,
      cost: cap.cost,
    };
  }

  function costStats(product) {
    const cap = positionCapital(product);
    if (!(cap.cost > 0) || !(cap.qty > 0)) {
      return {
        text: "加权成本：—｜保本卖出价：—",
        avg: null,
        be: null,
      };
    }
    const avg = cap.cost / cap.qty;
    const be = breakEvenSellPrice(cap.cost, cap.qty);
    return {
      text: `加权成本 ${fmtPrice(avg)}｜保本卖出价 ${
        be != null ? fmtPrice(be) : "—"
      }`,
      avg,
      be,
    };
  }

  function nextRestockPreview(product) {
    const n = restockCount(product) + 1;
    const op = `${OP_RESTOCK_PREFIX}${n}`;
    const price = previewNextRestockPrice(product);
    const entry = entryBuyPrice(product);
    const qtyStr = defaultRestockQty(product, op);
    const qty = parseNumber(qtyStr);
    let amount = null;
    if (price != null && qty != null) {
      const buyAmt = price * qty;
      amount = buyAmt + tradeFee(buyAmt, { sell: false });
    }
    let dropPct = null;
    if (entry != null && entry > 0 && price != null) {
      dropPct = ((entry - price) / entry) * 100;
    }
    return { n, op, price, qty, amount, dropPct, entry };
  }

  function formatNextRestockPreview(product) {
    const p = nextRestockPreview(product);
    if (p.price == null) return "下一档：—";
    const drop =
      p.dropPct == null ? "—" : `−${(Math.round(p.dropPct * 10) / 10).toFixed(1)}%`;
    const qty = p.qty == null ? "—" : String(Math.round(p.qty));
    const amt = p.amount == null ? "—" : fmtMoney(p.amount);
    return `下一档 ${p.op}：买 ${fmtPrice(p.price)}（相对建仓 ${drop}）×${qty}｜约 ${amt}`;
  }

  function dropStats(product) {
    const banPct = MAX_DROP_FROM_ENTRY * 100;
    const entry = entryBuyPrice(product);
    const next = nextRestockPreview(product);
    if (entry == null || entry <= 0) {
      return {
        text: `跌幅台阶：—｜禁补线 ${fmtPct(banPct)}%`,
        deepest: null,
        nextDrop: null,
        room: null,
      };
    }
    let deepest = 0;
    let anyDrop = false;
    for (const row of product.rows || []) {
      if (!isRestock(row.op)) continue;
      const price = parseNumber(row.price);
      if (price == null) continue;
      const d = ((entry - price) / entry) * 100;
      if (d > deepest) deepest = d;
      anyDrop = true;
    }
    const nextDrop = next.dropPct;
    const refDrop = nextDrop != null ? nextDrop : anyDrop ? deepest : 0;
    const room = banPct - refDrop;
    const deepText = anyDrop
      ? `最深 −${(Math.round(deepest * 10) / 10).toFixed(1)}%`
      : "尚未补仓";
    const nextText =
      nextDrop == null
        ? "下一档 —"
        : `下一档 −${(Math.round(nextDrop * 10) / 10).toFixed(1)}%`;
    const roomText =
      room < -1e-9
        ? "已触禁补线"
        : `距禁补线还剩 ${(Math.round(room * 10) / 10).toFixed(1)}%`;
    return {
      text: `跌幅 ${deepText}｜${nextText}｜禁补 ${fmtPct(banPct)}%｜${roomText}`,
      deepest: anyDrop ? deepest : null,
      nextDrop,
      room,
    };
  }

  function budgetStats(product) {
    const budget = parseNumber(product.budget);
    const cap = positionCapital(product);
    const next = nextRestockPreview(product);
    const used = cap.cost;
    const remain = budget != null ? budget - used : null;
    const nextAmt = next.amount;
    let tone = "";
    if (remain != null && remain < -1e-9) tone = "is-minus";
    else if (remain != null && nextAmt != null && remain + 1e-9 < nextAmt) {
      tone = "is-warn";
    } else if (remain != null) {
      tone = "is-plus";
    }
    const budgetText = budget == null ? "—" : fmtMoney(budget);
    const usedText = used > 0 ? fmtMoney(used) : "0";
    const remainText = remain == null ? "—" : fmtMoney(remain);
    const nextText = nextAmt == null ? "—" : fmtMoney(nextAmt);
    const share =
      budget != null && budget > 0 && used > 0
        ? `${fmtPct((used / budget) * 100)}%`
        : "—";
    return {
      text: `已用 ${usedText}（${share}）｜剩余 ${remainText}｜下一档约 ${nextText}`,
      budget,
      used,
      remain,
      nextAmt,
      tone,
      budgetText,
    };
  }

  function recalcProduct(product) {
    migrateMarkRowToField(product);
    applyDefaultPrices(product);
    const rows = product.rows;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (isMark(row.op)) continue;
      const price = parseNumber(row.price);
      const sell = parseNumber(row.sell);
      const qty = parseNumber(row.qty);
      const prevAnchor = prevUnachievedBuy(rows, i);

      // 下跌：相对最近一档未成交买入价
      if (isRestock(row.op) && prevAnchor != null && prevAnchor > 0 && price != null) {
        const loss = ((prevAnchor - price) / prevAnchor) * 100;
        row.lossPct = `${fmtPct(loss)}%`;
        row.lossTone = loss >= -1e-12 ? "is-minus" : "is-plus";
      } else {
        row.lossPct = "—";
        row.lossTone = "";
      }

      // 上涨（卖出侧）：相对本档买入价的涨幅
      if (price != null && price > 0 && sell != null) {
        const gain = ((sell - price) / price) * 100;
        row.gainPct = `${fmtPct(gain)}%`;
        row.gainTone = gain >= -1e-12 ? "is-plus" : "is-minus";
      } else {
        row.gainPct = "—";
        row.gainTone = "";
      }

      if (price != null && qty != null) {
        const buyAmt = price * qty;
        const buyFee = tradeFee(buyAmt, { sell: false });
        row.total = fmtMoney(buyAmt + buyFee);
        if (sell != null) {
          const sellAmt = sell * qty;
          const sellFee = tradeFee(sellAmt, { sell: true });
          row.profit = fmtProfit(sellAmt - sellFee - buyAmt - buyFee);
        } else {
          row.profit = "";
        }
      } else {
        row.total = "";
        row.profit = "";
      }
    }
  }

  /** 进货金额（含手续费） */
  function entryAmount(product) {
    const row = product.rows.find((r) => isEntry(r.op)) || product.rows[0];
    return row ? parseNumber(row.total) : null;
  }

  /** 期望收益：进货金额的 3%～5% */
  function expectedProfitRange(product) {
    const amount = entryAmount(product);
    if (amount == null || amount <= 0) return null;
    return {
      low: amount * EXPECTED_RATE_LOW,
      high: amount * EXPECTED_RATE_HIGH,
    };
  }

  function formatExpectedMetric() {
    return "期望收益（3%-5%）";
  }

  function hasExpectedTarget(product) {
    return expectedProfitRange(product) != null;
  }

  function ensureEntryRow(product) {
    if (!product.rows.some((r) => isEntry(r.op))) {
      product.rows.unshift(emptyRowState(DEFAULT_ROWS[0]));
    }
    migrateMarkRowToField(product);
  }

  function renumberRestocks(product) {
    let n = 1;
    for (const row of product.rows) {
      if (isRestock(row.op)) row.op = `${OP_RESTOCK_PREFIX}${n++}`;
    }
    migrateMarkRowToField(product);
  }

  /** 一键清仓前置：各档金额须有效（现价行除外） */
  function clearOutGuard(product) {
    const rows = holdingRows(product);
    if (!rows.length) {
      return { ok: false, reason: "没有可清仓的持仓" };
    }
    if (!rows.some(canSettleRow)) {
      return {
        ok: false,
        reason: "请先填写有效的买入价与数量后再清仓。",
      };
    }
    const bad = rows.find((r) => !canSettleRow(r));
    if (bad) {
      return {
        ok: false,
        reason: `「${bad.op}」金额无效，请补全买入价与数量后再一键清仓。`,
      };
    }
    return { ok: true, reason: "" };
  }

  /** 当前持仓数量、含费成本、加权买入价（不含现价行） */
  function positionLotStats(product) {
    recalcProduct(product);
    let qty = 0;
    let cost = 0;
    let buyNotional = 0;
    for (const row of holdingRows(product)) {
      const q = parseNumber(row.qty);
      const t = parseNumber(row.total);
      const p = parseNumber(row.price);
      if (q != null && q > 0) {
        qty += q;
        if (p != null) buyNotional += p * q;
      }
      if (t != null) cost += t;
    }
    const avgPrice = qty > 0 && buyNotional > 0 ? buyNotional / qty : null;
    return { qty, cost, avgPrice };
  }

  /** 按清仓价估算整仓收益（扣卖出费用）；收益率=收益/含费总成本 */
  function clearOutEstimate(product, sellPrice) {
    const lot = positionLotStats(product);
    if (!(lot.qty > 0) || !(lot.cost > 0) || !(sellPrice > 0)) return null;
    const sellAmt = sellPrice * lot.qty;
    const net = sellAmt - tradeFee(sellAmt, { sell: true });
    const profit = net - lot.cost;
    const profitPct = (profit / lot.cost) * 100;
    let priceGainPct = null;
    if (lot.avgPrice != null && lot.avgPrice > 0) {
      priceGainPct = ((sellPrice - lot.avgPrice) / lot.avgPrice) * 100;
    }
    return {
      qty: lot.qty,
      cost: lot.cost,
      avgPrice: lot.avgPrice,
      sellPrice,
      profit,
      profitPct,
      priceGainPct,
      // 成交收益率按成本收益率，不再用裸价差涨幅
      gainPct: profitPct,
    };
  }

  function formatClearOutPreview(product, sellPrice) {
    const est = clearOutEstimate(product, sellPrice);
    if (!est) return { text: "请输入有效清仓价以计算收益", tone: "" };
    const avg =
      est.avgPrice != null ? fmtPrice(est.avgPrice) : "—";
    const yieldPct =
      est.profitPct == null ? "—" : `${fmtPct(est.profitPct)}%`;
    return {
      text: `持仓 ${Math.round(est.qty)}｜成本 ${fmtMoney(
        est.cost
      )}｜均买 ${avg} → 清仓 ${fmtPrice(est.sellPrice)}｜${SETTLED_PROFIT_LABEL} ${fmtProfit(
        est.profit
      )}（${yieldPct}）`,
      tone: est.profit < 0 ? "is-minus" : "is-plus",
      estimate: est,
    };
  }

  function defaultClearOutPrice(product) {
    recalcProduct(product);
    const entry = entryBuyPrice(product);
    if (entry != null && entry > 0) return fmtPrice(entry);
    return "";
  }

  /**
   * 按输入清仓价一次性清仓：成交历史只记一条「清仓」，
   * 收益按整仓清仓价扣除卖出费用后减总成本。
   */
  function clearOutAll(product, sellPrice) {
    const est = clearOutEstimate(product, sellPrice);
    if (!est) return false;
    ensureRoundCostBase(product);
    const priorSettled = settledProfit(product);
    const retained = retainedProfitOf(product);
    const roundCum =
      (priorSettled == null ? 0 : priorSettled) + retained + est.profit;
    // 成交收益率 = 清仓收益 / 整仓含费总成本（不是建仓成本，也不是裸价差涨幅）
    const clearYieldPct = est.profitPct;

    if (!Array.isArray(product.history)) product.history = [];
    product.history.push({
      id: newHistoryId(),
      at: Date.now(),
      op: "清仓",
      kind: "clear",
      price: est.avgPrice != null ? fmtPrice(est.avgPrice) : "",
      qty: String(Math.round(est.qty)),
      sell: fmtPrice(est.sellPrice),
      profit: fmtProfit(est.profit),
      gainPct: clearYieldPct == null ? "—" : `${fmtPct(clearYieldPct)}%`,
      lossPct: "—",
      cumulative: roundCum,
      cumulativePct: clearYieldPct,
    });

    product.rows = [emptyRowState(DEFAULT_ROWS[0])];
    product.markPrice = "";
    product.realizedProfit = 0;
    product.realizedAny = false;
    clearRetainedProfit(product);
    clearRoundCostBase(product);
    recalcProduct(product);
    return true;
  }

  /** 成交：写入历史并从价格表删除该行；清仓记入历史并附带本轮累计，随后清零 */
  function settleDealRow(product, rowIndex) {
    const row = product.rows[rowIndex];
    if (!row) return false;
    const settleSell = parseNumber(row.sell);
    if (settleSell != null) product.markPrice = fmtPrice(settleSell);
    const isClearOut = onlyEntryLeft(product) && isEntry(row.op);
    row.done = true;
    recalcProduct(product);
    const costBase = isClearOut ? roundCostBaseOf(product) : null;
    if (isClearOut) {
      pushDealHistory(product, row, { op: "清仓", kind: "clear" });
      const rounds = splitHistoryRounds(product.history);
      const lastRound = rounds[rounds.length - 1] || [];
      const { sum: cum, any } = sumDealProfits(lastRound);
      const last = product.history[product.history.length - 1];
      if (last && any) {
        last.cumulative = cum;
        last.cumulativePct =
          costBase != null && costBase > 0 ? (cum / costBase) * 100 : null;
      }
      product.realizedProfit = 0;
      product.realizedAny = false;
      clearRetainedProfit(product);
      clearRoundCostBase(product);
    } else {
      pushDealHistory(product, row);
    }
    product.rows.splice(rowIndex, 1);
    ensureEntryRow(product);
    renumberRestocks(product);
    for (const r of product.rows) r.done = false;
    recalcProduct(product);
    return true;
  }

  function prefersReducedMotion() {
    return (
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function requestSettleSkip() {
    settleAbort = true;
    if (settleSkipResolve) {
      const fn = settleSkipResolve;
      settleSkipResolve = null;
      fn();
    }
  }

  function setSkipSettleVisible(show) {
    if (!els.skipSettle) return;
    els.skipSettle.hidden = !show;
  }

  async function waitOrSkip(ms) {
    if (settleAbort) return;
    if (prefersReducedMotion()) {
      await sleep(Math.min(ms, 100));
      return;
    }
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (settleSkipResolve === resolve) settleSkipResolve = null;
        resolve();
      }, ms);
      settleSkipResolve = () => {
        clearTimeout(timer);
        settleSkipResolve = null;
        resolve();
      };
    });
  }

  async function flyRowToHistory(tr, section) {
    const history = section.querySelector(".deal-history");
    const target = history?.querySelector("summary") || history;
    if (!target) return;
    if (settleAbort || prefersReducedMotion()) {
      history.scrollIntoView({ block: "nearest" });
      return;
    }
    history.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const from = tr.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const srcCells = tr.children;
    const table = document.createElement("table");
    table.className = "deal-fly-ghost sheet";
    const tbody = document.createElement("tbody");
    const ghostRow = tr.cloneNode(true);
    ghostRow.classList.remove("is-deal-flying", "is-settling");
    const ghostCells = ghostRow.children;
    for (let i = 0; i < srcCells.length && i < ghostCells.length; i++) {
      ghostCells[i].style.width = `${srcCells[i].getBoundingClientRect().width}px`;
    }
    ghostRow.querySelectorAll("input, button").forEach((el) => {
      el.disabled = true;
      el.tabIndex = -1;
    });
    tbody.appendChild(ghostRow);
    table.appendChild(tbody);
    Object.assign(table.style, {
      width: `${from.width}px`,
      height: `${from.height}px`,
      left: `${from.left}px`,
      top: `${from.top}px`,
    });
    document.body.appendChild(table);
    tr.classList.add("is-deal-flying");

    const dx = to.left + to.width * 0.72 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const midX = dx * 0.45;
    const midY = dy * 0.35 - Math.min(90, Math.abs(dy) * 0.25 + 48);

    const anim = table.animate(
      [
        {
          transform: "translate(0px, 0px) scale(1) rotate(0deg)",
          opacity: 1,
          offset: 0,
        },
        {
          transform: `translate(${midX}px, ${midY}px) scale(0.78) rotate(-2deg)`,
          opacity: 0.92,
          offset: 0.42,
        },
        {
          transform: `translate(${dx}px, ${dy}px) scale(0.22) rotate(4deg)`,
          opacity: 0.08,
          offset: 1,
        },
      ],
      {
        duration: 520,
        easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        fill: "forwards",
      }
    );
    await Promise.race([
      anim.finished.catch(() => {}),
      waitOrSkip(520),
    ]);
    try {
      anim.cancel();
    } catch {
      /* ignore */
    }
    table.remove();
  }

  async function animateAndSettleDeal(section, product, pi, ri) {
    const key = `${product.id}:${ri}`;
    if (settlingKeys.has(key)) return;
    settlingKeys.add(key);
    settleAbort = false;
    const tr = section.querySelector(`tr[data-row="${ri}"]`);
    if (!tr || !product.rows[ri] || !canSettleRow(product.rows[ri])) {
      settlingKeys.delete(key);
      return;
    }
    tr.classList.add("is-settling");
    section.classList.add("is-settling-product");
    document.getElementById("trading-calc")?.classList.add("is-settling-app");
    setSkipSettleVisible(true);
    const doneInputs = [...tr.querySelectorAll(".done-input")];
    doneInputs.forEach((el) => {
      el.checked = true;
      el.disabled = true;
      el.classList.remove("is-checked-ok");
      void el.offsetWidth;
      el.classList.add("is-checked-ok");
      el.closest(".done-check")?.classList.add("is-on");
    });
    try {
      await waitOrSkip(prefersReducedMotion() ? 80 : 160);
      doneInputs.forEach((el) => el.classList.remove("is-checked-ok"));
      if (products[pi] !== product || !product.rows[ri]) return;
      if (!settleAbort) await flyRowToHistory(tr, section);
      if (products[pi] !== product || !product.rows[ri]) return;
      settleDealRow(product, ri);
      refreshProductDom(pi);
      const next = els.products.querySelector(`.product[data-index="${pi}"]`);
      const hist = next?.querySelector(".deal-history");
      if (hist) {
        hist.classList.add("is-deal-arrived");
        setTimeout(() => hist.classList.remove("is-deal-arrived"), 600);
      }
    } finally {
      setSkipSettleVisible(false);
      document
        .getElementById("trading-calc")
        ?.classList.remove("is-settling-app");
      settlingKeys.delete(key);
      settleAbort = false;
      settleSkipResolve = null;
    }
  }

  /** 旧存档：表内已勾选成交的行迁入历史并从表中移除 */
  function migrateDoneRowsToHistory(product) {
    if (!Array.isArray(product.history)) product.history = [];
    const hasDone = product.rows.some((r) => r.done);
    if (!hasDone) return;
    recalcProduct(product);
    const keep = [];
    for (const row of product.rows) {
      if (row.done) pushDealHistory(product, row);
      else keep.push(row);
    }
    product.rows = keep;
    ensureEntryRow(product);
    renumberRestocks(product);
    for (const r of product.rows) r.done = false;
    recalcProduct(product);
  }

  function profitDisplay(row) {
    return row.profit || "";
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
          sell: r.sell,
          done: !!r.done,
          priceManual: !!r.priceManual,
          sellManual: !!r.sellManual,
        })),
        history: Array.isArray(p.history)
          ? p.history.map((h) => {
              const item = {
                id: h.id,
                at: h.at,
                op: h.op,
                price: h.price,
                qty: h.qty,
                sell: h.sell,
                profit: h.profit,
                gainPct: h.gainPct,
                lossPct: h.lossPct,
              };
              if (h.kind === "clear" || h.op === "清仓") item.kind = "clear";
              if (
                typeof h.cumulative === "number" &&
                Number.isFinite(h.cumulative)
              ) {
                item.cumulative = h.cumulative;
              }
              if (
                typeof h.cumulativePct === "number" &&
                Number.isFinite(h.cumulativePct)
              ) {
                item.cumulativePct = h.cumulativePct;
              }
              return item;
            })
          : [],
        realizedProfit:
          typeof p.realizedProfit === "number" && Number.isFinite(p.realizedProfit)
            ? p.realizedProfit
            : 0,
        realizedAny: !!p.realizedAny,
        retainedProfit:
          typeof p.retainedProfit === "number" && Number.isFinite(p.retainedProfit)
            ? p.retainedProfit
            : 0,
        retainedAny: !!p.retainedAny,
        roundCostBase:
          typeof p.roundCostBase === "number" &&
          Number.isFinite(p.roundCostBase) &&
          p.roundCostBase > 0
            ? p.roundCostBase
            : null,
        budget: p.budget == null || p.budget === "" ? "" : String(p.budget),
        markPrice:
          p.markPrice == null || p.markPrice === "" ? "" : String(p.markPrice),
      })),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      const quota =
        err &&
        (err.name === "QuotaExceededError" ||
          err.code === 22 ||
          err.code === 1014);
      if (quota) {
        console.warn("trading-calc save quota exceeded");
        showToast("本地存储空间不足，请导出数据备份后清理浏览器缓存");
      }
    }
  }

  let toastTimer = 0;
  function showToast(message) {
    let el = document.getElementById("tc-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "tc-toast";
      el.className = "tc-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 3200);
  }

  function buildBackupPayload() {
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      products: products.map((p) => ({
        product_name: p.name,
        rows: p.rows.map((r) => ({
          op: r.op,
          price: r.price,
          qty: r.qty,
          sell: r.sell,
          done: !!r.done,
          priceManual: !!r.priceManual,
          sellManual: !!r.sellManual,
        })),
        history: Array.isArray(p.history) ? p.history : [],
        realizedProfit: p.realizedProfit,
        realizedAny: !!p.realizedAny,
        retainedProfit: p.retainedProfit,
        retainedAny: !!p.retainedAny,
        roundCostBase: p.roundCostBase,
        budget: p.budget,
        markPrice: p.markPrice,
      })),
    };
  }

  function exportDataJson() {
    const payload = buildBackupPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safeFilename(
      `${EXPORT_BASENAME}-backup-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast("数据已导出");
  }

  function importDataJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ""));
        const list = Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
            ? data
            : null;
        if (!list?.length) {
          alert("无效的备份文件：缺少 products");
          return;
        }
        products = list
          .slice(0, MAX_PRODUCTS)
          .map((p, i) => makeProduct(i, p));
        products.forEach(migrateDoneRowsToHistory);
        renderAll();
        scheduleSave();
        showToast("数据已导入");
      } catch (err) {
        alert(`导入失败：${err?.message || err}`);
      }
    };
    reader.onerror = () => alert("读取文件失败");
    reader.readAsText(file);
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
  }

  function stepperHtml({ value, editable, kind }) {
    const disabled = editable ? "" : "disabled";
    const roClass = editable ? "" : " is-readonly";
    return `<div class="stepper${roClass}" data-kind="${kind}">
      <button type="button" class="step-btn" data-dir="-1" ${disabled} aria-label="减少">−</button>
      <input class="step-val" type="text" inputmode="decimal" value="${escapeAttr(
        value
      )}" ${disabled} />
      <button type="button" class="step-btn" data-dir="1" ${disabled} aria-label="增加">+</button>
    </div>`;
  }

  function pctCellHtml(text, tone, colClass, label) {
    return `<td class="ro pct-cell ${colClass} ${tone}" data-label="${label}">${escapeHtml(
      text || "—"
    )}</td>`;
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
    const expectedText = formatExpectedMetric();
    let expectedClass = "metric expected";
    if (hasExpectedTarget(product)) expectedClass += " is-plus";
    const cumulativeText = formatCumulativeMetric(product);
    const cumulativeClass = cumulativeMetricClass(product);
    const pos = positionStats(product);
    const cost = costStats(product);
    const drop = dropStats(product);
    const budget = budgetStats(product);
    const nextPreview = formatNextRestockPreview(product);
    const guard = restockGuard(product);
    const clearGuard = clearOutGuard(product);
    const placeholder =
      product.name.trim() === defaultName(index) ? " is-placeholder" : "";

    const settleLabel = settleActionLabel(product);
    const body = product.rows
      .map((row, ri) => {
        if (isMark(row.op)) return "";
        const shown = profitDisplay(row);
        const profitNum = parseNumber(row.profit);
        let profitTone = " is-pending";
        if (profitNum != null) {
          profitTone = profitNum < 0 ? " is-minus" : " is-plus";
        }
        return `<tr data-row="${ri}">
          <td class="op ${COL_CLASS[COL.OP]}" data-label="${COL_LABELS[COL.OP]}">${escapeHtml(row.op)}</td>
          ${pctCellHtml(row.lossPct, row.lossTone || "", COL_CLASS[COL.LOSS], COL_LABELS[COL.LOSS])}
          <td class="${COL_CLASS[COL.PRICE]}" data-label="${COL_LABELS[COL.PRICE]}">${stepperHtml({
            value: row.price,
            editable: true,
            kind: "price",
          })}</td>
          <td class="${COL_CLASS[COL.QTY]}" data-label="${COL_LABELS[COL.QTY]}">${stepperHtml({
            value: row.qty,
            editable: true,
            kind: "qty",
          })}</td>
          <td class="ro ${COL_CLASS[COL.TOTAL]}" data-label="${COL_LABELS[COL.TOTAL]}">${escapeHtml(row.total)}</td>
          ${pctCellHtml(row.gainPct, row.gainTone || "", COL_CLASS[COL.GAIN], COL_LABELS[COL.GAIN])}
          <td class="${COL_CLASS[COL.SELL]}" data-label="${COL_LABELS[COL.SELL]}">${stepperHtml({
            value: row.sell,
            editable: true,
            kind: "sell",
          })}</td>
          <td class="ro ${COL_CLASS[COL.PROFIT]}${profitTone}" data-label="${COL_LABELS[COL.PROFIT]}">${escapeHtml(shown)}</td>
          <td class="${COL_CLASS[COL.DONE]}" data-label="${escapeAttr(settleLabel)}">
            <label class="done-check${canSettleRow(row) ? "" : " is-disabled"}">
              <input type="checkbox" class="done-input" aria-label="${escapeAttr(
                settleLabel + "并移入历史"
              )}"${canSettleRow(row) ? "" : " disabled"} />
              <span class="done-mark" aria-hidden="true"></span>
            </label>
          </td>
        </tr>`;
      })
      .join("");

    const markDrop = markPriceDropInfo(product);
    return `<section class="product" data-id="${product.id}" data-index="${index}">
      <div class="wm-anchor" aria-hidden="true">
        <div class="wm-stack">
          <span class="wm-line wm-1">${WM_LINE_1}</span>
          <span class="wm-line wm-2">${WM_LINE_2}</span>
        </div>
      </div>
      <div class="product-head">
        <div class="name-cluster">
          <div class="title-row">
            <input class="name-input${placeholder}" type="text" maxlength="32"
              value="${escapeAttr(product.name)}" aria-label="商品名称" />
            <span class="title-suffix">${TITLE_SUFFIX}</span>
          </div>
          <label class="mark-price-label">
            <span class="mark-price-caption">当前价格</span>
            <input class="mark-price-input" type="text" inputmode="decimal"
              value="${escapeAttr(product.markPrice || "")}"
              placeholder="0.00" aria-label="当前价格" />
            <span class="mark-price-drop${markDrop.tone ? ` ${markDrop.tone}` : ""}"${
              markDrop.text ? "" : " hidden"
            }>${escapeHtml(markDrop.text)}</span>
          </label>
        </div>
        <div class="product-metrics">
          <div class="metric-block">
            <div class="position-summary">${escapeHtml(pos.text)}</div>
            <div class="metric cost-summary">${escapeHtml(cost.text)}</div>
            <div class="drop-summary">${escapeHtml(drop.text)}</div>
          </div>
          <div class="metric-block metric-block-focus">
            <div class="${expectedClass}">${escapeHtml(expectedText)}</div>
            <div class="${cumulativeClass}">${escapeHtml(cumulativeText)}</div>
          </div>
        </div>
      </div>
      <div class="budget-bar">
        <label class="budget-label">
          <span class="budget-caption">总预算</span>
          <input class="budget-input" type="text" inputmode="decimal"
            value="${escapeAttr(product.budget || DEFAULT_BUDGET)}"
            placeholder="${DEFAULT_BUDGET}" aria-label="总预算金额" />
        </label>
        <div class="budget-summary${budget.tone ? ` ${budget.tone}` : ""}">${escapeHtml(budget.text)}</div>
      </div>
      <p class="col-legend" aria-hidden="true">
        <span class="lg-buy">买入侧（含下跌）</span>
        <span class="lg-sell">卖出侧（含上涨）</span>
        <span class="lg-profit">收益</span>
      </p>
      <div class="table-wrap">
        <table class="sheet">
          <colgroup>
            <col class="col-op" />
            <col class="col-loss" />
            <col class="col-buy" />
            <col class="col-qty" />
            <col class="col-total" />
            <col class="col-gain" />
            <col class="col-sell" />
            <col class="col-profit" />
            <col class="col-done" />
          </colgroup>
          <thead>
            <tr class="group-row">
              <th rowspan="2" class="${COL_CLASS[COL.OP]}">操作</th>
              <th colspan="4" class="grp-buy">买入侧</th>
              <th colspan="4" class="grp-sell">卖出侧</th>
            </tr>
            <tr class="sub-row">
              <th class="${COL_CLASS[COL.LOSS]}">下跌</th>
              <th class="${COL_CLASS[COL.PRICE]}">买入</th>
              <th class="${COL_CLASS[COL.QTY]}">数量</th>
              <th class="${COL_CLASS[COL.TOTAL]}">金额</th>
              <th class="${COL_CLASS[COL.GAIN]}">上涨</th>
              <th class="${COL_CLASS[COL.SELL]}">卖出</th>
              <th class="${COL_CLASS[COL.PROFIT]}">收益</th>
              <th class="${COL_CLASS[COL.DONE]}">${escapeHtml(settleLabel)}</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <div class="restock-toolbar">
        <button type="button" class="tool-btn btn-add-restock"${
          guard.ok ? "" : " disabled"
        } title="${escapeAttr(
          guard.ok ? "在表格底部追加一档补仓" : guard.reason
        )}">补仓</button>
        <button type="button" class="tool-btn btn-del-restock"${
          canDelRestock(product) ? "" : " disabled"
        } title="${escapeAttr(delRestockLabel(product))}">删补仓</button>
        <button type="button" class="tool-btn tool-btn-danger btn-clear-out"${
          clearGuard.ok ? "" : " disabled"
        } title="${escapeAttr(
          clearGuard.ok
            ? "输入清仓价，整仓一次清仓（历史只记一条）"
            : clearGuard.reason
        )}">一键清仓</button>
        <button type="button" class="tool-btn btn-del-product"${
          products.length <= 1 ? " disabled" : ""
        } title="${
          products.length <= 1 ? "至少保留 1 个商品" : "删除当前商品"
        }">删除商品</button>
        <span class="restock-preview">${escapeHtml(nextPreview)}</span>
      </div>
      <p class="restock-hint"${guard.ok ? " hidden" : ""}>${escapeHtml(
        guard.reason
      )}</p>
      ${historyHtml(product)}
    </section>`;
  }

  function updateRestockToolbar(section, product) {
    const addBtn = section.querySelector(".btn-add-restock");
    const delBtn = section.querySelector(".btn-del-restock");
    const clearOutBtn = section.querySelector(".btn-clear-out");
    const hint = section.querySelector(".restock-hint");
    const preview = section.querySelector(".restock-preview");
    const guard = restockGuard(product);
    const clearGuard = clearOutGuard(product);
    if (addBtn) {
      addBtn.disabled = !guard.ok;
      addBtn.title = guard.ok ? "在表格底部追加一档补仓" : guard.reason;
    }
    if (delBtn) {
      const canDel = canDelRestock(product);
      delBtn.disabled = !canDel;
      delBtn.title = delRestockLabel(product);
    }
    if (clearOutBtn) {
      clearOutBtn.disabled = !clearGuard.ok;
      clearOutBtn.title = clearGuard.ok
        ? "输入清仓价，整仓一次清仓（历史只记一条）"
        : clearGuard.reason;
    }
    if (hint) {
      hint.textContent = guard.reason;
      hint.hidden = guard.ok;
    }
    if (preview) preview.textContent = formatNextRestockPreview(product);
  }

  function updatePosition(section, product) {
    const el = section.querySelector(".position-summary");
    if (!el) return;
    el.textContent = positionStats(product).text;
  }

  function updateTradeInsights(section, product) {
    updatePosition(section, product);
    const costEl = section.querySelector(".cost-summary");
    if (costEl) costEl.textContent = costStats(product).text;
    const dropEl = section.querySelector(".drop-summary");
    if (dropEl) dropEl.textContent = dropStats(product).text;
    const budget = budgetStats(product);
    const budgetEl = section.querySelector(".budget-summary");
    if (budgetEl) {
      budgetEl.classList.remove("is-plus", "is-minus", "is-warn");
      budgetEl.textContent = budget.text;
      if (budget.tone) budgetEl.classList.add(budget.tone);
    }
    updateRestockToolbar(section, product);
  }

  function fitProductWatermark(section) {
    const stack = section?.querySelector?.(".wm-stack");
    if (!stack) return;
    const w = section.clientWidth;
    const h = section.clientHeight;
    if (w < 40 || h < 40) return;

    let lo = 28;
    let hi = Math.max(w, h) * 1.45;
    let best = 48;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      section.style.setProperty("--wm-size", `${mid}px`);
      const r = stack.getBoundingClientRect();
      if (r.width <= w * 0.97 && r.height <= h * 0.94) {
        best = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    section.style.setProperty("--wm-size", `${Math.floor(best)}px`);
  }

  function fitAllWatermarks() {
    els.products?.querySelectorAll?.(".product").forEach(fitProductWatermark);
  }

  let wmResizeObserver = null;
  function observeProductWatermarks() {
    fitAllWatermarks();
    if (typeof ResizeObserver === "undefined") return;
    if (!wmResizeObserver) {
      let raf = 0;
      wmResizeObserver = new ResizeObserver(() => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          raf = 0;
          fitAllWatermarks();
        });
      });
    }
    wmResizeObserver.disconnect();
    els.products.querySelectorAll(".product").forEach((section) => {
      wmResizeObserver.observe(section);
    });
  }

  function renderAll() {
    products.forEach((p) => recalcProduct(p));
    els.products.innerHTML = products
      .map((p, i) => renderProduct(p, i))
      .join("");
    updateToolbar();
    updateTitle();
    observeProductWatermarks();
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
    observeProductWatermarks();
  }

  function productIndexFromEl(el) {
    const section = el.closest(".product");
    if (!section) return -1;
    return Number(section.dataset.index);
  }

  function applyStep(kind, row, dir) {
    if (kind === "price") {
      let cur = parseNumber(row.price);
      if (cur == null) cur = 0;
      row.price = fmtPrice(Math.max(0, cur + dir * PRICE_STEP));
      row.priceManual = true;
    } else if (kind === "qty") {
      let cur = parseNumber(row.qty);
      if (cur == null) cur = 0;
      const base = ceilQty(cur);
      row.qty = String(Math.max(0, base + dir * QTY_STEP));
    } else if (kind === "sell") {
      let cur = parseNumber(row.sell);
      if (cur == null) cur = 0;
      row.sell = fmtPrice(Math.max(0, cur + dir * PRICE_STEP));
      row.sellManual = true;
    }
  }

  function onProductsClick(e) {
    const delProductBtn = e.target.closest(".btn-del-product");
    if (delProductBtn) {
      if (delProductBtn.disabled) return;
      const section = delProductBtn.closest(".product");
      if (!section) return;
      delProductAt(Number(section.dataset.index));
      return;
    }

    const clearHistoryBtn = e.target.closest(".btn-clear-history");
    if (clearHistoryBtn) {
      if (clearHistoryBtn.disabled) return;
      const section = clearHistoryBtn.closest(".product");
      if (!section) return;
      openClearHistoryModal(Number(section.dataset.index));
      return;
    }

    const clearOutBtn = e.target.closest(".btn-clear-out");
    if (clearOutBtn) {
      if (clearOutBtn.disabled) return;
      const section = clearOutBtn.closest(".product");
      if (!section) return;
      openClearOutModal(Number(section.dataset.index));
      return;
    }

    const restockBtn = e.target.closest(".btn-add-restock, .btn-del-restock");
    if (restockBtn) {
      if (restockBtn.disabled) return;
      const section = restockBtn.closest(".product");
      if (!section) return;
      const pi = Number(section.dataset.index);
      const product = products[pi];
      if (!product) return;
      if (restockBtn.classList.contains("btn-add-restock")) {
        const guard = restockGuard(product);
        if (!guard.ok) {
          alert(guard.reason);
          updateRestockToolbar(section, product);
          return;
        }
        addRestockRow(product);
        refreshProductDom(pi);
        scheduleSave();
        return;
      }
      const info = lastRestockInfo(product);
      if (!info) {
        updateRestockToolbar(section, product);
        return;
      }
      // 末档已填买入/卖出价时先确认，避免误删
      if (restockRowHasUserData(info.row)) {
        const tr = section.querySelector(`tr[data-row="${info.index}"]`);
        tr?.classList.add("is-del-restock-target");
        openConfirmModal({
          title: "删除补仓",
          message: `确定删除末档「${info.row.op}」？已填写的价格会一并移除。`,
          confirmLabel: "删除",
          action: { type: "del-restock", index: pi },
        });
        return;
      }
      if (!delRestockRow(product)) return;
      refreshProductDom(pi);
      scheduleSave();
      return;
    }

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
    if (!product || !product.rows[ri] || product.rows[ri].done) return;
    applyStep(kind, product.rows[ri], dir);
    if (kind === "qty" && isEntry(product.rows[ri].op)) {
      syncRestockQtyFromEntry(product);
    }
    recalcProduct(product);
    syncReadonlyCells(section, product);
    updateExpected(section, product);
    updateTitle();
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

    if (t.classList.contains("budget-input")) {
      product.budget = t.value.trim();
      updateTradeInsights(section, product);
      scheduleSave();
      return;
    }

    if (t.classList.contains("mark-price-input")) {
      product.markPrice = t.value.trim();
      syncMarkPriceDropEl(section, product);
      updateExpected(section, product);
      scheduleSave();
      return;
    }

    if (t.classList.contains("done-input")) {
      if (!t.checked) return;
      const tr = t.closest("tr");
      if (!tr) return;
      const ri = Number(tr.dataset.row);
      const row = product.rows[ri];
      t.checked = false;
      if (!row) return;
      if (!canSettleRow(row) || section.classList.contains("is-settling-product")) {
        t.disabled = !canSettleRow(row);
        return;
      }
      openSettleModal(pi, ri);
      return;
    }

    if (!t.classList.contains("step-val")) return;
    const tr = t.closest("tr");
    const stepper = t.closest(".stepper");
    if (!tr || !stepper) return;
    const ri = Number(tr.dataset.row);
    const row = product.rows[ri];
    if (!row || row.done) return;
    const kind = stepper.dataset.kind;
    if (kind === "price") {
      row.price = t.value;
      row.priceManual = true;
    } else if (kind === "qty") {
      row.qty = t.value;
      if (isEntry(row.op)) syncRestockQtyFromEntry(product);
    } else if (kind === "sell") {
      row.sell = t.value;
      row.sellManual = true;
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
      const active = document.activeElement;

      const priceInput = cells[COL.PRICE].querySelector(".step-val");
      if (priceInput && active !== priceInput) {
        priceInput.value = row.price;
      }

      const lossCell = cells[COL.LOSS];
      lossCell.textContent = row.lossPct || "—";
      lossCell.classList.remove("is-plus", "is-minus");
      if (row.lossTone) lossCell.classList.add(row.lossTone);

      const qtyInput = cells[COL.QTY].querySelector(".step-val");
      if (qtyInput && active !== qtyInput) {
        qtyInput.value = row.qty;
      }

      cells[COL.TOTAL].textContent = row.total;

      const sellInput = cells[COL.SELL].querySelector(".step-val");
      if (sellInput && active !== sellInput) {
        sellInput.value = row.sell;
      }

      const gainCell = cells[COL.GAIN];
      gainCell.textContent = row.gainPct || "—";
      gainCell.classList.remove("is-plus", "is-minus");
      if (row.gainTone) gainCell.classList.add(row.gainTone);

      syncProfitCell(tr, row);
      syncDoneInput(tr, row);
    });
  }

  function syncDoneInput(tr, row) {
    const input = tr.querySelector(".done-input");
    const label = tr.querySelector(".done-check");
    if (!input) return;
    const ok = canSettleRow(row);
    const settling = tr.classList.contains("is-settling");
    input.disabled = !ok || settling;
    if (!ok) {
      input.checked = false;
      label?.classList.remove("is-on");
    }
    label?.classList.toggle("is-disabled", !ok);
    label?.classList.toggle("is-on", !!input.checked);
  }

  function syncProfitCell(tr, row) {
    const cells = tr.children;
    const profitCell = cells[COL.PROFIT];
    if (!profitCell) return;
    profitCell.textContent = profitDisplay(row);
    profitCell.classList.remove("is-plus", "is-minus", "is-pending", "is-masked");
    const profitNum = parseNumber(row.profit);
    if (profitNum != null) {
      profitCell.classList.add(profitNum < 0 ? "is-minus" : "is-plus");
    } else {
      profitCell.classList.add("is-pending");
    }
  }

  function setMetricEl(el, label, value) {
    if (!el) return;
    el.classList.remove("is-plus", "is-minus");
    if (value == null) {
      el.textContent = `${label}：—`;
      return;
    }
    el.textContent = `${label}：${fmtMoney(value)}`;
    el.classList.add(value < 0 ? "is-minus" : "is-plus");
  }

  function updateMetrics(section, product) {
    const expectedEl = section.querySelector(".expected");
    if (expectedEl) {
      expectedEl.classList.remove("is-plus", "is-minus");
      expectedEl.textContent = formatExpectedMetric();
      if (hasExpectedTarget(product)) expectedEl.classList.add("is-plus");
    }
    const sum = cumulativeProfit(product);
    const cumulativeText = formatCumulativeMetric(product);
    const cumulativeEl = section.querySelector(".cumulative");
    if (cumulativeEl) {
      cumulativeEl.classList.remove("is-plus", "is-minus");
      cumulativeEl.textContent = cumulativeText;
      if (sum != null) {
        cumulativeEl.classList.add(sum < 0 ? "is-minus" : "is-plus");
      }
    }
    const histSum = settledProfit(product);
    const histSumEl = section.querySelector(".deal-history-sum");
    if (histSumEl) {
      histSumEl.classList.remove("is-plus", "is-minus");
      histSumEl.textContent = formatCumulativeMetric(
        product,
        SETTLED_PROFIT_LABEL
      );
      if (histSum != null) {
        histSumEl.classList.add(histSum < 0 ? "is-minus" : "is-plus");
      }
    }
    updateTradeInsights(section, product);
  }

  function updateExpected(section, product) {
    updateMetrics(section, product);
  }

  function isZeroPriceText(text) {
    const n = parseNumber(text);
    return n != null && Math.abs(n) < 1e-12;
  }

  /** 买入/卖出价：聚焦时清掉 0 / 0.00 占位，方便直接输入 */
  function onProductsFocusIn(e) {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || !t.classList.contains("step-val")) {
      return;
    }
    const stepper = t.closest(".stepper");
    const kind = stepper?.dataset.kind;
    if (!stepper || (kind !== "price" && kind !== "sell")) return;
    if (t.disabled) return;
    if (isZeroPriceText(t.value)) {
      t.value = "";
    } else if (kind === "sell" || kind === "price") {
      t.select();
    }
  }

  function onProductsFocusOut(e) {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    const section = t.closest(".product");
    if (!section) return;
    const pi = Number(section.dataset.index);
    const product = products[pi];
    if (!product) return;

    if (t.classList.contains("mark-price-input")) {
      const raw = parseNumber(t.value);
      product.markPrice = raw == null ? "" : fmtPrice(raw);
      t.value = product.markPrice;
      syncMarkPriceDropEl(section, product);
      updateExpected(section, product);
      scheduleSave();
      return;
    }

    if (!t.classList.contains("step-val")) return;
    const tr = t.closest("tr");
    const stepper = t.closest(".stepper");
    if (!tr || !stepper) return;
    const ri = Number(tr.dataset.row);
    const row = product.rows[ri];
    if (!row || row.done) return;
    const kind = stepper.dataset.kind;
    if (kind === "price") {
      const raw = parseNumber(t.value);
      // 全部清空保存时显示 0.00
      row.price = raw == null ? PRICE_ZERO : fmtPrice(raw);
      row.priceManual = true;
    } else if (kind === "qty") {
      const raw = parseNumber(t.value);
      row.qty = raw == null ? "" : String(ceilQty(raw));
      if (isEntry(row.op)) syncRestockQtyFromEntry(product);
    } else if (kind === "sell") {
      const raw = parseNumber(t.value);
      row.sell = raw == null ? "" : fmtPrice(raw);
      row.sellManual = true;
    }
    recalcProduct(product);
    syncReadonlyCells(section, product);
    if (kind === "price" || kind === "sell") {
      t.value = row[kind] || "";
    } else if (kind === "qty") {
      t.value = row.qty || "";
    }
    syncMarkPriceDropEl(section, product);
    updateExpected(section, product);
    updateTitle();
    scheduleSave();
  }

  function onProductsKeyDown(e) {
    if (e.key !== "Enter") return;
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (
      t.classList.contains("step-val") ||
      t.classList.contains("name-input") ||
      t.classList.contains("budget-input") ||
      t.classList.contains("mark-price-input")
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

  function setClearOutExtraVisible(show) {
    if (els.delExtra) els.delExtra.hidden = !show;
    if (!show) {
      if (els.clearPrice) els.clearPrice.value = "";
      if (els.clearPreview) {
        els.clearPreview.textContent = "";
        els.clearPreview.classList.remove("is-plus", "is-minus");
      }
    }
  }

  function refreshClearOutPreview() {
    const action = pendingConfirm;
    if (action?.type !== "clear-out") return;
    const product = products[action.index];
    if (!product || !els.clearPreview) return;
    const price = parseNumber(els.clearPrice?.value);
    const preview = formatClearOutPreview(product, price);
    els.clearPreview.textContent = preview.text;
    els.clearPreview.classList.remove("is-plus", "is-minus");
    if (preview.tone) els.clearPreview.classList.add(preview.tone);
    if (els.delConfirm) {
      els.delConfirm.disabled = !preview.estimate;
    }
  }

  function openConfirmModal({ title, message, confirmLabel, action }) {
    pendingConfirm = action;
    pendingDeleteIndex = -1;
    if (els.delTitle) els.delTitle.textContent = title;
    if (els.delMsg) els.delMsg.textContent = message;
    if (els.delConfirm) {
      els.delConfirm.textContent = confirmLabel || "确定";
      els.delConfirm.disabled = false;
    }
    const isClearOut = action?.type === "clear-out";
    setClearOutExtraVisible(isClearOut);
    if (els.delModal) {
      els.delModal.hidden = false;
      if (isClearOut && els.clearPrice) {
        els.clearPrice.focus();
        els.clearPrice.select();
      } else {
        els.delConfirm?.focus();
      }
    }
  }

  function closeDeleteModal() {
    pendingDeleteIndex = -1;
    pendingConfirm = null;
    setClearOutExtraVisible(false);
    if (els.delConfirm) els.delConfirm.disabled = false;
    if (els.delModal) els.delModal.hidden = true;
    document
      .querySelectorAll("tr.is-del-restock-target, tr.is-settle-target")
      .forEach((tr) =>
        tr.classList.remove("is-del-restock-target", "is-settle-target")
      );
  }

  function confirmModalAction() {
    const action = pendingConfirm;
    const delIndex = pendingDeleteIndex;
    const clearPriceRaw =
      action?.type === "clear-out" ? String(els.clearPrice?.value || "") : "";
    closeDeleteModal();
    if (action?.type === "clear-history") {
      const product = products[action.index];
      if (!product) return;
      absorbSettledIntoRetained(product);
      product.history = [];
      product.realizedProfit = 0;
      product.realizedAny = false;
      refreshProductDom(action.index);
      scheduleSave();
      return;
    }
    if (action?.type === "clear-out") {
      const product = products[action.index];
      if (!product) return;
      const guard = clearOutGuard(product);
      if (!guard.ok) {
        alert(guard.reason);
        return;
      }
      const sellPrice = parseNumber(clearPriceRaw);
      if (sellPrice == null || !(sellPrice > 0)) {
        alert("请输入有效的清仓价。");
        return;
      }
      if (!clearOutAll(product, sellPrice)) {
        alert("清仓失败，请检查持仓与清仓价。");
        return;
      }
      refreshProductDom(action.index);
      scheduleSave();
      showToast("已一键清仓");
      return;
    }
    if (action?.type === "settle") {
      const product = products[action.index];
      const section = els.products.querySelector(
        `.product[data-index="${action.index}"]`
      );
      const row = product?.rows[action.row];
      if (
        !product ||
        !section ||
        !row ||
        !canSettleRow(row) ||
        section.classList.contains("is-settling-product")
      ) {
        return;
      }
      animateAndSettleDeal(section, product, action.index, action.row).then(
        () => {
          scheduleSave();
        }
      );
      return;
    }
    if (action?.type === "del-restock") {
      const product = products[action.index];
      if (!product || !delRestockRow(product)) return;
      refreshProductDom(action.index);
      scheduleSave();
      return;
    }
    const index = action?.type === "del-product" ? action.index : delIndex;
    if (products.length <= 1) return;
    if (index == null || index < 0 || index >= products.length) return;
    products.splice(index, 1);
    renderAll();
    scheduleSave();
  }

  function delProductAt(index) {
    if (products.length <= 1) return;
    if (index < 0 || index >= products.length) return;
    const product = products[index];
    const name = product.name.trim() || defaultName(index);
    openConfirmModal({
      title: "删除商品",
      message: `确定删除「${name}」？删除后不可恢复。`,
      confirmLabel: "删除",
      action: { type: "del-product", index },
    });
  }

  function openSettleModal(index, rowIndex) {
    const product = products[index];
    const row = product?.rows[rowIndex];
    if (!product || !row || !canSettleRow(row)) return;
    const section = els.products.querySelector(
      `.product[data-index="${index}"]`
    );
    document
      .querySelectorAll("tr.is-settle-target")
      .forEach((tr) => tr.classList.remove("is-settle-target"));
    section
      ?.querySelector(`tr[data-row="${rowIndex}"]`)
      ?.classList.add("is-settle-target");
    const clearOut = onlyEntryLeft(product) && isEntry(row.op);
    const label = clearOut ? "清仓" : "成交";
    const profit = row.profit || "—";
    openConfirmModal({
      title: `确认已${label}`,
      message: `确定将「${row.op}」${label}？买 ${row.price || "—"} → 卖 ${
        row.sell || "—"
      } ×${row.qty || "—"}，收益 ${profit}。确认后记入成交历史并从价格表移除。`,
      confirmLabel: label,
      action: { type: "settle", index, row: rowIndex },
    });
  }

  function openClearHistoryModal(index) {
    if (index < 0 || index >= products.length) return;
    const product = products[index];
    if (!product.history?.length) return;
    const name = product.name.trim() || defaultName(index);
    openConfirmModal({
      title: "清空成交历史",
      message: `确定清空「${name}」的成交历史与${SETTLED_PROFIT_LABEL}？累计收益会保留。`,
      confirmLabel: "清空",
      action: { type: "clear-history", index },
    });
  }

  function openClearOutModal(index) {
    if (index < 0 || index >= products.length) return;
    const product = products[index];
    const guard = clearOutGuard(product);
    if (!guard.ok) {
      alert(guard.reason);
      return;
    }
    recalcProduct(product);
    const name = product.name.trim() || defaultName(index);
    const lot = positionLotStats(product);
    openConfirmModal({
      title: "确认一键清仓",
      message: `确定将「${name}」全部持仓 ${Math.round(
        lot.qty
      )} 股按下方清仓价一次性清仓？成交历史只记一条清仓记录，并开启新一轮。`,
      confirmLabel: "清仓",
      action: { type: "clear-out", index },
    });
    if (els.clearPrice) {
      els.clearPrice.value = defaultClearOutPrice(product);
      refreshClearOutPreview();
    }
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
        r.lossPct || "—",
        r.price,
        r.qty,
        r.total,
        r.gainPct || "—",
        r.sell,
        profitDisplay(r),
        "—",
      ]);
      const lossTones = p.rows.map((r) => r.lossTone || "");
      const gainTones = p.rows.map((r) => r.gainTone || "");
      const expected = expectedProfitRange(p);
      const cumulative = cumulativeProfit(p);
      const pos = positionStats(p);
      const parts = [];
      if (pos.sum != null) parts.push(pos.text);
      if (expected != null) parts.push(formatExpectedMetric());
      if (cumulative != null) parts.push(formatCumulativeMetric(p));
      const summary = parts.length ? parts.join("  ·  ") : null;
      const headers = HEADERS.slice();
      headers[COL.DONE] = settleActionLabel(p);
      return {
        title,
        headers,
        rows,
        lossTones,
        gainTones,
        summary,
        cumulative,
      };
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
      const num =
        typeof item.cumulative === "number" && Number.isFinite(item.cumulative)
          ? item.cumulative
          : null;
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
        } else if (rI > 0 && cI === COL.LOSS) {
          fill =
            item.lossTones?.[rI - 1] === "is-plus"
              ? `rgb(${PLUS_RGB.join(",")})`
              : `rgb(${MINUS_RGB.join(",")})`;
        } else if (rI > 0 && cI === COL.GAIN) {
          fill =
            item.gainTones?.[rI - 1] === "is-minus"
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

    // Watermark constrained to left side through 成本 column
    const costRight =
      tableX +
      colW.slice(0, COL.TOTAL + 1).reduce((a, b) => a + b, 0);
    const wmFont = loadFont(Math.max(42, Math.floor(tableH * 0.22)), "700");
    ctx.save();
    ctx.beginPath();
    ctx.rect(tableX, y0, Math.max(0, costRight - tableX), tableH);
    ctx.clip();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#1e3a5f";
    ctx.font = wmFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const cx = tableX + (costRight - tableX) * 0.46;
    const cy = y0 + tableH / 2;
    ctx.translate(cx, cy);
    ctx.rotate((-18 * Math.PI) / 180);
    const gap = sizeFromFont(wmFont) * 1.15;
    ctx.fillText(WM_LINE_1, -gap * 0.55, -gap * 0.55);
    ctx.fillText(WM_LINE_2, gap * 0.15, gap * 0.55);
    ctx.restore();

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
      products.forEach(migrateDoneRowsToHistory);
    } else {
      products = [makeProduct(0)];
    }
    renderAll();

    els.btnAdd.addEventListener("click", addProduct);
    els.btnExport.addEventListener("click", () => {
      exportPng().catch((err) => alert(String(err?.message || err)));
    });
    els.btnExportData?.addEventListener("click", exportDataJson);
    els.btnImportData?.addEventListener("click", () => els.importFile?.click());
    els.importFile?.addEventListener("change", () => {
      const file = els.importFile.files?.[0];
      importDataJson(file);
      els.importFile.value = "";
    });
    els.skipSettle?.addEventListener("click", requestSettleSkip);
    els.products.addEventListener("click", onProductsClick);
    els.products.addEventListener("input", onProductsInput);
    els.products.addEventListener("change", onProductsInput);
    els.products.addEventListener("focusin", onProductsFocusIn);
    els.products.addEventListener("focusout", onProductsFocusOut);
    els.products.addEventListener("keydown", onProductsKeyDown);

    els.delConfirm?.addEventListener("click", confirmModalAction);
    els.delModal?.addEventListener("click", (e) => {
      if (e.target.closest("[data-tc-close]")) closeDeleteModal();
    });
    els.clearPrice?.addEventListener("input", refreshClearOutPreview);
    els.clearPrice?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (els.delConfirm && !els.delConfirm.disabled) confirmModalAction();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (els.skipSettle && !els.skipSettle.hidden) {
          requestSettleSkip();
          return;
        }
        if (els.delModal && !els.delModal.hidden) closeDeleteModal();
      }
    });
  }

  init();
})();
