/**
 * Exports a Venue Subscription Bill and its complete itemized orders breakdown
 * to a professionally formatted .xlsx Excel file using ExcelJS.
 */
export async function exportVenueInvoiceExcel(invoice) {
  if (!invoice) return;

  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import('exceljs'),
    import('file-saver')
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DigiAds Platform';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Subscription Bill');

  // 1. Title Banner (Merged A1:F1)
  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'AIBOTINK — DIGIADS VENUE SUBSCRIPTION STATEMENT';
  titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0069A8' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 28;

  // 2. Subtitle / Venue Metadata Rows
  const sDate = new Date(invoice.cycleStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const eDate = new Date(invoice.cycleEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  worksheet.mergeCells('A2:F2');
  const metaCell = worksheet.getCell('A2');
  metaCell.value = `Venue: ${invoice.outletName}  |  Bill Ref: ${invoice.invoiceNumber}`;
  metaCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E293B' } };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  worksheet.mergeCells('A3:F3');
  const periodCell = worksheet.getCell('A3');
  periodCell.value = `Billing Period: ${sDate} to ${eDate}  |  Due Date: ${dueDate}  |  Payee UPI: ${invoice.upiDetails?.upiId || 'N/A'}`;
  periodCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: '64748B' } };
  periodCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(3).height = 18;

  worksheet.getRow(4).height = 10;
  let currentRow = 5;

  // 3. Orders Breakdown Section
  if (invoice.ordersBreakdown && invoice.ordersBreakdown.length > 0) {
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
    const ordersSectionHeader = worksheet.getCell(`A${currentRow}`);
    ordersSectionHeader.value = `ITEMIZED ORDERS BREAKDOWN (${invoice.ordersBreakdown.length} ORDERS)`;
    ordersSectionHeader.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    ordersSectionHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
    ordersSectionHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 24;
    currentRow++;

    const orderHeaders = ['Sl', 'Order ID', 'Table / Service', 'Date & Time', 'Order Value (₹)', 'DigiAds Commission (₹)'];
    const orderHeaderRow = worksheet.getRow(currentRow);
    orderHeaderRow.values = orderHeaders;
    orderHeaderRow.height = 20;
    orderHeaderRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '475569' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    currentRow++;

    let sumOrderValues = 0;
    let sumCommissions = 0;

    invoice.ordersBreakdown.forEach((ord, index) => {
      const row = worksheet.getRow(currentRow);
      const oDate = new Date(ord.orderDate).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });
      sumOrderValues += Number(ord.orderValueRupees || 0);
      sumCommissions += Number(ord.commissionAmount || 0);

      row.values = [
        index + 1,
        ord.orderId,
        ord.tableNumber || 'Takeout',
        oDate,
        Number(ord.orderValueRupees || 0).toFixed(2),
        Number(ord.commissionAmount || 0).toFixed(2)
      ];
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'right' };
      row.getCell(6).alignment = { horizontal: 'right' };
      currentRow++;
    });

    const ordersSumRow = worksheet.getRow(currentRow);
    ordersSumRow.values = [
      '',
      '',
      '',
      '',
      `₹${sumOrderValues.toLocaleString('en-IN')}`,
      `₹${sumCommissions.toFixed(2)}`
    ];
    ordersSumRow.height = 22;
    ordersSumRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    });
    ordersSumRow.getCell(5).alignment = { horizontal: 'right' };
    ordersSumRow.getCell(6).alignment = { horizontal: 'right' };
  } else if (invoice.items && invoice.items.length > 0) {
    // Device-based plans fallback
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
    const itemsHeader = worksheet.getCell(`A${currentRow}`);
    itemsHeader.value = 'HARDWARE / SUBSCRIPTION ITEMS';
    itemsHeader.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    itemsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
    itemsHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    invoice.items.forEach((item, idx) => {
      const row = worksheet.getRow(currentRow);
      row.values = [idx + 1, item.description, `${item.quantity} Units`, '', `₹${Number(item.rate).toFixed(2)}`, `₹${Number(item.amount).toFixed(2)}`];
      row.getCell(5).alignment = { horizontal: 'right' };
      row.getCell(6).alignment = { horizontal: 'right' };
      currentRow++;
    });

    const totalRow = worksheet.getRow(currentRow);
    totalRow.values = ['', '', '', '', 'Total Payable', `₹${Number(invoice.totalAmount).toLocaleString('en-IN')}`];
    totalRow.getCell(5).alignment = { horizontal: 'right' };
    totalRow.getCell(6).alignment = { horizontal: 'right' };
  }

  // Set Column Widths
  worksheet.columns = [
    { width: 8 },  // Sl
    { width: 26 }, // Description / Order ID
    { width: 18 }, // Count / Table
    { width: 22 }, // Rate / Date
    { width: 18 }, // Tax / Order Value
    { width: 26 }  // Amount / Commission
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `DigiAds_Bill_${invoice.invoiceNumber}.xlsx`);
}
