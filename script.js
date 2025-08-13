// app.js
let rows = [];
let uid = 1;

const $ = (sel) => document.querySelector(sel);

function addRow({ ledger = "", debit = "", credit = "" } = {}) {
  const tbody = $("#trialBody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" value="${ledger}"></td>
    <td><input type="number" value="${debit}"></td>
    <td><input type="number" value="${credit}"></td>
    <td><button class="delete">X</button></td>
  `;
  tbody.appendChild(tr);
}

$("#addRow").addEventListener("click", () => addRow());

$("#trialBody").addEventListener("click", (e) => {
  if (e.target.classList.contains("delete")) {
    e.target.closest("tr").remove();
  }
});

$("#csvFile").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const lines = String(reader.result).split(/\r?\n/).filter(Boolean);
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(",").map(s => s.trim());
      if (i === 0 && /ledger/i.test(parts[0])) continue; // skip header
      if (parts.length < 3) continue;
      const [ledger, dr, cr] = parts;
      out.push({ ledger, debit: dr, credit: cr });
    }
    rows = [];
    $("#trialBody").innerHTML = "";
    out.forEach(r => addRow(r));
    generate(); // Auto-generate after CSV upload
  };
  reader.readAsText(file);
});

$("#generate").addEventListener("click", generate);

function generate() {
  const closingStock = parseFloat($("#closingStock").value) || 0;
  const trading = { debit: [], credit: [] };
  const pnl = { debit: [], credit: [] };
  
  const trs = $("#trialBody").querySelectorAll("tr");
  trs.forEach(tr => {
    const ledger = tr.children[0].querySelector("input").value.trim();
    const debit = parseFloat(tr.children[1].querySelector("input").value) || 0;
    const credit = parseFloat(tr.children[2].querySelector("input").value) || 0;

    if (/opening stock|purchases|wages|carriage inwards|freight/i.test(ledger)) {
      trading.debit.push({ ledger, amount: debit || credit });
    } else if (/sales|purchase returns/i.test(ledger)) {
      trading.credit.push({ ledger, amount: credit || debit });
    } else {
      if (debit) pnl.debit.push({ ledger, amount: debit });
      if (credit) pnl.credit.push({ ledger, amount: credit });
    }
  });

  if (closingStock > 0) {
    trading.credit.push({ ledger: "Closing Stock", amount: closingStock });
  }

  const tradingDebitTotal = trading.debit.reduce((a, b) => a + b.amount, 0);
  const tradingCreditTotal = trading.credit.reduce((a, b) => a + b.amount, 0);

  let grossProfit = 0, grossLoss = 0;
  if (tradingCreditTotal > tradingDebitTotal) {
    grossProfit = tradingCreditTotal - tradingDebitTotal;
    pnl.credit.push({ ledger: "Gross Profit c/d", amount: grossProfit });
  } else {
    grossLoss = tradingDebitTotal - tradingCreditTotal;
    pnl.debit.push({ ledger: "Gross Loss c/d", amount: grossLoss });
  }

  const pnlDebitTotal = pnl.debit.reduce((a, b) => a + b.amount, 0);
  const pnlCreditTotal = pnl.credit.reduce((a, b) => a + b.amount, 0);

  let netProfit = 0, netLoss = 0;
  if (pnlCreditTotal > pnlDebitTotal) {
    netProfit = pnlCreditTotal - pnlDebitTotal;
  } else {
    netLoss = pnlDebitTotal - pnlCreditTotal;
  }

  renderTable("#tradingTable", trading, tradingDebitTotal, tradingCreditTotal, grossProfit, grossLoss);
  renderTable("#pnlTable", pnl, pnlDebitTotal, pnlCreditTotal, netProfit, netLoss);
}

function renderTable(selector, data, debitTotal, creditTotal, profit, loss) {
  const table = document.querySelector(selector);
  table.innerHTML = `
    <tr><th>Particulars</th><th>Amount</th><th>Particulars</th><th>Amount</th></tr>
  `;

  const maxRows = Math.max(data.debit.length, data.credit.length);
  for (let i = 0; i < maxRows; i++) {
    const dr = data.debit[i] || {};
    const cr = data.credit[i] || {};
    table.innerHTML += `
      <tr>
        <td>${dr.ledger || ""}</td>
        <td>${dr.amount || ""}</td>
        <td>${cr.ledger || ""}</td>
        <td>${cr.amount || ""}</td>
      </tr>
    `;
  }

  if (profit > 0) {
    table.innerHTML += `<tr><td colspan="2"></td><td>Net Profit</td><td>${profit}</td></tr>`;
  }
  if (loss > 0) {
    table.innerHTML += `<tr><td>Net Loss</td><td>${loss}</td><td colspan="2"></td></tr>`;
  }

  table.innerHTML += `<tr><th>Total</th><th>${Math.max(debitTotal, creditTotal)}</th><th>Total</th><th>${Math.max(debitTotal, creditTotal)}</th></tr>`;
}
