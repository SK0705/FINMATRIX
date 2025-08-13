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
    document.getElementById('viewFlowchart').addEventListener('click', () => {
        window.location.href = 'flowchart.html';
    });

    // Add empty row to table
    function addEmptyRow() {
        trialData.push({
            ledger: '',
            debit: 0,
            credit: 0,
            class: 'Other',
            isManual: true
        });
        updateTrialBalanceTable();
    }

    // Handle CSV file upload
    function handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const lines = e.target.result.split(/\r?\n/);
            trialData = [];
            
            lines.forEach((line, index) => {
                if (index === 0 || line.trim() === "") return;
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

    // Classify ledger items
    function classifyLedger(ledgerName) {
        const name = ledgerName.toLowerCase();
        if (["sales", "revenue", "income"].some(k => name.includes(k))) return "Revenue";
        if (["purchases", "cost of goods", "cogs"].some(k => name.includes(k))) return "COGS";
        if (["expense", "salary", "wage", "rent", "utility"].some(k => name.includes(k))) return "Expense";
        if (["asset", "inventory", "equipment"].some(k => name.includes(k))) return "Asset";
        if (["liability", "payable", "debt"].some(k => name.includes(k))) return "Liability";
        return "Other";
    }

    // Update trial balance table
    function updateTrialBalanceTable() {
        const tbody = document.getElementById('tbBody');
        tbody.innerHTML = "";
        
        trialData.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><input type="text" class="ledger-input" value="${row.ledger}" data-index="${index}"></td>
                <td><input type="number" class="debit-input" value="${row.debit || ''}" step="0.01" data-index="${index}"></td>
                <td><input type="number" class="credit-input" value="${row.credit || ''}" step="0.01" data-index="${index}"></td>
                <td>
                    <select class="class-select" data-index="${index}">
                        <option value="Revenue" ${row.class === 'Revenue' ? 'selected' : ''}>Revenue</option>
                        <option value="COGS" ${row.class === 'COGS' ? 'selected' : ''}>COGS</option>
                        <option value="Expense" ${row.class === 'Expense' ? 'selected' : ''}>Expense</option>
                        <option value="Asset" ${row.class === 'Asset' ? 'selected' : ''}>Asset</option>
                        <option value="Liability" ${row.class === 'Liability' ? 'selected' : ''}>Liability</option>
                        <option value="Other" ${row.class === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </td>
                <td></td>
                <td class="actions">
                    <button class="danger" data-index="${index}">×</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners to inputs
        document.querySelectorAll('.ledger-input').forEach(input => {
            input.addEventListener('change', function() {
                const index = parseInt(this.getAttribute('data-index'));
                trialData[index].ledger = this.value;
                trialData[index].class = classifyLedger(this.value);
                updateTrialBalanceTable();
            });
        });

        document.querySelectorAll('.debit-input').forEach(input => {
            input.addEventListener('change', function() {
                const index = parseInt(this.getAttribute('data-index'));
                trialData[index].debit = parseFloat(this.value) || 0;
                updateTotals();
            });
        });

        document.querySelectorAll('.credit-input').forEach(input => {
            input.addEventListener('change', function() {
                const index = parseInt(this.getAttribute('data-index'));
                trialData[index].credit = parseFloat(this.value) || 0;
                updateTotals();
            });
        });

        document.querySelectorAll('.class-select').forEach(select => {
            select.addEventListener('change', function() {
                const index = parseInt(this.getAttribute('data-index'));
                trialData[index].class = this.value;
            });
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

        updateTotals();
    }

    // Update totals
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

    // Generate financial statements
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

    // Download PDF
    function downloadPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text("Financial Statements", 105, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 22, { align: 'center' });
        
        // Trading Account
        doc.setFontSize(12);
        doc.text("Trading Account", 14, 30);
        
        const tradingData = [
            ['Particulars', 'Amount (₹)'],
            ...getStatementData('trading', 'debit'),
            ['Total', currencySymbol + ' ' + calculateTotal('trading', 'debit').toFixed(2)],
            ...getStatementData('trading', 'credit'),
            ['Closing Stock', currencySymbol + ' ' + (parseFloat(document.getElementById('closingStock').value) || 0).toFixed(2)],
            ['Total', currencySymbol + ' ' + calculateTotal('trading', 'credit').toFixed(2)]
        ];
        
        doc.autoTable({
            head: [tradingData[0]],
            body: tradingData.slice(1),
            startY: 35,
            styles: { 
                cellPadding: 5,
                fontSize: 10,
                valign: 'middle'
            },
            headStyles: {
                fillColor: [67, 97, 238],
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240]
            }
        });
        
        // Profit & Loss Account
        let finalY = doc.lastAutoTable.finalY + 10;
        doc.text("Profit & Loss Account", 14, finalY);
        
        const plData = [
            ['Particulars', 'Amount (₹)'],
            ...getStatementData('pnl', 'debit'),
            ['Total', currencySymbol + ' ' + calculateTotal('pnl', 'debit').toFixed(2)],
            ...getStatementData('pnl', 'credit'),
            ['Total', currencySymbol + ' ' + calculateTotal('pnl', 'credit').toFixed(2)]
        ];
        
        doc.autoTable({
            head: [plData[0]],
            body: plData.slice(1),
            startY: finalY + 5,
            styles: { 
                cellPadding: 5,
                fontSize: 10,
                valign: 'middle'
            },
            headStyles: {
                fillColor: [67, 97, 238],
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240]
            }
        });
        
        // Summary
        finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text("Summary", 14, finalY);
        
        const grossResult = calculateTotal('trading', 'credit') - calculateTotal('trading', 'debit');
        const netProfit = calculateTotal('pnl', 'credit') - calculateTotal('pnl', 'debit');
        
        const summaryData = [
            ['Gross Profit/Loss', currencySymbol + ' ' + Math.abs(grossResult).toFixed(2)],
            ['Net Profit/Loss', currencySymbol + ' ' + Math.abs(netProfit).toFixed(2)]
        ];
        
        doc.autoTable({
            body: summaryData,
            startY: finalY + 5,
            styles: { 
                cellPadding: 5,
                fontSize: 10,
                valign: 'middle'
            },
            columnStyles: {
                1: { fontStyle: 'bold' }
            }
        });
        
        doc.save('financial_statements.pdf');
    }

    // Helper functions
    function getStatementData(type, column) {
        const items = type === 'trading' ? 
            trialData.filter(item => isTradingItem(item.ledger.toLowerCase())) :
            trialData.filter(item => !isTradingItem(item.ledger.toLowerCase()));
        
        return items
            .filter(item => item[column] > 0)
            .map(item => [item.ledger, currencySymbol + ' ' + item[column].toFixed(2)]);
    }

    function calculateTotal(type, column) {
        const items = type === 'trading' ? 
            trialData.filter(item => isTradingItem(item.ledger.toLowerCase())) :
            trialData.filter(item => !isTradingItem(item.ledger.toLowerCase()));
        
        return items.reduce((sum, item) => sum + item[column], 0) + 
            (type === 'trading' && column === 'credit' ? (parseFloat(document.getElementById('closingStock').value) || 0) : 0);
    }

    function isTradingItem(name) {
        return ["opening stock", "purchases", "wages", "carriage inwards", "sales returns", "sales", "purchase returns"]
            .some(k => name.includes(k));
    }

    function clearAll() {
        trialData = [];
        updateTrialBalanceTable();
        document.getElementById('tradingWrap').innerHTML = '';
        document.getElementById('plWrap').innerHTML = '';
        document.getElementById('summary').innerHTML = '';
        document.getElementById('closingStock').value = '';
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
