const trialBody = document.getElementById("trialBody");
const tradingTable = document.getElementById("tradingTable");
const pnlTable = document.getElementById("pnlTable");
const closingStockInput = document.getElementById("closingStock");

// Parse CSV and auto-fill table
document.getElementById("csvFile").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const lines = evt.target.result.split(/\r?\n/).filter(Boolean);
        trialBody.innerHTML = ""; // clear table

        lines.forEach((line, index) => {
            if (index === 0) return; // skip header row
            const [ledger, debit, credit] = line.split(",").map(s => s.trim());

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${ledger}</td>
                <td>${debit || ""}</td>
                <td>${credit || ""}</td>
            `;
            trialBody.appendChild(row);
        });

        generateStatements(); // auto-generate
    };
    reader.readAsText(file);
});

// Auto-regenerate if closing stock changes
closingStockInput.addEventListener("input", generateStatements);

// Generate Trading & P&L
function generateStatements() {
    let tradingDebit = 0, tradingCredit = 0;
    let pnlDebit = 0, pnlCredit = 0;
    let tradingRows = "", pnlRows = "";

    const closingStock = parseFloat(closingStockInput.value) || 0;

    [...trialBody.rows].forEach(row => {
        const ledger = row.cells[0].innerText;
        const debit = parseFloat(row.cells[1].innerText) || 0;
        const credit = parseFloat(row.cells[2].innerText) || 0;

        // Classify
        if (["Opening Stock", "Purchases", "Purchase Returns", "Sales", "Sales Returns", "Wages", "Carriage Inwards"].includes(ledger)) {
            tradingRows += `<tr><td>${ledger}</td><td>${debit}</td><td>${credit}</td></tr>`;
            tradingDebit += debit;
            tradingCredit += credit;
        } else {
            pnlRows += `<tr><td>${ledger}</td><td>${debit}</td><td>${credit}</td></tr>`;
            pnlDebit += debit;
            pnlCredit += credit;
        }
    });

    // Add Closing Stock
    if (closingStock) {
        tradingRows += `<tr><td>Closing Stock</td><td></td><td>${closingStock}</td></tr>`;
        tradingCredit += closingStock;
    }

    // Calculate Gross Profit or Loss
    let grossProfit = 0, grossLoss = 0;
    if (tradingCredit > tradingDebit) {
        grossProfit = tradingCredit - tradingDebit;
        tradingRows += `<tr><td><strong>Gross Profit c/d</strong></td><td>${grossProfit}</td><td></td></tr>`;
        tradingDebit += grossProfit;
        pnlRows = `<tr><td><strong>Gross Profit b/d</strong></td><td></td><td>${grossProfit}</td></tr>` + pnlRows;
        pnlCredit += grossProfit;
    } else if (tradingDebit > tradingCredit) {
        grossLoss = tradingDebit - tradingCredit;
        tradingRows += `<tr><td><strong>Gross Loss c/d</strong></td><td></td><td>${grossLoss}</td></tr>`;
        tradingCredit += grossLoss;
        pnlRows = `<tr><td><strong>Gross Loss b/d</strong></td><td>${grossLoss}</td><td></td></tr>` + pnlRows;
        pnlDebit += grossLoss;
    }

    // Calculate Net Profit or Loss
    let netProfit = 0, netLoss = 0;
    if (pnlCredit > pnlDebit) {
        netProfit = pnlCredit - pnlDebit;
        pnlRows += `<tr><td><strong>Net Profit</strong></td><td>${netProfit}</td><td></td></tr>`;
        pnlDebit += netProfit;
    } else if (pnlDebit > pnlCredit) {
        netLoss = pnlDebit - pnlCredit;
        pnlRows += `<tr><td><strong>Net Loss</strong></td><td></td><td>${netLoss}</td></tr>`;
        pnlCredit += netLoss;
    }

    // Render Tables
    tradingTable.innerHTML = `
        <tr><th>Ledger</th><th>Debit</th><th>Credit</th></tr>
        ${tradingRows}
        <tr><td><strong>Total</strong></td><td><strong>${tradingDebit}</strong></td><td><strong>${tradingCredit}</strong></td></tr>
    `;

    pnlTable.innerHTML = `
        <tr><th>Ledger</th><th>Debit</th><th>Credit</th></tr>
        ${pnlRows}
        <tr><td><strong>Total</strong></td><td><strong>${pnlDebit}</strong></td><td><strong>${pnlCredit}</strong></td></tr>
    `;
}
