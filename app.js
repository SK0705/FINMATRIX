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

    // Add empty row to table
    function addEmptyRow() {
        trialData.push({
            ledger: '',
            debit: 0,
            credit: 0,
            class: 'Other',
            isManual: true  // Flag to identify manually added rows
        });
        updateTrialBalanceTable();
    }

    // Update table with current data
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
                updateTrialBalanceTable(); // Re-render to update classification
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

    // ... (keep all other existing functions the same, including generateStatements and downloadPDF)

    // Enhanced downloadPDF function to include manual rows
    function downloadPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(16);
        doc.text("Financial Statements", 105, 15, { align: 'center' });
        
        // Add generation date
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

    // Helper function to get statement data
    function getStatementData(type, column) {
        const items = type === 'trading' ? 
            trialData.filter(item => isTradingItem(item.ledger.toLowerCase())) :
            trialData.filter(item => !isTradingItem(item.ledger.toLowerCase()));
        
        return items
            .filter(item => item[column] > 0)
            .map(item => [item.ledger, currencySymbol + ' ' + item[column].toFixed(2)]);
    }

    // Helper function to calculate totals
    function calculateTotal(type, column) {
        const items = type === 'trading' ? 
            trialData.filter(item => isTradingItem(item.ledger.toLowerCase())) :
            trialData.filter(item => !isTradingItem(item.ledger.toLowerCase()));
        
        return items.reduce((sum, item) => sum + item[column], 0) + 
            (type === 'trading' && column === 'credit' ? (parseFloat(document.getElementById('closingStock').value) || 0) : 0);
    }

    // Helper function to classify trading items
    function isTradingItem(name) {
        return ["opening stock", "purchases", "wages", "carriage inwards", "sales returns", "sales", "purchase returns"]
            .some(k => name.includes(k));
    }
    
    // ... (keep all other existing functions the same)
});
