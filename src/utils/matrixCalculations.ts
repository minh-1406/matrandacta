import { MatrixRow, QuestionPointConfig, SubjectName, ExamSemester, StructureMode } from '../types';
import { CURRICULUM_DATA, DETAILED_SPECS, NOCALC, PRACT } from '../constants/curriculumData';

export const F_NAMES = [
  'Trắc nghiệm nhiều lựa chọn',
  'Đúng/Sai (câu có 4 ý)',
  'Trả lời ngắn',
  'Tự luận',
];

export const FORMAT_LABELS = ['Nhiều lựa chọn', '“Đúng – Sai”', 'Trả lời ngắn'];
export const LEVEL_LABELS = ['Biết', 'Hiểu', 'Vận dụng'];

export const formatNumber = (x: number): string =>
  String(+(+x).toFixed(2)).replace('.', ',');

export const formatVietnameseNumber = (text: string | number | undefined | null): string => {
  if (text == null) return '';
  const s = String(text);
  // Replace decimal points between digits with comma: e.g. "12.5" -> "12,5", "100.0" -> "100,0"
  return s.replace(/(?<=\d)\.(?=\d)/g, ',');
};

export function getZeroVector(): number[] {
  return Array(12).fill(0);
}

export function getY(r: MatrixRow): number[] {
  if (!r.y) r.y = [0, 0, 0];
  return r.y;
}

export function dsOf(r: MatrixRow): number[][] {
  const y = getY(r);
  const sy = y[0] + y[1] + y[2];
  if (!sy) return [];
  const Q = Math.max(1, Math.round(sy / 4));
  const levels: number[] = [];
  y.forEach((n, l) => {
    for (let i = 0; i < n; i++) levels.push(l);
  });
  while (levels.length < 4 * Q) levels.push(2);
  levels.length = 4 * Q;
  const qs: number[][] = Array.from({ length: Q }, () => []);
  levels.forEach((l, i) => qs[i % Q].push(l));
  return qs.map((q) => q.sort((a, b) => a - b));
}

export function dsNote(r: MatrixRow): string {
  const qs = dsOf(r);
  if (!qs.length) return '';
  return (
    'Dạng Đúng – Sai: ' +
    qs
      .map((q, k) => {
        const g: string[][] = [[], [], []];
        q.forEach((l, i) => g[l].push('abcd'[i]));
        const note = g
          .map((a, l) => (a.length ? `ý ${a.join(', ')} – ${LEVEL_LABELS[l]}` : ''))
          .filter(Boolean)
          .join('; ');
        return (qs.length > 1 ? `Câu ${k + 1}: ` : '') + note;
      })
      .join('. ') +
    '.'
  );
}

export function calculateRowScore(r: MatrixRow, points: QuestionPointConfig): number {
  const pts = [points.tn, points.ds, points.tln, points.tl];
  const mainScore = r.v.reduce(
    (s, v, j) => (Math.floor(j / 3) === 1 ? s : s + v * pts[Math.floor(j / 3)]),
    0
  );
  const dsScore = getY(r).reduce((s, y) => s + (y * points.ds) / 4, 0);
  return mainScore + dsScore;
}

export function calculateRowLevelCounts(r: MatrixRow): number[] {
  return [0, 1, 2].map((l) => [0, 1, 2, 3].reduce((s, f) => s + r.v[f * 3 + l], 0));
}

export interface MatrixSums {
  t: number[]; // total questions / items per 12 columns
  tt: number[]; // total questions per 3 cognitive levels
  f: number[]; // total points per format (TNLC, ĐS, TLN, TL)
  lv: number[]; // total points per cognitive level (Biết, Hiểu, Vận dụng)
  T: number; // total points (should be 10.0)
}

export function calculateSums(rows: MatrixRow[], points: QuestionPointConfig): MatrixSums {
  const pts = [points.tn, points.ds, points.tln, points.tl];
  const t = Array(12).fill(0);
  const tt = [0, 0, 0];
  const f = [0, 0, 0, 0];
  const lv = [0, 0, 0];

  rows.forEach((r) => {
    const y = getY(r);
    r.v.forEach((v, j) => {
      const fi = (j / 3) | 0;
      const l = j % 3;
      if (fi === 1) {
        t[j] += y[l];
        const p = (y[l] * pts[1]) / 4;
        f[1] += p;
        lv[l] += p;
      } else {
        t[j] += v;
        f[fi] += v * pts[fi];
        lv[l] += v * pts[fi];
      }
      tt[l] += v;
    });
  });

  return {
    t,
    tt,
    f,
    lv,
    T: f.reduce((s, x) => s + x, 0),
  };
}

export function getPresetPoints(
  mon: SubjectName,
  structureMode: StructureMode
): { note: string; points: QuestionPointConfig } {
  let note = 'Điều chỉnh điểm mỗi câu cho đúng đề của tổ.';
  const p: QuestionPointConfig = { tn: 0.25, ds: 1, tln: 0.5, tl: 1 };

  if (mon === 'Ngữ văn') {
    note = 'Ngữ văn: tự luận 100% (10 điểm), gồm đọc hiểu và viết; thời gian thường 90 phút.';
  } else if (structureMode === 't') {
    if (mon === 'Toán') {
      note = 'Toán (QĐ 764): 12 câu TNLC (3đ), 4 câu Đúng/Sai (4đ), 6 câu trả lời ngắn (3đ).';
    } else if (['Vật lí', 'Hóa học', 'Sinh học'].includes(mon)) {
      p.tln = 0.25;
      note = `${mon} (QĐ 764): 18 câu TNLC (4,5đ), 4 câu Đúng/Sai (4đ), 6 câu trả lời ngắn (1,5đ).`;
    } else if (
      ['Lịch sử', 'Địa lí', 'Giáo dục kinh tế và pháp luật', 'Tin học', 'Công nghệ'].includes(mon)
    ) {
      note = `${mon} (QĐ 764): 24 câu TNLC (6đ), 4 câu Đúng/Sai (4đ).`;
    } else {
      note = 'Môn này không có cấu trúc riêng trong QĐ 764: dùng dạng thức do Sở/nhà trường quy định.';
    }
  } else {
    note =
      'Theo Phụ lục CV 7991: Nhiều lựa chọn 3,0đ (30%), Đúng – Sai 2,0đ (20%), Trả lời ngắn 2,0đ (20%), Tự luận 3,0đ (30%); Biết 4,0đ, Hiểu 3,0đ, Vận dụng 3,0đ (40/30/30).';
  }

  if (PRACT.includes(mon)) {
    note =
      'Môn này đánh giá bằng thực hành hoặc sản phẩm: dùng cột Tự luận như nhiệm vụ/tiêu chí và ghi thang điểm trong bản đặc tả.';
  }

  return { note, points: p };
}

export function distributeQuestions(
  rows: MatrixRow[],
  mon: SubjectName,
  structureMode: StructureMode,
  noTLN: boolean
): MatrixRow[] {
  if (!rows.length) return rows;

  let C: number[][];
  if (noTLN) {
    C = [
      [4, 4, 4],
      [2, 1, 1],
      [0, 0, 0],
      [1, 1, 1],
    ];
  } else {
    C = [
      [4, 4, 4],
      [1, 0, 1],
      [2, 1, 1],
      [1, 1, 1],
    ];
  }

  if (structureMode === 't') {
    const N =
      mon === 'Toán'
        ? [12, 4, 6, 0]
        : ['Địa lí', 'Lịch sử', 'Tin học', 'Công nghệ', 'Giáo dục kinh tế và pháp luật'].includes(mon)
        ? [24, 4, 0, 0]
        : [18, 4, 6, 0];
    C = N.map((n) => {
      const b = Math.round(n * 0.4);
      const h = Math.round(n * 0.3);
      return [b, h, n - b - h];
    });
  }

  if (PRACT.includes(mon) || mon === 'Ngữ văn') {
    C = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [3, 3, 4],
    ];
  }

  if (mon === 'Tiếng Anh') {
    C = [
      [16, 12, 12],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
  }

  const nDS = C[1].reduce((a, b) => a + b, 0);
  C[1] = [0, 0, 0];

  // Reset row questions
  rows.forEach((r) => {
    r.v = getZeroVector();
    r.y = [0, 0, 0];
  });

  let p = 0;
  C.forEach((cs, f) => {
    cs.forEach((c, l) => {
      for (let i = 0; i < c; i++) {
        rows[p++ % rows.length].v[f * 3 + l]++;
      }
    });
  });

  for (let k = 0; k < nDS; k++) {
    const r = rows[p++ % rows.length];
    [2, 1, 1].forEach((c, l) => {
      if (c > 0) {
        r.v[3 + l] += 1;
        getY(r)[l] += c;
      }
    });
  }

  return rows;
}

export function generateDefaultRows(
  mon: SubjectName,
  grade: string,
  semester: ExamSemester,
  structureMode: StructureMode,
  noTLN: boolean
): MatrixRow[] {
  const d = CURRICULUM_DATA[mon] && CURRICULUM_DATA[mon][grade];
  if (!d) {
    return [
      { c: 'Chương 1', n: 'Nội dung bài học chương 1', v: getZeroVector() },
      { c: 'Chương 2', n: 'Nội dung bài học chương 2', v: getZeroVector() },
    ];
  }

  if (mon === 'Ngữ văn') {
    const defaultLiterature: MatrixRow[] = [
      {
        c: 'Đọc hiểu',
        n: 'Văn bản đọc hiểu (ngữ liệu trong hoặc ngoài sách giáo khoa)',
        v: [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1],
        s: [
          'Nhận biết thể loại, đặc điểm hình thức; hiểu nội dung, nghệ thuật; vận dụng liên hệ, nêu bài học, quan điểm riêng.',
          'Nhận biết thể loại, đặc điểm hình thức; hiểu nội dung, nghệ thuật; vận dụng liên hệ, nêu bài học, quan điểm riêng.',
          'Nhận biết thể loại, đặc điểm hình thức; hiểu nội dung, nghệ thuật; vận dụng liên hệ, nêu bài học, quan điểm riêng.',
        ],
      },
      {
        c: 'Viết',
        n: 'Viết đoạn văn nghị luận xã hội (khoảng 200 chữ)',
        v: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
        s: [
          'Hiểu yêu cầu đề; vận dụng kĩ năng lập luận, dùng dẫn chứng để viết đoạn văn đúng, đủ ý.',
          'Hiểu yêu cầu đề; vận dụng kĩ năng lập luận, dùng dẫn chứng để viết đoạn văn đúng, đủ ý.',
          'Hiểu yêu cầu đề; vận dụng kĩ năng lập luận, dùng dẫn chứng để viết đoạn văn đúng, đủ ý.',
        ],
      },
      {
        c: 'Viết',
        n: 'Viết bài văn nghị luận văn học (phân tích, đánh giá tác phẩm hoặc đoạn trích)',
        v: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2],
        s: [
          'Xác định đối tượng nghị luận; phân tích nội dung, nghệ thuật; đánh giá, liên hệ và diễn đạt sáng tạo.',
          'Xác định đối tượng nghị luận; phân tích nội dung, nghệ thuật; đánh giá, liên hệ và diễn đạt sáng tạo.',
          'Xác định đối tượng nghị luận; phân tích nội dung, nghệ thuật; đánh giá, liên hệ và diễn đạt sáng tạo.',
        ],
      },
    ];
    return defaultLiterature;
  }

  const k = semester.includes('II') ? 2 : 1;
  const list = d as [string, number][];
  let ch = list
    .map((x, i): [string, number, number] => [x[0], x[1], i])
    .filter((x) => x[1] === k);

  if (semester.startsWith('Giữa')) {
    ch = ch.slice(0, Math.ceil(ch.length / 2));
  }

  const specList = DETAILED_SPECS[mon] && DETAILED_SPECS[mon][grade];

  const initialRows: MatrixRow[] = ch.map(([c, , i]) => {
    const t = specList && specList[i];
    return {
      c,
      n: t ? t[0] : 'Các bài thuộc chương (theo kế hoạch dạy học của tổ)',
      v: getZeroVector(),
      s: t
        ? [t[1], t[2], t[3]]
        : [
            `Nhận biết, nêu được khái niệm, định nghĩa, công thức, tính chất cơ bản của "${c}".`,
            `Hiểu, giải thích, so sánh được các nội dung; thực hiện được các phép tính, biến đổi cơ bản trong "${c}".`,
            `Vận dụng kiến thức "${c}" giải quyết bài toán, tình huống thực tiễn.`,
          ],
    };
  });

  return distributeQuestions(initialRows, mon, structureMode, noTLN);
}
