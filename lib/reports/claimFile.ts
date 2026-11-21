'use client';

import type { Claim } from '../types';
import { blobToDataUrl, getPhoto } from '../photos';
import { fmtDate } from '../rules';
import { download } from './download';

/** The same 26 columns as the master "8 MONTHS" sheet and the monthly files. */
export const CLAIM_HEADERS = [
  'S No #', 'Distributor', 'Bilty', 'DOT', 'Date of Fittment ', '发生日期 \nHappened Date', '地点 \nLocation', '车型 \nTruck Type',
  '司机姓名\nDriver Name', '车牌号 \nTruck Number', 'Brand', '轮胎规格\nTyre Size', '轮胎号\nTyre Number', '载荷 \nTruck+ Cargo Load(Tons)',
  '行驶距离\nOperating Distance(Km)', 'KM Covered ', '速度\nSpeed(km/h)', '路况\nRoad Condition', '剩余花纹深度\nresidual pattern depth(mm)',
  '损坏部位\nDamage Position', '损坏轮位\nVehicle Position', 'Comments', '照片\nPicture', 'Physical Inspection ', 'whatsaap Inspection', 'Remarks',
];
const WIDTHS = [6, 22, 8, 7, 11, 12, 13, 11, 11, 12, 13, 17, 14, 10, 10, 10, 8, 11, 10, 22, 9, 13, 20, 14, 11, 22];

function row(c: Claim, sNo: number): (string | number)[] {
  const v = (x: number | null | undefined) => (x === null || x === undefined ? '' : x);
  const remarks = [c.remarks, c.dealerChecked && c.dealerChecked !== c.distributor ? c.dealerChecked : ''].filter(Boolean).join(' · ');
  return [
    sNo, c.distributor, c.bilty, c.dot, c.fitmentDate ? fmtDate(c.fitmentDate) : '', fmtDate(c.happenedDate), c.location, c.truckType,
    c.driverName, c.truckNumber, c.brand, c.tyreSize, c.tyreNumber, v(c.loadTons), v(c.operatingDistanceKm), v(c.kmCovered), v(c.speedKmh),
    c.roadCondition, v(c.residualDepthMm), c.damage, c.vehiclePosition, c.decision === 'Pending' ? '' : c.decision, '', c.inspectedBy,
    c.whatsappInspection, remarks,
  ];
}

/**
 * Builds one claim workbook (e.g. one brand, one month, one dealer visit).
 * S No # restarts at 1 inside the file; the defect photo goes in the Picture column.
 */
export async function buildClaimWorkbook(claims: Claim[], sheetName: string): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName.slice(0, 31));
  ws.addRow(CLAIM_HEADERS);
  const head = ws.getRow(1);
  head.height = 48;
  head.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } };
    cell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
  });
  WIDTHS.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  for (let i = 0; i < claims.length; i++) {
    const c = claims[i];
    const r = ws.addRow(row(c, i + 1));
    r.height = 62;
    r.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    const pid = c.photos?.defect?.[0];
    if (pid) {
      const blob = await getPhoto(pid);
      if (blob) {
        const img = wb.addImage({ base64: await blobToDataUrl(blob), extension: 'jpeg' });
        ws.addImage(img, { tl: { col: 22.05, row: i + 1.05 }, ext: { width: 136, height: 77 } });
      }
    }
  }
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  const out = await wb.xlsx.writeBuffer();
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function downloadClaimFile(claims: Claim[], fileName: string, sheetName: string) {
  const blob = await buildClaimWorkbook(claims, sheetName);
  download(blob, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}
