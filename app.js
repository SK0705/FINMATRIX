document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let trialData = [];
    const currencySymbol = document.getElementById('currency').value;

    // Event listeners
    document.getElementById('csvFile').addEventListener('change', handleFile);
    document.getElementById('generate').addEventListener('click', generateStatements);
    document.getElementById('downloadPdf').addEventListener('click', downloadPDF);
    document.getElementById('clearAll').addEventListener('click', clearAll);
    document.getElementById('addRow').addEventListener('click', addEmptyRow);
    document.getElementById('downloadSample').addEventListener('click', downloadSampleCSV);

    // Main functions
    function handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const lines = e.target.result.split(/\r?\n/);
            trialData = [];
            
            lines.forEach((line, index) => {
                if (index === 0 || line.trim() === "") return; // Skip header and empty lines
                const [ledger, debit, credit] = line.split(",");
                trialData.push({
                    ledger: ledger.trim(),
                    debit: parseFloat(debit) || 0,
                    credit: parseFloat(credit) || 0,
                    class: classifyLedger(ledger.trim())
                });
            });

            updateTrialBalanceTable();
            updateTotals();
        };
        reader.readAsText(file);
    }

    function classifyLedger(ledgerName) {
        const name = ledgerName.toLowerCase();
        if (["sales", "revenue", "income"].some(k => name.includes(k))) return "Revenue";
        if (["purchases", "cost of goods", "cogs"].some(k => name.includes(k))) return "COGS";
        if (["expense", "salary", "wage", "rent", "utility"].some(k => name.includes(k))) return "Expense";
        if (["asset", "inventory", "equipment"].some(k => name.includes(k))) return "Asset";
        if (["liability", "payable", "debt"].some(k => name.includes(k))) return "Liability";
        return "Other";
    }

    function updateTrialBalanceTable() {
        const tbody = document.getElementById('tbBody');
        tbody.innerHTML = "";
        
        trialData.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${row.ledger}</td>
                <td class="right">${row.debit ? row.debit.toFixed(2) : ''}</td>
                <td class="right">${row.credit ? row.credit.toFixed(2) : ''}</td>
                <td>${row.class}</td>
                <td></td>
                <td class="actions">
                    <button class="danger" data-index="${index}">×</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add delete row functionality
        document.querySelectorAll('#tbBody button.danger').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                trialData.splice(index, 1);
                updateTrialBalanceTable();
                updateTotals();
            });
        });
    }

    function updateTotals() {
        const totalDebit = trialData.reduce((sum, row) => sum + row.debit, 0);
        const totalCredit = trialData.reduce((sum, row) => sum + row.credit, 0);
        
        document.getElementById('sumDebit').textContent = totalDebit.toFixed(2);
        document.getElementById('sumCredit').textContent = totalCredit.toFixed(2);
        
        const statusEl = document.getElementById('tbStatus');
        if (Math.abs(totalDebit - totalCredit) < 0.01) {
            statusEl.textContent = "✓ Balanced";
            statusEl.className = "ok";
        } else {
            statusEl.textContent = "✗ Not Balanced";
            statusEl.className = "bad";
        }
    }

    function generateStatements() {
        const closingStock = parseFloat(document.getElementById('closingStock').value) || 0;
        
        // Classify items
        const tradingItems = [];
        const pnlItems = [];
        let totalDebitTrading = 0;
        let totalCreditTrading = closingStock;

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
            }
        });

        // Calculate gross profit/loss
        const grossResult = totalCreditTrading - totalDebitTrading;
        if (grossResult > 0) {
            pnlItems.unshift({ ledger: "Gross Profit c/d", debit: 0, credit: grossResult });
        } else {
            pnlItems.unshift({ ledger: "Gross Loss c/d", debit: Math.abs(grossResult), credit: 0 });
        }

        // Render Trading Account
        let tradingHTML = `
            <div class="statement-col">
                <h3>Debit</h3>
                <table>
                    ${tradingItems.filter(item => item.debit > 0).map(item => `
                        <tr>
                            <td>${item.ledger}</td>
                            <td class="right">${currencySymbol} ${item.debit.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td><strong>Total</strong></td>
                        <td class="right"><strong>${currencySymbol} ${totalDebitTrading.toFixed(2)}</strong></td>
                    </tr>
                </table>
            </div>
            <div class="statement-col">
                <h3>Credit</h3>
                <table>
                    ${tradingItems.filter(item => item.credit > 0).map(item => `
                        <tr>
                            <td>${item.ledger}</td>
                            <td class="right">${currencySymbol} ${item.credit.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    <tr>
                        <td>Closing Stock</td>
                        <td class="right">${currencySymbol} ${closingStock.toFixed(2)}</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>Total</strong></td>
                        <td class="right"><strong>${currencySymbol} ${totalCreditTrading.toFixed(2)}</strong></td>
                    </tr>
                </table>
            </div>`;
        
        document.getElementById('tradingWrap').innerHTML = tradingHTML;

        // Render Profit & Loss Account
        const totalDebitPnL = pnlItems.reduce((sum, item) => sum + item.debit, 0);
        const totalCreditPnL = pnlItems.reduce((sum, item) => sum + item.credit, 0);
        
        let pnlHTML = `
            <div class="statement-col">
                <h3>Debit (Expenses/Losses)</h3>
                <table>
                    ${pnlItems.filter(item => item.debit > 0).map(item => `
                        <tr>
                            <td>${item.ledger}</td>
                            <td class="right">${currencySymbol} ${item.debit.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td><strong>Total</strong></td>
                        <td class="right"><strong>${currencySymbol} ${totalDebitPnL.toFixed(2)}</strong></td>
                    </tr>
                </table>
            </div>
            <div class="statement-col">
                <h3>Credit (Incomes/Gains)</h3>
                <table>
                    ${pnlItems.filter(item => item.credit > 0).map(item => `
                        <tr>
                            <td>${item.ledger}</td>
                            <td class="right">${currencySymbol} ${item.credit.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td><strong>Total</strong></td>
                        <td class="right"><strong>${currencySymbol} ${totalCreditPnL.toFixed(2)}</strong></td>
                    </tr>
                </table>
            </div>`;
        
        document.getElementById('plWrap').innerHTML = pnlHTML;

        // Update summary
        const netProfit = totalCreditPnL - totalDebitPnL;
        document.getElementById('summary').innerHTML = `
            <p>Gross ${grossResult >= 0 ? 'Profit' : 'Loss'}: <strong class="${grossResult >= 0 ? 'ok' : 'bad'}">
                ${currencySymbol} ${Math.abs(grossResult).toFixed(2)}
            </strong></p>
            <p>Net ${netProfit >= 0 ? 'Profit' : 'Loss'}: <strong class="${netProfit >= 0 ? 'ok' : 'bad'}">
                ${currencySymbol} ${Math.abs(netProfit).toFixed(2)}
            </strong></p>
        `;
    }

    function downloadPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text("Financial Statements", 14, 15);
        doc.setFontSize(12);
        
        // Trading Account
        doc.text("Trading Account", 14, 25);
        doc.autoTable({
            head: [['Particulars', 'Amount']],
            body: [
                ...document.querySelectorAll('#tradingWrap .statement-col:first-child tr:not(.total-row)').map(tr => [
                    tr.cells[0].textContent,
                    tr.cells[1].textContent
                ]),
                ['Total', document.querySelector('#tradingWrap .statement-col:first-child .total-row td:last-child').textContent]
            ],
            startY: 30
        });
        
        // Profit & Loss Account
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.text("Profit & Loss Account", 14, finalY);
        doc.autoTable({
            head: [['Particulars', 'Amount']],
            body: [
                ...document.querySelectorAll('#plWrap .statement-col:first-child tr:not(.total-row)').map(tr => [
                    tr.cells[0].textContent,
                    tr.cells[1].textContent
                ]),
                ['Total', document.querySelector('#plWrap .statement-col:first-child .total-row td:last-child').textContent]
            ],
            startY: finalY + 5
        });
        
        doc.save('financial_statements.pdf');
    }

    // Helper functions
    function clearAll() {
        trialData = [];
        updateTrialBalanceTable();
        updateTotals();
        document.getElementById('tradingWrap').innerHTML = '';
        document.getElementById('plWrap').innerHTML = '';
        document.getElementById('summary').innerHTML = '';
    }

    function addEmptyRow() {
        trialData.push({ ledger: '', debit: 0, credit: 0, class: 'Other' });
        updateTrialBalanceTable();
    }

    function downloadSampleCSV() {
        const csvContent = "Ledger,Debit,Credit\nSales,,250000\nPurchases,150000,\nWages,25000,\nRent,12000,\nOpening Stock,50000,";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'sample_trial_balance.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
