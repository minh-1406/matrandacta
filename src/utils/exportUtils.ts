import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ShadingType,
  VerticalAlign,
  PageOrientation,
} from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ExamHeaderConfig, GeneratedQuestion, MatrixRow, QuestionPointConfig } from '../types';
import {
  calculateRowLevelCounts,
  calculateRowScore,
  calculateSums,
  dsNote,
  FORMAT_LABELS,
  formatNumber,
  formatVietnameseNumber,
  getY,
  LEVEL_LABELS,
  getChapterSpans,
  stripCognitiveLevelPrefixes,
} from './matrixCalculations';
import { FOOTNOTES_TEXT } from '../constants/curriculumData';
import { parsePartIIITableQuestion, getSafeTrueFalseItems } from './questionChecker';

export function downloadBlob(data: Blob, filename: string): void {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function generateMatrixHTML(
  rows: MatrixRow[],
  points: QuestionPointConfig,
  title: string
): string {
  const S = calculateSums(rows, points);
  const Tt = S.T || 10;

  const headerHtml = `
    <tr>
      <th rowspan="4" style="background:#e8eefe;border:1px solid #999;padding:6px">TT</th>
      <th rowspan="4" style="background:#e8eefe;border:1px solid #999;padding:6px">Chủ đề/Chương</th>
      <th rowspan="4" style="background:#e8eefe;border:1px solid #999;padding:6px">Nội dung/đơn vị kiến thức</th>
      <th colspan="12" style="background:#e8eefe;border:1px solid #999;padding:6px">Mức độ đánh giá</th>
      <th colspan="3" rowspan="3" style="background:#e8eefe;border:1px solid #999;padding:6px">Tổng</th>
      <th rowspan="4" style="background:#e8eefe;border:1px solid #999;padding:6px">Tỉ lệ % điểm</th>
    </tr>
    <tr>
      <th colspan="9" style="background:#e8eefe;border:1px solid #999;padding:6px">TNKQ</th>
      <th colspan="3" rowspan="2" style="background:#e8eefe;border:1px solid #999;padding:6px">Tự luận</th>
    </tr>
    <tr>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;padding:6px">${FORMAT_LABELS[0]}</th>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;padding:6px">${FORMAT_LABELS[1]}<sup>2</sup></th>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;padding:6px">${FORMAT_LABELS[2]}<sup>3</sup></th>
    </tr>
    <tr>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
    </tr>`;

  const { spans, showCell } = getChapterSpans(rows);

  const rowsHtml = rows
    .map((r, i) => {
      const L3 = calculateRowLevelCounts(r);
      const rowScore = calculateRowScore(r, points);
      const cells = r.v
        .map((x, j) => {
          const f = (j / 3) | 0;
          const l = j % 3;
          if (f === 1) {
            const y = getY(r)[l];
            const qStr = x || (y > 0 ? 1 : 0);
            const itemStr = y ? ` (${y})` : '';
            return `<td style="border:1px solid #999;text-align:center">${(x || y) ? `${qStr}${itemStr}` : ''}</td>`;
          }
          return `<td style="border:1px solid #999;text-align:center">${x || ''}</td>`;
        })
        .join('');

      const cCell = showCell[i]
        ? `<td rowspan="${spans[i]}" style="border:1px solid #999;text-align:left;padding:4px 6px;vertical-align:middle">${r.c}</td>`
        : '';

      return `<tr>
        <td style="border:1px solid #999;text-align:center">${i + 1}</td>
        ${cCell}
        <td style="border:1px solid #999;text-align:left;padding:4px 6px">${r.n}</td>
        ${cells}
        ${L3.map((v) => `<td style="border:1px solid #999;text-align:center;font-weight:600">${v || ''}</td>`).join('')}
        <td style="border:1px solid #999;text-align:center;font-weight:600">${formatNumber((rowScore / Tt) * 100)}</td>
      </tr>`;
    })
    .join('');

  const footerHtml = `
    <tr>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;text-align:left;padding:4px 6px">Tổng số câu</th>
      ${S.t
        .map((v, j) => {
          const fi = (j / 3) | 0;
          if (fi === 1) {
            return `<th style="background:#e8eefe;border:1px solid #999;text-align:center">${v}</th>`;
          }
          return `<th style="background:#e8eefe;border:1px solid #999;text-align:center">${v}</th>`;
        })
        .join('')}
      ${S.tt.map((v) => `<th style="background:#e8eefe;border:1px solid #999;text-align:center">${v}</th>`).join('')}
      <th style="background:#e8eefe;border:1px solid #999"></th>
    </tr>
    <tr>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;text-align:left;padding:4px 6px">Tổng số điểm</th>
      ${S.f
        .map(
          (v, i) =>
            `<th colspan="3" style="background:#e8eefe;border:1px solid #999;text-align:center">${formatNumber(v)}${i === 0 ? '<sup>5</sup>' : ''}</th>`
        )
        .join('')}
      ${S.lv.map((v) => `<th style="background:#e8eefe;border:1px solid #999;text-align:center">${formatNumber(v)}</th>`).join('')}
      <th style="background:#e8eefe;border:1px solid #999"></th>
    </tr>
    <tr>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;text-align:left;padding:4px 6px">Tỉ lệ %</th>
      ${S.f
        .map(
          (v) =>
            `<th colspan="3" style="background:#e8eefe;border:1px solid #999;text-align:center">${formatNumber((v / Tt) * 100)}</th>`
        )
        .join('')}
      ${S.lv.map((v) => `<th style="background:#e8eefe;border:1px solid #999;text-align:center">${formatNumber((v / Tt) * 100)}</th>`).join('')}
      <th style="background:#e8eefe;border:1px solid #999"></th>
    </tr>`;

  // Specification table
  const specHeader = `
    <tr>
      <th rowspan="4" style="background:#e8eefe;border:1px solid #999;padding:6px">TT</th>
      <th rowspan="4" style="background:#e8eefe;border:1px solid #999;padding:6px">Chủ đề/Chương</th>
      <th rowspan="4" style="background:#e8eefe;border:1px solid #999;padding:6px">Nội dung/đơn vị kiến thức</th>
      <th rowspan="4" style="background:#e8eefe;border:1px solid #999;padding:6px;min-width:320px">Yêu cầu cần đạt</th>
      <th colspan="12" style="background:#e8eefe;border:1px solid #999;padding:6px">Số câu hỏi ở các mức độ đánh giá</th>
    </tr>
    <tr>
      <th colspan="9" style="background:#e8eefe;border:1px solid #999;padding:6px">TNKQ</th>
      <th colspan="3" rowspan="2" style="background:#e8eefe;border:1px solid #999;padding:6px">Tự luận</th>
    </tr>
    <tr>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;padding:6px">${FORMAT_LABELS[0]}</th>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;padding:6px">${FORMAT_LABELS[1]}</th>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;padding:6px">${FORMAT_LABELS[2]}</th>
    </tr>
    <tr>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
    </tr>`;

  const specRowsHtml = rows
    .map((r, i) => {
      const sp = r.s || ['', '', ''];
      const q0 = (r.v[0] || 0) + (r.v[3] || 0) + (r.v[6] || 0) + (r.v[9] || 0);
      const q1 = (r.v[1] || 0) + (r.v[4] || 0) + (r.v[7] || 0) + (r.v[10] || 0);
      const q2 = (r.v[2] || 0) + (r.v[5] || 0) + (r.v[8] || 0) + (r.v[11] || 0);

      const parts: string[] = [];
      if (q0 > 0 && sp[0]) parts.push(`<div><b>- Biết:</b> ${stripCognitiveLevelPrefixes(sp[0])}</div>`);
      if (q1 > 0 && sp[1]) parts.push(`<div><b>- Hiểu:</b> ${stripCognitiveLevelPrefixes(sp[1])}</div>`);
      if (q2 > 0 && sp[2]) parts.push(`<div><b>- Vận dụng:</b> ${stripCognitiveLevelPrefixes(sp[2])}</div>`);
      if (dsNote(r)) parts.push(`<div style="margin-top:4px;color:#1d4ed8;font-style:italic">${dsNote(r)}</div>`);

      const qDesc = parts.join('');

      const cells = r.v
        .map((x, j) => {
          const f = (j / 3) | 0;
          const l = j % 3;
          if (f === 1) {
            const y = getY(r)[l];
            const qStr = x || (y > 0 ? 1 : 0);
            const itemStr = y ? ` (${y})` : '';
            return `<td style="border:1px solid #999;text-align:center">${(x || y) ? `${qStr}${itemStr}` : ''}</td>`;
          }
          return `<td style="border:1px solid #999;text-align:center">${x || ''}</td>`;
        })
        .join('');

      const cCellSpec = showCell[i]
        ? `<td rowspan="${spans[i]}" style="border:1px solid #999;text-align:left;padding:4px 6px;vertical-align:middle">${r.c}</td>`
        : '';

      return `<tr>
        <td style="border:1px solid #999;text-align:center">${i + 1}</td>
        ${cCellSpec}
        <td style="border:1px solid #999;text-align:left;padding:4px 6px">${r.n}</td>
        <td style="border:1px solid #999;text-align:left;padding:4px 6px">${qDesc}</td>
        ${cells}
      </tr>`;
    })
    .join('');

  const notesHtml = `
    <div style="font-size:12px;color:#475569;margin-top:12px">
      <p><sup>2</sup> ${FOOTNOTES_TEXT[2]}</p>
      <p><sup>3</sup> ${FOOTNOTES_TEXT[3]}</p>
      <p><sup>4</sup> ${FOOTNOTES_TEXT[4]}</p>
      <p><sup>5</sup> ${FOOTNOTES_TEXT[5]}</p>
      <p><i>Ghi chú: ở dạng “Đúng – Sai”, mỗi ô ghi Số câu lớn (Số ý nhỏ); dòng Tổng số câu của dạng này tính theo số ý nhỏ; cột Tổng và số điểm tính theo số câu lớn (mỗi câu lớn gồm 4 ý).</i></p>
    </div>
  `;

  return `
    <div style="font-family:'Times New Roman',serif;padding:16px">
      <h2 style="text-align:center;margin-bottom:8px">${title.toUpperCase()}</h2>
      <h3 style="margin-top:16px;margin-bottom:8px">1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ</h3>
      <table border="1" cellpadding="4" style="border-collapse:collapse;width:100%;font-size:13px">
        <thead>${headerHtml}</thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>${footerHtml}</tfoot>
      </table>
      ${notesHtml}
      <h3 style="margin-top:24px;margin-bottom:8px;page-break-before:always">2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ</h3>
      <table border="1" cellpadding="4" style="border-collapse:collapse;width:100%;font-size:13px">
        <thead>${specHeader}</thead>
        <tbody>${specRowsHtml}</tbody>
        <tfoot>
          <tr>
            <th colspan="4" style="background:#e8eefe;border:1px solid #999;text-align:left;padding:4px 6px">Tổng số câu</th>
            ${S.t
              .map((v, j) => {
                const fi = (j / 3) | 0;
                const l = j % 3;
                if (fi === 1) {
                  return `<th style="background:#e8eefe;border:1px solid #999;text-align:center">${S.qDS[l]} (${v})</th>`;
                }
                return `<th style="background:#e8eefe;border:1px solid #999;text-align:center">${v}</th>`;
              })
              .join('')}
          </tr>
          <tr>
            <th colspan="4" style="background:#e8eefe;border:1px solid #999;text-align:left;padding:4px 6px">Tổng số điểm</th>
            ${S.f
              .map(
                (v) =>
                  `<th colspan="3" style="background:#e8eefe;border:1px solid #999;text-align:center">${formatNumber(v)}</th>`
              )
              .join('')}
          </tr>
          <tr>
            <th colspan="4" style="background:#e8eefe;border:1px solid #999;text-align:left;padding:4px 6px">Tỉ lệ %</th>
            ${S.f
              .map(
                (v) =>
                  `<th colspan="3" style="background:#e8eefe;border:1px solid #999;text-align:center">${formatNumber((v / Tt) * 100)}%</th>`
              )
              .join('')}
          </tr>
        </tfoot>
      </table>
      <div style="font-size:12px;color:#475569;margin-top:12px">
        <p><sup>6</sup> ${FOOTNOTES_TEXT[6]}</p>
      </div>
    </div>
  `;
}

export function copyHTMLToClipboard(html: string): Promise<boolean> {
  const fallback = () => {
    const d = document.createElement('div');
    d.innerHTML = html;
    d.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(d);
    const r = document.createRange();
    r.selectNode(d);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(r);
    try {
      document.execCommand('copy');
      d.remove();
      return true;
    } catch {
      d.remove();
      return false;
    }
  };

  try {
    return navigator.clipboard
      .write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })])
      .then(() => true)
      .catch(() => fallback());
  } catch {
    return Promise.resolve(fallback());
  }
}

export async function exportMatrixWord(
  rows: MatrixRow[],
  points: QuestionPointConfig,
  title: string,
  filename: string
): Promise<void> {
  const S = calculateSums(rows, points);
  const Tt = S.T || 10;

  // 1. Matrix Header Cells
  const headerCells = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TT', bold: true })], alignment: AlignmentType.CENTER })], rowSpan: 4, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Chủ đề/Chương', bold: true })], alignment: AlignmentType.CENTER })], rowSpan: 4, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nội dung/đơn vị kiến thức', bold: true })], alignment: AlignmentType.CENTER })], rowSpan: 4, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Mức độ đánh giá', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 12, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tổng', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3, rowSpan: 3, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tỉ lệ %', bold: true })], alignment: AlignmentType.CENTER })], rowSpan: 4, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TNKQ', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 9, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tự luận', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3, rowSpan: 2, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nhiều lựa chọn', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Đúng - Sai', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Trả lời ngắn', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'Biết', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Hiểu', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'VD', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Biết', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Hiểu', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'VD', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Biết', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Hiểu', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'VD', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Biết', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Hiểu', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'VD', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Biết', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Hiểu', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'VD', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
      ],
    }),
  ];

  // 2. Matrix Data Rows
  const dataRows = rows.map((r, i) => {
    const l3 = calculateRowLevelCounts(r);
    const rowScore = calculateRowScore(r, points);
    const cells: TableCell[] = [
      new TableCell({ children: [new Paragraph({ text: String(i + 1), alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ text: r.c })] }),
      new TableCell({ children: [new Paragraph({ text: r.n })] }),
    ];

    for (let j = 0; j < 12; j++) {
      const f = (j / 3) | 0;
      const l = j % 3;
      if (f === 1) {
        const y = getY(r)[l];
        const qCount = r.v[j] || (y > 0 ? 1 : 0);
        const cellText = (qCount || y) ? `${qCount}${y ? ` (${y})` : ''}` : '';
        cells.push(new TableCell({ children: [new Paragraph({ text: cellText, alignment: AlignmentType.CENTER })] }));
      } else {
        cells.push(new TableCell({ children: [new Paragraph({ text: r.v[j] ? String(r.v[j]) : '', alignment: AlignmentType.CENTER })] }));
      }
    }

    l3.forEach((v) => {
      cells.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v ? String(v) : '', bold: true })], alignment: AlignmentType.CENTER })] }));
    });
    cells.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatNumber((rowScore / Tt) * 100), bold: true })], alignment: AlignmentType.CENTER })] }));

    return new TableRow({ children: cells });
  });

  // 3. Matrix Footer Totals
  const totQCells: TableCell[] = [
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: 'Tổng số câu', bold: true })] })],
      columnSpan: 3,
      shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
    }),
  ];
  S.t.forEach((v, j) => {
    const fi = (j / 3) | 0;
    if (fi === 1) {
      totQCells.push(
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(v), bold: true })], alignment: AlignmentType.CENTER })],
          shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
        })
      );
    } else {
      totQCells.push(
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(v), bold: true })], alignment: AlignmentType.CENTER })],
          shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
        })
      );
    }
  });
  S.tt.forEach((v) => {
    totQCells.push(
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: String(v), bold: true })], alignment: AlignmentType.CENTER })],
        shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
      })
    );
  });
  totQCells.push(new TableCell({ children: [new Paragraph({ text: '' })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }));

  const totScoreCells: TableCell[] = [
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: 'Tổng số điểm', bold: true })] })],
      columnSpan: 3,
      shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
    }),
  ];
  S.f.forEach((v) => {
    totScoreCells.push(
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: formatNumber(v), bold: true })], alignment: AlignmentType.CENTER })],
        columnSpan: 3,
        shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
      })
    );
  });
  S.lv.forEach((v) => {
    totScoreCells.push(
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: formatNumber(v), bold: true })], alignment: AlignmentType.CENTER })],
        shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
      })
    );
  });
  totScoreCells.push(new TableCell({ children: [new Paragraph({ text: '' })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }));

  const totPctCells: TableCell[] = [
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: 'Tỉ lệ %', bold: true })] })],
      columnSpan: 3,
      shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
    }),
  ];
  S.f.forEach((v) => {
    totPctCells.push(
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: formatNumber((v / Tt) * 100), bold: true })], alignment: AlignmentType.CENTER })],
        columnSpan: 3,
        shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
      })
    );
  });
  S.lv.forEach((v) => {
    totPctCells.push(
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: formatNumber((v / Tt) * 100), bold: true })], alignment: AlignmentType.CENTER })],
        shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
      })
    );
  });
  totPctCells.push(new TableCell({ children: [new Paragraph({ text: '' })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }));

  const matrixTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      ...headerCells,
      ...dataRows,
      new TableRow({ children: totQCells }),
      new TableRow({ children: totScoreCells }),
      new TableRow({ children: totPctCells }),
    ],
  });

  // 4. Matrix Footnotes
  const footnotesParas = [
    new Paragraph({ children: [new TextRun({ text: `(2) ${FOOTNOTES_TEXT[2]}`, size: 20 })], spacing: { before: 80 } }),
    new Paragraph({ children: [new TextRun({ text: `(3) ${FOOTNOTES_TEXT[3]}`, size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: `(4) ${FOOTNOTES_TEXT[4]}`, size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: `(5) ${FOOTNOTES_TEXT[5]}`, size: 20 })] }),
    new Paragraph({
      children: [new TextRun({ text: 'Ghi chú: ở dạng “Đúng – Sai”, mỗi ô ghi Số câu lớn (Số ý nhỏ); dòng Tổng số câu của dạng này tính theo số ý nhỏ; cột Tổng và số điểm tính theo số câu lớn (mỗi câu lớn gồm 4 ý).', italics: true, size: 20 })],
      spacing: { after: 180 },
    }),
  ];

  // 5. Specification Table Header
  const specHeaderCells = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TT', bold: true })], alignment: AlignmentType.CENTER })], rowSpan: 4, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Chủ đề/Chương', bold: true })], alignment: AlignmentType.CENTER })], rowSpan: 4, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nội dung/đơn vị kiến thức', bold: true })], alignment: AlignmentType.CENTER })], rowSpan: 4, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Yêu cầu cần đạt', bold: true })], alignment: AlignmentType.CENTER })], rowSpan: 4, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Số câu hỏi ở các mức độ đánh giá', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 12, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TNKQ', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 9, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tự luận', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3, rowSpan: 2, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nhiều lựa chọn', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Đúng - Sai', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Trả lời ngắn', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'Biết', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Hiểu', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'VD', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Biết', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Hiểu', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'VD', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Biết', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Hiểu', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'VD', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Biết', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Hiểu', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'VD', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
      ],
    }),
  ];

  // 6. Specification Data Rows
  const specDataRows = rows.map((r, i) => {
    const sp = r.s || ['', '', ''];
    const q0 = (r.v[0] || 0) + (r.v[3] || 0) + (r.v[6] || 0) + (r.v[9] || 0);
    const q1 = (r.v[1] || 0) + (r.v[4] || 0) + (r.v[7] || 0) + (r.v[10] || 0);
    const q2 = (r.v[2] || 0) + (r.v[5] || 0) + (r.v[8] || 0) + (r.v[11] || 0);

    const specParas: Paragraph[] = [];
    if (q0 > 0 && sp[0]) {
      specParas.push(new Paragraph({ children: [new TextRun({ text: '- Biết: ', bold: true }), new TextRun({ text: stripCognitiveLevelPrefixes(sp[0]) })] }));
    }
    if (q1 > 0 && sp[1]) {
      specParas.push(new Paragraph({ children: [new TextRun({ text: '- Hiểu: ', bold: true }), new TextRun({ text: stripCognitiveLevelPrefixes(sp[1]) })] }));
    }
    if (q2 > 0 && sp[2]) {
      specParas.push(new Paragraph({ children: [new TextRun({ text: '- Vận dụng: ', bold: true }), new TextRun({ text: stripCognitiveLevelPrefixes(sp[2]) })] }));
    }
    if (dsNote(r)) {
      specParas.push(
        new Paragraph({ children: [new TextRun({ text: dsNote(r), italics: true, color: '1D4ED8' })], spacing: { before: 40 } })
      );
    }

    const cells: TableCell[] = [
      new TableCell({ children: [new Paragraph({ text: String(i + 1), alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ text: r.c })] }),
      new TableCell({ children: [new Paragraph({ text: r.n })] }),
      new TableCell({ children: specParas }),
    ];

    for (let j = 0; j < 12; j++) {
      const f = (j / 3) | 0;
      const l = j % 3;
      if (f === 1) {
        const y = getY(r)[l];
        const qCount = r.v[j] || (y > 0 ? 1 : 0);
        const cellText = (qCount || y) ? `${qCount}${y ? ` (${y})` : ''}` : '';
        cells.push(new TableCell({ children: [new Paragraph({ text: cellText, alignment: AlignmentType.CENTER })] }));
      } else {
        cells.push(new TableCell({ children: [new Paragraph({ text: r.v[j] ? String(r.v[j]) : '', alignment: AlignmentType.CENTER })] }));
      }
    }

    return new TableRow({ children: cells });
  });

  // 7. Specification Footer Totals
  const specTotQCells: TableCell[] = [
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: 'Tổng số câu', bold: true })] })],
      columnSpan: 4,
      shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
    }),
  ];
  S.t.forEach((v, j) => {
    const fi = (j / 3) | 0;
    if (fi === 1) {
      specTotQCells.push(
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(v), bold: true })], alignment: AlignmentType.CENTER })],
          shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
        })
      );
    } else {
      specTotQCells.push(
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(v), bold: true })], alignment: AlignmentType.CENTER })],
          shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
        })
      );
    }
  });

  const specTotScoreCells: TableCell[] = [
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: 'Tổng số điểm', bold: true })] })],
      columnSpan: 4,
      shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
    }),
  ];
  S.f.forEach((v) => {
    specTotScoreCells.push(
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: formatNumber(v), bold: true })], alignment: AlignmentType.CENTER })],
        columnSpan: 3,
        shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
      })
    );
  });

  const specTotPctCells: TableCell[] = [
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: 'Tỉ lệ %', bold: true })] })],
      columnSpan: 4,
      shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
    }),
  ];
  S.f.forEach((v) => {
    specTotPctCells.push(
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: `${formatNumber((v / Tt) * 100)}%`, bold: true })], alignment: AlignmentType.CENTER })],
        columnSpan: 3,
        shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
      })
    );
  });

  const specTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      ...specHeaderCells,
      ...specDataRows,
      new TableRow({ children: specTotQCells }),
      new TableRow({ children: specTotScoreCells }),
      new TableRow({ children: specTotPctCells }),
    ],
  });

  const specFootnotesPara = new Paragraph({
    children: [new TextRun({ text: `(6) ${FOOTNOTES_TEXT[6]}`, size: 20 })],
    spacing: { before: 80 },
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ', bold: true, size: 24 })],
            spacing: { before: 100, after: 100 },
          }),
          matrixTable,
          ...footnotesParas,
          new Paragraph({
            children: [new TextRun({ text: '2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ', bold: true, size: 24 })],
            spacing: { before: 240, after: 100 },
            pageBreakBefore: true,
          }),
          specTable,
          specFootnotesPara,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filename}.docx`);
}

export async function exportMatrixExcel(
  rows: MatrixRow[],
  points: QuestionPointConfig,
  filename: string
): Promise<void> {
  const S = calculateSums(rows, points);
  const Tt = S.T || 10;

  // Build Sheet 1: Ma tran
  const A1: any[][] = [];
  const M1: any[] = [];

  const addMerge1 = (r1: number, c1: number, r2: number, c2: number) =>
    M1.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });

  // Rows 0 to 3
  const row0 = ['TT', 'Chủ đề/Chương', 'Nội dung/đơn vị kiến thức'];
  for (let i = 0; i < 15; i++) row0.push('Mức độ đánh giá');
  row0.push('Tổng', 'Tổng', 'Tổng', 'Tỉ lệ % điểm');
  A1.push(row0);

  const row1 = ['', '', ''];
  for (let i = 0; i < 12; i++) row1.push('TNKQ');
  row1.push('Tự luận', 'Tự luận', 'Tự luận', '', '', '', '');
  A1.push(row1);

  const row2 = ['', '', ''];
  for (let i = 0; i < 3; i++) row2.push('Nhiều lựa chọn');
  for (let i = 0; i < 6; i++) row2.push('Đúng - Sai');
  for (let i = 0; i < 3; i++) row2.push('Trả lời ngắn');
  row2.push('Tự luận', 'Tự luận', 'Tự luận', '', '', '', '');
  A1.push(row2);

  const row3 = [
    '',
    '',
    '',
    'Biết',
    'Hiểu',
    'Vận dụng',
    'Biết',
    '',
    'Hiểu',
    '',
    'Vận dụng',
    '',
    'Biết',
    'Hiểu',
    'Vận dụng',
    'Biết',
    'Hiểu',
    'Vận dụng',
    'Biết',
    'Hiểu',
    'Vận dụng',
    '',
  ];
  A1.push(row3);

  // Merges for header
  addMerge1(0, 0, 3, 0); // TT
  addMerge1(0, 1, 3, 1); // Chu de
  addMerge1(0, 2, 3, 2); // Noi dung
  addMerge1(0, 3, 0, 17); // Muc do danh gia
  addMerge1(1, 3, 1, 14); // TNKQ
  addMerge1(1, 15, 2, 17); // Tu luan
  addMerge1(2, 3, 2, 5); // NLC
  addMerge1(2, 6, 2, 11); // DS
  addMerge1(2, 12, 2, 14); // TLN
  addMerge1(3, 6, 3, 7); // DS B
  addMerge1(3, 8, 3, 9); // DS H
  addMerge1(3, 10, 3, 11); // DS V
  addMerge1(0, 18, 2, 20); // Tong
  addMerge1(0, 21, 3, 21); // Ti le %

  // Data rows
  rows.forEach((r, i) => {
    const l3 = calculateRowLevelCounts(r);
    const rScore = calculateRowScore(r, points);
    const row = [i + 1, r.c, r.n];
    for (let j = 0; j < 12; j++) {
      const f = (j / 3) | 0;
      const l = j % 3;
      if (f === 1) {
        const y = getY(r)[l];
        row.push(r.v[j] || '', y ? `(${y})` : '');
      } else {
        row.push(r.v[j] || '');
      }
    }
    row.push(...l3, formatNumber((rScore / Tt) * 100));
    A1.push(row);
  });

  // Totals
  const totalRowIndex = A1.length;
  const totQRow: (string | number)[] = ['Tổng số câu', '', ''];
  for (let j = 0; j < 12; j++) {
    const f = (j / 3) | 0;
    if (f === 1) {
      totQRow.push(S.t[j], '');
      addMerge1(totalRowIndex, totQRow.length - 2, totalRowIndex, totQRow.length - 1);
    } else {
      totQRow.push(S.t[j]);
    }
  }
  totQRow.push(...S.tt, '');
  addMerge1(totalRowIndex, 0, totalRowIndex, 2);
  A1.push(totQRow);

  const totScoreIndex = A1.length;
  const totScoreRow = ['Tổng số điểm', '', ''];
  totScoreRow.push(
    formatNumber(S.f[0]),
    '',
    '',
    formatNumber(S.f[1]),
    '',
    '',
    '',
    '',
    '',
    formatNumber(S.f[2]),
    '',
    '',
    formatNumber(S.f[3]),
    '',
    ''
  );
  addMerge1(totScoreIndex, 0, totScoreIndex, 2);
  addMerge1(totScoreIndex, 3, totScoreIndex, 5);
  addMerge1(totScoreIndex, 6, totScoreIndex, 11);
  addMerge1(totScoreIndex, 12, totScoreIndex, 14);
  addMerge1(totScoreIndex, 15, totScoreIndex, 17);
  totScoreRow.push(formatNumber(S.lv[0]), formatNumber(S.lv[1]), formatNumber(S.lv[2]), '');
  A1.push(totScoreRow);

  const ws1 = XLSX.utils.aoa_to_sheet(A1);
  ws1['!merges'] = M1;

  // Build Sheet 2: Ban dac ta
  const A2: any[][] = [];
  const M2: any[] = [];
  const addMerge2 = (r1: number, c1: number, r2: number, c2: number) =>
    M2.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });

  const sRow0 = ['TT', 'Chủ đề/Chương', 'Nội dung/đơn vị kiến thức', 'Yêu cầu cần đạt'];
  for (let i = 0; i < 15; i++) sRow0.push('Số câu hỏi ở các mức độ đánh giá');
  A2.push(sRow0);

  const sRow1 = ['', '', '', ''];
  for (let i = 0; i < 12; i++) sRow1.push('TNKQ');
  sRow1.push('Tự luận', 'Tự luận', 'Tự luận');
  A2.push(sRow1);

  const sRow2 = ['', '', '', ''];
  for (let i = 0; i < 3; i++) sRow2.push('Nhiều lựa chọn');
  for (let i = 0; i < 6; i++) sRow2.push('Đúng - Sai');
  for (let i = 0; i < 3; i++) sRow2.push('Trả lời ngắn');
  sRow2.push('Tự luận', 'Tự luận', 'Tự luận');
  A2.push(sRow2);

  const sRow3 = [
    '',
    '',
    '',
    '',
    'Biết',
    'Hiểu',
    'Vận dụng',
    'Biết',
    '',
    'Hiểu',
    '',
    'Vận dụng',
    '',
    'Biết',
    'Hiểu',
    'Vận dụng',
    'Biết',
    'Hiểu',
    'Vận dụng',
  ];
  A2.push(sRow3);

  addMerge2(0, 0, 3, 0);
  addMerge2(0, 1, 3, 1);
  addMerge2(0, 2, 3, 2);
  addMerge2(0, 3, 3, 3);
  addMerge2(0, 4, 0, 18);
  addMerge2(1, 4, 1, 15);
  addMerge2(1, 16, 2, 18);
  addMerge2(2, 4, 2, 6);
  addMerge2(2, 7, 2, 12);
  addMerge2(2, 13, 2, 15);
  addMerge2(3, 7, 3, 8);
  addMerge2(3, 9, 3, 10);
  addMerge2(3, 11, 3, 12);

  rows.forEach((r, i) => {
    const sp = r.s || ['', '', ''];
    const q0 = (r.v[0] || 0) + (r.v[3] || 0) + (r.v[6] || 0) + (r.v[9] || 0);
    const q1 = (r.v[1] || 0) + (r.v[4] || 0) + (r.v[7] || 0) + (r.v[10] || 0);
    const q2 = (r.v[2] || 0) + (r.v[5] || 0) + (r.v[8] || 0) + (r.v[11] || 0);

    const specLines: string[] = [];
    if (q0 > 0 && sp[0]) specLines.push(`- Biết: ${stripCognitiveLevelPrefixes(sp[0])}`);
    if (q1 > 0 && sp[1]) specLines.push(`- Hiểu: ${stripCognitiveLevelPrefixes(sp[1])}`);
    if (q2 > 0 && sp[2]) specLines.push(`- Vận dụng: ${stripCognitiveLevelPrefixes(sp[2])}`);
    if (dsNote(r)) specLines.push(dsNote(r));
    const specText = specLines.join('\n');

    const row = [i + 1, r.c, r.n, specText];
    for (let j = 0; j < 12; j++) {
      const f = (j / 3) | 0;
      const l = j % 3;
      if (f === 1) {
        const y = getY(r)[l];
        row.push(r.v[j] || '', y ? `(${y})` : '');
      } else {
        row.push(r.v[j] || '');
      }
    }
    A2.push(row);
  });

  const specTotalRowIndex = A2.length;
  const totQRow2: (string | number)[] = ['Tổng số câu', '', '', ''];
  for (let j = 0; j < 12; j++) {
    const f = (j / 3) | 0;
    if (f === 1) {
      totQRow2.push(S.t[j], '');
      addMerge2(specTotalRowIndex, totQRow2.length - 2, specTotalRowIndex, totQRow2.length - 1);
    } else {
      totQRow2.push(S.t[j]);
    }
  }
  addMerge2(specTotalRowIndex, 0, specTotalRowIndex, 3);
  A2.push(totQRow2);

  const specTotalScoreIndex = A2.length;
  const totScoreRow2 = ['Tổng số điểm', '', '', ''];
  totScoreRow2.push(
    formatNumber(S.f[0]),
    '',
    '',
    formatNumber(S.f[1]),
    '',
    '',
    '',
    '',
    '',
    formatNumber(S.f[2]),
    '',
    '',
    formatNumber(S.f[3]),
    '',
    ''
  );
  addMerge2(specTotalScoreIndex, 0, specTotalScoreIndex, 3);
  addMerge2(specTotalScoreIndex, 4, specTotalScoreIndex, 6);
  addMerge2(specTotalScoreIndex, 7, specTotalScoreIndex, 12);
  addMerge2(specTotalScoreIndex, 13, specTotalScoreIndex, 15);
  addMerge2(specTotalScoreIndex, 16, specTotalScoreIndex, 18);
  A2.push(totScoreRow2);

  const specTotalPctIndex = A2.length;
  const totPctRow2 = ['Tỉ lệ %', '', '', ''];
  totPctRow2.push(
    `${formatNumber((S.f[0] / Tt) * 100)}%`,
    '',
    '',
    `${formatNumber((S.f[1] / Tt) * 100)}%`,
    '',
    '',
    '',
    '',
    '',
    `${formatNumber((S.f[2] / Tt) * 100)}%`,
    '',
    '',
    `${formatNumber((S.f[3] / Tt) * 100)}%`,
    '',
    ''
  );
  addMerge2(specTotalPctIndex, 0, specTotalPctIndex, 3);
  addMerge2(specTotalPctIndex, 4, specTotalPctIndex, 6);
  addMerge2(specTotalPctIndex, 7, specTotalPctIndex, 12);
  addMerge2(specTotalPctIndex, 13, specTotalPctIndex, 15);
  addMerge2(specTotalPctIndex, 16, specTotalPctIndex, 18);
  A2.push(totPctRow2);

  const ws2 = XLSX.utils.aoa_to_sheet(A2);
  ws2['!merges'] = M2;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Ma trận');
  XLSX.utils.book_append_sheet(wb, ws2, 'Bản đặc tả');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([buf], { type: 'application/octet-stream' }), `${filename}.xlsx`);
}

export async function exportMatrixPDF(htmlContent: string, filename: string): Promise<void> {
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:1400px;background:#fff;color:#000;padding:24px;font-family:"Times New Roman",serif';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 1.5,
      backgroundColor: '#ffffff',
      windowWidth: 1440,
    });
    container.remove();

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth() - 40;
    const pageHeight = pdf.internal.pageSize.getHeight() - 40;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    let offset = 0;
    while (offset < imgHeight) {
      if (offset > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 20, 20 - offset, pageWidth, imgHeight);
      offset += pageHeight;
    }

    pdf.save(`${filename}.pdf`);
  } catch (err) {
    container.remove();
    throw err;
  }
}

export async function exportExamWord(
  sets: GeneratedQuestion[][],
  examTitle: string,
  mon: string,
  kh: string,
  ki: string,
  points: QuestionPointConfig,
  filename: string,
  examCodes: string[],
  headerConfig?: ExamHeaderConfig
): Promise<void> {
  const paragraphs: (Paragraph | Table)[] = [];

  const soGD = headerConfig?.soGiaoDuc?.trim() || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ..........';
  const truong = headerConfig?.truongThpt?.trim() || 'TRƯỜNG THPT ..........................';
  const tenKy = headerConfig?.tenKyThi?.trim() || (ki ? `ĐỀ KIỂM TRA ${ki.toUpperCase()}` : 'ĐỀ KIỂM TRA ĐỊNH KÌ');
  const namHoc = headerConfig?.namHoc?.trim() || '2024 - 2025';
  const thoiGian = headerConfig?.thoiGianLamBai?.trim() || '50';
  const ghiChuTrang = headerConfig?.ghiChuDeThi?.trim() || '(Đề thi có ... trang)';

  sets.forEach((setQuestions, sIdx) => {
    if (sIdx > 0) {
      paragraphs.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    }

    const isFourDigits = (examCodes && examCodes[0] && examCodes[0].length === 4);
    const currentCode = (examCodes && examCodes[sIdx]) ? examCodes[sIdx] : (isFourDigits ? String(1001 + sIdx) : String(101 + sIdx));

    const groups: Record<string, GeneratedQuestion[]> = {
      NLC: setQuestions.filter((q) => q.d === 'NLC'),
      DS: setQuestions.filter((q) => q.d === 'DS'),
      TLN: setQuestions.filter((q) => q.d === 'TLN'),
      TL: setQuestions.filter((q) => q.d === 'TL'),
    };

    // Header Table (Borderless, Times New Roman, font sizes 12-13pt)
    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: 'none' as any, size: 0, color: 'auto' },
        bottom: { style: 'none' as any, size: 0, color: 'auto' },
        left: { style: 'none' as any, size: 0, color: 'auto' },
        right: { style: 'none' as any, size: 0, color: 'auto' },
        insideHorizontal: { style: 'none' as any, size: 0, color: 'auto' },
        insideVertical: { style: 'none' as any, size: 0, color: 'auto' },
      },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: soGD, bold: true, font: 'Times New Roman', size: 24 }),
                    new TextRun({ break: 1, text: truong, bold: true, font: 'Times New Roman', size: 24 }),
                    new TextRun({ break: 1, text: '----------', font: 'Times New Roman', size: 24 }),
                    new TextRun({
                      break: 1,
                      text: ghiChuTrang,
                      italics: true,
                      font: 'Times New Roman',
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `${tenKy} - NĂM HỌC ${namHoc}`,
                      bold: true,
                      font: 'Times New Roman',
                      size: 26,
                    }),
                    new TextRun({
                      break: 1,
                      text: `MÔN: ${mon.toUpperCase()} - LỚP ${kh}`,
                      bold: true,
                      font: 'Times New Roman',
                      size: 26,
                    }),
                    new TextRun({
                      break: 1,
                      text: `Thời gian làm bài: ${thoiGian} phút (không kể thời gian phát đề)`,
                      italics: true,
                      font: 'Times New Roman',
                      size: 24,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    paragraphs.push(headerTable);

    // Candidate Info & Unfilled Rectangular Exam Code Box Table
    const candidateTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: 'none' as any, size: 0, color: 'auto' },
        bottom: { style: 'none' as any, size: 0, color: 'auto' },
        left: { style: 'none' as any, size: 0, color: 'auto' },
        right: { style: 'none' as any, size: 0, color: 'auto' },
        insideHorizontal: { style: 'none' as any, size: 0, color: 'auto' },
        insideVertical: { style: 'none' as any, size: 0, color: 'auto' },
      },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Họ và tên thí sinh: ...................................................................',
                      bold: true,
                      font: 'Times New Roman',
                      size: 24,
                    }),
                    new TextRun({
                      break: 1,
                      text: 'Số báo danh: .............................',
                      bold: true,
                      font: 'Times New Roman',
                      size: 24,
                    }),
                  ],
                  spacing: { before: 40, after: 40 },
                }),
              ],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: 'single' as any, size: 8, color: '000000' },
                    bottom: { style: 'single' as any, size: 8, color: '000000' },
                    left: { style: 'single' as any, size: 8, color: '000000' },
                    right: { style: 'single' as any, size: 8, color: '000000' },
                  },
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              children: [
                                new TextRun({
                                  text: `Mã đề thi ${currentCode}`,
                                  bold: true,
                                  font: 'Times New Roman',
                                  size: 26,
                                }),
                              ],
                              spacing: { before: 60, after: 60 },
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    paragraphs.push(candidateTable);
    paragraphs.push(new Paragraph({ children: [], spacing: { after: 120 } }));

    const objectiveScore =
      groups.NLC.length * (points.tn || 0.25) +
      groups.DS.length * (points.ds || 1) +
      groups.TLN.length * (points.tln || 0.5);
    const rawTlTotal = groups.TL.length * (points.tl || 1);
    const totalTlScore =
      objectiveScore > 0 &&
      objectiveScore < 10 &&
      Math.abs(objectiveScore + rawTlTotal - 10) > 0.01 &&
      points.tl === 1
        ? Math.round((10 - objectiveScore) * 100) / 100
        : Math.round((rawTlTotal > 0 ? rawTlTotal : 3) * 100) / 100;
    const tlScoreStr = Number.isInteger(totalTlScore)
      ? `${totalTlScore},0`
      : String(totalTlScore).replace('.', ',');

    const appendStimulusSourcesToWord = (srcs?: any[]) => {
      (srcs || []).forEach((s) => {
        if (s.text) {
          paragraphs.push(
            new Paragraph({
              keepLines: true,
              keepNext: true,
              children: [new TextRun({ text: s.text, italics: true, font: 'Times New Roman', size: 25 })],
              spacing: { after: 40 },
            })
          );
        }
        if (s.table && s.table.head && s.table.rows) {
          if (s.table.title) {
            paragraphs.push(
              new Paragraph({
                keepLines: true,
                keepNext: true,
                children: [new TextRun({ text: s.table.title, bold: true, font: 'Times New Roman', size: 25 })],
                spacing: { after: 40 },
              })
            );
          }
          const docxTableRows = [
            new TableRow({
              cantSplit: true,
              children: s.table.head.map(
                (h: string) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: h, bold: true, font: 'Times New Roman', size: 24 })],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
                  })
              ),
            }),
            ...s.table.rows.map(
              (row: string[]) =>
                new TableRow({
                  cantSplit: true,
                  children: row.map(
                    (cell: string, cIdx: number) =>
                      new TableCell({
                        children: [
                          new Paragraph({
                            alignment: cIdx === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: formatVietnameseNumber(cell),
                                font: 'Times New Roman',
                                size: 24,
                              }),
                            ],
                          }),
                        ],
                      })
                  ),
                })
            ),
          ];
          paragraphs.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: docxTableRows,
            })
          );
        }
        if (s.chart && s.chart.title) {
          paragraphs.push(
            new Paragraph({
              keepLines: true,
              keepNext: true,
              children: [
                new TextRun({
                  text: `[Biểu đồ: ${s.chart.title}]`,
                  bold: true,
                  italics: true,
                  font: 'Times New Roman',
                  size: 25,
                }),
              ],
              spacing: { after: 40 },
            })
          );
          (s.chart.series || []).forEach((ser: any) => {
            paragraphs.push(
              new Paragraph({
                keepLines: true,
                keepNext: true,
                children: [
                  new TextRun({
                    text: `- ${ser.name || 'Số liệu'}: ${(ser.values || [])
                      .map((v: any) => formatVietnameseNumber(v))
                      .join(', ')}`,
                    italics: true,
                    font: 'Times New Roman',
                    size: 25,
                  }),
                ],
                spacing: { after: 20 },
              })
            );
          });
        }
        if (s.fig) {
          paragraphs.push(
            new Paragraph({
              keepLines: true,
              keepNext: true,
              children: [
                new TextRun({
                  text: `[Hình vẽ / Sơ đồ / Bản đồ: ${s.fig}]`,
                  bold: true,
                  italics: true,
                  font: 'Times New Roman',
                  size: 25,
                }),
              ],
              spacing: { after: 40 },
            })
          );
        }
        if (s.src) {
          const cleanSrc = s.src.replace(/^(Chương \d+|Câu \d+|Nguồn:)\s*/gi, '').trim();
          if (cleanSrc) {
            paragraphs.push(
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                keepLines: true,
                keepNext: true,
                children: [
                  new TextRun({
                    text: `(Nguồn: ${cleanSrc})`,
                    italics: true,
                    font: 'Times New Roman',
                    size: 23,
                  }),
                ],
                spacing: { before: 20, after: 40 },
              })
            );
          }
        }
      });
    };

    // Part I: NLC
    if (groups.NLC.length > 0) {
      paragraphs.push(
        new Paragraph({
          keepLines: true,
          keepNext: true,
          children: [
            new TextRun({
              text: 'PHẦN I. Câu trả lời trắc nghiệm nhiều phương án lựa chọn. ',
              bold: true,
              font: 'Times New Roman',
              size: 26,
            }),
            new TextRun({
              text: `Học sinh trả lời từ câu 1 đến câu ${groups.NLC.length}. Mỗi câu hỏi học sinh chỉ chọn một phương án.`,
              font: 'Times New Roman',
              size: 26,
            }),
          ],
          spacing: { before: 180, after: 100 },
        })
      );

      groups.NLC.forEach((q, i) => {
        paragraphs.push(
          new Paragraph({
            keepLines: true,
            keepNext: true,
            children: [
              new TextRun({ text: `Câu ${i + 1}. `, bold: true, font: 'Times New Roman', size: 26 }),
              new TextRun({ text: q.stem, font: 'Times New Roman', size: 26 }),
            ],
            spacing: { before: 80, after: 40 },
          })
        );

        const correctOptChar = String(q.ans || '').trim().charAt(0).toUpperCase();

        (q.opts || []).forEach((opt, j) => {
          const optChar = 'ABCD'[j];
          const isCorrect = correctOptChar === optChar;
          const isLastOpt = j === (q.opts || []).length - 1;

          paragraphs.push(
            new Paragraph({
              keepLines: true,
              keepNext: !isLastOpt,
              children: [
                new TextRun({ text: '   ', font: 'Times New Roman', size: 26 }),
                new TextRun({
                  text: `${optChar}.`,
                  bold: true,
                  underline: isCorrect ? {} : undefined,
                  font: 'Times New Roman',
                  size: 26,
                }),
                new TextRun({ text: ` ${opt}`, font: 'Times New Roman', size: 26 }),
              ],
              spacing: { after: 20 },
            })
          );
        });
      });
    }

    // Part II: DS
    if (groups.DS.length > 0) {
      paragraphs.push(
        new Paragraph({
          keepLines: true,
          keepNext: true,
          children: [
            new TextRun({
              text: 'PHẦN II. Câu trắc nghiệm đúng sai. ',
              bold: true,
              font: 'Times New Roman',
              size: 26,
            }),
            new TextRun({
              text: `Học sinh trả lời từ câu 1 đến câu ${groups.DS.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, học sinh chọn đúng hoặc sai.`,
              font: 'Times New Roman',
              size: 26,
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      groups.DS.forEach((q, i) => {
        const hasTable = !!(q.srcs && q.srcs.some((s) => s.k === 'table' || (s as any).table));
        const stemText = hasTable ? 'Cho bảng số liệu sau:' : q.stem;
        paragraphs.push(
          new Paragraph({
            keepLines: true,
            keepNext: true,
            children: [
              new TextRun({ text: `Câu ${i + 1}. `, bold: true, font: 'Times New Roman', size: 26 }),
              new TextRun({ text: stemText, font: 'Times New Roman', size: 26 }),
            ],
            spacing: { before: 100, after: 40 },
          })
        );

        appendStimulusSourcesToWord(q.srcs);

        const safeItems = getSafeTrueFalseItems(q.items, sIdx * 5 + i);
        safeItems.forEach((it, j) => {
          const isLastSub = j === safeItems.length - 1;
          paragraphs.push(
            new Paragraph({
              keepLines: true,
              keepNext: !isLastSub,
              children: [
                new TextRun({ text: '   ', font: 'Times New Roman', size: 26 }),
                new TextRun({
                  text: `${'abcd'[j]})`,
                  bold: true,
                  underline: it.a ? {} : undefined,
                  font: 'Times New Roman',
                  size: 26,
                }),
                new TextRun({ text: ` ${it.t}`, font: 'Times New Roman', size: 26 }),
              ],
              spacing: { after: 20 },
            })
          );
        });
      });
    }

    // Part III: TLN
    if (groups.TLN.length > 0) {
      paragraphs.push(
        new Paragraph({
          keepLines: true,
          keepNext: true,
          children: [
            new TextRun({
              text: 'PHẦN III. Câu trắc nghiệm yêu cầu trả lời ngắn. ',
              bold: true,
              font: 'Times New Roman',
              size: 26,
            }),
            new TextRun({
              text: `Học sinh trả lời từ câu 1 đến câu ${groups.TLN.length}.`,
              font: 'Times New Roman',
              size: 26,
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      groups.TLN.forEach((q, i) => {
        const tableInfo = parsePartIIITableQuestion(q);
        if (tableInfo.hasTable) {
          // 1. Lead-in before table: "Câu 1. Cho bảng số liệu:"
          paragraphs.push(
            new Paragraph({
              keepLines: true,
              keepNext: true,
              children: [
                new TextRun({ text: `Câu ${i + 1}. `, bold: true, font: 'Times New Roman', size: 26 }),
                new TextRun({ text: tableInfo.leadIn, font: 'Times New Roman', size: 26 }),
              ],
              spacing: { before: 80, after: 40 },
            })
          );

          // 2. Table itself
          appendStimulusSourcesToWord(q.srcs);

          // 3. Question prompt / calculation command below table
          paragraphs.push(
            new Paragraph({
              keepLines: true,
              keepNext: true,
              children: [
                new TextRun({ text: q.ask || tableInfo.questionPrompt, font: 'Times New Roman', size: 26 }),
              ],
              spacing: { before: 40, after: 40 },
            })
          );
        } else {
          paragraphs.push(
            new Paragraph({
              keepLines: true,
              keepNext: true,
              children: [
                new TextRun({ text: `Câu ${i + 1}. `, bold: true, font: 'Times New Roman', size: 26 }),
                new TextRun({ text: q.stem, font: 'Times New Roman', size: 26 }),
              ],
              spacing: { before: 80, after: 40 },
            })
          );

          appendStimulusSourcesToWord(q.srcs);
        }
      });
    }

    // Part IV: TL
    if (groups.TL.length > 0) {
      paragraphs.push(
        new Paragraph({
          keepLines: true,
          keepNext: true,
          children: [
            new TextRun({
              text: `PHẦN IV. Tự luận (Từ câu 1 đến câu ${groups.TL.length}; ${tlScoreStr} điểm)`,
              bold: true,
              font: 'Times New Roman',
              size: 26,
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );
      groups.TL.forEach((q, i) => {
        paragraphs.push(
          new Paragraph({
            keepLines: true,
            children: [
              new TextRun({ text: `Câu ${i + 1}. `, bold: true, font: 'Times New Roman', size: 26 }),
              new TextRun({ text: q.stem, font: 'Times New Roman', size: 26 }),
            ],
            spacing: { before: 80, after: 80 },
          })
        );
      });
    }

    // End of test (chỉ có đề, không kèm Đáp án và Hướng dẫn chấm)
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        keepLines: true,
        children: [
          new TextRun({ text: '------------------------ HẾT ------------------------', bold: true, font: 'Times New Roman', size: 26 }),
          new TextRun({ break: 1, text: '- Thí sinh không được sử dụng tài liệu;', italics: true, font: 'Times New Roman', size: 24 }),
          new TextRun({ break: 1, text: '- Giám thị không giải thích gì thêm.', italics: true, font: 'Times New Roman', size: 24 }),
        ],
        spacing: { before: 200, after: 200 },
      })
    );
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 26, // 13pt
          },
          paragraph: {
            spacing: { line: 276, before: 0, after: 0 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: 850,    // 1.5 cm
              bottom: 850, // 1.5 cm
              left: 1134,  // 2.0 cm
              right: 850,  // 1.5 cm
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filename}.docx`);
}

export async function exportAnswerExcel(
  questionsOrSets: GeneratedQuestion[] | GeneratedQuestion[][],
  filename: string,
  customExamCodes?: string[]
): Promise<void> {
  const sets: GeneratedQuestion[][] = Array.isArray(questionsOrSets[0])
    ? (questionsOrSets as GeneratedQuestion[][])
    : [questionsOrSets as GeneratedQuestion[]];

  const masterQuestions = sets[0] || [];
  const masterGroups = {
    NLC: masterQuestions.filter((q) => q.d === 'NLC'),
    DS: masterQuestions.filter((q) => q.d === 'DS'),
    TLN: masterQuestions.filter((q) => q.d === 'TLN'),
  };

  const NN = Math.max(40, masterGroups.NLC.length);
  const DD = Math.max(8, masterGroups.DS.length);
  const TT = Math.max(6, masterGroups.TLN.length);

  const header = ['Đề\\câu'];
  for (let i = 1; i <= NN; i++) header.push(String(i));
  for (let i = 1; i <= DD; i++) {
    for (const c of ['a', 'b', 'c', 'd']) header.push(`${i}${c}`);
  }
  for (let i = 1; i <= TT; i++) header.push(String(i));

  const rows: (string | number)[][] = [header];

  sets.forEach((set, idx) => {
    const isFourDigits = (customExamCodes && customExamCodes[0] && customExamCodes[0].length === 4);
    const code = (customExamCodes && customExamCodes[idx]) ? customExamCodes[idx] : (isFourDigits ? String(1001 + idx) : String(101 + idx));
    const groups = {
      NLC: set.filter((q) => q.d === 'NLC'),
      DS: set.filter((q) => q.d === 'DS'),
      TLN: set.filter((q) => q.d === 'TLN'),
    };

    const row: (string | number)[] = [`Mã đề ${code}`];
    for (let i = 0; i < NN; i++) {
      row.push(groups.NLC[i] ? String(groups.NLC[i].ans || '').trim().charAt(0) : '');
    }
    for (let i = 0; i < DD; i++) {
      const q = groups.DS[i];
      const safeItems = q ? getSafeTrueFalseItems(q.items, idx * 5 + i) : [];
      for (let j = 0; j < 4; j++) {
        row.push(safeItems[j] ? (safeItems[j].a ? 'Đ' : 'S') : '');
      }
    }
    for (let i = 0; i < TT; i++) {
      const q = groups.TLN[i];
      row.push(q ? formatVietnameseNumber(q.ans || '') : '');
    }
    rows.push(row);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Đáp án');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([buf], { type: 'application/octet-stream' }), `${filename}.xlsx`);
}

export async function exportAnswerWord(
  questionsOrSets: GeneratedQuestion[] | GeneratedQuestion[][],
  examTitle: string,
  mon: string,
  kh: string,
  ki: string,
  filename: string,
  customExamCodes?: string[],
  headerConfig?: ExamHeaderConfig
): Promise<void> {
  const sets: GeneratedQuestion[][] = Array.isArray(questionsOrSets[0])
    ? (questionsOrSets as GeneratedQuestion[][])
    : [questionsOrSets as GeneratedQuestion[]];

  const masterQuestions = sets[0] || [];
  const groups: Record<string, GeneratedQuestion[]> = {
    NLC: masterQuestions.filter((q) => q.d === 'NLC'),
    DS: masterQuestions.filter((q) => q.d === 'DS'),
    TLN: masterQuestions.filter((q) => q.d === 'TLN'),
    TL: masterQuestions.filter((q) => q.d === 'TL'),
  };

  const paragraphs: (Paragraph | Table)[] = [];

  const soGD = headerConfig?.soGiaoDuc?.trim() || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ..........';
  const truong = headerConfig?.truongThpt?.trim() || 'TRƯỜNG THPT ..........................';
  const tenKy = headerConfig?.tenKyThi?.trim() || (ki ? `ĐỀ KIỂM TRA ${ki.toUpperCase()}` : 'ĐỀ KIỂM TRA ĐỊNH KÌ');
  const namHoc = headerConfig?.namHoc?.trim() || '2024 - 2025';

  // Header Table
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: 'none' as any, size: 0, color: 'auto' },
      bottom: { style: 'none' as any, size: 0, color: 'auto' },
      left: { style: 'none' as any, size: 0, color: 'auto' },
      right: { style: 'none' as any, size: 0, color: 'auto' },
      insideHorizontal: { style: 'none' as any, size: 0, color: 'auto' },
      insideVertical: { style: 'none' as any, size: 0, color: 'auto' },
    },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: soGD, bold: true, font: 'Times New Roman', size: 24 }),
                  new TextRun({ break: 1, text: truong, bold: true, font: 'Times New Roman', size: 24 }),
                  new TextRun({ break: 1, text: '----------', font: 'Times New Roman', size: 24 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, font: 'Times New Roman', size: 24 }),
                  new TextRun({ break: 1, text: 'Độc lập - Tự do - Hạnh phúc', bold: true, font: 'Times New Roman', size: 24 }),
                  new TextRun({ break: 1, text: '----------', font: 'Times New Roman', size: 24 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  paragraphs.push(headerTable);
  paragraphs.push(new Paragraph({ children: [], spacing: { after: 120 } }));

  // Title section
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `HƯỚNG DẪN CHẤM ${tenKy.toUpperCase()} - NĂM HỌC ${namHoc}`, bold: true, font: 'Times New Roman', size: 26 }),
        new TextRun({ break: 1, text: `MÔN: ${mon.toUpperCase()} - LỚP ${kh}`, bold: true, font: 'Times New Roman', size: 26 }),
      ],
      spacing: { after: 120 },
    })
  );

  const examCodes = sets.map((_, idx) => (customExamCodes && customExamCodes[idx]) ? customExamCodes[idx] : String(101 + idx));
  const codeHeaders = examCodes.map((code) => `Mã đề ${code}`);

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `(Đáp án gồm các mã đề: ${codeHeaders.join(', ')})`,
          italics: true,
          font: 'Times New Roman',
          size: 22,
        }),
      ],
      spacing: { after: 180 },
    })
  );

  // ========================================================
  // PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN
  // ========================================================
  if (groups.NLC.length > 0) {
    paragraphs.push(
      new Paragraph({
        keepLines: true,
        keepNext: true,
        children: [
          new TextRun({ text: 'PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN', bold: true, font: 'Times New Roman', size: 26 }),
        ],
        spacing: { before: 140, after: 40 },
      })
    );
    paragraphs.push(
      new Paragraph({
        keepLines: true,
        keepNext: true,
        children: [
          new TextRun({
            text: `(Thí sinh trả lời từ câu 1 đến câu ${groups.NLC.length}. Mỗi câu trả lời đúng được 0,25 điểm)`,
            italics: true,
            font: 'Times New Roman',
            size: 24,
          }),
        ],
        spacing: { after: 80 },
      })
    );

    const nlcCount = groups.NLC.length;
    const colWidth = Math.floor(85 / examCodes.length);

    const nlcTableRows: TableRow[] = [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Câu', bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
            shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
          ...examCodes.map(
            (code) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: `Mã ${code}`, bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
                shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
                width: { size: colWidth, type: WidthType.PERCENTAGE },
              })
          ),
        ],
      }),
    ];

    for (let i = 0; i < nlcCount; i++) {
      const rowCells: TableCell[] = [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
      ];
      sets.forEach((set) => {
        const qList = set.filter((q) => q.d === 'NLC');
        const q = qList[i];
        const ansChar = q ? String(q.ans || '').trim().charAt(0).toUpperCase() : '';
        rowCells.push(
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: ansChar, bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
            width: { size: colWidth, type: WidthType.PERCENTAGE },
          })
        );
      });
      nlcTableRows.push(new TableRow({ cantSplit: true, children: rowCells }));
    }

    paragraphs.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: nlcTableRows,
      })
    );
    paragraphs.push(new Paragraph({ children: [], spacing: { after: 140 } }));
  }

  // ========================================================
  // PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG SAI
  // ========================================================
  if (groups.DS.length > 0) {
    paragraphs.push(
      new Paragraph({
        keepLines: true,
        keepNext: true,
        children: [
          new TextRun({ text: 'PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG SAI', bold: true, font: 'Times New Roman', size: 26 }),
        ],
        spacing: { before: 140, after: 40 },
      })
    );
    paragraphs.push(
      new Paragraph({
        keepLines: true,
        keepNext: true,
        children: [
          new TextRun({
            text: `(Thí sinh trả lời từ câu 1 đến câu ${groups.DS.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.\n` +
              `- Điểm tối đa của 01 câu hỏi là 1,0 điểm:\n` +
              `  + Thí sinh chỉ lựa chọn chính xác 01 ý trong 01 câu hỏi được 0,10 điểm;\n` +
              `  + Thí sinh chỉ lựa chọn chính xác 02 ý trong 01 câu hỏi được 0,25 điểm;\n` +
              `  + Thí sinh chỉ lựa chọn chính xác 03 ý trong 01 câu hỏi được 0,50 điểm;\n` +
              `  + Thí sinh lựa chọn chính xác cả 04 ý trong 01 câu hỏi được 1,00 điểm.)`,
            italics: true,
            font: 'Times New Roman',
            size: 24,
          }),
        ],
        spacing: { after: 80 },
      })
    );

    const dsCount = groups.DS.length;
    const dsColWidth = Math.floor(76 / codeHeaders.length);

    const dsTableRows: TableRow[] = [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Câu', bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
            shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Lệnh hỏi', bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
            shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
          ...codeHeaders.map(
            (code) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: code, bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
                shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
                width: { size: dsColWidth, type: WidthType.PERCENTAGE },
              })
          ),
        ],
      }),
    ];

    for (let i = 0; i < dsCount; i++) {
      for (let j = 0; j < 4; j++) {
        const itemLetter = 'abcd'[j];
        const rowCells: TableCell[] = [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), bold: j === 0, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: itemLetter, bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
        ];

        sets.forEach((set, sIdx) => {
          const qList = set.filter((q) => q.d === 'DS');
          const q = qList[i];
          const safeItems = q ? getSafeTrueFalseItems(q.items, sIdx * 5 + i) : [];
          const it = safeItems[j];
          const val = it != null ? (it.a ? 'Đ' : 'S') : '';
          rowCells.push(
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: val,
                      bold: true,
                      color: val === 'Đ' ? '008000' : val === 'S' ? 'CC0000' : '000000',
                      font: 'Times New Roman',
                      size: 24,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: dsColWidth, type: WidthType.PERCENTAGE },
            })
          );
        });

        dsTableRows.push(new TableRow({ cantSplit: true, children: rowCells }));
      }
    }

    paragraphs.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: dsTableRows,
      })
    );
    paragraphs.push(new Paragraph({ children: [], spacing: { after: 140 } }));
  }

  // ========================================================
  // PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN
  // ========================================================
  if (groups.TLN.length > 0) {
    paragraphs.push(
      new Paragraph({
        keepLines: true,
        keepNext: true,
        children: [
          new TextRun({ text: 'PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN', bold: true, font: 'Times New Roman', size: 26 }),
        ],
        spacing: { before: 140, after: 40 },
      })
    );
    paragraphs.push(
      new Paragraph({
        keepLines: true,
        keepNext: true,
        children: [
          new TextRun({
            text: `(Thí sinh trả lời từ câu 1 đến câu ${groups.TLN.length}. Mỗi câu trả lời đúng được 0,25 điểm)`,
            italics: true,
            font: 'Times New Roman',
            size: 24,
          }),
        ],
        spacing: { after: 80 },
      })
    );

    const tlnCount = groups.TLN.length;
    const tlnColWidth = Math.floor(85 / codeHeaders.length);

    const tlnTableRows: TableRow[] = [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Câu', bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
            shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
          ...codeHeaders.map(
            (code) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: code, bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
                shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
                width: { size: tlnColWidth, type: WidthType.PERCENTAGE },
              })
          ),
        ],
      }),
    ];

    for (let i = 0; i < tlnCount; i++) {
      const rowCells: TableCell[] = [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
      ];
      sets.forEach((set) => {
        const qList = set.filter((q) => q.d === 'TLN');
        const q = qList[i];
        const rawAns = q ? String(q.ans || '').trim() : '';
        const formattedAns = formatVietnameseNumber(rawAns);
        rowCells.push(
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: formattedAns, bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
            width: { size: tlnColWidth, type: WidthType.PERCENTAGE },
          })
        );
      });
      tlnTableRows.push(new TableRow({ cantSplit: true, children: rowCells }));
    }

    paragraphs.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tlnTableRows,
      })
    );
    paragraphs.push(new Paragraph({ children: [], spacing: { after: 140 } }));
  }

  // ========================================================
  // PHẦN IV. TỰ LUẬN
  // ========================================================
  const hasAnyTL = sets.some((s) => s.some((q) => q.d === 'TL'));
  if (hasAnyTL) {
    paragraphs.push(
      new Paragraph({
        keepLines: true,
        keepNext: true,
        children: [
          new TextRun({ text: 'PHẦN IV. TỰ LUẬN (HƯỚNG DẪN CHẤM VÀ BIỂU ĐIỂM CHI TIẾT)', bold: true, font: 'Times New Roman', size: 26 }),
        ],
        spacing: { before: 180, after: 80 },
      })
    );

    sets.forEach((set, setIdx) => {
      const code = (customExamCodes && customExamCodes[setIdx]) ? customExamCodes[setIdx] : String(101 + setIdx);
      const tlQuestions = set.filter((q) => q.d === 'TL');
      if (tlQuestions.length === 0) return;

      paragraphs.push(
        new Paragraph({
          keepLines: true,
          keepNext: true,
          children: [
            new TextRun({ text: `* Hướng dẫn chấm tự luận - Mã đề ${code}`, bold: true, font: 'Times New Roman', size: 25, color: '1E3A8A' }),
          ],
          spacing: { before: 120, after: 60 },
        })
      );

      const tlRows: TableRow[] = [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Câu', bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
              shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
              width: { size: 12, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Nội dung câu hỏi & Đáp án chi tiết', bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
              shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
              width: { size: 60, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Biểu điểm', bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
              shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
              width: { size: 28, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
      ];

      tlQuestions.forEach((q, i) => {
        const rubricParas: Paragraph[] = (q.rubric || [
          { y: 'Trình bày đầy đủ nội dung cốt lõi', d: 0.5 },
          { y: 'Phân tích dẫn chứng thực tế và giải pháp', d: 0.5 },
        ]).map(
          (rb, j) =>
            new Paragraph({
              children: [
                new TextRun({ text: `- Ý ${j + 1}: ${rb.y} (${formatNumber(rb.d)} điểm)`, font: 'Times New Roman', size: 24 }),
              ],
              spacing: { after: 30 },
            })
        );

        const stemPara = new Paragraph({
          children: [
            new TextRun({ text: 'Đề bài: ', bold: true, italics: true, font: 'Times New Roman', size: 24 }),
            new TextRun({ text: q.stem || '', italics: true, font: 'Times New Roman', size: 24 }),
          ],
          spacing: { after: 40 },
        });

        const ansHeaderPara = new Paragraph({
          children: [
            new TextRun({ text: 'Đáp án chi tiết:', bold: true, font: 'Times New Roman', size: 24 }),
          ],
          spacing: { after: 30 },
        });

        const ansParas: Paragraph[] = String(q.ans || 'Học sinh trình bày đầy đủ các ý theo yêu cầu của đề bài.')
          .split('\n')
          .filter((line) => line.trim().length > 0)
          .map(
            (line, lIdx) =>
              new Paragraph({
                children: [new TextRun({ text: line, bold: /^\s*(\d+\.|phần|ý\s*\d+)/i.test(line) || lIdx === 0, font: 'Times New Roman', size: 24 })],
                spacing: { after: 30 },
              })
          );

        tlRows.push(
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: `Câu ${i + 1}`, bold: true, font: 'Times New Roman', size: 24 })], alignment: AlignmentType.CENTER })],
                width: { size: 12, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [stemPara, ansHeaderPara, ...ansParas],
                width: { size: 60, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: rubricParas,
                width: { size: 28, type: WidthType.PERCENTAGE },
              }),
            ],
          })
        );
      });

      paragraphs.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tlRows,
        })
      );
      paragraphs.push(new Paragraph({ children: [], spacing: { after: 120 } }));
    });
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 26, // 13pt
          },
          paragraph: {
            spacing: { line: 276, before: 0, after: 0 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: 850,    // 1.5 cm
              bottom: 850, // 1.5 cm
              left: 1134,  // 2.0 cm
              right: 850,  // 1.5 cm
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filename}.docx`);
}

