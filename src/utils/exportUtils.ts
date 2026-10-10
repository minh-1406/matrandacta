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
import { GeneratedQuestion, MatrixRow, QuestionPointConfig } from '../types';
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
} from './matrixCalculations';
import { FOOTNOTES_TEXT } from '../constants/curriculumData';

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
      <th colspan="15" style="background:#e8eefe;border:1px solid #999;padding:6px">Mức độ đánh giá</th>
      <th colspan="3" rowspan="3" style="background:#e8eefe;border:1px solid #999;padding:6px">Tổng</th>
      <th rowspan="4" style="background:#e8eefe;border:1px solid #999;padding:6px">Tỉ lệ % điểm</th>
    </tr>
    <tr>
      <th colspan="12" style="background:#e8eefe;border:1px solid #999;padding:6px">TNKQ</th>
      <th colspan="3" rowspan="2" style="background:#e8eefe;border:1px solid #999;padding:6px">Tự luận</th>
    </tr>
    <tr>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;padding:6px">${FORMAT_LABELS[0]}</th>
      <th colspan="6" style="background:#e8eefe;border:1px solid #999;padding:6px">${FORMAT_LABELS[1]}<sup>2</sup></th>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;padding:6px">${FORMAT_LABELS[2]}<sup>3</sup></th>
    </tr>
    <tr>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
      <th colspan="2" style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th colspan="2" style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th colspan="2" style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
    </tr>`;

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
            return `<td style="border:1px solid #999;text-align:center">${x || ''}</td><td style="border:1px solid #999;text-align:center;color:#666">${y ? `(${y})` : ''}</td>`;
          }
          return `<td style="border:1px solid #999;text-align:center">${x || ''}</td>`;
        })
        .join('');

      return `<tr>
        <td style="border:1px solid #999;text-align:center">${i + 1}</td>
        <td style="border:1px solid #999;text-align:left;padding:4px 6px">${r.c}</td>
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
        .map((v, j) =>
          ((j / 3) | 0) === 1
            ? `<th colspan="2" style="background:#e8eefe;border:1px solid #999;text-align:center">${v}</th>`
            : `<th style="background:#e8eefe;border:1px solid #999;text-align:center">${v}</th>`
        )
        .join('')}
      ${S.tt.map((v) => `<th style="background:#e8eefe;border:1px solid #999;text-align:center">${v}</th>`).join('')}
      <th style="background:#e8eefe;border:1px solid #999"></th>
    </tr>
    <tr>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;text-align:left;padding:4px 6px">Tổng số điểm</th>
      ${S.f
        .map(
          (v, i) =>
            `<th colspan="${i === 1 ? 6 : 3}" style="background:#e8eefe;border:1px solid #999;text-align:center">${formatNumber(v)}${i === 0 ? '<sup>5</sup>' : ''}</th>`
        )
        .join('')}
      ${S.lv.map((v) => `<th style="background:#e8eefe;border:1px solid #999;text-align:center">${formatNumber(v)}</th>`).join('')}
      <th style="background:#e8eefe;border:1px solid #999"></th>
    </tr>
    <tr>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;text-align:left;padding:4px 6px">Tỉ lệ %</th>
      ${S.f
        .map(
          (v, i) =>
            `<th colspan="${i === 1 ? 6 : 3}" style="background:#e8eefe;border:1px solid #999;text-align:center">${formatNumber((v / Tt) * 100)}</th>`
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
      <th colspan="15" style="background:#e8eefe;border:1px solid #999;padding:6px">Số câu hỏi ở các mức độ đánh giá</th>
    </tr>
    <tr>
      <th colspan="12" style="background:#e8eefe;border:1px solid #999;padding:6px">TNKQ</th>
      <th colspan="3" rowspan="2" style="background:#e8eefe;border:1px solid #999;padding:6px">Tự luận</th>
    </tr>
    <tr>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;padding:6px">${FORMAT_LABELS[0]}</th>
      <th colspan="6" style="background:#e8eefe;border:1px solid #999;padding:6px">${FORMAT_LABELS[1]}</th>
      <th colspan="3" style="background:#e8eefe;border:1px solid #999;padding:6px">${FORMAT_LABELS[2]}</th>
    </tr>
    <tr>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
      <th colspan="2" style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th colspan="2" style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th colspan="2" style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
      <th style="background:#e8eefe;border:1px solid #999;padding:4px">Biết</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Hiểu</th><th style="background:#e8eefe;border:1px solid #999;padding:4px">Vận dụng</th>
    </tr>`;

  const specRowsHtml = rows
    .map((r, i) => {
      const sp = r.s || ['', '', ''];
      const qDesc = `
        <div><b>- Biết:</b> ${sp[0]}</div>
        <div><b>- Hiểu:</b> ${sp[1]}</div>
        <div><b>- VD:</b> ${sp[2]}</div>
        ${dsNote(r) ? `<div style="margin-top:4px;color:#1d4ed8;font-style:italic">${dsNote(r)}</div>` : ''}
      `;

      const cells = r.v
        .map((x, j) => {
          const f = (j / 3) | 0;
          const l = j % 3;
          if (f === 1) {
            const y = getY(r)[l];
            return `<td style="border:1px solid #999;text-align:center">${x || ''}</td><td style="border:1px solid #999;text-align:center;color:#666">${y ? `(${y})` : ''}</td>`;
          }
          return `<td style="border:1px solid #999;text-align:center">${x || ''}</td>`;
        })
        .join('');

      return `<tr>
        <td style="border:1px solid #999;text-align:center">${i + 1}</td>
        <td style="border:1px solid #999;text-align:left;padding:4px 6px">${r.c}</td>
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
              .map((v, j) =>
                ((j / 3) | 0) === 1
                  ? `<th colspan="2" style="background:#e8eefe;border:1px solid #999;text-align:center">${v}</th>`
                  : `<th style="background:#e8eefe;border:1px solid #999;text-align:center">${v}</th>`
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

  const headerCells = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TT', bold: true })], alignment: AlignmentType.CENTER })], rowSpan: 4, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Chủ đề/Chương', bold: true })], alignment: AlignmentType.CENTER })], rowSpan: 4, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nội dung/đơn vị kiến thức', bold: true })], alignment: AlignmentType.CENTER })], rowSpan: 4, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Mức độ đánh giá', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 15, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tổng', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3, rowSpan: 3, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tỉ lệ %', bold: true })], alignment: AlignmentType.CENTER })], rowSpan: 4, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TNKQ', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 12, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tự luận', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3, rowSpan: 2, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nhiều lựa chọn', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Đúng - Sai', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 6, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Trả lời ngắn', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'Biết', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Hiểu', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'VD', alignment: AlignmentType.CENTER })], shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Biết', alignment: AlignmentType.CENTER })], columnSpan: 2, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'Hiểu', alignment: AlignmentType.CENTER })], columnSpan: 2, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: 'VD', alignment: AlignmentType.CENTER })], columnSpan: 2, shading: { fill: 'E8EEFE', type: ShadingType.CLEAR } }),
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
        cells.push(new TableCell({ children: [new Paragraph({ text: r.v[j] ? String(r.v[j]) : '', alignment: AlignmentType.CENTER })] }));
        cells.push(new TableCell({ children: [new Paragraph({ text: y ? `(${y})` : '', alignment: AlignmentType.CENTER })] }));
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

  const matrixTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [...headerCells, ...dataRows],
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
            children: [new TextRun({ text: title.toUpperCase(), bold: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ', bold: true })],
            spacing: { before: 100, after: 100 },
          }),
          matrixTable,
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
    const specText = [
      `- Biết: ${sp[0]}`,
      `- Hiểu: ${sp[1]}`,
      `- Vận dụng: ${sp[2]}`,
      dsNote(r) ? dsNote(r) : '',
    ]
      .filter(Boolean)
      .join('\n');

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
    'position:fixed;left:-9999px;top:0;width:1200px;background:#fff;color:#000;padding:24px;font-family:Arial,sans-serif';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 1.5,
      backgroundColor: '#ffffff',
      windowWidth: 1240,
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
  questions: GeneratedQuestion[],
  examTitle: string,
  mon: string,
  kh: string,
  ki: string,
  points: QuestionPointConfig,
  filename: string
): Promise<void> {
  const groups: Record<string, GeneratedQuestion[]> = {
    NLC: questions.filter((q) => q.d === 'NLC'),
    DS: questions.filter((q) => q.d === 'DS'),
    TLN: questions.filter((q) => q.d === 'TLN'),
    TL: questions.filter((q) => q.d === 'TL'),
  };

  const paragraphs: (Paragraph | Table)[] = [];

  // Header Table
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ..........', bold: true }),
                  new TextRun({ break: 1, text: 'TRƯỜNG THPT ..........................', bold: true }),
                  new TextRun({ break: 1, text: '----------' }),
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
                    text: `ĐỀ KIỂM TRA ${ki.toUpperCase()} - LỚP ${kh}`,
                    bold: true,
                  }),
                  new TextRun({
                    break: 1,
                    text: `MÔN: ${mon.toUpperCase()}`,
                    bold: true,
                  }),
                  new TextRun({
                    break: 1,
                    text: 'Thời gian làm bài: ...... phút (Không kể phát đề)',
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  paragraphs.push(new Paragraph({ children: [] }));
  paragraphs.push(new Paragraph({
    children: [
      new TextRun({ text: 'Họ và tên thí sinh: ................................................................... Số báo danh: .............................', bold: true }),
      new TextRun({ break: 1, text: 'Mã đề thi: ..........', bold: true }),
    ],
    spacing: { after: 120 },
  }));

  // Part I
  if (groups.NLC.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'PHẦN I. Câu trắc nghiệm nhiều lựa chọn (Chọn một đáp án đúng duy nhất)',
            bold: true,
          }),
        ],
        spacing: { before: 180, after: 60 },
      })
    );
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Thí sinh trả lời từ câu 1 đến câu ${groups.NLC.length}. Mỗi câu trả lời đúng được ${formatNumber(points.tn)} điểm.`,
            italics: true,
          }),
        ],
        spacing: { after: 120 },
      })
    );

    groups.NLC.forEach((q, i) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${i + 1}. `, bold: true }),
            new TextRun({ text: q.stem }),
          ],
          spacing: { before: 80, after: 40 },
        })
      );
      (q.opts || []).forEach((opt, j) => {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `   ${'ABCD'[j]}. `, bold: true }),
              new TextRun({ text: opt }),
            ],
            spacing: { after: 20 },
          })
        );
      });
    });
  }

  // Part II
  if (groups.DS.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'PHẦN II. Câu trắc nghiệm đúng sai', bold: true }),
        ],
        spacing: { before: 200, after: 60 },
      })
    );
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Thí sinh trả lời từ câu 1 đến câu ${groups.DS.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai. Điểm tối đa của một câu hỏi là ${formatNumber(points.ds)} điểm.`,
            italics: true,
          }),
        ],
        spacing: { after: 120 },
      })
    );

    groups.DS.forEach((q, i) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${i + 1}. `, bold: true }),
            new TextRun({ text: q.stem }),
          ],
          spacing: { before: 100, after: 40 },
        })
      );
      (q.srcs || []).forEach((s) => {
        if (s.text) {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: s.text, italics: true })],
              spacing: { after: 40 },
            })
          );
        }
        if (s.table && s.table.head && s.table.rows) {
          if (s.table.title) {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: s.table.title, bold: true })],
                spacing: { after: 40 },
              })
            );
          }
          const docxTableRows = [
            new TableRow({
              children: s.table.head.map(
                (h) =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })], alignment: AlignmentType.CENTER })],
                    shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
                  })
              ),
            }),
            ...s.table.rows.map(
              (row) =>
                new TableRow({
                  children: row.map(
                    (cell) =>
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: formatVietnameseNumber(cell) })] })],
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
              children: [new TextRun({ text: `[Biểu đồ: ${s.chart.title}]`, bold: true, italics: true })],
              spacing: { after: 40 },
            })
          );
          (s.chart.series || []).forEach((ser) => {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: `- ${ser.name || 'Số liệu'}: ${(ser.values || []).map((v) => formatVietnameseNumber(v)).join(', ')}`, italics: true })],
                spacing: { after: 20 },
              })
            );
          });
        }
        if (s.fig) {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: `[Hình vẽ / Sơ đồ / Bản đồ: ${s.fig}]`, bold: true, italics: true })],
              spacing: { after: 40 },
            })
          );
        }
        if (s.src) {
          const cleanSrc = s.src.replace(/^Nguồn:\s*/i, '').trim();
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: `(Nguồn: ${cleanSrc})`, italics: true }),
              ],
              spacing: { after: 40 },
            })
          );
        }
      });
      (q.items || []).forEach((it, j) => {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `   ${'abcd'[j]}) `, bold: true }),
              new TextRun({ text: it.t }),
            ],
            spacing: { after: 20 },
          })
        );
      });
    });
  }

  // Part III
  if (groups.TLN.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'PHẦN III. Câu trắc nghiệm trả lời ngắn', bold: true }),
        ],
        spacing: { before: 200, after: 60 },
      })
    );
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Thí sinh trả lời từ câu 1 đến câu ${groups.TLN.length}. Thí sinh điền kết quả (số nguyên hoặc số thập phân) vào ô trống tương ứng.`,
            italics: true,
          }),
        ],
        spacing: { after: 120 },
      })
    );

    groups.TLN.forEach((q, i) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${i + 1}. `, bold: true }),
            new TextRun({ text: q.stem }),
          ],
          spacing: { before: 80, after: 40 },
        })
      );
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: 'Trả lời: ..........................................................' })],
          spacing: { after: 60 },
        })
      );
    });
  }

  // Part IV
  if (groups.TL.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: 'PHẦN IV. Tự luận', bold: true })],
        spacing: { before: 200, after: 60 },
      })
    );
    groups.TL.forEach((q, i) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${i + 1}. `, bold: true }),
            new TextRun({ text: q.stem }),
          ],
          spacing: { before: 80, after: 80 },
        })
      );
    });
  }

  // End of test
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: '------------------------ HẾT ------------------------', bold: true }),
        new TextRun({ break: 1, text: '(Giám thị coi thi không giải thích gì thêm)', italics: true }),
      ],
      spacing: { before: 200, after: 200 },
    })
  );

  // Answer Key Page
  paragraphs.push(
    new Paragraph({
      pageBreakBefore: true,
      children: [new TextRun({ text: 'ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM', bold: true, size: 28 })],
      spacing: { after: 120 },
    })
  );

  if (groups.NLC.length > 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: 'Phần I - Trắc nghiệm nhiều lựa chọn', bold: true })] }));
    groups.NLC.forEach((q, i) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${i + 1}: `, bold: true }),
            new TextRun({ text: q.ans || '' }),
          ],
        })
      );
    });
  }

  if (groups.DS.length > 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: 'Phần II - Trắc nghiệm Đúng/Sai', bold: true })], spacing: { before: 120 } }));
    groups.DS.forEach((q, i) => {
      const itemsStr = (q.items || []).map((it, j) => `${'abcd'[j]}) ${it.a ? 'Đúng' : 'Sai'}`).join('; ');
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${i + 1}: `, bold: true }),
            new TextRun({ text: itemsStr }),
          ],
        })
      );
    });
  }

  if (groups.TLN.length > 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: 'Phần III - Trắc nghiệm trả lời ngắn', bold: true })], spacing: { before: 120 } }));
    groups.TLN.forEach((q, i) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${i + 1}: `, bold: true }),
            new TextRun({ text: formatVietnameseNumber(q.ans || '') }),
          ],
        })
      );
    });
  }

  if (groups.TL.length > 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: 'Phần IV - Tự luận', bold: true })], spacing: { before: 120 } }));
    groups.TL.forEach((q, i) => {
      const ansLines = String(q.ans || '').split('\n').filter((l) => l.trim().length > 0);
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${i + 1}:`, bold: true }),
            ...(ansLines.length > 0 ? [new TextRun({ text: ` ${ansLines[0]}` })] : []),
          ],
        })
      );
      for (let lIdx = 1; lIdx < ansLines.length; lIdx++) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: ansLines[lIdx], bold: /^\s*\d+\./.test(ansLines[lIdx]) })],
          })
        );
      }
      (q.rubric || []).forEach((rb, j) => {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: `  - Ý ${j + 1}: ${rb.y} (${formatNumber(rb.d)} điểm)` })],
          })
        );
      });
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT,
            },
            margin: { top: 720, bottom: 720, left: 900, right: 900 },
          },
        },
        children: [headerTable, ...paragraphs],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filename}.docx`);
}

export async function exportAnswerExcel(
  questions: GeneratedQuestion[],
  filename: string
): Promise<void> {
  const groups: Record<string, GeneratedQuestion[]> = {
    NLC: questions.filter((q) => q.d === 'NLC'),
    DS: questions.filter((q) => q.d === 'DS'),
    TLN: questions.filter((q) => q.d === 'TLN'),
  };

  const NN = Math.max(40, groups.NLC.length);
  const DD = Math.max(8, groups.DS.length);
  const TT = Math.max(6, groups.TLN.length);

  const header = ['Đề\\câu'];
  for (let i = 1; i <= NN; i++) header.push(String(i));
  for (let i = 1; i <= DD; i++) {
    for (const c of ['a', 'b', 'c', 'd']) header.push(`${i}${c}`);
  }
  for (let i = 1; i <= TT; i++) header.push(String(i));

  const row = ['Mã đề 101'];
  for (let i = 0; i < NN; i++) {
    row.push(groups.NLC[i] ? String(groups.NLC[i].ans || '').trim().charAt(0) : '');
  }
  for (let i = 0; i < DD; i++) {
    const q = groups.DS[i];
    for (let j = 0; j < 4; j++) {
      row.push(q && q.items && q.items[j] ? (q.items[j].a ? 'Đ' : 'S') : '');
    }
  }
  for (let i = 0; i < TT; i++) {
    const q = groups.TLN[i];
    row.push(q ? String(q.ans || '').trim() : '');
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, row]);
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
  filename: string
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

  // Header Table
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ..........', bold: true }),
                  new TextRun({ break: 1, text: 'TRƯỜNG THPT ..........................', bold: true }),
                  new TextRun({ break: 1, text: '----------' }),
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
                  new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true }),
                  new TextRun({ break: 1, text: 'Độc lập - Tự do - Hạnh phúc', bold: true }),
                  new TextRun({ break: 1, text: '----------' }),
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
        new TextRun({ text: `HƯỚNG DẪN CHẤM ĐỀ KIỂM TRA ${ki.toUpperCase()} - LỚP ${kh}`, bold: true, size: 26 }),
        new TextRun({ break: 1, text: `MÔN: ${mon.toUpperCase()}`, bold: true, size: 24 }),
      ],
      spacing: { after: 120 },
    })
  );

  const codeHeaders = sets.length > 1
    ? sets.map((_, idx) => `Mã đề ${101 + idx}`)
    : ['Mã đề 101'];

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `(Đáp án gồm các mã đề: ${codeHeaders.join(', ')})`,
          italics: true,
          size: 20,
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
        children: [
          new TextRun({ text: 'PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN', bold: true, size: 22 }),
        ],
        spacing: { before: 140, after: 40 },
      })
    );
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `(Thí sinh trả lời từ câu 1 đến câu ${groups.NLC.length}. Mỗi câu trả lời đúng được 0,25 điểm)`,
            italics: true,
          }),
        ],
        spacing: { after: 80 },
      })
    );

    const nlcCount = groups.NLC.length;
    const colWidth = Math.floor(85 / codeHeaders.length);

    const nlcTableRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Câu', bold: true })], alignment: AlignmentType.CENTER })],
            shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
          ...codeHeaders.map(
            (code) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: code, bold: true })], alignment: AlignmentType.CENTER })],
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
          children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), bold: true })], alignment: AlignmentType.CENTER })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
      ];
      sets.forEach((set) => {
        const qList = set.filter((q) => q.d === 'NLC');
        const q = qList[i];
        const ansChar = q ? String(q.ans || '').trim().charAt(0).toUpperCase() : '';
        rowCells.push(
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: ansChar, bold: true })], alignment: AlignmentType.CENTER })],
            width: { size: colWidth, type: WidthType.PERCENTAGE },
          })
        );
      });
      nlcTableRows.push(new TableRow({ children: rowCells }));
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
        children: [
          new TextRun({ text: 'PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG SAI', bold: true, size: 22 }),
        ],
        spacing: { before: 140, after: 40 },
      })
    );
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `(Thí sinh trả lời từ câu 1 đến câu ${groups.DS.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.\n` +
              `- Điểm tối đa của 01 câu hỏi là 1,0 điểm:\n` +
              `  + Thí sinh chỉ lựa chọn chính xác 01 ý trong 01 câu hỏi được 0,10 điểm;\n` +
              `  + Thí sinh chỉ lựa chọn chính xác 02 ý trong 01 câu hỏi được 0,25 điểm;\n` +
              `  + Thí sinh chỉ lựa chọn chính xác 03 ý trong 01 câu hỏi được 0,50 điểm;\n` +
              `  + Thí sinh lựa chọn chính xác cả 04 ý trong 01 câu hỏi được 1,00 điểm.)`,
            italics: true,
          }),
        ],
        spacing: { after: 80 },
      })
    );

    const dsCount = groups.DS.length;
    const dsColWidth = Math.floor(76 / codeHeaders.length);

    const dsTableRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Câu', bold: true })], alignment: AlignmentType.CENTER })],
            shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Lệnh hỏi', bold: true })], alignment: AlignmentType.CENTER })],
            shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
          ...codeHeaders.map(
            (code) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: code, bold: true })], alignment: AlignmentType.CENTER })],
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
            children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), bold: j === 0 })], alignment: AlignmentType.CENTER })],
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: itemLetter, bold: true })], alignment: AlignmentType.CENTER })],
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
        ];

        sets.forEach((set) => {
          const qList = set.filter((q) => q.d === 'DS');
          const q = qList[i];
          const it = q && q.items ? q.items[j] : undefined;
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
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: dsColWidth, type: WidthType.PERCENTAGE },
            })
          );
        });

        dsTableRows.push(new TableRow({ children: rowCells }));
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
        children: [
          new TextRun({ text: 'PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN', bold: true, size: 22 }),
        ],
        spacing: { before: 140, after: 40 },
      })
    );
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `(Thí sinh trả lời từ câu 1 đến câu ${groups.TLN.length}. Mỗi câu trả lời đúng được 0,25 điểm)`,
            italics: true,
          }),
        ],
        spacing: { after: 80 },
      })
    );

    const tlnCount = groups.TLN.length;
    const tlnColWidth = Math.floor(85 / codeHeaders.length);

    const tlnTableRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Câu', bold: true })], alignment: AlignmentType.CENTER })],
            shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
          ...codeHeaders.map(
            (code) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: code, bold: true })], alignment: AlignmentType.CENTER })],
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
          children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), bold: true })], alignment: AlignmentType.CENTER })],
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
            children: [new Paragraph({ children: [new TextRun({ text: formattedAns, bold: true })], alignment: AlignmentType.CENTER })],
            width: { size: tlnColWidth, type: WidthType.PERCENTAGE },
          })
        );
      });
      tlnTableRows.push(new TableRow({ children: rowCells }));
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
  if (groups.TL.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'PHẦN IV. TỰ LUẬN', bold: true, size: 22 }),
        ],
        spacing: { before: 140, after: 80 },
      })
    );

    const tlRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Câu', bold: true })], alignment: AlignmentType.CENTER })],
            shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Nội dung đáp án', bold: true })], alignment: AlignmentType.CENTER })],
            shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
            width: { size: 60, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Biểu điểm', bold: true })], alignment: AlignmentType.CENTER })],
            shading: { fill: 'E8EEFE', type: ShadingType.CLEAR },
            width: { size: 28, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ];

    groups.TL.forEach((q, i) => {
      const rubricParas: Paragraph[] = (q.rubric || [
        { y: 'Trình bày đầy đủ nội dung cốt lõi', d: 0.5 },
        { y: 'Phân tích dẫn chứng thực tế và giải pháp', d: 0.5 },
      ]).map(
        (rb, j) =>
          new Paragraph({
            children: [
              new TextRun({ text: `- Ý ${j + 1}: ${rb.y} (${formatNumber(rb.d)} điểm)` }),
            ],
            spacing: { after: 30 },
          })
      );

      const ansParas: Paragraph[] = String(q.ans || 'Học sinh trình bày đầy đủ các ý theo yêu cầu của đề bài.')
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map(
          (line, lIdx) =>
            new Paragraph({
              children: [new TextRun({ text: line, bold: /^\s*(\d+\.|phần|ý\s*\d+)/i.test(line) || lIdx === 0 })],
              spacing: { after: 30 },
            })
        );

      tlRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `Câu ${i + 1}`, bold: true })], alignment: AlignmentType.CENTER })],
              width: { size: 12, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: ansParas,
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
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT,
            },
            margin: { top: 720, bottom: 720, left: 900, right: 900 },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filename}.docx`);
}
