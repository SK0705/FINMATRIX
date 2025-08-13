// ===== Utility =====
const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));
const fmt = (n, cur) => (isNaN(n) ? "" : `${cur}${Number(n).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`);
const parseNum = (v) => {
  if (v === null || v === undefined) return 0;
  const s = String(v).replace(/[, ]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

// ===== Classification dictionaries =====
const CLASSES = [
  "Trading - Sales",
  "Trading - Purchases",
  "Trading - Opening Stock",
  "Trading - Closing Stock",
  "Trading - Direct Expense",
  "P&L - Indirect Expense",
  "P&L - Income",
  "Ignore"
];

const SUBTYPES = {
  "Trading - Sales": ["Sales", "Sales Returns (contra)"],
  "Trading - Purchases": ["Purchases", "Purchase Returns (contra)"],
  "Trading - Opening Stock": ["Opening Stock"],
  "Trading - Closing Stock": ["Closing Stock"],
  "Trading - Direct Expense": ["Wages", "Carriage Inwards", "Power & Fuel", "Royalties","Factory Rent","Other Direct"],
  "P&L - Indirect Expense": ["Salaries","Rent","Carriage Outwards","Office & Admin","Selling & Dist.","Bad Debts","Discount Allowed","Depreciation","Other Indirect"],
  "P&L - Income": ["Commission Received","Interest Received","Discount Received","Other Income"],
  "Ignore": ["Ignore"]
};

// Keyword rules for auto-detection
const RULES = [
  { k: /sales return/i, cls: "Trading - Sales", sub: "Sales Returns (contra)" },
  { k: /sales/i, cls: "Trading - Sales", sub: "Sales" },
  { k: /purchase return/i, cls: "Trading - Purchases", sub: "Purchase Returns (contra)" },
  { k: /purchase/i, cls: "Trading - Purchases", sub: "Purchases" },
  { k: /opening stock|opening inventory/i, cls: "Trading - Opening Stock", sub: "Opening Stock" },
  { k: /closing stock|closing inventory/i, cls: "Trading - Closing Stock", sub: "Closing Stock" },
  { k: /wage|direct labor|labour/i, cls: "Trading - Direct Expense", sub: "Wages" },
  { k: /carriage in|freight in|cartage in/i, cls: "Trading - Direct Expense", sub: "Carriage Inwards" },
  { k: /power|fuel|electric/i, cls: "Trading - Direct Expense", sub: "Power & Fuel" },
  { k: /royalt/i, cls: "Trading - Direct Expense", sub: "Royalties" },
  { k: /factory rent|factory/i, cls: "Trading - Direct Expense", sub: "Factory Rent" },

  { k: /salary|wage payable/i, cls: "P&L - Indirect Expense", sub: "Salaries" },
  { k: /rent/i, cls: "P&L - Indirect Expense", sub: "Rent" },
  { k: /carriage out|freight out|cartage out|delivery/i, cls: "P&L - Indirect Expense", sub: "Carriage Outwards" },
  { k: /admin|office|printing|stationery|telephone|internet/i, cls: "P&L - Indirect Expense", sub: "Office & Admin" },
  { k: /advert|marketing|promo|selling/i, cls: "P&L - Indirect Expense", sub: "Selling & Dist." },
  { k: /bad debt/i, cls: "P&L - Indirect Expense", sub: "Bad Debts" },
  { k: /discount allowed/i, cls: "P&L - Indirect Expense", sub: "Discount Allowed" },
  { k: /depreciation/i, cls: "P&L - Indirect Expense", sub: "Depreciation" },

  { k: /commission rec|commission$/i, cls: "P&L - Income", sub: "Commission Received" },
  { k: /interest rec|interest$/i, cls: "P&L - Income", sub: "Interest Received" },
  { k: /discount received/i, cls: "P&L - Income", sub: "Discount Received" },
];

const defaultClass = (name) => {
  for (const r of RULES) if (r.k.test(name)) return { cls: r.cls, sub: r.sub };
  return { cls: "Ignore", sub: "Ignore" };
};

// ===== State =====
let rows = []; // {id, ledger, debit, credit, cls, sub}
let uid = 1;

// ===== DOM elements =====
const tbBody = $("#tbBody");
const sumDebitEl = $("#sumDebit");
const sumCreditEl = $("#sumCredit");
const tbStatusEl = $("#tbStatus");

const closingStockEl = $("#closingStock");
const currencyEl = $("#currency");
const tradingWrap = $("#tradingWrap");
const plWrap = $("#plWrap");
const summaryEl = $("#summary");

// ===== Row rendering =====
function addRow(data = null) {
  const id = uid++;
  const ledger = data?.ledger || "";
  const debit = data ? parseNum(data.debit) : 0;
  const credit = data ? parseNum(data.credit) : 0;

  const guess = defaultClass(ledger);
  const cls = data?.cls || guess.cls;
  const sub = data?.sub || guess.sub;

  rows.push({ id, ledger, debit, credit, cls, sub });
  renderTable();
}

function deleteRow(id) {
  rows = rows.filter(r => r.id !== id);
  renderTable();
}

function updateRow(id, field, value) {
  const r = rows.find(x => x.id === id);
  if (!r) return;
  if (field === "debit" || field === "credit") {
    r[field] = parseNum(value);
  } else {
    r[field] = value;
    if (field === "ledger") {
      const g = defaultClass(value);
      // If user hasn't explicitly set class (currently "Ignore"), upgrade to guess
      if (r.cls === "Ignore") { r.cls = g.cls; r.sub = g.sub; }
    }
  }
  renderTotals();
}

function renderTable() {
  tbBody.innerHTML = rows.map((r, idx) => {
    const clsOptions = CLASSES.map(c => `<option ${r.cls===c?"selected":""}>${c}</option>`).join("");
    const subOptions = (SUBTYPES[r.cls] || ["Ignore"]).map(s => `<option ${r.sub===s?"selected":""}>${s}</option>`).join("");
    return `
      <tr data-id="${r.id}">
        <td>${idx+1}</td>
        <td><input type="text" value="${r.ledger}" data-field="ledger" placeholder="Ledger name"/></td>
        <td><input class="num" type="number" step="0.01" value="${r.debit || ""}" data-field="debit"/></td>
        <td><input class="num" type="number" step="0.01" value="${r.credit || ""}" data-field="credit"/></td>
        <td>
          <select data-field="cls">${clsOptions}</select>
        </td>
        <td>
          <select data-field="sub">${subOptions}</select>
        </td>
        <td class="actions">
          <button class="ghost del">✕</button>
        </td>
      </tr>
    `;
  }).join("");

  // Wire events
  $$("#tbBody tr").forEach(tr => {
    const id = parseInt(tr.getAttribute("data-id"),10);
    tr.querySelectorAll("input,select").forEach(el => {
      el.addEventListener("input", (e) => {
        const field = e.target.getAttribute("data-field");
        updateRow(id, field, e.target.value);
        // refresh subtype list if class changed
        if (field === "cls") {
          const subSel = tr.querySelector('select[data-field="sub"]');
          const subs = SUBTYPES[e.target.value] || ["Ignore"];
          subSel.innerHTML = subs.map(s => `<option>${s}</option>`).join("");
        }
      });
    });
    tr.querySelector(".del").addEventListener("click", () => deleteRow(id));
  });

  renderTotals();
}

function renderTotals() {
  const sumD = rows.reduce((a,b)=>a+parseNum(b.debit),0);
  const sumC = rows.reduce((a,b)=>a+parseNum(b.credit),0);
  sumDebitEl.textContent = fmt(sumD, currencyEl.value);
  sumCreditEl.textContent = fmt(sumC, currencyEl.value);
  const diff = Math.abs(sumD - sumC);
  if (diff < 0.01) {
    tbStatusEl.innerHTML = `<span class="ok">Balanced</span>`;
  } else {
    tbStatusEl.innerHTML = `<span class="bad">Not balanced (Δ ${fmt(diff, currencyEl.value)})</span>`;
  }
}

// ===== CSV handling =====
$("#csvFile").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const lines = String(reader.result).split(/\r?\n/).filter(Boolean);
    // expect "Ledger,Debit,Credit"
    const out = [];
    for (let i=0;i<lines.length;i++){
      const parts = lines[i].split(",").map(s=>s.trim());
      if (i===0 && /ledger/i.test(parts[0])) continue; // header
      if (parts.length < 3) continue;
      const [ledger, dr, cr] = parts;
      out.push({ ledger, debit: dr, credit: cr });
    }
    rows = [];
    uid = 1;
    out.forEach(r => addRow(r));
  };
  reader.readAsText(file);
});

$("#downloadSample").addEventListener("click", () => {
  const sample = [
    ["Ledger","Debit","Credit"],
    ["Opening Stock","150000",""],
    ["Purchases","300000",""],
    ["Purchase Returns","","10000"],
    ["Wages","20000",""],
    ["Sales","","500000"],
    ["Sales Returns","5000",""],
    ["Carriage Inwards","6000",""],
    ["Rent","12000",""],
    ["Salaries","25000",""],
    ["Discount Received","","3000"],
    ["Commission Received","","8000"],
    ["Depreciation","7000",""],
  ].map(r => r.join(",")).join("\n");
  const blob = new Blob([sample], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "trial_balance_sample.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
});

$("#addRow").addEventListener("click", () => addRow());
$("#clearAll").addEventListener("click", () => { rows=[]; uid=1; renderTable(); });

// ===== Core accounting logic =====
function computeStatements() {
  const cur = currencyEl.value || "";

  // Buckets
  let openingStock = 0, closingStock = parseNum(closingStockEl.value||0);
  let purchases = 0, purchaseReturns = 0;
  let sales = 0, salesReturns = 0;
  let directExpenses = [];  // {name, amount}
  let indirectExpenses = [];
  let incomes = [];

  // From trial balance
  rows.forEach(r => {
    const name = r.ledger || "";
    const dr = parseNum(r.debit);
    const cr = parseNum(r.credit);

    // Normalize sign: Trial balance line is either Dr or Cr, never both
    const amount = dr > 0 ? dr : (cr > 0 ? cr : 0);
    const isDr = dr > 0;

    switch (r.cls) {
      case "Trading - Opening Stock":
        if (isDr) openingStock += amount;
        break;

      case "Trading - Closing Stock":
        // Users may keep this empty and use the separate field; prefer explicit field
        break;

      case "Trading - Purchases":
        if (r.sub === "Purchase Returns (contra)") {
          // Return is Credit in TB (usually), but we just add its amount
          purchaseReturns += amount;
        } else {
          purchases += amount;
        }
        break;

      case "Trading - Sales":
        if (r.sub === "Sales Returns (contra)") {
          salesReturns += amount;
        } else {
          sales += amount;
        }
        break;

      case "Trading - Direct Expense":
        // Direct expenses are Dr in TB
        if (isDr) directExpenses.push({ name, amount });
        break;

      case "P&L - Indirect Expense":
        if (isDr) indirectExpenses.push({ name, amount });
        break;

      case "P&L - Income":
        if (!isDr) incomes.push({ name, amount });
        break;

      default:
        break;
    }
  });

  // Trading Account Calculations
  const tradingDebit = openingStock
    + purchases - purchaseReturns
    + directExpenses.reduce((a,b)=>a+b.amount,0);

  const tradingCredit = (sales - salesReturns) + closingStock;

  const grossProfit = tradingCredit - tradingDebit; // if negative -> gross loss

  // Profit & Loss Calculations
  const indirectExpTotal = indirectExpenses.reduce((a,b)=>a+b.amount,0);
  const incomeTotal = incomes.reduce((a,b)=>a+b.amount,0);

  const plCredit = (grossProfit >= 0 ? grossProfit : 0) + incomeTotal;
  const plDebit  = (grossProfit < 0 ? -grossProfit : 0) + indirectExpTotal;

  const netProfit = plCredit - plDebit; // if negative -> net loss

  return {
    cur,
    openingStock, closingStock,
    purchases, purchaseReturns, sales, salesReturns,
    directExpenses, indirectExpenses, incomes,
    grossProfit, netProfit,
    checks: {
      tbBalanced: Math.abs(
        rows.reduce((a,b)=>a+parseNum(b.debit),0) -
        rows.reduce((a,b)=>a+parseNum(b.credit),0)
      ) < 0.01
    }
  };
}

// ===== Rendering statements =====
function renderStatementColumns(trading, pl, cur) {
  tradingWrap.innerHTML = `
    <div class="statement-col">
      <h3>Debit</h3>
      <table>
        <tbody>
          ${trading.debitRows.map(r=>`<tr><td>${r.name}</td><td class="right">${fmt(r.amount, cur)}</td></tr>`).join("")}
        </tbody>
        <tfoot>
          <tr><td>Total</td><td class="right">${fmt(trading.totalDebit, cur)}</td></tr>
        </tfoot>
      </table>
    </div>
    <div class="statement-col">
      <h3>Credit</h3>
      <table>
        <tbody>
          ${trading.creditRows.map(r=>`<tr><td>${r.name}</td><td class="right">${fmt(r.amount, cur)}</td></tr>`).join("")}
        </tbody>
        <tfoot>
          <tr><td>Total</td><td class="right">${fmt(trading.totalCredit, cur)}</td></tr>
        </tfoot>
      </table>
    </div>
  `;

  plWrap.innerHTML = `
    <div class="statement-col">
      <h3>Debit</h3>
      <table>
        <tbody>
          ${pl.debitRows.map(r=>`<tr><td>${r.name}</td><td class="right">${fmt(r.amount, cur)}</td></tr>`).join("")}
        </tbody>
        <tfoot>
          <tr><td>Total</td><td class="right">${fmt(pl.totalDebit, cur)}</td></tr>
        </tfoot>
      </table>
    </div>
    <div class="statement-col">
      <h3>Credit</h3>
      <table>
        <tbody>
          ${pl.creditRows.map(r=>`<tr><td>${r.name}</td><td class="right">${fmt(r.amount, cur)}</td></tr>`).join("")}
        </tbody>
        <tfoot>
          <tr><td>Total</td><td class="right">${fmt(pl.totalCredit, cur)}</td></tr>
        </tfoot>
      </table>
    </div>
  `;
}

function generate() {
  const r = computeStatements();

  const trading = {
    debitRows: [
      ...(r.openingStock ? [{name:"To Opening Stock", amount:r.openingStock}] : []),
      ...(r.purchases ? [{name:"To Purchases", amount:r.purchases}] : []),
      ...(r.purchaseReturns ? [{name:"Less: Purchase Returns", amount:-r.purchaseReturns}] : []),
      ...r.directExpenses.map(x=>({name:`To ${x.name}`, amount:x.amount})),
      ...(r.grossProfit < 0 ? [{name:"To Gross Loss c/d", amount:-r.grossProfit}] : [])
    ],
    creditRows: [
      ...(r.sales ? [{name:"By Sales", amount:r.sales}] : []),
      ...(r.salesReturns ? [{name:"Less: Sales Returns", amount:-r.salesReturns}] : []),
      ...(r.closingStock ? [{name:"By Closing Stock", amount:r.closingStock}] : []),
      ...(r.grossProfit >= 0 ? [{name:"By Gross Profit c/d", amount:r.grossProfit}] : [])
    ]
  };
  trading.totalDebit  = trading.debitRows.reduce((a,b)=>a+b.amount,0);
  trading.totalCredit = trading.creditRows.reduce((a,b)=>a+b.amount,0);

  const pl = {
    debitRows: [
      ...(r.grossProfit >= 0 ? [{name:"To Gross Profit b/d", amount:r.grossProfit}] : []),
      ...r.indirectExpenses.map(x=>({name:`To ${x.name}`, amount:x.amount})),
      ...(r.netProfit < 0 ? [{name:"To Net Loss", amount:-r.netProfit}] : [])
    ],
    creditRows: [
      ...(r.grossProfit < 0 ? [{name:"By Gross Loss b/d", amount:-r.grossProfit}] : []),
      ...r.incomes.map(x=>({name:`By ${x.name}`, amount:x.amount})),
      ...(r.netProfit >= 0 ? [{name:"By Net Profit", amount:r.netProfit}] : [])
    ]
  };
  pl.totalDebit  = pl.debitRows.reduce((a,b)=>a+b.amount,0);
  pl.totalCredit = pl.creditRows.reduce((a,b)=>a+b.amount,0);

  renderStatementColumns(trading, pl, r.cur);

  // Summary
  const tags = [
    r.grossProfit >= 0 ? `<span class="tag ok">Gross Profit: ${fmt(r.grossProfit, r.cur)}</span>` :
                          `<span class="tag bad">Gross Loss: ${fmt(-r.grossProfit, r.cur)}</span>`,
    r.netProfit >= 0 ? `<span class="tag ok">Net Profit: ${fmt(r.netProfit, r.cur)}</span>` :
                       `<span class="tag bad">Net Loss: ${fmt(-r.netProfit, r.cur)}</span>`,
    r.checks.tbBalanced ? `<span class="tag ok">Trial Balance Balanced</span>` :
                          `<span class="tag bad">Trial Balance Not Balanced</span>`
  ];
  summaryEl.innerHTML = tags.join(" ");
}

// ===== Buttons =====
$("#generate").addEventListener("click", generate);
$("#printBtn").addEventListener("click", () => window.print());

// ===== Seed a blank row for convenience =====
addRow();
