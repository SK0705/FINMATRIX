document.getElementById('csvFile').addEventListener('change', handleFile);
document.getElementById('generate').addEventListener('click', generateStatements);

let trialData = [];

function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const lines = e.target.result.split(/\r?\n/);
        trialData = [];
        document.getElementById('trialBody').innerHTML = "";

        lines.slice(1).forEach(line => {
            if (line.trim() === "") return;
            const [ledger, debit, credit] = line.split(",");
            trialData.push({
                ledger: ledger.trim(),
                debit: parseFloat(debit) || 0,
                credit: parseFloat(credit) || 0
            });
        });

        fillTrialTable();
    };
    reader.readAsText(file);
}

function fillTrialTable() {
    const tbody = document.getElementById('trialBody');
    tbody.innerHTML = "";
    trialData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.ledger}</td>
            <td>${row.debit || ""}</td>
            <td>${row.credit || ""}</td>
        `;
        tbody.appendChild(tr);
    });
}

function generateStatements() {
    const closingStock = parseFloat(document.getElementById('closingStock').value) || 0;
    
    const tradingItems = [];
    const pnlItems = [];

    let totalDebitTrading = 0;
    let totalCreditTrading = closingStock;
    let totalDebitPnL = 0;
    let totalCreditPnL = 0;

    // Classify items
    trialData.forEach(row => {
        const name = row.ledger.toLowerCase();
        if (["opening stock", "purchases", "wages", "carriage inwards", "sales returns"].some(k => name.includes(k))) {
            tradingItems.push(row);
            totalDebitTrading += row.debit;
        } else if (["sales", "purchase returns"].some(k => name.includes(k))) {
            tradingItems.push(row);
            totalCreditTrading += row.credit;
        } else {
            pnlItems.push(row);
            totalDebitPnL += row.debit;
            totalCreditPnL += row.credit;
        }
    });

    // Calculate gross profit/loss
    const grossResult = totalCreditTrading - totalDebitTrading;
    if (grossResult > 0) {
        pnlItems.unshift({ ledger: "Gross Profit c/d", debit: 0, credit: grossResult });
        totalCreditPnL += grossResult;
    } else {
        pnlItems.unshift({ ledger: "Gross Loss c/d", debit: Math.abs(grossResult), credit: 0 });
        totalDebitPnL += Math.abs(grossResult);
    }

    // Render Trading Table
    let tradingHTML = `<tr><th>Particulars</th><th>Debit</th><th>Credit</th></tr>`;
    tradingItems.forEach(row => {
        tradingHTML += `<tr><td>${row.ledger}</td><td>${row.debit || ""}</td><td>${row.credit || ""}</td></tr>`;
    });
    tradingHTML += `<tr><td>Closing Stock</td><td></td><td>${closingStock}</td></tr>`;
    tradingHTML += `<tr><td><strong>Total</strong></td><td><strong>${totalDebitTrading}</strong></td><td><strong>${totalCreditTrading}</strong></td></tr>`;
    document.getElementById('tradingTable').innerHTML = tradingHTML;

    // Render P&L Table
    let pnlHTML = `<tr><th>Particulars</th><th>Debit</th><th>Credit</th></tr>`;
    pnlItems.forEach(row => {
        pnlHTML += `<tr><td>${row.ledger}</td><td>${row.debit || ""}</td><td>${row.credit || ""}</td></tr>`;
    });
    pnlHTML += `<tr><td><strong>Total</strong></td><td><strong>${totalDebitPnL}</strong></td><td><strong>${totalCreditPnL}</strong></td></tr>`;
    document.getElementById('pnlTable').innerHTML = pnlHTML;
}
