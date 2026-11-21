'use client';

import type { Claim } from '../types';
import { fmtDate, monthLabel } from '../rules';
import { download } from './download';

/**
 * Monthly "Claim Summary" form for one distributor/dealer.
 * Only claimable (approved) tyres are listed — rejected / nonclaimable never appear.
 */
export async function downloadClaimSummary(claims: Claim[], distributor: string, month: string, city = '') {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const list = claims.filter((c) => c.status === 'confirmed' && c.decision === 'Claimable' && c.distributor === distributor && (c.happenedDate ?? '').startsWith(month));

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(192, 0, 0);
  doc.rect(14, 12, W - 28, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SLM TYRES', 18, 23.5);
  doc.setFontSize(12);
  doc.text('CLAIM SUMMARY', W - 18, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('After-Sales Services · Central-II', W - 18, 25.5, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(153, 153, 153);
  doc.rect(14, 33, W - 28, 9);
  doc.line(14 + (W - 28) * 0.66, 33, 14 + (W - 28) * 0.66, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Distributor / Dealer:', 17, 38.8);
  doc.text('Month:', 17 + (W - 28) * 0.66, 38.8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${distributor}${city ? ', ' + city : ''}`, 53, 38.8);
  doc.text(monthLabel(month), 31 + (W - 28) * 0.66, 38.8);

  const body = list.map((c, i) => [
    String(i + 1), c.size || c.tyreSize, c.pattern, c.tyreNumber, c.bilty,
    c.amountApproved ? c.amountApproved.toLocaleString() : '', c.approvedBy ?? '', c.approvedDate ? fmtDate(c.approvedDate) : '', '',
  ]);
  const total = list.reduce((s, c) => s + (c.amountApproved ?? 0), 0);

  autoTable(doc, {
    startY: 46,
    head: [['Sr #', 'Size', 'Pattern', 'Tyre Serial #', 'Bilty #', 'Amount\nApproved', 'Approved\nby', 'Approved\nDate', 'Remarks']],
    body,
    foot: [['', '', '', 'Total Tyres', String(list.length), total ? total.toLocaleString() : 'Total', '', '', '']],
    theme: 'grid',
    styles: { fontSize: 9, halign: 'center', valign: 'middle', lineColor: [153, 153, 153], lineWidth: 0.2 },
    headStyles: { fillColor: [26, 26, 26], textColor: 255, fontSize: 8.5 },
    footStyles: { fillColor: [251, 227, 227], textColor: 0, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 14, right: 14 },
  });

  const y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120) + 34;
  const cols = [W / 6, W / 2, (5 * W) / 6];
  const labels = [['Distributor / Dealer', 'Signature & Stamp'], ['Area Sales Manager', 'Approval'], ['After Sales', 'Approval']];
  cols.forEach((x, i) => {
    doc.line(x - 25, y, x + 25, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(labels[i][0], x, y + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(85, 85, 85);
    doc.text(labels[i][1], x, y + 11, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  });

  const safe = distributor.replace(/[\\/:*?"<>|]/g, '');
  download(doc.output('blob'), `Claim Summary - ${safe} - ${monthLabel(month)}.pdf`);
  return list.length;
}
