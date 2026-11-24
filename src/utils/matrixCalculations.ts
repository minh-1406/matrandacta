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

export function getChapterSpans(matrixRows: MatrixRow[]): { spans: number[]; showCell: boolean[] } {
  const spans: number[] = new Array(matrixRows.length).fill(1);
  const showCell: boolean[] = new Array(matrixRows.length).fill(true);

  let i = 0;
  while (i < matrixRows.length) {
    const currentC = (matrixRows[i].c || '').trim();
    let count = 1;
    let j = i + 1;
    while (
      j < matrixRows.length &&
      (matrixRows[j].c || '').trim().toLowerCase() === currentC.toLowerCase() &&
      currentC !== ''
    ) {
      count++;
      showCell[j] = false;
      j++;
    }
    spans[i] = count;
    i = j;
  }

  return { spans, showCell };
}

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
  const y = getY(r);
  return [0, 1, 2].map((l) =>
    [0, 1, 2, 3].reduce((s, f) => {
      if (f === 1) {
        return s + (y[l] || 0);
      }
      return s + (r.v[f * 3 + l] || 0);
    }, 0)
  );
}

export interface MatrixSums {
  t: number[]; // total questions / items per 12 columns
  tt: number[]; // total questions per 3 cognitive levels
  f: number[]; // total points per format (TNLC, ĐS, TLN, TL)
  lv: number[]; // total points per cognitive level (Biết, Hiểu, Vận dụng)
  qDS: number[]; // total questions count for ĐS [Biết, Hiểu, Vận dụng]
  T: number; // total points (should be 10.0)
}

export function calculateSums(rows: MatrixRow[], points: QuestionPointConfig): MatrixSums {
  const pts = [points.tn, points.ds, points.tln, points.tl];
  const t = Array(12).fill(0);
  const tt = [0, 0, 0];
  const f = [0, 0, 0, 0];
  const lv = [0, 0, 0];
  const qDS = [0, 0, 0];

  rows.forEach((r) => {
    const y = getY(r);
    r.v.forEach((v, j) => {
      const fi = (j / 3) | 0;
      const l = j % 3;
      if (fi === 1) {
        t[j] += y[l];
        qDS[l] += v;
        const p = (y[l] * pts[1]) / 4;
        f[1] += p;
        lv[l] += p;
        tt[l] += y[l];
      } else {
        t[j] += v;
        f[fi] += v * pts[fi];
        lv[l] += v * pts[fi];
        tt[l] += v;
      }
    });
  });

  return {
    t,
    tt,
    f,
    lv,
    qDS,
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

export function isChuyenDeTitle(str: string | undefined | null): boolean {
  if (!str) return false;
  const lower = str.toLowerCase().trim();
  if (!lower) return false;

  // If title explicitly starts with core curriculum lessons e.g. "Bài 1", "Bài 9", "Bài 4", or "Phần 1", "Phần 2", "Chương 1"
  // It is NOT a chuyên đề unless it explicitly contains the keyword "chuyên đề", "cụm chuyên đề", "cđht", or "cđ"
  const isCoreLessonOrChapter = /^(?:bài\s*(?:\d+|[ivx]+)|phần\s*(?:\d+|[ivx]+)|chương\s*(?:\d+|[ivx]+)|chủ\s*đề\s*(?:\d+|[ivx]+))[\:\.\-\–\—\s]/i.test(lower);
  const hasChuyenDeExplicit = /chuyên\s*đề|cụm\s*chuyên\s*đề|chuyên\s*đề\s*học\s*tập|cđht|\b(?:cđ|cd)[\s\.\:\_\-\divx]+/i.test(lower);

  if (isCoreLessonOrChapter && !hasChuyenDeExplicit) {
    return false;
  }

  // 1. Explicit Chuyên đề keywords & variations (Chuyên đề, Chuyên đề học tập, Cụm chuyên đề, CĐ, CD...)
  if (hasChuyenDeExplicit) {
    return true;
  }

  // 2. Specific Chuyên đề Module Titles (GDPT 2018 Chuyên đề elective module names)
  if (
    /vấn\s*đề\s*chung\s*về\s*báo\s*cáo\s*địa\s*l[íý]|chuyên\s*đề\s*địa\s*l[íý]\s*đô\s*thị|chuyên\s*đề\s*đô\s*thị|chống\s*biến\s*đổi\s*khí\s*hậu|tác\s*động\s*của\s*biến\s*đổi\s*khí\s*hậu/i.test(lower)
  ) {
    return true;
  }

  if (
    /hệ\s*phương\s*trình\s*bậc\s*nhất\s*ba\s*ẩn|quy\s*nạp\s*toán\s*học|ba\s*đường\s*conic\b/i.test(lower)
  ) {
    return true;
  }

  if (
    /vật\s*l[íý]\s*trong\s*một\s*số\s*ngành\s*nghề|trái\s*đất\s*và\s*bầu\s*trời/i.test(lower)
  ) {
    return true;
  }

  if (
    /các\s*lĩnh\s*vực\s*của\s*lịch\s*sử|lịch\s*sử\s*văn\s*minh|lịch\s*sử\s*đối\s*ngoại|di\s*sản\s*văn\s*hóa\s*lịch\s*sử/i.test(lower)
  ) {
    return true;
  }

  return false;
}

export function isDocumentTitleOrNoise(str: string | undefined | null): boolean {
  if (!str) return false;
  const s = str.trim();
  const lower = s.toLowerCase();
  if (lower.length < 2) return false;

  // If this is a table row with multiple cells separated by | or \t:
  // We do NOT treat the entire row as noise if it contains lesson titles or chapter headers
  if (s.includes('|') || s.includes('\t')) {
    const cells = s.split(/[|\t]/).map((c) => c.trim()).filter(Boolean);
    if (cells.some((c) => /\bbài\s*(?:\d+|[ivx]+)/i.test(c))) return false;
    if (cells.some((c) => /^(?:chương(?!\s*trình)|chủ\s*đề|phần|mạch\s*kiến\s*thức)\s*([0-9ivxabc]+)?/i.test(c))) return false;
    // Check if every cell is noise
    const nonNoiseCount = cells.filter((c) => !isDocumentTitleOrNoise(c)).length;
    return nonNoiseCount === 0;
  }

  // If it explicitly starts with "Bài X" (e.g. Bài 1, Bài 2), it is a lesson, NOT document title noise
  if (/^bài\s*(?:\d+|[ivx]+)[\:\.\-\–\—\s]/i.test(s)) {
    return false;
  }

  // If it starts with "Phần X" for curriculum chapters (e.g. "Phần 1. Địa lí tự nhiên", "Phần 2. Địa lí dân cư")
  if (
    /^phần\s*(?:\d+|[ivx]+)[\:\.\-\–\—\s]+/i.test(s) &&
    !/(?:trắc\s*nghiệm|tự\s*luận|câu\s*hỏi|đáp\s*án|hướng\s*dẫn|thang\s*điểm|kế\s*hoạch|thông\s*tin|căn\s*cứ|nhiệm\s*vụ|mục\s*tiêu|khung\s*kế\s*hoạch)/i.test(lower)
  ) {
    return false;
  }

  // 1. School, Department, Ministry, Republic motto headers
  if (
    /cộng\s*hòa\s*xã\s*hội|độc\s*lập\s*[\-\–]\s*tự\s*do|sở\s*gd|phòng\s*gd|bộ\s*giáo\s*dục|ubnd|ủy\s*ban/i.test(lower) ||
    /trường\s*(?:thpt|thcs|tiểu\s*học|phổ\s*thông|liên\s*cấp)|trung\s*tâm\s*gdtx|\bthpt\b|\bthcs\b|\bgdtx\b/i.test(lower) ||
    /(?:tổ|nhóm)\s*(?:chuyên\s*môn|khoa\s*học|tự\s*nhiên|xã\s*hội|sử|địa|toán|văn|lí|hóa|sinh|ngoại\s*ngữ|tin\s*học)/i.test(lower)
  ) {
    return true;
  }

  // 2. Document/File title noise: "Kế hoạch dạy học", "Phân phối chương trình", "Kế hoạch giáo dục", "Khung kế hoạch"...
  if (
    /kế\s*hoạch\s*(?:dạy\s*học|giáo\s*dục|bài\s*dạy|kiểm\s*tra|thực\s*hiện|tổ\s*chuyên\s*môn|nhà\s*trường|năm\s*học)/i.test(lower) ||
    /phân\s*phối\s*chương\s*trình/i.test(lower) ||
    /khung\s*kế\s*hoạch/i.test(lower) ||
    /khung\s*phân\s*phối/i.test(lower) ||
    /bảng\s*phân\s*phối/i.test(lower) ||
    /phân\s*phối\s*nội\s*dung/i.test(lower) ||
    /chương\s*trình\s*(?:gdpt|giáo\s*dục|chi\s*tiết|môn\s*học|nhà\s*trường|tổng\s*thể)/i.test(lower) ||
    /^(?:kế\s*hoạch|khgd|khbd|ppct|khdh|khtn)\b/i.test(lower) ||
    /^(?:tiêu\s*đề|tên\s*tệp|tên\s*file|mục\s*lục|bảng\s*tổng\s*hợp)\b/i.test(lower) ||
    /^(?:bảng\s*đặc\s*tả|ma\s*trận\s*và\s*bản\s*đặc\s*tả|ma\s*trận\s*đề\s*kiểm\s*tra|đặc\s*tả\s*ma\s*trận|khung\s*ma\s*trận)\b/i.test(lower)
  ) {
    return true;
  }

  // 3. Administrative document metadata outside table: "Phụ lục...", "Công văn...", "Thông tư...", "Quyết định..."
  if (
    /^(?:phụ\s*lục|công\s*văn|thông\s*tư|quyết\s*định|hướng\s*dẫn|căn\s*cứ)\b/i.test(lower) ||
    /kèm\s*theo\s*(?:công\s*văn|kế\s*hoạch|quyết\s*định|thông\s*tư)/i.test(lower) ||
    /công\s*văn\s*(?:số\s*)?5512|thông\s*tư\s*(?:số\s*)?22|thông\s*tư\s*(?:số\s*)?26/i.test(lower)
  ) {
    return true;
  }

  // 4. Section headings outside table: "I. Kế hoạch dạy học", "I. Thông tin chung", "II. Kế hoạch cụ thể", "1. Phân phối chương trình"
  if (
    /^(?:phần|mục|[i|v|x]+)[\.\:\-\–\—\s]+(?:kế\s*hoạch|thông\s*tin|căn\s*cứ|nhiệm\s*vụ|mục\s*tiêu|đặc\s*điểm|phân\s*phối|kiểm\s*tra|đánh\s*giá|chỉ\s*tiêu|quy\s*định|khung\s*kế\s*hoạch)\b/i.test(lower) ||
    /^(?:\d+)[\.\:\-\–\—\s]+(?:phân\s*phối\s*chương\s*trình|kế\s*hoạch\s*dạy\s*học|kiểm\s*tra\s*định\s*k[ìỳ]|chuyên\s*đề\s*học\s*tập)\b/i.test(lower)
  ) {
    return true;
  }

  // 5. Metadata lines: Teacher, Class, Academic year, Signatures
  if (
    /^(?:họ\s*và\s*tên|giáo\s*viên|người\s*thực\s*hiện|năm\s*học|học\s*k[ìỳ]\s*\d+\s*[\-\–]\s*năm\s*học|áp\s*dụng\s*cho\s*lớp|bộ\s*sách)\b/i.test(lower) ||
    /^(?:ký\s*duyệt|người\s*duyệt|ban\s*giám\s*hiệu|tổ\s*trưởng|hiệu\s*trưởng|ngày\s*\d+\s*tháng)\b/i.test(lower) ||
    /năm\s*học\s*20\d\d\s*[\-\–]\s*20\d\d/i.test(lower)
  ) {
    return true;
  }

  // 6. Standalone subject/grade labels: "Môn: Địa lí 10", "Khối 10", "Lớp 10A1"
  if (/^(?:môn|môn\s*học|khối|lớp)\s*[\:\.]\s*[a-zà-ỹ\s\d]+$/i.test(lower)) {
    return true;
  }

  // 7. Table column & sub-header noise (formats, cognitive levels, headers):
  if (
    /^(?:stt|tt|thứ\s*tự|tuần|tiết|tiết\s*ppct|tên\s*bài|tên\s*bài\s*học|bài\s*học|bài\s*dạy|nội\s*dung|đơn\s*vị\s*kiến\s*thức|yêu\s*cầu\s*cần\s*đạt|yccd|thiết\s*bị|địa\s*điểm|ghi\s*chú|số\s*tiết|thời\s*lượng)$/i.test(lower) ||
    /^(?:phần|mục|chương|chủ\s*đề)?\s*(?:[0-9ivx]+[\:\.\-\s]*)?(?:trắc\s*nghiệm\s*)?(?:đúng\s*[\-\–\/\s]*sai|tự\s*luận|nhiều\s*lựa\s*chọn|trả\s*lời\s*ngắn|tnkq|bảng\s*đặc\s*tả|khung\s*ma\s*trận|mức\s*độ\s*đánh\s*giá)$/i.test(lower) ||
    /^(?:bài\s*\d+[\:\.\-\s]*)?(?:nhận\s*biết|thông\s*hiểu|vận\s*dụng\s*cao|vận\s*dụng|biết|hiểu|vd|vdc)$/i.test(lower) ||
    /^(?:tổng|tổng\s*câu|tổng\s*số\s*câu|tổng\s*điểm|tỉ\s*lệ|tỉ\s*lệ\s*\%|mức\s*độ)$/i.test(lower)
  ) {
    return true;
  }

  return false;
}

export function normalizeRomanToArabic(numStr: string): string {
  const romanMap: Record<string, string> = {
    i: '1', ii: '2', iii: '3', iv: '4', v: '5',
    vi: '6', vii: '7', viii: '8', ix: '9', x: '10'
  };
  const lower = (numStr || '').toLowerCase().trim();
  return romanMap[lower] || lower;
}

export function normalizeArabicToRoman(numStr: string): string {
  const arabicMap: Record<string, string> = {
    '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V',
    '6': 'VI', '7': 'VII', '8': 'VIII', '9': 'IX', '10': 'X'
  };
  const str = (numStr || '').trim();
  return arabicMap[str] || str.toUpperCase();
}

export function getChapterKey(chapterTitle: string): string {
  if (!chapterTitle) return '';
  const raw = chapterTitle.trim();

  // Extract chapter number if present at start
  const chMatch = raw.match(/^(?:\[bảng.*?\]\s*)?(?:chương|chủ\s*đề|phần)?\s*([0-9]+|[ivx]+)\b[\:\.\-\–\—\s]*/i);
  let numKey = '';
  if (chMatch) {
    numKey = normalizeRomanToArabic(chMatch[1]);
  }

  // Clean title text: strip chapter number prefixes, replace 'lý' with 'lí', remove non-alphanumeric chars
  const textOnly = raw
    .toLowerCase()
    .replace(/^\[bảng.*?\]\s*/i, '')
    .replace(/^(?:chương|chủ\s*đề|phần)\s*[0-9ivx]+[\:\.\-\–\—\s]*/i, '')
    .replace(/^[0-9ivx]+[\:\.\-\–\—\s]*/i, '')
    .replace(/lý/g, 'lí')
    .replace(/[^a-z0-9àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệđìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/g, '')
    .trim();

  if (numKey) {
    return `ch_${numKey}`;
  }

  return textOnly.slice(0, 35) || 'ch_default';
}

export function sanitizeChapterTitle(raw: string, mon: string, fallbackIdx: number = 1): string {
  if (!raw) {
    const prefix = (mon === 'Lịch sử' || mon === 'Giáo dục kinh tế và pháp luật') ? 'Chủ đề' : 'Chương';
    return `${prefix} ${fallbackIdx}`;
  }

  let s = raw
    .replace(/^\[Bảng.*?\]\s*/i, '')
    .replace(/\[Sheet:[^\]]+\]/g, '')
    .replace(/\(.*?\)/g, '') // remove parenthetical notes
    .trim();

  // If raw matches document title or noise, DO NOT let it become a chapter!
  if (isDocumentTitleOrNoise(s)) {
    const prefix = (mon === 'Lịch sử' || mon === 'Giáo dục kinh tế và pháp luật') ? 'Chủ đề' : 'Chương';
    return `${prefix} ${fallbackIdx}`;
  }

  // Strip any "Bài..." or lesson text that leaked into the chapter title
  s = s.split(/(?=\bbài\s*\d+)/i)[0].trim();

  // Exclude noise headers if prepended
  s = s.replace(/^(phân phối chương trình|kế hoạch dạy học|môn|lớp)\b.*?(?:chương|chủ đề|phần)/i, (m) => {
    const idx = m.search(/(?:chương|chủ đề|phần)/i);
    return idx !== -1 ? m.slice(idx) : m;
  }).trim();

  // Check if starts with "Chương X", "Chủ đề X", or "Phần X" (strictly not "Chương trình")
  const prefixMatch = s.match(/^(?:\[bảng.*?\]\s*)?(chương(?!\s*trình)|chủ\s*đề|phần)\s*([0-9ivx]+)[\:\.\-\–\—\s]*([^\n\r]*)/i);
  if (prefixMatch) {
    const type = prefixMatch[1].toLowerCase().includes('chủ') ? 'Chủ đề' : (prefixMatch[1].toLowerCase().includes('phần') ? 'Phần' : 'Chương');
    const numStr = prefixMatch[2].trim();
    let name = prefixMatch[3].trim().replace(/^[\:\-\.\–\—\s]+/, '').replace(/[\:\-\.\–\—\s]+$/, '').trim();
    if (isDocumentTitleOrNoise(name)) {
      return `${type} ${numStr}`;
    }
    return name ? `${type} ${numStr}. ${name}` : `${type} ${numStr}`;
  }

  // Check if starts with Roman numerals or numbers like "I. Tên chương" or "1. Tên chương"
  const numMatch = s.match(/^(?:\[bảng.*?\]\s*)?([0-9ivx]+)[\:\.\-\–\—\s]+([^\n\r]+)/i);
  if (numMatch && !/^bài\s*\d+/i.test(s)) {
    const numStr = numMatch[1].trim();
    let name = numMatch[2].trim().replace(/^[\:\-\.\–\—\s]+/, '').replace(/[\:\-\.\–\—\s]+$/, '').trim();
    if (isDocumentTitleOrNoise(name)) {
        const prefix = (mon === 'Lịch sử' || mon === 'Giáo dục kinh tế và pháp luật') ? 'Chủ đề' : 'Chương';
        return `${prefix} ${fallbackIdx}`;
    }
    const prefix = (mon === 'Lịch sử' || mon === 'Giáo dục kinh tế và pháp luật') ? 'Chủ đề' : 'Chương';
    return name ? `${prefix} ${numStr}. ${name}` : `${prefix} ${numStr}`;
  }

  // Fallback: format as "Chương fallbackIdx. cleanName"
  const cleanName = s.replace(/^(?:chương(?!\s*trình)|chủ\s*đề|phần)\s*/i, '').trim();
  if (isDocumentTitleOrNoise(cleanName)) {
    const prefix = (mon === 'Lịch sử' || mon === 'Giáo dục kinh tế và pháp luật') ? 'Chủ đề' : 'Chương';
    return `${prefix} ${fallbackIdx}`;
  }
  const prefix = (mon === 'Lịch sử' || mon === 'Giáo dục kinh tế và pháp luật') ? 'Chủ đề' : 'Chương';
  return cleanName ? `${prefix} ${fallbackIdx}. ${cleanName}` : `${prefix} ${fallbackIdx}`;
}

/**
 * Cleans a lesson title by stripping lesson hours/periods (e.g. "(2 tiết)", "Tiết 1..", "Tiết 1, 2"),
 * sub-section markers (e.g., "a) ...", "1.1 ..."), extra colons/periods, and trailing punctuation.
 * Output is pure: "Tên bài" (e.g., "Phương pháp biểu hiện các đối tượng địa lí trên bản đồ").
 */
/**
 * Detects if a text line is a Learning Outcome (Yêu cầu cần đạt / YCCĐ) rather than a pure lesson name.
 * Matrix content (r.n) must NEVER contain YCCĐ; only lesson numbers and lesson names are allowed.
 */
export function isYccdTextOrOutcome(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  const lower = t.toLowerCase();

  // Explicit YCCĐ / level labels
  if (/^(?:\[?[0-9a-z\+\*\-\•\–\—\.\,\(\)\[\]\s]|mức\s*độ)*\b(nhận\s*biết|thông\s*hiểu|vận\s*dụng\s*cao|vận\s*dụng|biết|hiểu)\s*[\:\-\.]/i.test(lower)) {
    return true;
  }
  if (/^(?:yêu\s*cầu\s*cần\s*đạt|yccd|mục\s*tiêu|chuẩn\s*kiến\s*thức|năng\s*lực|phẩm\s*chất)\b/i.test(lower)) {
    return true;
  }

  // Bullet starting with dash/star/bullet
  const hasBullet = /^[+\*\-•\–\—]/.test(t);

  // Common GDPT 2018 learning outcome action verbs
  const hasOutcomeVerb =
    /\b(?:trình\s*bày|nêu|mô\s*tả|phát\s*biểu|phân\s*biệt|so\s*sánh|giải\s*thích|chứng\s*minh|phân\s*tích|đánh\s*giá|vận\s*dụng|liên\s*hệ|rút\s*ra|thực\s*hiện|sử\s*dụng|vẽ|đọc|xác\s*định|tính|chỉ\s*ra|lấy\s*được\s*ví\s*dụ|hệ\s*thống\s*hóa|nhận\s*biết|liệt\s*kê|đề\s*xuất|phân\s*loại|nhận\s*xét)\s+(?:được|các|về|nguyên\s*nhân|khái\s*niệm|vai\s*trò|ý\s*nghĩa|công\s*thức|mối\s*quan\s*hệ|đặc\s*điểm|cấu\s*trúc|sự|bản\s*chất)\b/i.test(lower);

  if (hasOutcomeVerb) {
    if (hasBullet || !/^(?:bài\s*\d+|[0-9ivx]+\.)/i.test(t)) {
      return true;
    }
    // Even with "Bài X", if it's "Bài 2. Trình bày được..." then it is YCCĐ, not a lesson title
    if (/^bài\s*\d+[\:\.\-\s]+(?:trình\s*bày|nêu|phân\s*tích|giải\s*thích|vận\s*dụng|nhận\s*biết)\s+được\b/i.test(lower)) {
      return true;
    }
  }

  // Any bullet containing "được" or typical outcome phrasing
  if (hasBullet && /\b(?:được|kể\s*tên|nhận\s*biết)\b/i.test(lower)) {
    return true;
  }

  return false;
}

/**
 * Cleans a lesson title by stripping lesson hours/periods (e.g. "(2 tiết)", "Tiết 1..", "Tiết 1, 2"),
 * sub-section markers (e.g., "a) ...", "1.1 ..."), extra colons/periods, and trailing punctuation.
 * Output is pure: "Tên bài" (e.g., "Phương pháp biểu hiện các đối tượng địa lí trên bản đồ").
 */
export function cleanLessonTitle(rawTitle: string, stripBaiPrefix: boolean = false): string {
  if (!rawTitle) return '';
  let clean = rawTitle.trim();
  if (isDocumentTitleOrNoise(clean)) return '';

  if (stripBaiPrefix) {
    clean = clean.replace(/^(?:bài\s*(?:\d+|[ivx]+)?[\:\.\-\–\—\s]*)+/gi, '').trim();
  } else {
    // If it has duplicate "Bài X." prefixes (e.g. "Bài 1. Bài 1. Tên bài"), simplify to single "Bài 1. "
    clean = clean.replace(/^(?:bài\s*(\d+|[ivx]+)[\:\.\-\–\—\s]*)(?:bài\s*(?:\d+|[ivx]+)?[\:\.\-\–\—\s]*)+/gi, 'Bài $1. ').trim();
  }

  // 1. Remove parenthetical or bracketed notes regarding time/periods/weeks/equipment/locations
  clean = clean.replace(/[\(\[\{]\s*(?:tiết|số\s*tiết|thời\s*lượng|thời\s*gian|tuần|phút|phòng|máy\s*chiếu|thiết\s*bị|địa\s*điểm|ghi\s*chú)[\s\d\,\-\–\—\:\.]*[\)\]\}]/gi, '');
  clean = clean.replace(/[\(\[\{]\s*\d+\s*(?:tiết|t|phút)\s*[\)\]\}]/gi, '');
  clean = clean.replace(/\s*[\(\[\{].*?(?:tiết|số\s*tiết|thời\s*lượng|tuần).*?[\)\]\}]\s*$/gi, '');

  // 2. Remove inline or prefix/suffix "Tiết 1..", "Tiết 1, 2", "Tiết 1-3", "Số tiết: 2", "Thời lượng: 2 tiết"
  clean = clean.replace(/\b(?:tiết|số\s*tiết|thời\s*lượng|thời\s*gian)\s*[\:\.\s]*[\d\,\-\–\—\s]+/gi, '');
  clean = clean.replace(/[\:\-\–\—\.\,]\s*(?:tiết|thời\s*lượng)\b.*$/gi, '');

  // 3. Remove trailing YCCĐ outcome text attached after a colon, dash, or semicolon
  // NEVER cut on "Sự ..." when "Sự" is part of the actual lesson title e.g. "Sự hình thành Trái Đất"
  clean = clean.replace(/\s*[\-\–\—\:\;]\s*(?:yêu\s*cầu\s*cần\s*đạt|yccd|mục\s*tiêu|chuẩn\s*kiến\s*thức).*$/gi, '');
  clean = clean.replace(/\s*[\-\–\—\:\;]\s*(?:trình\s*bày|nêu|mô\s*tả|phát\s*biểu|phân\s*tích|giải\s*thích|sử\s*dụng|vận\s*dụng|nhận\s*biết|xác\s*định|đánh\s*giá)\s+được\b.*$/gi, '');

  // 4. Clean up leading/trailing punctuation, colons, hyphens, periods
  clean = clean.replace(/^[\:\-\–\—\.\,\s]+/, '').replace(/[\:\-\–\—\.\,\s]+$/, '').trim();

  // 5. Clean up duplicate spaces
  clean = clean.replace(/\s+/g, ' ');

  // 6. Handle sentence case if ALL CAPS e.g. "PHƯƠNG PHÁP BIỂU HIỆN..." -> "Phương pháp biểu hiện..."
  if (clean === clean.toUpperCase() && clean.length > 4) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }

  if (isDocumentTitleOrNoise(clean)) return '';

  return clean;
}

export function sanitizeLessonContent(
  raw: string,
  chapterTitle: string,
  startingLessonNum = 1,
  outState?: { nextLessonNum: number }
): string {
  if (!raw || !raw.trim()) {
    const cleanCh = chapterTitle.replace(/^chương\s*[0-9ivxabc]+\.s*/i, '').trim();
    if (outState) outState.nextLessonNum = startingLessonNum + 1;
    return `Bài ${startingLessonNum}. ${cleanCh || 'Nội dung kiến thức trọng tâm'}`;
  }

  // Pre-process raw text:
  // 1. Convert newlines to uniform newlines (preserve semicolons inside lesson titles)
  // 2. Put inline "Bài X" markers on their own lines e.g. "Bài 6. Tên 6. Bài 7. Tên 7" -> separate lines
  let expandedRaw = raw
    .replace(/\r?\n/g, '\n')
    .replace(/\s*;\s*(?=(?:bài|bài\s*học)\s*(?:\d+|[ivx]+)[\:\.\-\–\—\s])/gi, '\n')
    .replace(/(?<=\S)\s+(?=(?:bài|bài\s*học)\s*(?:\d+|[ivx]+)[\:\.\-\–\—\s])/gi, '\n');

  // 3. Expand grouped "Bài 6, 7, 8: Tên bài" or "Bài 6, Bài 7, Bài 8: Tên bài" into separate lines
  expandedRaw = expandedRaw.replace(
    /\bbài\s*((?:\d+|[ivx]+)(?:\s*[\,\-\–\—\&]\s*(?:bài\s*)?(?:\d+|[ivx]+))+)\s*[\:\.\-\–\—\s]+([^\n\r]+)/gi,
    (match, numGroup, titleStr) => {
      const numMatches = numGroup.match(/\d+|[ivx]+/gi);
      if (!numMatches || numMatches.length === 0) return match;
      const cleanT = cleanLessonTitle(titleStr, true);
      return numMatches.map((n: string) => `Bài ${n}. ${cleanT}`).join('\n');
    }
  );

  // 4. Preserve full lesson titles without auto-chopping on periods or commas
  const rawLines = expandedRaw.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed) return [];

    // Check if line contains multiple inline "Bài X" markers e.g. "Bài 1. Tên 1. Bài 2. Tên 2"
    if (/bài\s*\d+/i.test(trimmed)) {
      const parts = trimmed.split(/(?=\bbài\s*\d+[\:\.\-\s])/i).map((p) => p.trim()).filter(Boolean);
      if (parts.length > 1) return parts;
    }

    // Do NOT split long lesson titles on periods, commas or semicolons inside the name
    return [trimmed];
  });

  const formatted: string[] = [];
  let lessonNum = startingLessonNum;

  for (const line of rawLines) {
    if (isChuyenDeTitle(line)) continue;
    // CRITICAL: Drop any YCCĐ / learning outcome lines! Matrix MUST NOT include YCCĐ!
    if (isYccdTextOrOutcome(line)) continue;
    if (isDocumentTitleOrNoise(line)) continue;

    let clean = line.replace(/^[+\*\-•\–\—]\s*/, '').trim();

    // Skip sub-topic / sub-heading lines e.g. "a) Khái niệm", "1.1 Mục tiêu", "Mục 1...", "Phần 2...", "- Yêu cầu..."
    if (/^[a-z]\)\s*/i.test(clean) || /^\d+\.\d+\b/.test(clean) || /^(?:mục|phần|nội dung)\s*\d+/i.test(clean)) {
      continue;
    }

    // Match if line starts with "Bài X." or "Bài X:" or "Bài X -"
    const baiMatch = clean.match(/^bài\s*(\d+|[ivx]+)[\:\.\-\–\—\s]+([^\n\r]+)/i);
    if (baiMatch) {
      const numStr = baiMatch[1];
      const titleStr = cleanLessonTitle(baiMatch[2], true);
      if (titleStr && !isYccdTextOrOutcome(titleStr) && !isDocumentTitleOrNoise(titleStr)) {
        const parsed = parseInt(numStr, 10);
        // If parsed is >= startingLessonNum, keep it; otherwise enforce sequential lesson numbering
        const actualNum = (!isNaN(parsed) && parsed >= startingLessonNum) ? parsed : lessonNum;
        formatted.push(`Bài ${actualNum}. ${titleStr}`);
        lessonNum = actualNum + 1;
      }
      continue;
    }

    // Match if line starts with number e.g. "1. Tên bài" or "1: Tên bài"
    const numMatch = clean.match(/^(\d+)[\:\.\)\-\–\—\s]+([^\n\r]+)/i);
    if (numMatch) {
      const numStr = numMatch[1];
      const candidateNum = parseInt(numStr, 10);
      const titleStr = cleanLessonTitle(numMatch[2], true);

      // If titleStr starts with sub-topic keywords like "Khái niệm", "Đặc điểm", skip it
      const isSubKeyword = /^(?:khái\s*niệm|đặc\s*điểm|vai\s*trò|ý\s*nghĩa|cấu\s*trúc|mục\s*tiêu|kĩ\s*năng|nội\s*dung)/i.test(titleStr);
      if (titleStr && !isSubKeyword && !isYccdTextOrOutcome(titleStr) && !isDocumentTitleOrNoise(titleStr)) {
        const actualNum = (!isNaN(candidateNum) && candidateNum >= startingLessonNum) ? candidateNum : lessonNum;
        formatted.push(`Bài ${actualNum}. ${titleStr}`);
        lessonNum = actualNum + 1;
        continue;
      } else if (isSubKeyword) {
        continue; // skip sub-topic
      }
    }

    // Line is a lesson title without "Bài X." prefix
    const titleStr = cleanLessonTitle(clean, true);
    const isSubKeyword = /^(?:khái\s*niệm|đặc\s*điểm|vai\s*trò|ý\s*nghĩa|cấu\s*trúc|mục\s*tiêu|kĩ\s*năng|nội\s*dung|thực\s*hành\s*bài|tiết\s*\d+)/i.test(titleStr);

    if (titleStr.length > 2 && !isSubKeyword && !isYccdTextOrOutcome(titleStr) && !isDocumentTitleOrNoise(titleStr)) {
      formatted.push(`Bài ${lessonNum}. ${titleStr}`);
      lessonNum++;
    }
  }

  if (formatted.length === 0) {
    const cleanCh = chapterTitle.replace(/^chương\s*[0-9ivxabc]+\.s*/i, '').trim();
    if (outState) outState.nextLessonNum = startingLessonNum + 1;
    return `Bài ${startingLessonNum}. ${cleanCh || 'Nội dung kiến thức trọng tâm'}`;
  }

  // Deduplicate exact same lines (ignoring case)
  const uniqueFormatted: string[] = [];
  const seen = new Set<string>();
  formatted.forEach((item) => {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFormatted.push(item);
    }
  });

  if (outState) outState.nextLessonNum = lessonNum;
  return uniqueFormatted.join('\n');
}

export function detectTestMarkerType(text: string): 'midterm1' | 'final1' | 'midterm2' | 'final2' | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  // Must contain test / assessment keyword
  const hasTestKeyword = /(?:kiểm\s*tra|đánh\s*giá|kttx|ktgk|đggk|ktck|đgck|ôn\s*tập\s*và\s*kiểm\s*tra|kt\s*đk|định\s*k[ìỳ])/i.test(lower);
  if (!hasTestKeyword) return null;

  // Midterm 2
  if (
    /(?:giữa|gk)\s*(?:học\s*)?k[ìỳ]\s*(?:2|ii)\b/i.test(lower) ||
    /\b(?:ktgk|đggk)\s*(?:2|ii)\b/i.test(lower)
  ) {
    return 'midterm2';
  }

  // Final 2
  if (
    /(?:cuối|ck)\s*(?:học\s*)?k[ìỳ]\s*(?:2|ii)\b/i.test(lower) ||
    /\b(?:ktck|đgck)\s*(?:2|ii)\b/i.test(lower) ||
    /cuối\s*năm/i.test(lower)
  ) {
    return 'final2';
  }

  // Final 1
  if (
    /(?:cuối|ck)\s*(?:học\s*)?k[ìỳ]\s*(?:1|i)\b/i.test(lower) ||
    /\b(?:ktck|đgck)\s*(?:1|i)\b/i.test(lower) ||
    /cuối\s*học\s*k[ìỳ]\s*(?:1|i)/i.test(lower) ||
    /hết\s*học\s*k[ìỳ]\s*(?:1|i)/i.test(lower)
  ) {
    return 'final1';
  }

  // Midterm 1 (or general midterm if no semester specified)
  if (
    /(?:giữa|gk)\s*(?:học\s*)?k[ìỳ]\s*(?:1|i)?\b/i.test(lower) ||
    /\b(?:ktgk|đggk)\s*(?:1|i)?\b/i.test(lower) ||
    /(?:kiểm\s*tra|đánh\s*giá)(?:[\s\,\.\-\–\—\:]*(?:định\s*k[ìỳ]|thường\s*xuyên))*[\s\,\.\-\–\—\:]*(?:giữa|gk)/i.test(lower) ||
    /kiểm\s*tra\s*(?:định\s*k[ìỳ]\s*)?(?:lần\s*1|tiết\s*9|1\s*tiết)/i.test(lower) ||
    /(?:ôn\s*tập\s*và\s*)?kiểm\s*tra\s*(?:định\s*k[ìỳ]\s*)?giữa/i.test(lower)
  ) {
    return 'midterm1';
  }

  return null;
}

export interface PpctCutoffInfo {
  forbiddenLessonNums: Set<number>;
  maxAllowedLessonNum: number | null;
  forbiddenLessonKeywords: string[];
  hasCutoffDetected: boolean;
}

export function extractPostExamLessonsFromPpct(
  ppctText: string,
  ki: string
): PpctCutoffInfo {
  const result: PpctCutoffInfo = {
    forbiddenLessonNums: new Set<number>(),
    maxAllowedLessonNum: null,
    forbiddenLessonKeywords: [],
    hasCutoffDetected: false,
  };

  if (!ppctText || ppctText.trim().length < 20) {
    return result;
  }

  const isMidterm = ki.startsWith('Giữa') || ki.includes('GK');
  const isSem1 = !ki.includes('II') && !ki.includes('2');
  const targetSemNum = isSem1 ? 1 : 2;

  const rawLines = ppctText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let currentSem: 1 | 2 = 1;
  let isPastCutoff = false;
  let seenLessonCountBeforeCutoff = 0;
  const preCutoffLessonNums: number[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (isDocumentTitleOrNoise(line) || isChuyenDeTitle(line)) continue;

    // Check semester switches
    if (/học\s*k[ìỳ]\s*(?:2|ii)\b|hk\s*(?:2|ii)\b/i.test(line)) {
      currentSem = 2;
      if (isSem1) {
        // If target is Semester 1, everything in Semester 2 is past cutoff
        isPastCutoff = true;
      }
    } else if (/học\s*k[ìỳ]\s*(?:1|i)\b|hk\s*(?:1|i)\b/i.test(line)) {
      currentSem = 1;
    }

    // Check week numbers
    const weekMatch = line.match(/(?:tuần|t\.)\s*(\d+)/i);
    let lineWeek: number | null = null;
    if (weekMatch) {
      lineWeek = parseInt(weekMatch[1], 10);
      if (lineWeek > 18) {
        currentSem = 2;
        if (isSem1) isPastCutoff = true;
      }
    }

    // Check test markers in line or table cells
    const cells = line.includes('|') || line.includes('\t')
      ? line.split(/[|\t]/).map((c) => c.trim()).filter(Boolean)
      : [line];

    let lineMatchesTargetExam = false;
    for (const c of cells) {
      const markerType = detectTestMarkerType(c);
      if (isSem1 && isMidterm && markerType === 'midterm1') {
        lineMatchesTargetExam = true;
        break;
      } else if (isSem1 && !isMidterm && markerType === 'final1') {
        lineMatchesTargetExam = true;
        break;
      } else if (!isSem1 && isMidterm && markerType === 'midterm2') {
        lineMatchesTargetExam = true;
        break;
      } else if (!isSem1 && !isMidterm && markerType === 'final2') {
        lineMatchesTargetExam = true;
        break;
      }
    }

    // Also check week-based cutoff if lineWeek is present
    if (isSem1 && isMidterm && lineWeek !== null && lineWeek > 9 && seenLessonCountBeforeCutoff >= 3) {
      isPastCutoff = true;
      result.hasCutoffDetected = true;
    } else if (!isSem1 && isMidterm && lineWeek !== null && lineWeek > 27 && seenLessonCountBeforeCutoff >= 3) {
      isPastCutoff = true;
      result.hasCutoffDetected = true;
    }

    if (lineMatchesTargetExam && seenLessonCountBeforeCutoff >= 1) {
      isPastCutoff = true;
      result.hasCutoffDetected = true;
      continue;
    }

    // Extract any lesson reference from line/cells
    for (const c of cells) {
      const cleanC = c.replace(/^\[bảng.*?\]\s*/i, '').replace(/^tiết\s*[\d\,\-\s]+[\:\.\-\–\—\s]*/i, '').trim();
      if (!cleanC || isDocumentTitleOrNoise(cleanC) || isChuyenDeTitle(cleanC) || isYccdTextOrOutcome(cleanC)) continue;

      // Match "Bài X"
      const baiMatch = cleanC.match(/(?:^|[\s\:\.\-\–\—\(\)\[\]])(?:bài|bài\s*học)\s*0*([0-9]+|[ivx]+)\b(?:\s*[\:\.\-\–\—\s]+([^\n\r\|]+))?/i);
      if (baiMatch) {
        const num = parseInt(normalizeRomanToArabic(baiMatch[1]), 10);
        const titlePart = cleanLessonTitle(baiMatch[2] || '');

        if (!isPastCutoff && currentSem === targetSemNum) {
          if (!isNaN(num)) {
            preCutoffLessonNums.push(num);
          }
          seenLessonCountBeforeCutoff++;
        } else if (isPastCutoff || (isSem1 && currentSem === 2)) {
          if (!isNaN(num)) {
            result.forbiddenLessonNums.add(num);
          }
          if (titlePart && titlePart.length >= 4) {
            result.forbiddenLessonKeywords.push(titlePart.toLowerCase());
          }
        }
        continue;
      }

      // Match "X. Tên bài"
      const numMatch = cleanC.match(/^(\d+)[\:\.\)\-\–\—\s]+([^\n\r\|]+)/i);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        const titlePart = cleanLessonTitle(numMatch[2] || '');
        if (titlePart.length >= 3 && !isYccdTextOrOutcome(titlePart)) {
          if (!isPastCutoff && currentSem === targetSemNum) {
            if (!isNaN(num)) preCutoffLessonNums.push(num);
            seenLessonCountBeforeCutoff++;
          } else if (isPastCutoff || (isSem1 && currentSem === 2)) {
            if (!isNaN(num)) result.forbiddenLessonNums.add(num);
            if (titlePart.length >= 4) {
              result.forbiddenLessonKeywords.push(titlePart.toLowerCase());
            }
          }
        }
      }
    }
  }

  if (preCutoffLessonNums.length > 0) {
    result.maxAllowedLessonNum = Math.max(...preCutoffLessonNums);
  }

  return result;
}

export function isLessonBeyondMidtermScope(
  lessonText: string,
  mon: string,
  semester?: string
): boolean {
  if (!semester) return false;
  const isMidterm = semester.startsWith('Giữa') || semester.includes('GK');
  const isSem1 = !semester.includes('II') && !semester.includes('2');

  if (isMidterm && isSem1) {
    const lower = (lessonText || '').toLowerCase().trim();

    // Standard History Grade 10 Midterm 1 scope is strictly Lesson 1 to Lesson 4
    if (mon.includes('Lịch sử')) {
      // 1. Any lesson numbered > 4 (Bài 5, Bài 6, 5., 6...)
      // Loosened regex to capture more variations
      const m1 = lower.match(/(?:bài|bài\s*học)\s*(?:số\s*)?0*([0-9]+|[ivx]+)\b/i);
      if (m1) {
        const num = parseInt(normalizeRomanToArabic(m1[1]), 10);
        if (!isNaN(num) && num > 4) {
          console.log(`[History Scope Check] Lesson "${lessonText}" identified as beyond midterm 1 scope (Lesson ${num} > 4)`);
          return true;
        }
      }
      
      // 2. Specific post-midterm topics taught in second half of Semester 1 in History 10 (Lessons 5, 6...)
      // Added more specific keywords and reduced aggressiveness of generic ones
      const postMidtermKeywords = [
        /văn\s*minh\s*(?:phương\s*đông|phương\s*tây|thế\s*giới|ấn\s*độ|ai\s*cập|trung\s*hoa|hy\s*lạp|la\s*mã|tây\s*âu)/i,
        /văn\s*minh\s*ấn\s*độ/i,
        /văn\s*minh\s*ai\s*cập/i,
        /văn\s*minh\s*trung\s*hoa/i,
        /thời\s*phục\s*hưng/i
      ];
      
      if (postMidtermKeywords.some(re => re.test(lower))) {
        // "Khái niệm văn minh" is Lesson 4 (in Midterm 1). 
        if (/khái\s*niệm\s*văn\s*minh/i.test(lower) && !/phương\s*đông|phương\s*tây|ấn\s*độ|ai\s*cập|trung\s*hoa|hy\s*lạp|la\s*mã/i.test(lower)) {
          return false;
        }
        console.log(`[History Scope Check] Lesson "${lessonText}" identified as beyond midterm 1 scope (Keyword match)`);
        return true;
      }
    }
  }

  return false;
}

export function cleanseRowsForExamScope<
  T extends { c: string; n: string; v?: number[]; y?: number[]; s?: [string, string, string] }
>(rows: T[], mon: string, semester?: string, skipHardcodedRules: boolean = false): T[] {
  if (!rows || !rows.length || !semester) return rows;
  if (skipHardcodedRules) return rows;

  const isMidterm = semester.startsWith('Giữa') || semester.includes('GK');
  const isSem1 = !semester.includes('II') && !semester.includes('2');

  return rows
    .map((row) => {
      const cLower = (row.c || '').toLowerCase();
      // In History Midterm 1, if chapter title is purely post-midterm topic
      if (!skipHardcodedRules && isMidterm && isSem1 && mon.includes('Lịch sử')) {
        const isPostMidtermChapter = /văn\s*minh\s*thế\s*giới|nền\s*văn\s*minh\s*thế\s*giới|văn\s*minh\s*phương\s*đông|văn\s*minh\s*phương\s*tây/i.test(cLower);
        if (isPostMidtermChapter && !/lịch\s*sử\s*và\s*sử\s*học/i.test(cLower)) {
          const lines = (row.n || '').split(/(?:\r?\n|;)+/).map((l) => l.trim()).filter(Boolean);
          const hasPreMidterm = lines.some((l) => !isLessonBeyondMidtermScope(l, mon, semester));
          if (!hasPreMidterm) return null;
        }
      }

      const lines = (row.n || '')
        .replace(/(?<=\S)\s+(?=(?:bài|bài\s*học)\s*(?:\d+|[ivx]+)[\:\.\-\–\—\s])/gi, '\n')
        .split(/(?:\r?\n|;)+/)
        .map((l) => l.trim())
        .filter(Boolean);

      const validLines = lines.filter((l) => {
        if (!skipHardcodedRules && isMidterm && isSem1 && isLessonBeyondMidtermScope(l, mon, semester)) {
          return false;
        }
        return true;
      });

      if (!validLines.length) return null;

      return {
        ...row,
        n: validLines.join('\n'),
      };
    })
    .filter((r): r is T => r !== null && Boolean(r.n && r.n.trim()));
}

export function cleanseRowsByPpctCutoff<
  T extends { c: string; n: string; v?: number[]; y?: number[]; s?: [string, string, string] }
>(rows: T[], ppctText: string, mon: string, semester: string, skipHardcodedRules: boolean = false): T[] {
  if (!rows || !rows.length) return [];
  if (skipHardcodedRules) return rows;

  // Step 1: If no PPCT text is available or text is matrix/YCCD, skip hardcoded scope removal
  const isLikelyMatrixOrYccd =
    skipHardcodedRules ||
    /(?:ma\s*trận|đặc\s*tả|yêu\s*cầu\s*cần\s*đạt|yccd|mức\s*độ|nhận\s*biết|thông\s*hiểu|vận\s*dụng|nhiều\s*lựa\s*chọn|đúng\s*[\-\–]?\s*sai|trả\s*lời\s*ngắn|tự\s*luận)/i.test(ppctText.toLowerCase());

  if (!ppctText || ppctText.trim().length < 20) {
    return cleanseRowsForExamScope(rows, mon, semester, isLikelyMatrixOrYccd);
  }

  // Step 2: Extract chronological cutoff from PPCT
  const cutoffInfo = extractPostExamLessonsFromPpct(ppctText, semester);
  const { forbiddenLessonNums, maxAllowedLessonNum, forbiddenLessonKeywords, hasCutoffDetected } = cutoffInfo;

  // Step 3: If no cutoff detected and no forbidden lessons found, return base cleansed
  if (!hasCutoffDetected && forbiddenLessonNums.size === 0 && !maxAllowedLessonNum && forbiddenLessonKeywords.length === 0) {
    return cleanseRowsForExamScope(rows, mon, semester, isLikelyMatrixOrYccd);
  }

  const isMidterm = semester.startsWith('Giữa') || semester.includes('GK');

  return rows
    .map((row) => {
      const lines = (row.n || '')
        .replace(/(?<=\S)\s+(?=(?:bài|bài\s*học)\s*(?:\d+|[ivx]+)[\:\.\-\–\—\s])/gi, '\n')
        .split(/(?:\r?\n|;)+/)
        .map((l) => l.trim())
        .filter(Boolean);

      const validLines = lines.filter((line) => {
        const lower = line.toLowerCase();

        // 1. Check if line explicitly matches forbidden numbers or keywords from PPCT
        const numMatch = lower.match(/(?:^|[\s\:\.\-\–\—\(\)\[\]])(?:bài|bài\s*học)\s*0*([0-9]+|[ivx]+)\b/i) ||
          lower.match(/^[-+*•]?\s*0*([0-9]+)[\:\.\)\-\–\—\s]/i);
        if (numMatch) {
          const num = parseInt(normalizeRomanToArabic(numMatch[1]), 10);
          if (!isNaN(num)) {
            if (forbiddenLessonNums.has(num)) return false;
            if (isMidterm && maxAllowedLessonNum !== null && num > maxAllowedLessonNum) return false;
          }
        }

        for (const kw of forbiddenLessonKeywords) {
          if (kw.length >= 6 && (lower.includes(kw) || kw.includes(lower))) {
            return false;
          }
        }

        // 2. Check general beyond midterm scope (only if skipHardcodedRules/isLikelyMatrixOrYccd is false and PPCT didn't provide explicit cutoff)
        if (!skipHardcodedRules && !isLikelyMatrixOrYccd && !hasCutoffDetected && isLessonBeyondMidtermScope(line, mon, semester)) {
          return false;
        }

        return true;
      });

      if (!validLines.length) return null;

      return {
        ...row,
        n: validLines.join('\n'),
      };
    })
    .filter((r): r is T => r !== null && Boolean(r.n && r.n.trim()));
}

export function consolidateRowsByChapter<
  T extends { c: string; n: string; v?: number[]; y?: number[]; s?: [string, string, string] }
>(rows: T[], mon: string, semester?: string, ppctText?: string, bypassCleaning: boolean = false): T[] {
  if (!rows || !rows.length) return [];
  
  let cleansedInput: T[] = rows;
  if (!bypassCleaning) {
    cleansedInput = ppctText && semester
      ? cleanseRowsByPpctCutoff(rows, ppctText, mon, semester, bypassCleaning)
      : cleanseRowsForExamScope(rows, mon, semester, bypassCleaning);
    if (!cleansedInput || !cleansedInput.length) return [];
  }

  const map = new Map<string, T>();
  
  cleansedInput.forEach((row, idx) => {
    const rawChapter = (row.c || '').trim();
    if (!bypassCleaning && (!rawChapter || isChuyenDeTitle(rawChapter) || isChuyenDeTitle(row.n) || isDocumentTitleOrNoise(rawChapter))) return;
    
    const cleanChapter = bypassCleaning ? rawChapter : sanitizeChapterTitle(rawChapter, mon, idx + 1);
    if (!bypassCleaning && (!cleanChapter || isChuyenDeTitle(cleanChapter) || isDocumentTitleOrNoise(cleanChapter))) return;

    const key = getChapterKey(cleanChapter) || getChapterKey(rawChapter);
    if (!key) return;

    if (!map.has(key)) {
      map.set(key, { ...row, c: cleanChapter });
    } else {
      const existing = map.get(key)!;

      // Group all lessons/subtopics belonging to the same chapter into the single 'n' cell
      const existingLines = (existing.n || '').split('\n').map((l) => l.trim()).filter(Boolean);
      const newLines = (row.n || '').split('\n').map((l) => l.trim()).filter(Boolean);
      const combinedLines: string[] = [];
      [...existingLines, ...newLines].forEach((line) => {
        if (!combinedLines.some((l) => l.toLowerCase() === line.toLowerCase()) && (bypassCleaning || (!isChuyenDeTitle(line) && !isDocumentTitleOrNoise(line) && !isYccdTextOrOutcome(line)))) {
          combinedLines.push(line);
        }
      });
      existing.n = combinedLines.join('\n');

      if (cleanChapter.length > existing.c.length) {
        existing.c = cleanChapter;
      }

      if (existing.v && row.v) {
        existing.v[0] = (existing.v[0] || 0) + (row.v[0] || 0);
        existing.v[1] = (existing.v[1] || 0) + (row.v[1] || 0);
        existing.v[2] = (existing.v[2] || 0) + (row.v[2] || 0);

        existing.v[6] = (existing.v[6] || 0) + (row.v[6] || 0);
        existing.v[7] = (existing.v[7] || 0) + (row.v[7] || 0);
        existing.v[8] = (existing.v[8] || 0) + (row.v[8] || 0);

        existing.v[9] = (existing.v[9] || 0) + (row.v[9] || 0);
        existing.v[10] = (existing.v[10] || 0) + (row.v[10] || 0);
        existing.v[11] = (existing.v[11] || 0) + (row.v[11] || 0);
      }

      if (existing.y && row.y) {
        existing.y[0] = (existing.y[0] || 0) + (row.y[0] || 0);
        existing.y[1] = (existing.y[1] || 0) + (row.y[1] || 0);
        existing.y[2] = (existing.y[2] || 0) + (row.y[2] || 0);

        const sy = existing.y[0] + existing.y[1] + existing.y[2];
        if (existing.v) {
          if (sy > 0) {
            const totalDSQ = Math.max(1, Math.round(sy / 4));
            existing.v[3] = totalDSQ;
            existing.v[4] = 0;
            existing.v[5] = 0;
          } else {
            existing.v[3] = 0;
            existing.v[4] = 0;
            existing.v[5] = 0;
          }
        }
      }

      if (row.s && Array.isArray(row.s)) {
        if (!existing.s) {
          existing.s = [...row.s];
        } else {
          const combineYccd = (s1: string, s2: string): string => {
            const t1 = (s1 || '').trim();
            const t2 = (s2 || '').trim();
            if (!t1) return t2;
            if (!t2) return t1;
            if (t1.toLowerCase() === t2.toLowerCase()) return t1;
            if (t1.includes(t2)) return t1;
            if (t2.includes(t1)) return t2;
            return `${t1}\n${t2}`;
          };
          existing.s = [
            combineYccd(existing.s[0], row.s[0]),
            combineYccd(existing.s[1], row.s[1]),
            combineYccd(existing.s[2], row.s[2]),
          ];
        }
      }
    }
  });

  // Final pass: enforce chapter title and lesson content formatting rules on all output rows with continuous PPCT lesson counter
  const outState = { nextLessonNum: 1 };
  const rawConsolidated = Array.from(map.values())
    .map((row, idx) => {
      const cleanC = sanitizeChapterTitle(row.c, mon, idx + 1);
      const cleanN = sanitizeLessonContent(row.n, cleanC, outState.nextLessonNum, outState);
      return {
        ...row,
        c: cleanC,
        n: cleanN,
      };
    })
    .filter((r) => r.c && !isDocumentTitleOrNoise(r.c) && r.n && !isDocumentTitleOrNoise(r.n));

  if (bypassCleaning) {
    return rawConsolidated;
  }

  return ppctText && semester
    ? cleanseRowsByPpctCutoff(rawConsolidated, ppctText, mon, semester, bypassCleaning)
    : cleanseRowsForExamScope(rawConsolidated, mon, semester, bypassCleaning);
}

export function distributeQuestions(
  rows: MatrixRow[],
  mon: SubjectName,
  structureMode: StructureMode,
  noTLN: boolean,
  points?: QuestionPointConfig,
  targetFormatPts?: number[],
  targetLevelPts?: number[],
  bypassCleaning: boolean = false
): MatrixRow[] {
  if (!rows.length) return rows;

  // Ensure 1 row = 1 lesson before distributing questions so counts are distributed cleanly across lessons
  const targetRows = bypassCleaning
    ? ensureOneLessonPerRow(rows)
    : ensureOneLessonPerRow(consolidateRowsByChapter(rows, mon, undefined, undefined, bypassCleaning));

  const pConfig: QuestionPointConfig = points || { tn: 0.25, ds: 1, tln: 0.5, tl: 1 };
  const fmtPts = targetFormatPts || (noTLN ? [3, 4, 0, 3] : [3, 2, 2, 3]);
  const lvlPts = targetLevelPts || [4, 3, 3];
  const totalLvl = lvlPts[0] + lvlPts[1] + lvlPts[2] || 10;

  let C: number[][];

  if (PRACT.includes(mon) || mon === 'Ngữ văn') {
    C = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [
        Math.round((lvlPts[0] / totalLvl) * 10),
        Math.round((lvlPts[1] / totalLvl) * 10),
        Math.round((lvlPts[2] / totalLvl) * 10),
      ],
    ];
  } else if (mon === 'Tiếng Anh') {
    const totalTN = Math.max(
      1,
      Math.round((fmtPts.reduce((a, b) => a + b, 0) || 10) / Math.max(0.05, pConfig.tn))
    );
    const b = Math.round(totalTN * (lvlPts[0] / totalLvl));
    const h = Math.round(totalTN * (lvlPts[1] / totalLvl));
    const v = Math.max(0, totalTN - b - h);
    C = [
      [b, h, v],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
  } else if (structureMode === 't') {
    const N =
      mon === 'Toán'
        ? [12, 4, 6, 0]
        : ['Địa lí', 'Lịch sử', 'Tin học', 'Công nghệ', 'Giáo dục kinh tế và pháp luật'].includes(mon)
        ? [24, 4, 0, 0]
        : [18, 4, 6, 0];
    C = N.map((n) => {
      const b = Math.round(n * (lvlPts[0] / totalLvl));
      const h = Math.round(n * (lvlPts[1] / totalLvl));
      return [b, h, Math.max(0, n - b - h)];
    });
  } else {
    // Standard CV 7991 mode: Calculate required question counts dynamically from points & format targets
    const nTN = Math.max(0, Math.round(fmtPts[0] / Math.max(0.05, pConfig.tn)));
    const nDS = Math.max(0, Math.round(fmtPts[1] / Math.max(0.1, pConfig.ds)));
    const nTLN = noTLN ? 0 : Math.max(0, Math.round(fmtPts[2] / Math.max(0.1, pConfig.tln)));
    const nTL = Math.max(0, Math.round(fmtPts[3] / Math.max(0.1, pConfig.tl)));

    const formatCounts = [nTN, nDS, nTLN, nTL];

    C = formatCounts.map((totalQ) => {
      if (totalQ <= 0) return [0, 0, 0];
      const b = Math.round(totalQ * (lvlPts[0] / totalLvl));
      const h = Math.round(totalQ * (lvlPts[1] / totalLvl));
      const v = Math.max(0, totalQ - b - h);
      return [b, h, v];
    });
  }

  const nDS = C[1].reduce((a, b) => a + b, 0);
  C[1] = [0, 0, 0];

  // Reset row questions
  targetRows.forEach((r) => {
    r.v = getZeroVector();
    r.y = [0, 0, 0];
  });

  let p = 0;
  C.forEach((cs, f) => {
    cs.forEach((c, l) => {
      for (let i = 0; i < c; i++) {
        targetRows[p++ % targetRows.length].v[f * 3 + l]++;
      }
    });
  });

  for (let k = 0; k < nDS; k++) {
    const r = targetRows[p++ % targetRows.length];
    const y = getY(r);
    // Bảo toàn phần 2 Đúng - Sai: luôn 1 câu lớn gồm 2 ý Biết, 1 ý Hiểu, 1 ý Vận dụng
    y[0] += 2;
    y[1] += 1;
    y[2] += 1;
    r.v[3] = y[0] > 0 ? 1 : 0;
    r.v[4] = y[1] > 0 ? 1 : 0;
    r.v[5] = y[2] > 0 ? 1 : 0;
  }

  return targetRows;
}

export function isPlaceholderOrInvalidYccd(
  str: string | undefined | null,
  lessonOrChapter?: string
): boolean {
  if (!str) return true;
  const s = str.trim();
  if (s.length < 8) return true;

  const lower = s.toLowerCase();

  // Strip level prefixes like "nhận biết:", "thông hiểu:", "vận dụng:", "biết:", "hiểu:"
  const contentOnly = lower
    .replace(/^(nhận biết|thông hiểu|vận dụng|biết|hiểu)\s*[\:\-\.\s]*/i, '')
    .trim();

  if (!contentOnly || contentOnly.length < 5) return true;

  // Generic placeholder checks
  if (/^(thông hiểu|nhận biết|vận dụng|biết)\s*\d*$/i.test(contentOnly)) return true;
  if (/^thông hiểu\s*:\s*(thông hiểu\s*\d*|\d*)$/i.test(contentOnly)) return true;
  if (/^nhận biết\s*:\s*(nhận biết\s*\d*|\d*)$/i.test(contentOnly)) return true;
  if (/^vận dụng\s*:\s*(vận dụng\s*\d*|\d*)$/i.test(contentOnly)) return true;
  if (contentOnly.includes('thông hiểu 1') && contentOnly.length < 25) return true;
  if (contentOnly.includes('nhận biết 1') && contentOnly.length < 25) return true;
  if (contentOnly.includes('vận dụng 1') && contentOnly.length < 25) return true;
  if (contentOnly === 'nội dung...' || contentOnly === 'nhập yêu cầu cần đạt...') return true;

  // Key requirement action verbs in Vietnamese curriculum (2018)
  const hasVerb = /(nêu|kể|phân biệt|giải thích|vận dụng|trình bày|xác định|mô tả|phân tích|hiểu|đọc|sử dụng|tính|chứng minh|liên hệ|viết|rút ra|đánh giá|phân loại|sắp xếp|lập|vẽ|trả lời|tra cứu|tìm hiểu|biết được|thực hiện|đưa ra|so sánh|nhận biết được)/i.test(
    contentOnly
  );

  // If the content starts with "Bài X", "Chương X", "Chủ đề X" and lacks verbs, it's just a lesson/chapter title header!
  if (/^(chương|chủ đề|bài)\s*\d+[\:\.\-\s]*/i.test(contentOnly) && !hasVerb) {
    return true;
  }

  // If lessonOrChapter is provided, check if contentOnly is essentially equal to the lesson/chapter name without action verbs
  if (lessonOrChapter && lessonOrChapter.trim().length > 3) {
    const cleanLesson = lessonOrChapter
      .trim()
      .toLowerCase()
      .replace(/^(chương|chủ đề|bài)\s*\d*[\:\.\-\s]*/i, '')
      .trim();

    const cleanS = contentOnly
      .replace(/^(chương|chủ đề|bài)\s*\d*[\:\.\-\s]*/i, '')
      .trim();

    if (
      cleanS === cleanLesson ||
      (cleanS.includes(cleanLesson) && cleanS.length < cleanLesson.length + 20 && !hasVerb) ||
      (cleanLesson.includes(cleanS) && cleanS.length > 5 && !hasVerb)
    ) {
      return true;
    }
  }

  if (/^bài\s*\d+/i.test(contentOnly) && !hasVerb) {
    return true;
  }

  return false;
}

export function findMatchingSpec(
  mon: string,
  grade: string,
  chapterTitle: string,
  subtopics: string
): [string, string, string] | null {
  const normalizedMon = mon === 'Địa lý' ? 'Địa lí' : (mon === 'Lịch sử & Địa lí' ? 'Địa lí' : mon);
  const specs = DETAILED_SPECS[normalizedMon] && DETAILED_SPECS[normalizedMon][grade];
  if (!specs || !Array.isArray(specs)) return null;

  const cleanC = chapterTitle.toLowerCase().replace(/^(chương|chủ đề|bài)\s*\d*[\:\.\-\s]*/i, '').trim();
  const cleanN = subtopics.toLowerCase().replace(/^(chương|chủ đề|bài)\s*\d*[\:\.\-\s]*/i, '').trim();

  // 1. Direct match on lesson name/chapter title substring
  for (let i = 0; i < specs.length; i++) {
    const item = specs[i];
    if (!item || item.length < 4) continue;
    const itemTitle = item[0].toLowerCase();

    if (
      (cleanC && (itemTitle.includes(cleanC) || cleanC.includes(itemTitle.slice(0, 20)))) ||
      (cleanN && (itemTitle.includes(cleanN) || cleanN.includes(itemTitle.slice(0, 20))))
    ) {
      return [item[1], item[2], item[3]];
    }
  }

  // 2. Match by Chapter Index if "Chủ đề X" or "Chương X"
  const chNumMatch = chapterTitle.match(/(?:chương|chủ\s*đề)\s*(\d+)/i);
  if (chNumMatch) {
    const idx = parseInt(chNumMatch[1], 10) - 1;
    if (idx >= 0 && idx < specs.length && specs[idx] && specs[idx].length >= 4) {
      return [specs[idx][1], specs[idx][2], specs[idx][3]];
    }
  }

  // 3. Keyword overlap match
  const words = `${cleanC} ${cleanN}`.split(/\s+/).filter((w) => w.length > 3);
  let bestMatch: [string, string, string] | null = null;
  let maxScore = 0;

  for (const item of specs) {
    if (!item || item.length < 4) continue;
    const itemTitle = item[0].toLowerCase();
    let score = 0;
    for (const word of words) {
      if (itemTitle.includes(word)) score++;
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = [item[1], item[2], item[3]];
    }
  }

  if (maxScore >= 1) return bestMatch;
  return null;
}

export function detectLevelInCell(text: string): { level: 'biet' | 'hieu' | 'vanDung'; content: string } | null {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Check for "nhận biết", "thông hiểu", "vận dụng"
  if (/^(?:\[?[0-9a-z\+\*\-\•\–\—\.\,\(\)\[\]\s]|mức\s*độ)*\b(nhận\s*biết|biết)\b/i.test(lower)) {
    const content = trimmed.replace(/^(?:\[?[0-9a-z\+\*\-\•\–\—\.\,\(\)\[\]\s]|mức\s*độ)*(?:nhận\s*biết|biết)\s*[\:\-\.]?\s*/i, '').trim();
    return { level: 'biet', content };
  }
  if (/^(?:\[?[0-9a-z\+\*\-\•\–\—\.\,\(\)\[\]\s]|mức\s*độ)*\b(thông\s*hiểu|hiểu)\b/i.test(lower)) {
    const content = trimmed.replace(/^(?:\[?[0-9a-z\+\*\-\•\–\—\.\,\(\)\[\]\s]|mức\s*độ)*(?:thông\s*hiểu|hiểu)\s*[\:\-\.]?\s*/i, '').trim();
    return { level: 'hieu', content };
  }
  if (/^(?:\[?[0-9a-z\+\*\-\•\–\—\.\,\(\)\[\]\s]|mức\s*độ)*\b(vận\s*dụng\s*cao|vận\s*dụng)\b/i.test(lower)) {
    const content = trimmed.replace(/^(?:\[?[0-9a-z\+\*\-\•\–\—\.\,\(\)\[\]\s]|mức\s*độ)*(?:vận\s*dụng\s*cao|vận\s*dụng)\s*[\:\-\.]?\s*/i, '').trim();
    return { level: 'vanDung', content };
  }
  return null;
}

export const parseNum = (str: string): number => {
  if (!str) return 0;
  const s = str.trim();
  if (!s || s === '-' || s === '0') return 0;

  // 1. Question range: e.g. "Câu 1 - Câu 3", "Câu 1-3", "C1-3", "1 - 3"
  const rangeMatch = s.match(/(?:câu|c)?\s*(\d+)\s*(?:[\-\–\—]|đến)\s*(?:câu|c)?\s*(\d+)/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (!isNaN(start) && !isNaN(end) && end >= start && start <= 100 && end <= 100) {
      return end - start + 1;
    }
  }

  // 2. Explicit question label list: e.g. "Câu 1, Câu 2", "C1, C2", "Câu 1, 2, 3", "Câu 5"
  if (/^(?:câu|c)\b/i.test(s) || /câu\s*\d+/i.test(s)) {
    const questionItems = s.split(/[\,\;]/).map((p) => p.trim()).filter((p) => /\d+/.test(p));
    if (questionItems.length > 0) {
      return questionItems.length;
    }
  }

  // 3. Comma/semicolon separated list of question numbers, e.g. "1, 2, 3" or "1; 2"
  if (/^\d+(\s*[\,\;]\s*\d+)+$/.test(s)) {
    const parts = s.split(/[\,\;]/).map((p) => p.trim()).filter(Boolean);
    return parts.length;
  }

  // 4. Standard plain number or decimal e.g. "3", "3,0", "3 câu", "3 ý", "Câu 5"
  const m = s.match(/^(\d+(?:[.,]\d+)?)/) || s.match(/(\d+(?:[.,]\d+)?)/);
  if (m) {
    const val = parseFloat(m[1].replace(',', '.'));
    return !isNaN(val) ? val : 0;
  }

  return 0;
};

export const parseDsCell = (str: string, levelIdx: 0 | 1 | 2): number => {
  if (!str) return 0;
  const s = str.trim();
  if (!s || s === '0' || s === '-') return 0;

  // 1. Check if string has explicit sub-items in parentheses: e.g. "1(2)", "1 (2 ý)", "1 (2c)", "(2 ý)"
  const parenMatch = s.match(/[\(\\[\{]\s*(\d+)\s*(?:ý|câu|c)?\s*[\)\]\}]/i);
  if (parenMatch) {
    const numInParen = parseInt(parenMatch[1], 10);
    if (!isNaN(numInParen) && numInParen > 0) return numInParen;
  }

  // 2. Check if string explicitly specifies "2 ý" or "2ý" or "1 ý"
  const yMatch = s.match(/(\d+)\s*ý\b/i);
  if (yMatch) {
    const numY = parseInt(yMatch[1], 10);
    if (!isNaN(numY) && numY > 0) return numY;
  }

  // 3. Extract standard number
  const val = parseNum(s);
  if (val <= 0) return 0;

  // 4. In CV 7991, 1 True/False question (1 câu lớn) contains 2 sub-items (2 ý) for 'Biết'
  // If cell in 'Biết' column (levelIdx 0) writes 1 (meaning 1 câu lớn), convert to 2 sub-items (2 ý)
  if (levelIdx === 0 && val === 1) {
    return 2;
  }

  return val;
};

/**
 * Isolates the Matrix Table section and Specification Table section from uploaded file text.
 * Strictly adheres to user instruction:
 * "tìm đến bảng ma trận của file tải lên, sau đó tập trung vào bản ma trận đó để ánh xạ toàn bộ trực tiếp nội dung theo hàng lên ma trận hiện tại đã có trên hệ thống theo chuẩn cv 7991, chú ý ko tự ý thêm hay bớt bất kì nội dung nào trong bản ma trận tải lên"
 */
export function isolateMatrixAndSpecTables(fileText: string): {
  matrixTableText: string;
  specTableText: string;
  isMatrixFound: boolean;
} {
  if (!fileText || fileText.length < 20) {
    return { matrixTableText: fileText || '', specTableText: '', isMatrixFound: false };
  }

  // 1. Look for [BẢNG]: ... [/BẢNG] blocks (produced by fileReader for docx)
  const blockRegex = /\[BẢNG\]:([\s\S]*?)\[\/BẢNG\]/gi;
  const blocks: { full: string; body: string; startIndex: number; headerContext: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(fileText)) !== null) {
    const startIndex = match.index;
    const headerContext = fileText.slice(Math.max(0, startIndex - 350), startIndex).toLowerCase();
    blocks.push({
      full: match[0],
      body: match[1].trim(),
      startIndex,
      headerContext,
    });
  }

  if (blocks.length > 0) {
    let matrixBlock: (typeof blocks)[0] | null = null;
    let specBlock: (typeof blocks)[0] | null = null;

    const scoredBlocks = blocks.map((b) => {
      const lowerContext = b.headerContext.toLowerCase();
      const lowerBody = b.body.toLowerCase();

      const hasMatrixTitle = /khung\s*ma\s*trận|bảng\s*ma\s*trận|bản\s*ma\s*trận|ma\s*trận\s*đề/i.test(lowerContext) ||
        /^(?:\[?[0-9ivx\.\s]+\]?)?\s*(?:khung\s*ma\s*trận|bảng\s*ma\s*trận|ma\s*trận)/i.test(lowerBody.slice(0, 150));

      const hasSpecTitle = /bản\s*đặc\s*tả|bảng\s*đặc\s*tả|đặc\s*tả\s*đề|đặc\s*tả\s*ma\s*trận|yêu\s*cầu\s*cần\s*đạt|yccd|chuẩn\s*kiến\s*thức/i.test(lowerContext) ||
        /^(?:\[?[0-9ivx\.\s]+\]?)?\s*(?:bản\s*đặc\s*tả|bảng\s*đặc\s*tả|đặc\s*tả)/i.test(lowerBody.slice(0, 150));

      let numericCellCount = 0;
      let textDescCount = 0;
      const lines = b.body.split(/\r?\n/).filter(Boolean);
      lines.slice(1).forEach((l) => {
        const cells = l.split('|').map((c) => c.trim()).filter(Boolean);
        cells.forEach((c) => {
          if (/^\d+(?:[.,]\d+)?$/.test(c)) numericCellCount++;
          else if (c.length > 25 && !/cộng\s*hòa|trường\s*thpt|tổ\s*chuyên\s*môn/i.test(c)) textDescCount++;
        });
      });

      return {
        block: b,
        hasMatrixTitle,
        hasSpecTitle,
        numericCellCount,
        textDescCount,
        isSpecLikely: hasSpecTitle || textDescCount >= 3 || (textDescCount > 0 && textDescCount >= numericCellCount),
        isMatrixLikely: hasMatrixTitle || (!hasSpecTitle && numericCellCount >= 6 && numericCellCount > textDescCount),
      };
    });

    for (const sb of scoredBlocks) {
      if (sb.hasSpecTitle && !specBlock) {
        specBlock = sb.block;
      } else if (sb.hasMatrixTitle && !matrixBlock) {
        matrixBlock = sb.block;
      }
    }

    for (const sb of scoredBlocks) {
      if (!matrixBlock && sb.isMatrixLikely && sb.block !== specBlock) {
        matrixBlock = sb.block;
      } else if (!specBlock && sb.isSpecLikely && sb.block !== matrixBlock) {
        specBlock = sb.block;
      }
    }

    if (!matrixBlock && blocks.length > 0) {
      matrixBlock = blocks[0];
    }
    if (!specBlock && blocks.length > 1 && blocks[1] !== matrixBlock) {
      specBlock = blocks[1];
    }

    if (matrixBlock) {
      return {
        matrixTableText: matrixBlock.body,
        specTableText: specBlock ? specBlock.body : (blocks.length > 1 && blocks[1] !== matrixBlock ? blocks[1].body : ''),
        isMatrixFound: true,
      };
    }
  }

  // 2. Fallback: Search headings in raw text
  const lower = fileText.toLowerCase();
  const matrixHeadingIdx = lower.search(/(?:khung\s*ma\s*trận|bảng\s*ma\s*trận|bản\s*ma\s*trận|ma\s*trận\s*đề\s*kiểm\s*tra|ma\s*trận\s*đề|phần\s*[i|1][\.\:\s]+ma\s*trận)/i);
  const specHeadingIdx = lower.search(/(?:bản\s*đặc\s*tả|bảng\s*đặc\s*tả|đặc\s*tả\s*đề|đặc\s*tả\s*ma\s*trận|phần\s*[i|v|x|2]+[\.\:\s]+bản\s*đặc\s*tả)/i);

  if (matrixHeadingIdx !== -1 && specHeadingIdx !== -1) {
    if (specHeadingIdx > matrixHeadingIdx) {
      const specEnd = lower.search(/(?:đề\s*bài|đề\s*kiểm\s*tra|hướng\s*dẫn\s*chấm|đáp\s*án)/i);
      const endIdx = (specEnd !== -1 && specEnd > specHeadingIdx) ? specEnd : fileText.length;
      return {
        matrixTableText: fileText.slice(matrixHeadingIdx, specHeadingIdx).trim(),
        specTableText: fileText.slice(specHeadingIdx, endIdx).trim(),
        isMatrixFound: true,
      };
    } else {
      const matrixEnd = lower.search(/(?:đề\s*bài|đề\s*kiểm\s*tra|hướng\s*dẫn\s*chấm|đáp\s*án)/i);
      const endIdx = (matrixEnd !== -1 && matrixEnd > matrixHeadingIdx) ? matrixEnd : fileText.length;
      return {
        matrixTableText: fileText.slice(matrixHeadingIdx, endIdx).trim(),
        specTableText: fileText.slice(specHeadingIdx, matrixHeadingIdx).trim(),
        isMatrixFound: true,
      };
    }
  }

  return { matrixTableText: fileText, specTableText: '', isMatrixFound: false };
}

/**
 * Parses an uploaded Matrix file text directly into MatrixRow[].
 * Focuses strictly on the Matrix table, directly maps row-by-row according to CV 7991,
 * and preserves EVERY single row without merging, adding, or removing rows.
 */
export function parseMatrixOrYccdTableFromText(
  fileText: string,
  mon: string,
  semester: string,
  bypassCleaning: boolean = false
): MatrixRow[] | null {
  if (!fileText || fileText.trim().length < 20) return null;

  // 1. Isolate the Matrix Table and Specification Table
  const isolated = isolateMatrixAndSpecTables(fileText);
  const targetText = isolated.matrixTableText || fileText;
  const specText = isolated.specTableText || fileText;
  const specRows = extractSpecRowsFromText(specText || fileText, mon);

  const rawLines = targetText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  console.log(`[File Parsing] Parsing matrix table, total lines: ${rawLines.length}, matrixFound: ${isolated.isMatrixFound}`);

  // Helper to check if a row is administrative noise, total row, preamble, or sub-header
  const isNoiseOrTotalRow = (rowCells: string[], fullLineText: string): boolean => {
    const fullText = fullLineText.toLowerCase().trim();
    if (!fullText || fullText.startsWith('=== tệp')) return true;

    // 1. Administrative / Document preamble / Exam header noise
    if (/cộng\s*hòa\s*xã\s*hội|độc\s*lập\s*tự\s*do|sở\s*gd|phòng\s*gd|bộ\s*giáo\s*dục|ubnd/i.test(fullText)) return true;
    if (/trường\s*(?:thpt|thcs|tiểu\s*học|phổ\s*thông|liên\s*cấp)|trung\s*tâm\s*gdtx|\bthpt\b|\bthcs\b/i.test(fullText)) return true;
    if (/(?:tổ|nhóm)\s*(?:chuyên\s*môn|khoa\s*học|tự\s*nhiên|xã\s*hội)/i.test(fullText)) return true;
    if (/họ\s*và\s*tên|giáo\s*viên\s*ra\s*đề|người\s*thực\s*hiện|năm\s*học\s*\d+|thời\s*gian\s*làm\s*bài|mã\s*đề|đề\s*số/i.test(fullText)) return true;
    if (/^(?:bảng\s*đặc\s*tả|ma\s*trận\s*và\s*bản\s*đặc\s*tả|ma\s*trận\s*đề\s*kiểm\s*tra|đặc\s*tả\s*ma\s*trận|khung\s*ma\s*trận)\b/i.test(fullText)) return true;
    if (/^(?:i|ii|iii|iv|v|vi)\.\s*(?:phần|trắc\s*nghiệm|tự\s*luận|hướng\s*dẫn|đáp\s*án)/i.test(fullText)) return true;
    if (/hướng\s*dẫn\s*chấm|đáp\s*án\s*và\s*thang\s*điểm|ghi\s*chú\s*[\:\.]/i.test(fullText)) return true;
    if (/câu\s*\d+[\:\.]\s*[a-d]/i.test(fullText)) return true; // answer key lines

    // 2. Summary / Total / Percentage
    const c0 = (rowCells[0] || '').trim().toLowerCase();
    const c1 = (rowCells[1] || '').trim().toLowerCase();
    const c2 = (rowCells[2] || '').trim().toLowerCase();

    const isTotalKeyword = (s: string) =>
      /^(?:tổng|tổng\s*cộng|tổng\s*số\s*câu|tổng\s*điểm|cộng|tỉ\s*lệ|tỉ\s*lệ\s*\%|mức\s*độ\s*đánh\s*giá|mức\s*độ\s*nhận\s*thức|tổng\s*số\s*tiết|tỉ\s*lệ\s*điểm)$/i.test(s) ||
      /^(?:tổng|cộng|tỉ\s*lệ)\b/i.test(s);

    if (isTotalKeyword(c0) || isTotalKeyword(c1) || isTotalKeyword(c2)) return true;

    // 3. Column Sub-headers (like "Biết | Hiểu | Vận dụng", "Nhiều lựa chọn | Đúng - Sai", "TNKQ | Tự luận")
    // If row cells consist only of level/header words and have NO numeric question counts > 0
    const containsOnlyHeaderWords = rowCells.every((c) => {
      const cl = c.trim().toLowerCase();
      if (!cl || /^\d+$/.test(cl)) return true;
      return /^(?:stt|tt|thứ\s*tự|bài|tên\s*bài|chủ\s*đề|chương|nội\s*dung|mức\s*độ|nhận\s*biết|thông\s*hiểu|vận\s*dụng|vd|vdc|biết|hiểu|nhiều\s*lựa\s*chọn|đúng\s*[\-\–]?\s*sai|trả\s*lời\s*ngắn|tự\s*luận|tnkq|tổng|điểm|tỉ\s*lệ|câu)$/i.test(cl);
    });

    const hasAnyNumberGtZero = rowCells.some((c) => {
      const num = parseFloat(c.trim().replace(',', '.'));
      return !isNaN(num) && num > 0;
    });

    if (containsOnlyHeaderWords && !hasAnyNumberGtZero) {
      return true;
    }

    return false;
  };

  // Candidate lines with multiple segments
  const candidateLines = rawLines.filter((line) => {
    if (line.startsWith('=== TỆP')) return false;
    const parts = line.split(/[\t|\;\,]|(?<=\S)\s{2,}(?=\S)/).map((p) => p.trim()).filter(Boolean);
    return parts.length >= 2;
  });

  if (candidateLines.length < 2) {
    console.log(`[File Parsing] Too few candidate lines in matrix table.`);
    return null;
  }

  interface TempRow {
    chapter: string;
    lesson: string;
    v: number[];
    y: number[];
    s: [string, string, string];
  }

  const extracted: TempRow[] = [];
  let currentChapter = '';
  let chapterIndex = 1;

  // Locked column offsets for the matrix table
  let lockedChIdx: number = -1;
  let lockedLessonIdx: number = -1;
  let lockedYccdIdx: number = -1;
  let lockedQOffset: number = -1;

  for (let lineIdx = 0; lineIdx < candidateLines.length; lineIdx++) {
    const line = candidateLines[lineIdx];

    // Determine cell delimiter: Tab, Pipe, Semicolon, or Comma/Space
    let rawCells: string[];
    if (line.includes('\t')) {
      rawCells = line.split('\t').map((c) => c.trim());
    } else if (line.includes('|')) {
      rawCells = line.split('|').map((c) => c.trim());
    } else if (line.includes(';')) {
      rawCells = line.split(';').map((c) => c.trim());
    } else if (line.includes(',,')) {
      rawCells = line.split(/,,+/).map((c) => c.trim());
    } else {
      rawCells = line.split(/,|\t|;|\s{2,}/).map((c) => c.trim());
    }

    // Filter out leading/trailing empty cells from markdown | cell |
    if (rawCells.length >= 2 && rawCells[0] === '' && line.startsWith('|')) {
      rawCells = rawCells.slice(1);
    }
    if (rawCells.length >= 1 && rawCells[rawCells.length - 1] === '' && line.endsWith('|')) {
      rawCells = rawCells.slice(0, rawCells.length - 1);
    }

    if (rawCells.length < 2) continue;

    // Check if row is total, preamble noise, or sub-header row
    if (isNoiseOrTotalRow(rawCells, line)) {
      console.log(`[File Parsing] Skipping noise/total/header row: ${line.substring(0, 45)}`);
      continue;
    }

    // Recombine lesson name if extra commas split a long title
    let cells = rawCells;
    if (cells.length > 15) {
      const last12 = cells.slice(cells.length - 12);
      const isLast12Numeric = last12.every((c) => /^\d+$/.test(c.trim()));
      if (isLast12Numeric) {
        const reunitedLesson = cells.slice(2, cells.length - 12).join(', ');
        cells = [cells[0], cells[1], reunitedLesson, ...last12];
      }
    }

    // Check if line is a table header row (e.g. STT | Chủ đề | Nội dung...)
    const hasChapterOrLessonPrefix = cells.some((c, idx) => idx <= 2 && /^(?:chương|chủ\s*đề|phần|bài)\s*\d+/i.test(c.trim()));
    const hasNumericData = cells.some((c) => {
      const n = parseFloat(c.trim().replace(',', '.'));
      return !isNaN(n) && n > 0;
    });
    const headerTest = cells.map((c) => c.toLowerCase()).join(' ');

    const isHeaderRow = !hasChapterOrLessonPrefix && !hasNumericData && (
      /(?:stt|thứ\s*tự|tên\s*bài|đơn\s*vị\s*kiến\s*thức|yêu\s*cầu\s*cần\s*đạt|yccd|mức\s*độ\s*đánh\s*giá|tỉ\s*lệ|tổng\s*số\s*câu|tổng\s*điểm|nhiều\s*lựa\s*chọn|đúng\s*[\-\–]?\s*sai|trả\s*lời\s*ngắn|tự\s*luận)/i.test(headerTest)
    );

    if (isHeaderRow) {
      console.log(`[File Parsing] Header row detected: ${line.substring(0, 45)}`);
      const lowerCells = cells.map((c) => c.toLowerCase().trim());
      const chIdx = lowerCells.findIndex((c) => /^(?:chủ\s*đề|chương|phần|mạch\s*kiến\s*thức)/i.test(c));
      const lessonIdx = lowerCells.findIndex((c) => /^(?:nội\s*dung|đơn\s*vị\s*kiến\s*thức|tên\s*bài|bài\s*học)/i.test(c));
      const yccdIdx = lowerCells.findIndex((c) => /^(?:yêu\s*cầu\s*cần\s*đạt|yccd|chuẩn\s*kiến\s*thức)/i.test(c));

      if (chIdx !== -1) lockedChIdx = chIdx;
      if (lessonIdx !== -1) lockedLessonIdx = lessonIdx;
      if (yccdIdx !== -1) lockedYccdIdx = yccdIdx;
      continue;
    }

    // LOCK IN COLUMN MAPPING FOR THE MATRIX OR SPEC TABLE
    if (lockedChIdx === -1 || lockedLessonIdx === -1 || lockedQOffset === -1) {
      if (cells.length >= 14) {
        if (lockedChIdx === -1) {
          const c0 = (cells[0] || '').trim();
          const c1 = (cells[1] || '').trim();

          const isC0NumericIndex = /^\d{1,2}[\.\)]?$/.test(c0) || /^[ivx]{1,4}[\.\)]?$/i.test(c0) || c0 === '';
          const isC1Text = c1.length > 0 && !/^\d+$/.test(c1);
          const hasSttCol = isC0NumericIndex && isC1Text;

          lockedChIdx = hasSttCol ? 1 : 0;
          lockedLessonIdx = hasSttCol ? 2 : 1;
        }

        if (lockedLessonIdx === -1) {
          lockedLessonIdx = lockedChIdx + 1;
        }

        // Check if candidate cell (lockedLessonIdx + 1) is a YCCĐ text column
        const candColIdx = lockedLessonIdx + 1;
        const candText = (cells[candColIdx] || '').trim();
        const isCandYccd = candText.length > 10 && !/^(?:\d+|\d+[\,\s\d]*|câu\s*\d+|c\d+|[\d\s\-\–\,\;]+)$/i.test(candText) && (
          parseYccdLevelsFromCellOrText(candText) !== null ||
          /(?:nhận\s*biết|thông\s*hiểu|vận\s*dụng|nêu|mô\s*tả|phân\s*tích|giải\s*thích|được)/i.test(candText)
        );

        if (isCandYccd) {
          lockedYccdIdx = candColIdx;
          lockedQOffset = candColIdx + 1;
        } else {
          lockedYccdIdx = -1;
          lockedQOffset = candColIdx;
        }
      } else {
        if (lockedChIdx === -1) lockedChIdx = 0;
        if (lockedLessonIdx === -1) lockedLessonIdx = 1;
        lockedYccdIdx = -1;
        lockedQOffset = 2;
      }
      console.log(`[File Parsing] Locked column mapping: Ch:${lockedChIdx}, Lesson:${lockedLessonIdx}, Yccd:${lockedYccdIdx}, QOffset:${lockedQOffset}`);
    }

    // Process data line using locked column mapping
    let rowChapter = '';
    let rowLesson = '';
    const rowS: [string, string, string] = ['', '', ''];
    const rowV = getZeroVector();
    const rowY = [0, 0, 0];

    if (cells.length >= 14) {
      // Heuristic check: Did the raw table merge chapter vertically, omitting the chapter column in row 2..N?
      // e.g. Row 1 had 15 cells (STT, Chapter, Lesson, 12 nums).
      // Row 2 only has 14 cells, where cells[1] is a lesson (starts with "Bài" or text) and cells[2] is a question number!
      const isMissingMergedChapterCol =
        lockedChIdx === 1 &&
        lockedLessonIdx === 2 &&
        cells.length === 14 &&
        !/^\d+$/.test(cells[1]) &&
        /^\d+(?:[.,]\d+)?$/.test(cells[2]);

      const effectiveQOffset = isMissingMergedChapterCol ? 2 : lockedQOffset;

      if (isMissingMergedChapterCol) {
        rowChapter = currentChapter;
        rowLesson = cells[1] || '';
      } else {
        rowChapter = cells[lockedChIdx] || '';
        rowLesson = cells[lockedLessonIdx] || '';
      }

      // Extract embedded YCCĐ if present at lockedYccdIdx
      if (!isMissingMergedChapterCol && lockedYccdIdx !== -1 && cells[lockedYccdIdx]) {
        const candYccd = cells[lockedYccdIdx];
        const parsedYccd = parseYccdLevelsFromCellOrText(candYccd);
        if (parsedYccd) {
          if (parsedYccd.biet) rowS[0] = parsedYccd.biet;
          if (parsedYccd.hieu) rowS[1] = parsedYccd.hieu;
          if (parsedYccd.vanDung) rowS[2] = parsedYccd.vanDung;
        } else if (candYccd.length > 5) {
          rowS[0] = candYccd;
        }
      }

      // 1. TNKQ Multiple Choice (effectiveQOffset + 0, 1, 2) -> rowV[0, 1, 2]
      rowV[0] = parseNum(cells[effectiveQOffset + 0]);
      rowV[1] = parseNum(cells[effectiveQOffset + 1]);
      rowV[2] = parseNum(cells[effectiveQOffset + 2]);

      // 2. True / False (effectiveQOffset + 3, 4, 5) -> rowY[0, 1, 2] & rowV[3]
      rowY[0] = parseDsCell(cells[effectiveQOffset + 3], 0);
      rowY[1] = parseDsCell(cells[effectiveQOffset + 4], 1);
      rowY[2] = parseDsCell(cells[effectiveQOffset + 5], 2);

      // Ensure that if True/False questions exist, 'Biết' column has 2 sub-items per question
      const qDSCount = Math.max(1, Math.round((rowY[0] + rowY[1] + rowY[2]) / 4));
      if (rowY[0] === qDSCount && rowY[1] === qDSCount && rowY[2] === qDSCount) {
        rowY[0] = 2 * qDSCount;
      }

      const sumDS = rowY[0] + rowY[1] + rowY[2];
      if (sumDS > 0) {
        rowV[3] = Math.max(1, Math.round(sumDS / 4));
        rowV[4] = 0;
        rowV[5] = 0;
      } else {
        rowV[3] = 0;
        rowV[4] = 0;
        rowV[5] = 0;
      }

      // 3. Short Answer (effectiveQOffset + 6, 7, 8) -> rowV[6, 7, 8]
      rowV[6] = parseNum(cells[effectiveQOffset + 6]);
      rowV[7] = parseNum(cells[effectiveQOffset + 7]);
      rowV[8] = parseNum(cells[effectiveQOffset + 8]);

      // 4. Essay / Tự luận (effectiveQOffset + 9, 10, 11) -> rowV[9, 10, 11]
      rowV[9] = parseNum(cells[effectiveQOffset + 9]);
      rowV[10] = parseNum(cells[effectiveQOffset + 10]);
      rowV[11] = parseNum(cells[effectiveQOffset + 11]);
    } else {
      // Extraction for tables with fewer columns
      if (cells[0]) rowChapter = cells[0];
      if (cells[1] && !/^\d+$/.test(cells[1])) rowLesson = cells[1];

      const numericCells: number[] = [];
      cells.forEach((c) => {
        const val = parseNum(c);
        if (val > 0) numericCells.push(val);
      });

      if (numericCells.length >= 12) {
        for (let i = 0; i < 12; i++) rowV[i] = numericCells[i] || 0;
      } else if (numericCells.length >= 3) {
        rowV[0] = numericCells[0] || 0;
        rowV[1] = numericCells[1] || 0;
        rowV[2] = numericCells[2] || 0;
        if (numericCells.length >= 4) {
          rowV[3] = numericCells[3] || 0;
          rowY[0] = numericCells[3] || 0;
        }
        if (numericCells.length >= 5) rowV[6] = numericCells[4] || 0;
        if (numericCells.length >= 6) rowV[9] = numericCells[5] || 0;
      }
    }

    // Handle merged vertical chapter cells: if cell is empty, carry forward currentChapter
    if (rowChapter && rowChapter.trim() && !isDocumentTitleOrNoise(rowChapter)) {
      currentChapter = rowChapter.trim();
    } else if (currentChapter) {
      rowChapter = currentChapter;
    }

    // Clean or preserve chapter and lesson title
    if (!bypassCleaning) {
      if (rowChapter) rowChapter = sanitizeChapterTitle(rowChapter, mon, chapterIndex);
      if (rowLesson) rowLesson = cleanLessonTitle(rowLesson);
    } else {
      rowChapter = (rowChapter || '').trim();
      rowLesson = (rowLesson || '').trim();
    }

    // If still no lesson title, check if chapter title is present
    if (!rowLesson && rowChapter) {
      for (const cell of cells) {
        if (/bài\s*\d+/i.test(cell)) {
          rowLesson = cell.trim();
          break;
        }
      }
      if (!rowLesson) {
        rowLesson = rowChapter;
      }
    }

    // Reject row if lesson/chapter is noise or preamble
    if (isDocumentTitleOrNoise(rowLesson) || isDocumentTitleOrNoise(rowChapter)) {
      continue;
    }

    // Match by lesson number / lesson title first, then fallback to position index
    const matchedSpec =
      specRows.find((sr) => isSameLesson(sr.lesson, rowLesson)) ||
      specRows[extracted.length];

    if (matchedSpec && (matchedSpec.s[0] || matchedSpec.s[1] || matchedSpec.s[2])) {
      if (matchedSpec.s[0]) rowS[0] = matchedSpec.s[0];
      if (matchedSpec.s[1]) rowS[1] = matchedSpec.s[1];
      if (matchedSpec.s[2]) rowS[2] = matchedSpec.s[2];
    }

    if (!rowS[0] && !rowS[1] && !rowS[2]) {
      const matchedYccd = findMatchingUploadedYccd(rowChapter, rowLesson, specText);
      if (matchedYccd) {
        rowS[0] = matchedYccd[0] || '';
        rowS[1] = matchedYccd[1] || '';
        rowS[2] = matchedYccd[2] || '';
      } else {
        rowS[0] = '';
        rowS[1] = '';
        rowS[2] = '';
      }
    }

    // Strictly preserve valid matrix row
    if (rowChapter || rowLesson) {
      extracted.push({
        chapter: rowChapter || `Chủ đề ${chapterIndex}`,
        lesson: rowLesson || `Nội dung ${chapterIndex}`,
        v: rowV,
        y: rowY,
        s: rowS,
      });
      chapterIndex++;
    }
  }

  if (extracted.length === 0) {
    return null;
  }

  // Directly map row-by-row into MatrixRow[] without merging or dropping any valid rows
  const matrixRows: MatrixRow[] = extracted.map((item) => ({
    c: item.chapter,
    n: item.lesson,
    v: item.v,
    y: item.y,
    s: item.s,
  }));

  console.log(`[File Parsing] Successfully extracted ${matrixRows.length} matrix rows 1:1.`);
  return ensureOneLessonPerRow(matrixRows);
}

export function isSameLesson(lessonA: string | undefined | null, lessonB: string | undefined | null): boolean {
  if (!lessonA || !lessonB) return false;
  const tA = lessonA.trim();
  const tB = lessonB.trim();
  if (!tA || !tB) return false;
  if (tA.toLowerCase() === tB.toLowerCase()) return true;

  // Match by Lesson Number e.g. "Bài 1" vs "Bài 1"
  const numA = tA.match(/\bbài\s*(\d+|[ivx]+)/i);
  const numB = tB.match(/\bbài\s*(\d+|[ivx]+)/i);
  if (numA && numB && numA[1].toLowerCase() === numB[1].toLowerCase()) {
    return true;
  }

  // Match by clean lesson title overlap
  const cleanA = cleanLessonTitle(tA, true).toLowerCase();
  const cleanB = cleanLessonTitle(tB, true).toLowerCase();
  if (cleanA && cleanB && cleanA.length >= 4 && cleanB.length >= 4) {
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
      return true;
    }
  }
  return false;
}

/**
 * Strips redundant cognitive level prefixes (e.g. "Nhận biết:", "Mức độ nhận biết:", "Thông hiểu:", "Vận dụng:", "NB:", "TH:", "VD:", "– Nhận biết:")
 * from YCCĐ text so that only pure YCCĐ outcome text is written into Detailed Specification table cells.
 */
export function stripCognitiveLevelPrefixes(text: string | null | undefined): string {
  if (!text) return '';
  const lines = String(text).split(/\r?\n/);
  const cleanedLines = lines.map((line) => {
    let l = line.trim();
    if (!l) return '';

    // Strip leading list symbols / numbers followed by level keywords
    l = l.replace(
      /^(?:(?:\d+|[a-zA-ZIVX]+)[\.\)\:\-]\s*)?(?:[+\*\-•\–\—\:\.]\s*)?(?:mức\s*độ\s*(?:đánh\s*giá|nhận\s*thức)?\s*)?(?:nhận\s*biết|thông\s*hiểu|vận\s*dụng\s*cao|vận\s*dụng|mức\s*nhận\s*biết|mức\s*thông\s*hiểu|mức\s*vận\s*dụng|nb|th|vd|vdc)\s*[\:\-\.\–\—]?\s*/gi,
      ''
    );

    // Strip any remaining leading bullet symbols or colons
    l = l.replace(/^[+\*\-•\–\—\:\.]+\s*/, '').trim();

    // Strip leading words if user typed "Nhận biết Trình bày..." without colon
    l = l.replace(/^(?:Nhận biết|Thông hiểu|Vận dụng|Vận dụng cao)\s+/i, '').trim();

    return l;
  }).filter(Boolean);

  return cleanedLines.join('\n');
}

export interface ExtractedSpecRow {
  chapter: string;
  lesson: string;
  s: [string, string, string];
}

export function extractSpecRowsFromText(
  specText: string,
  mon: string,
  bypassCleaning: boolean = false
): ExtractedSpecRow[] {
  if (!specText || specText.trim().length < 15) return [];

  const rawLines = specText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const specRows: ExtractedSpecRow[] = [];
  let currentChapter = '';
  let currentLesson = '';

  const isNumericOrQuestionLabelCell = (str: string) => {
    const s = str.trim();
    if (!s || s === '-' || s === '0') return true;
    if (/^\d+(?:[.,]\d+)?$/.test(s)) return true;
    if (/^(?:câu|c)\s*\d+/i.test(s)) return true;
    if (/^\d+(\s*[\,\;\-]\s*\d+)+$/.test(s)) return true;
    return false;
  };

  const isHeaderNoise = (lineText: string, cells: string[]): boolean => {
    const fullLineLower = lineText.toLowerCase();
    if (/cộng\s*hòa\s*xã\s*hội|bộ\s*giáo\s*dục|sở\s*gd|phòng\s*gd|trường\s*thpt|năm\s*học|thời\s*gian\s*làm\s*bài|mã\s*đề/i.test(fullLineLower)) return true;
    const headerTest = cells.map((c) => c.toLowerCase()).join(' ');
    if (
      /(?:stt|thứ\s*tự|mức\s*độ\s*đánh\s*giá|yêu\s*cầu\s*cần\s*đạt|yccd|nhiều\s*lựa\s*chọn|đúng\s*[\-\–]?\s*sai|trả\s*lời\s*ngắn|tự\s*luận)/i.test(headerTest) &&
      !cells.some((c) => /bài\s*\d+|chương\s*\d+|chủ\s*đề\s*\d+/i.test(c))
    ) {
      return true;
    }
    return false;
  };

  for (const line of rawLines) {
    if (line.startsWith('=== TỆP')) continue;

    let rawCells: string[] = [];
    if (line.includes('|')) {
      rawCells = line.split('|').map((c) => c.trim());
      if (rawCells.length >= 2 && rawCells[0] === '' && line.startsWith('|')) rawCells = rawCells.slice(1);
      if (rawCells.length >= 1 && rawCells[rawCells.length - 1] === '' && line.endsWith('|')) rawCells = rawCells.slice(0, -1);
    } else if (line.includes('\t')) {
      rawCells = line.split('\t').map((c) => c.trim());
    } else if (line.includes(';')) {
      rawCells = line.split(';').map((c) => c.trim());
    }

    if (rawCells.length < 2) continue;
    if (isHeaderNoise(line, rawCells)) continue;

    // Determine Chapter, Lesson, and remaining cells
    let rowChapter = '';
    let rowLesson = '';
    let remainingCells: string[] = [];

    const c0 = rawCells[0] || '';
    const c1 = rawCells[1] || '';
    const isC0Num = /^\d{1,2}[\.\)]?$/.test(c0) || /^[ivx]{1,4}[\.\)]?$/i.test(c0) || c0 === '';
    const isC1Text = c1.length > 0 && !/^\d+$/.test(c1);

    if (isC0Num && isC1Text && rawCells.length >= 4) {
      rowChapter = rawCells[1];
      rowLesson = rawCells[2];
      remainingCells = rawCells.slice(3);
    } else if (rawCells.length >= 3) {
      rowChapter = rawCells[0];
      rowLesson = rawCells[1];
      remainingCells = rawCells.slice(2);
    } else {
      rowLesson = rawCells[0];
      remainingCells = rawCells.slice(1);
    }

    // If rowChapter is empty or noise, fall back to currentChapter
    if (rowChapter && rowChapter.trim() && !isDocumentTitleOrNoise(rowChapter)) {
      currentChapter = rowChapter.trim();
    } else if (currentChapter) {
      rowChapter = currentChapter;
    }

    // Check if rowLesson is actually a level word (e.g. "Nhận biết") because columns shifted
    const isRowLessonLevel = /^(?:nhận\s*biết|thông\s*hiểu|vận\s*dụng\s*cao|vận\s*dụng|biết|hiểu)$/i.test(rowLesson.trim());
    if (isRowLessonLevel) {
      remainingCells = [rowLesson, ...remainingCells];
      rowLesson = currentLesson;
    }

    if (rowLesson && rowLesson.trim() && !isDocumentTitleOrNoise(rowLesson)) {
      if (!isRowLessonLevel) {
        currentLesson = rowLesson.trim();
      }
    } else if (currentLesson) {
      rowLesson = currentLesson;
    }

    if (!rowLesson && !currentLesson) continue;
    const effectiveLesson = rowLesson || currentLesson;

    // Detect level and YCCĐ outcome text in remainingCells
    let detectedLevel: 'biet' | 'hieu' | 'vanDung' | null = null;
    let textContent = '';
    let multiResult: { biet?: string; hieu?: string; vanDung?: string } | null = null;

    // 1. Check for embedded levels in any cell
    for (const c of remainingCells) {
      const parsed = parseYccdLevelsFromCellOrText(c);
      if (parsed && (parsed.biet || parsed.hieu || parsed.vanDung)) {
        multiResult = parsed;
        break;
      }
    }

    if (!multiResult) {
      // 2. Search for explicit level label ("Nhận biết", "Thông hiểu", "Vận dụng")
      for (let i = 0; i < remainingCells.length; i++) {
        const c = remainingCells[i].trim();
        if (!c) continue;
        const lower = c.toLowerCase();

        const isBiet = /^(?:mức\s*độ\s*(?:đánh\s*giá|nhận\s*thức)?[\:\.\s]*)?\b(nhận\s*biết|biết)\b/i.test(lower);
        const isHieu = /^(?:mức\s*độ\s*(?:đánh\s*giá|nhận\s*thức)?[\:\.\s]*)?\b(thông\s*hiểu|hiểu)\b/i.test(lower);
        const isVd = /^(?:mức\s*độ\s*(?:đánh\s*giá|nhận\s*thức)?[\:\.\s]*)?\b(vận\s*dụng\s*cao|vận\s*dụng)\b/i.test(lower);

        if (isBiet || isHieu || isVd) {
          if (isBiet) detectedLevel = 'biet';
          else if (isHieu) detectedLevel = 'hieu';
          else if (isVd) detectedLevel = 'vanDung';

          const stripped = c
            .replace(/^(?:mức\s*độ\s*(?:đánh\s*giá|nhận\s*thức)?[\:\.\s]*)?(?:nhận\s*biết|thông\s*hiểu|vận\s*dụng\s*cao|vận\s*dụng|biết|hiểu)\s*[\:\-\.]?\s*/i, '')
            .trim();
          if (stripped.length > 5) {
            textContent = stripped;
            break;
          }
        }
      }

      // If textContent was not in the level cell, pick the first non-numeric cell that isn't the level keyword
      if (!textContent) {
        for (const c of remainingCells) {
          const trimmed = c.trim();
          const lower = trimmed.toLowerCase();
          if (
            trimmed.length >= 5 &&
            !isNumericOrQuestionLabelCell(trimmed) &&
            !/^(?:nhận\s*biết|thông\s*hiểu|vận\s*dụng\s*cao|vận\s*dụng|biết|hiểu)$/i.test(lower)
          ) {
            textContent = trimmed;
            break;
          }
        }
      }

      // 3. Fallback: if no level keyword was found, but multiple text cells exist (Biết, Hiểu, Vận dụng in separate columns)
      if (!detectedLevel) {
        const textCells = remainingCells.filter(
          (c) => c.trim().length >= 5 && !isNumericOrQuestionLabelCell(c)
        );
        if (textCells.length >= 3) {
          multiResult = {
            biet: textCells[0],
            hieu: textCells[1],
            vanDung: textCells[2],
          };
        } else if (textCells.length === 2) {
          multiResult = {
            biet: textCells[0],
            hieu: textCells[1],
          };
        } else if (textCells.length === 1) {
          textContent = textCells[0];
          detectedLevel = 'biet';
        }
      }
    }

    // Clean textContent (remove leading punctuation/bullets)
    if (textContent) {
      textContent = textContent.replace(/^[+\*\-•\–\—\:\.]+\s*/, '').trim();
    }

    // Now aggregate into specRows by lesson!
    const lastEntry = specRows.length > 0 ? specRows[specRows.length - 1] : null;
    const isContinuationOfLastLesson =
      lastEntry &&
      (isSameLesson(lastEntry.lesson, effectiveLesson) ||
        (effectiveLesson === currentLesson && !isC0Num && rawCells[0] === ''));

    let targetEntry: ExtractedSpecRow;
    if (isContinuationOfLastLesson && lastEntry) {
      targetEntry = lastEntry;
    } else {
      targetEntry = {
        chapter: rowChapter || currentChapter,
        lesson: effectiveLesson,
        s: ['', '', ''],
      };
    }

    const appendYccdText = (existing: string, addition: string): string => {
      if (!addition || !addition.trim()) return existing;
      const addClean = stripCognitiveLevelPrefixes(addition.trim().replace(/^[+\*\-•\–\—\:\.]+\s*/, ''));
      if (!addClean) return existing;
      if (!existing || !existing.trim()) return addClean;
      if (existing.toLowerCase().includes(addClean.toLowerCase())) return existing;
      return `${existing}\n- ${addClean}`;
    };

    if (multiResult) {
      if (multiResult.biet) targetEntry.s[0] = appendYccdText(targetEntry.s[0], multiResult.biet);
      if (multiResult.hieu) targetEntry.s[1] = appendYccdText(targetEntry.s[1], multiResult.hieu);
      if (multiResult.vanDung) targetEntry.s[2] = appendYccdText(targetEntry.s[2], multiResult.vanDung);
    } else if (detectedLevel && textContent) {
      if (detectedLevel === 'biet') targetEntry.s[0] = appendYccdText(targetEntry.s[0], textContent);
      else if (detectedLevel === 'hieu') targetEntry.s[1] = appendYccdText(targetEntry.s[1], textContent);
      else if (detectedLevel === 'vanDung') targetEntry.s[2] = appendYccdText(targetEntry.s[2], textContent);
    } else if (textContent) {
      // Default to Nhận biết if no level could be deduced
      targetEntry.s[0] = appendYccdText(targetEntry.s[0], textContent);
    }
  }

  return specRows;
}

export function parseYccdLevelsFromCellOrText(text: string): {
  biet: string;
  hieu: string;
  vanDung: string;
} | null {
  if (!text || text.trim().length < 5) return null;

  const str = text.trim();
  const lower = str.toLowerCase();

  const hasBietKeyword = /\b(nhận\s*biết|biết)\b/i.test(lower);
  const hasHieuKeyword = /\b(thông\s*hiểu|hiểu)\b/i.test(lower);
  const hasVdKeyword = /\b(vận\s*dụng\s*cao|vận\s*dụng)\b/i.test(lower);

  if (hasBietKeyword || hasHieuKeyword || hasVdKeyword) {
    let biet = '';
    let hieu = '';
    let vanDung = '';

    const bietMatch = str.match(/(?:nhận\s*biết|biết)\s*[\:\-\.]?\s*([\s\S]*?)(?=(?:thông\s*hiểu|hiểu|vận\s*dụng|$))/i);
    const hieuMatch = str.match(/(?:thông\s*hiểu|hiểu)\s*[\:\-\.]?\s*([\s\S]*?)(?=(?:vận\s*dụng|$))/i);
    const vdMatch = str.match(/(?:vận\s*dụng\s*cao|vận\s*dụng)\s*[\:\-\.]?\s*([\s\S]*?)$/i);

    if (bietMatch) biet = bietMatch[1].trim();
    if (hieuMatch) hieu = hieuMatch[1].trim();
    if (vdMatch) vanDung = vdMatch[1].trim();

    const cleanSection = (s: string) =>
      s
        .replace(/^[+\*\-•\–\—\:\.]+\s*/, '')
        .replace(/[+\*\-•\–\—\:\.]+$/, '')
        .trim();

    biet = cleanSection(biet);
    hieu = cleanSection(hieu);
    vanDung = cleanSection(vanDung);

    if (biet || hieu || vanDung) {
      return { biet, hieu, vanDung };
    }
  }

  return null;
}

let lastCachedSpecText = '';
let lastCachedSpecRows: ReturnType<typeof extractSpecRowsFromText> = [];

function getCachedSpecRows(uploadedText: string, mon: string = ''): ReturnType<typeof extractSpecRowsFromText> {
  if (!uploadedText) return [];
  if (uploadedText === lastCachedSpecText) {
    return lastCachedSpecRows;
  }
  lastCachedSpecText = uploadedText;
  lastCachedSpecRows = extractSpecRowsFromText(uploadedText, mon);
  return lastCachedSpecRows;
}

export function findMatchingUploadedYccd(
  chapterTitle: string,
  subtopics: string,
  uploadedText?: string,
  precomputedSpecRows?: ReturnType<typeof extractSpecRowsFromText>
): [string, string, string] | null {
  if (!uploadedText || uploadedText.trim().length < 10) return null;

  const cleanChapter = (chapterTitle || '').trim();
  const cleanSubtopics = (subtopics || '').trim();
  if (!cleanChapter && !cleanSubtopics) return null;

  // 1. Try querying structured extracted spec rows first using isSameLesson (using precomputed/cached spec rows)
  const specRows = precomputedSpecRows ?? getCachedSpecRows(uploadedText, '');
  if (specRows && specRows.length > 0) {
    const matched = specRows.find(
      (sr) =>
        isSameLesson(sr.lesson, cleanSubtopics) ||
        isSameLesson(sr.lesson, cleanChapter) ||
        (cleanSubtopics && isSameLesson(cleanSubtopics, sr.lesson)) ||
        (cleanChapter && isSameLesson(cleanChapter, sr.lesson))
    );
    if (matched && (matched.s[0] || matched.s[1] || matched.s[2])) {
      return matched.s;
    }
  }

  // Split multiple lessons inside the chapter row (by newline or semicolon)
  const individualLessons = cleanSubtopics
    .split(/\r?\n|;/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 2);

  const targetsToSearch = individualLessons.length > 0 ? individualLessons : [cleanChapter];

  const allBiet: string[] = [];
  const allHieu: string[] = [];
  const allVanDung: string[] = [];

  const lines = uploadedText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const target of targetsToSearch) {
    const lessonNumMatch = target.match(/(?:bài|chương|chủ đề)\s*(\d+|[i|v|x]+)/i);
    const targetNum = lessonNumMatch ? lessonNumMatch[1].toLowerCase() : null;

    const pureTitle = target
      .replace(/^(chương|chủ đề|bài)\s*\d*[\:\.\-\s]*/gi, '')
      .trim()
      .toLowerCase();

    let bestIdx = -1;
    let maxScore = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lLower = line.toLowerCase();

      let score = 0;
      if (targetNum) {
        const numRegex = new RegExp(`\\b(bài|chương|chủ đề)\\s*0*${targetNum}\\b`, 'i');
        if (numRegex.test(lLower)) {
          score += 80;
        }
      }

      if (pureTitle.length >= 3) {
        if (lLower.includes(pureTitle)) {
          score += pureTitle.length * 3;
        } else {
          const words = pureTitle.split(/\s+/).filter((w) => w.length >= 3);
          let matchCount = 0;
          for (const w of words) {
            if (lLower.includes(w)) matchCount++;
          }
          if (words.length > 0 && matchCount / words.length >= 0.5) {
            score += matchCount * 4;
          }
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx !== -1) {
      const matchedLine = lines[bestIdx];

      const lessonBiet: string[] = [];
      const lessonHieu: string[] = [];
      const lessonVanDung: string[] = [];

      // Check if matched line is part of a Markdown or delimited table row
      if (matchedLine.includes('|')) {
        const cells = matchedLine
          .split('|')
          .map((c) => c.trim())
          .filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));

        let lessonColIdx = -1;
        for (let cIdx = 0; cIdx < cells.length; cIdx++) {
          const cLower = cells[cIdx].toLowerCase();
          if ((targetNum && new RegExp(`\\b(bài|chương|chủ đề)\\s*0*${targetNum}\\b`, 'i').test(cLower)) ||
              (pureTitle && cLower.includes(pureTitle))) {
            lessonColIdx = cIdx;
            break;
          }
        }

        if (lessonColIdx === -1) lessonColIdx = 1;

        const remainingCells = cells.slice(lessonColIdx + 1);

        if (remainingCells.length >= 3) {
          if (remainingCells[0] && !isPlaceholderOrInvalidYccd(remainingCells[0], target)) lessonBiet.push(remainingCells[0]);
          if (remainingCells[1] && !isPlaceholderOrInvalidYccd(remainingCells[1], target)) lessonHieu.push(remainingCells[1]);
          if (remainingCells[2] && !isPlaceholderOrInvalidYccd(remainingCells[2], target)) lessonVanDung.push(remainingCells[2]);
        } else if (remainingCells.length > 0) {
          for (const remCell of remainingCells) {
            const parsed = parseYccdLevelsFromCellOrText(remCell);
            if (parsed) {
              if (parsed.biet) lessonBiet.push(parsed.biet);
              if (parsed.hieu) lessonHieu.push(parsed.hieu);
              if (parsed.vanDung) lessonVanDung.push(parsed.vanDung);
            } else if (remCell.length > 3 && !isPlaceholderOrInvalidYccd(remCell, target)) {
              lessonBiet.push(remCell);
            }
          }
        }
      } else {
        // Plain text scan in window around bestIdx
        const searchStart = Math.max(0, bestIdx);
        const searchEnd = Math.min(lines.length, bestIdx + 60);
        const windowLines = lines.slice(searchStart, searchEnd);

        let currentLevel: 'biet' | 'hieu' | 'vanDung' | null = null;

        for (let idx = 0; idx < windowLines.length; idx++) {
          const line = windowLines[idx].trim();
          if (!line) continue;

          // Stop if we hit a DIFFERENT lesson heading after the first line
          if (idx > 0) {
            const nextNumMatch = line.match(/^(?:\[Bảng.*?\]\s*)?(?:chương|chủ đề|bài)\s*(\d+|[i|v|x]+)/i);
            if (nextNumMatch && targetNum && nextNumMatch[1].toLowerCase() !== targetNum) {
              break;
            }
          }

          const parsed = parseYccdLevelsFromCellOrText(line);
          if (parsed) {
            if (parsed.biet) lessonBiet.push(parsed.biet);
            if (parsed.hieu) lessonHieu.push(parsed.hieu);
            if (parsed.vanDung) lessonVanDung.push(parsed.vanDung);
          } else {
            const detected = detectLevelInCell(line);
            if (detected) {
              currentLevel = detected.level;
              if (detected.content && !isPlaceholderOrInvalidYccd(detected.content, target)) {
                if (currentLevel === 'biet') lessonBiet.push(detected.content);
                else if (currentLevel === 'hieu') lessonHieu.push(detected.content);
                else if (currentLevel === 'vanDung') lessonVanDung.push(detected.content);
              }
            } else if (currentLevel) {
              const cleanLine = line.replace(/^[+\*\-•\–\—]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();
              if (cleanLine.length >= 3 && !isPlaceholderOrInvalidYccd(cleanLine, target)) {
                if (currentLevel === 'biet') lessonBiet.push(cleanLine);
                else if (currentLevel === 'hieu') lessonHieu.push(cleanLine);
                else if (currentLevel === 'vanDung') lessonVanDung.push(cleanLine);
              }
            }
          }
        }
      }

      const lessonPrefix = targetsToSearch.length > 1 && target ? `${target}: ` : '';

      if (lessonBiet.length > 0) {
        allBiet.push(lessonPrefix + lessonBiet.join('; '));
      }
      if (lessonHieu.length > 0) {
        allHieu.push(lessonPrefix + lessonHieu.join('; '));
      }
      if (lessonVanDung.length > 0) {
        allVanDung.push(lessonPrefix + lessonVanDung.join('; '));
      }
    }
  }

  const formatPoints = (arr: string[]) => {
    const unique = Array.from(new Set(arr))
      .map((item) => item.replace(/^[+\*\-•\–\—]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim())
      .filter((item) => item.length >= 3 && !isPlaceholderOrInvalidYccd(item, subtopics || chapterTitle));

    if (!unique.length) return '';
    if (unique.length === 1) return unique[0];
    return unique.map((item) => (item.startsWith('-') || item.startsWith('–') ? item : `– ${item}`)).join('\n');
  };

  const validBiet = formatPoints(allBiet);
  const validHieu = formatPoints(allHieu);
  const validVanDung = formatPoints(allVanDung);

  if (validBiet || validHieu || validVanDung) {
    return [validBiet, validHieu, validVanDung];
  }

  return null;
}

export function formatYccdAsBulletedList(text: string): string {
  if (!text) return '';
  let clean = text.trim();
  clean = clean.replace(/^[-•]\s*/, '');
  if (!clean) return '';

  const parts = clean.split(/(?<=[.?!])\s+|;\s+/).filter((p) => p.trim().length > 3);
  if (parts.length <= 1) {
    return `- ${clean.charAt(0).toUpperCase() + clean.slice(1)}`;
  }
  return parts.map((p) => {
    const trimmed = p.trim().replace(/^[-•]\s*/, '');
    return `- ${trimmed.charAt(0).toUpperCase() + trimmed.slice(1)}`;
  }).join('\n');
}

export function ensureValidYccd(
  rows: MatrixRow[],
  mon: SubjectName,
  grade: string,
  ppctData?: { text?: string; yccdText?: string; base64?: string; yccdBase64?: string },
  forceRefresh: boolean = false
): MatrixRow[] {
  if (!rows || !rows.length) return rows;

  // CRITICAL: Filter out any Chuyên đề rows
  const cleanRows = rows.filter((r) => !isChuyenDeTitle(r.c) && !isChuyenDeTitle(r.n));
  const rowsToProcess = cleanRows.length > 0 ? cleanRows : rows;

  const uploadedText = ppctData ? `${ppctData.yccdText || ''}\n${ppctData.text || ''}` : '';
  const hasUploadedFile = Boolean(uploadedText.trim() || ppctData?.base64 || ppctData?.yccdBase64);
  const uploadedSpecRows = getCachedSpecRows(uploadedText, mon);

  const resultRows = rowsToProcess.map((r, rowIndex) => {
    const chapter = r.c || '';
    const lessons = r.n || '';
    const currentS = r.s ? [...r.s] : ['', '', ''];

    // Question counts per level across TNLC, DS, TLN, TL
    const q0 = (r.v[0] || 0) + (r.v[3] || 0) + (r.v[6] || 0) + (r.v[9] || 0);
    const q1 = (r.v[1] || 0) + (r.v[4] || 0) + (r.v[7] || 0) + (r.v[10] || 0);
    const q2 = (r.v[2] || 0) + (r.v[5] || 0) + (r.v[8] || 0) + (r.v[11] || 0);

    // Match against uploadedSpecRows using isSameLesson first, then positional fallback if count matches
    let directSpecRow = uploadedSpecRows.find(
      (sr) =>
        isSameLesson(sr.lesson, lessons) ||
        isSameLesson(sr.lesson, chapter) ||
        (lessons && sr.lesson && (sr.lesson.toLowerCase().includes(lessons.toLowerCase()) || lessons.toLowerCase().includes(sr.lesson.toLowerCase())))
    );

    if (!directSpecRow && uploadedSpecRows[rowIndex]) {
      const posRow = uploadedSpecRows[rowIndex];
      if (
        isSameLesson(posRow.lesson, lessons) ||
        isSameLesson(posRow.chapter, chapter) ||
        uploadedSpecRows.length === rowsToProcess.length
      ) {
        directSpecRow = posRow;
      }
    }

    const uploadedTuple = (directSpecRow && (directSpecRow.s[0] || directSpecRow.s[1] || directSpecRow.s[2]))
      ? directSpecRow.s
      : findMatchingUploadedYccd(chapter, lessons, uploadedText, uploadedSpecRows);

    // CRITICAL: ONLY take Ministry specTuple if NO FILE was uploaded!
    const specTuple = !hasUploadedFile ? findMatchingSpec(mon, grade, chapter, lessons) : null;

    const defaultBiet = mon === 'Ngữ văn'
      ? `Nhận biết thể loại, đặc điểm hình thức, các chi tiết, hình ảnh và phương thức biểu đạt tiêu biểu trong ${lessons || chapter}.`
      : `Nhận biết, nêu được các khái niệm, định nghĩa, tính chất, đặc điểm cốt lõi và công thức cơ bản của "${lessons || chapter}".`;

    const defaultHieu = mon === 'Ngữ văn'
      ? `Hiểu nội dung, chủ đề, thông điệp, ý nghĩa nghệ thuật và phân tích các chi tiết tiêu biểu trong ${lessons || chapter}.`
      : `Hiểu, giải thích, phân tích được bản chất, cơ chế, mối quan hệ kiến thức và thực hiện các phép tính, biến đổi cơ bản trong "${lessons || chapter}".`;

    const defaultVanDung = mon === 'Ngữ văn'
      ? `Vận dụng kĩ năng đọc hiểu và viết để liên hệ thực tế, rút ra bài học, thể hiện quan điểm cá nhân và viết đoạn/bài văn về ${lessons || chapter}.`
      : `Vận dụng kiến thức, kĩ năng của "${lessons || chapter}" để giải quyết các bài tập, bài toán tổng hợp và tình huống thực tiễn.`;

    const pickForLevel = (levelIdx: number, defaultText: string) => {
      const up = uploadedTuple ? uploadedTuple[levelIdx] : '';
      const sp = specTuple ? specTuple[levelIdx] : '';
      const cur = currentS[levelIdx] || '';

      const isCurInvalid = isPlaceholderOrInvalidYccd(cur, lessons || chapter);
      const isUpValid = up && !isPlaceholderOrInvalidYccd(up, lessons || chapter);
      const isSpValid = sp && !isPlaceholderOrInvalidYccd(sp, lessons || chapter);

      // 1. Prioritize uploaded file YCCĐ if present and valid
      if (isUpValid) return up;

      // 2. If a file was uploaded, strictly preserve uploaded text / current valid text without injecting default Ministry text!
      if (hasUploadedFile) {
        if (!isCurInvalid) return cur;
        return up || '';
      }

      // 3. No file was uploaded: standard Ministry curriculum logic
      if (forceRefresh) {
        if (isSpValid) return sp;
        if (!isCurInvalid) return cur;
        return defaultText;
      }

      if (!isCurInvalid) return cur;
      if (isSpValid) return sp;
      return defaultText;
    };

    const keepOrPick = (levelIdx: number, defaultText: string, qCount: number) => {
      const up = uploadedTuple ? uploadedTuple[levelIdx] : '';
      const isUpValid = up && !isPlaceholderOrInvalidYccd(up, lessons || chapter);

      // 1. If an uploaded file exists and has valid matched YCCĐ for this lesson, ALWAYS use the uploaded YCCĐ!
      if (isUpValid) return up;

      const cur = currentS[levelIdx] || '';

      // 2. If a file was uploaded, keep cur if valid or return up/empty string (never force default Ministry text)
      if (hasUploadedFile) {
        const isCurInvalid = isPlaceholderOrInvalidYccd(cur, lessons || chapter);
        if (!isCurInvalid) return cur;
        return up || '';
      }

      // If level has 0 questions and YCCĐ is empty, do not force default text
      if (qCount === 0 && cur === '') {
        return '';
      }

      const isCurInvalid = isPlaceholderOrInvalidYccd(cur, lessons || chapter);
      if (!isCurInvalid && !forceRefresh) return cur;

      const picked = pickForLevel(levelIdx, defaultText);
      if (picked && !isPlaceholderOrInvalidYccd(picked, lessons || chapter)) return picked;
      return qCount > 0 ? defaultText : '';
    };

    const newS: [string, string, string] = [
      formatYccdAsBulletedList(stripCognitiveLevelPrefixes(keepOrPick(0, defaultBiet, q0))),
      formatYccdAsBulletedList(stripCognitiveLevelPrefixes(keepOrPick(1, defaultHieu, q1))),
      formatYccdAsBulletedList(stripCognitiveLevelPrefixes(keepOrPick(2, defaultVanDung, q2))),
    ];

    return {
      ...r,
      s: newS,
    };
  });

  return ensureOneLessonPerRow(resultRows);
}

export function getMidtermSliceCount(mon: string, grade: string, semester: string, totalCount: number): number {
  if (totalCount <= 2) return Math.max(1, totalCount);

  const isSem1 = !semester.includes('II');

  if (mon === 'Địa lí') {
    if (grade === '10' && isSem1) return 4; // Chương 1, 2, 3, 4 (Tuần 1-9: Bài 1 đến Bài 8)
    if (grade === '11' && isSem1) return 4; // Chủ đề 1, 2, 3, 4
    if (grade === '12' && isSem1) return 2; // Phần 1 (Địa lí tự nhiên), Phần 2 (Địa lí dân cư)
    if (grade === '10' && !isSem1) return 2; // Chương 7, 8
    if (grade === '11' && !isSem1) return 3; // Tây Nam Á, Hoa Kì, Nga
    if (grade === '12' && !isSem1) return 3; // Dịch vụ, TDMNBB & ĐBSH, BTB & DHNTB & TN
  }

  if (mon === 'Lịch sử') {
    if (isSem1) return 1; // Midterm 1 strictly takes Topic 1 (Lessons 1-4 for G10, Lessons 1-2 for G11/12)
    return 1; // Midterm 2 strictly takes Topic 4
  }

  if (mon === 'Sinh học') {
    if (grade === '10' && isSem1) return 3; // Giới thiệu chung, Thành phần hóa học, Cấu trúc tế bào
    if (grade === '11' && isSem1) return 2;
    if (grade === '12' && isSem1) return 2;
  }

  if (mon === 'Toán') {
    if (grade === '10' && isSem1) return 3; // Mệnh đề & tập hợp, BPT, Hệ thức lượng
    if (grade === '11' && isSem1) return 3;
    if (grade === '12' && isSem1) return 2;
  }

  if (totalCount >= 6) {
    return Math.min(totalCount - 1, Math.max(3, Math.round(totalCount * 0.65)));
  }

  return Math.max(1, Math.ceil(totalCount / 2));
}

export function generateDefaultRows(
  mon: SubjectName,
  grade: string,
  semester: ExamSemester,
  structureMode: StructureMode,
  noTLN: boolean,
  points?: QuestionPointConfig,
  targetFormatPts?: number[],
  targetLevelPts?: number[]
): MatrixRow[] {
  const d = CURRICULUM_DATA[mon] && CURRICULUM_DATA[mon][grade];
  if (!d) {
    const fallbackRows = [
      { c: 'Chương 1', n: 'Nội dung bài học chương 1', v: getZeroVector() },
      { c: 'Chương 2', n: 'Nội dung bài học chương 2', v: getZeroVector() },
    ];
    return ensureValidYccd(fallbackRows, mon, grade);
  }

  if (mon === 'Ngữ văn') {
    const defaultLiterature: MatrixRow[] = [
      {
        c: 'Đọc hiểu',
        n: 'Văn bản đọc hiểu (ngữ liệu trong hoặc ngoài sách giáo khoa)',
        v: [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1],
        s: [
          'Nhận biết thể loại, đặc điểm hình thức, chi tiết nghệ thuật tiêu biểu trong văn bản.',
          'Hiểu nội dung, chủ đề, thông điệp, ý nghĩa nghệ thuật và phân tích tác dụng biện pháp tu từ.',
          'Vận dụng kĩ năng đọc hiểu để liên hệ thực tế, rút ra bài học nhân sinh và thể hiện quan điểm riêng.',
        ],
      },
      {
        c: 'Viết',
        n: 'Viết đoạn văn nghị luận xã hội (khoảng 200 chữ)',
        v: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
        s: [
          'Nhận biết các yêu cầu về thể loại, dung lượng và vấn đề cần nghị luận xã hội.',
          'Hiểu vấn đề tư tưởng, đạo lí, hiện tượng đời sống và triển khai các luận điểm chặt chẽ.',
          'Vận dụng kĩ năng lập luận, dẫn chứng thực tế để viết đoạn văn thuyết phục, thể hiện tư duy độc lập.',
        ],
      },
      {
        c: 'Viết',
        n: 'Viết bài văn nghị luận văn học (phân tích, đánh giá tác phẩm hoặc đoạn trích)',
        v: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2],
        s: [
          'Xác định đúng đối tượng nghị luận văn học, tác giả, tác phẩm và bối cảnh sáng tác.',
          'Phân tích sâu sắc giá trị nội dung, nghệ thuật, hình tượng nhân vật và tư tưởng tác phẩm.',
          'Vận dụng tri thức lý luận văn học để đánh giá, so sánh mở rộng và diễn đạt tài hoa, sáng tạo.',
        ],
      },
    ];
    return ensureValidYccd(defaultLiterature, mon, grade);
  }

  const k = semester.includes('II') ? 2 : 1;
  const list = d as [string, number][];
  let ch = list
    .map((x, i): [string, number, number] => [x[0], x[1], i])
    .filter((x) => x[1] === k && !isChuyenDeTitle(x[0]));

  if (semester.startsWith('Giữa')) {
    const sliceCount = getMidtermSliceCount(mon, grade, semester, ch.length);
    ch = ch.slice(0, sliceCount);
  }

  const specList = DETAILED_SPECS[mon] && DETAILED_SPECS[mon][grade];

  const initialRows: MatrixRow[] = ch.map(([c, , i]) => {
    const t = specList && specList[i];
    return {
      c,
      n: t ? t[0] : `${c}: Các bài học, nội dung kiến thức trọng tâm`,
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

  const expandedRows = ensureOneLessonPerRow(initialRows);
  const distributed = distributeQuestions(expandedRows, mon, structureMode, noTLN, points, targetFormatPts, targetLevelPts, true);
  return cleanseRowsForExamScope(ensureValidYccd(distributed, mon, grade), mon, semester);
}

const LESSON_SPECIFIC_YCCD_MAP: Array<{
  pattern: RegExp;
  s: [string, string, string];
}> = [
  {
    pattern: /bài\s*1\b.*vị\s*trí\s*địa\s*l[íý]|vị\s*trí\s*địa\s*l[íý]\s*và\s*phạm\s*vi\s*lãnh\s*thổ/i,
    s: [
      'Xác định được đặc điểm vị trí địa lí, giới hạn tọa độ và phạm vi lãnh thổ (vùng đất, vùng biển, vùng trời) của Việt Nam.',
      'Phân tích được ảnh hưởng của vị trí địa lí và phạm vi lãnh thổ đến tự nhiên, kinh tế - xã hội và an ninh quốc phòng.',
      'Vận dụng kiến thức vị trí địa lí, phạm vi lãnh thổ để tính toán số liệu biên giới, lãnh thổ và liên hệ bảo vệ chủ quyền quốc gia.',
    ],
  },
  {
    pattern: /bài\s*2\b.*nhiệt\s*đới\s*ẩm\s*gió\s*mùa|thiên\s*nhiên\s*nhiệt\s*đới\s*ẩm\s*gió\s*mùa/i,
    s: [
      'Trình bày được các biểu hiện của khí hậu nhiệt đới ẩm gió mùa (nhiệt độ, lượng mưa, gió mùa) và các thành phần tự nhiên địa hình, sông ngòi, đất, sinh vật.',
      'Giải thích được nguyên nhân tạo nên tính chất nhiệt đới ẩm gió mùa và tác động của gió mùa đến chế độ nhiệt, mưa, sông ngòi ở nước ta.',
      'Tính toán các chỉ tiêu khí hậu, thủy văn (biên độ nhiệt, cân bằng ẩm, lưu lượng nước) và phân tích ảnh hưởng của thiên nhiên nhiệt đới ẩm gió mùa đến sản xuất, đời sống.',
    ],
  },
  {
    pattern: /bài\s*3\b.*phân\s*h[oó]a\s*đa\s*dạng|sự\s*phân\s*h[oó]a\s*đa\s*dạng\s*của\s*thiên\s*nhiên/i,
    s: [
      'Trình bày được biểu hiện sự phân hóa thiên nhiên theo chiều Bắc - Nam, Đông - Tây, theo độ cao (3 đai cao) và 3 miền địa lí tự nhiên.',
      'Giải thích được nguyên nhân dẫn đến sự phân hóa thiên nhiên theo vĩ độ, theo kinh độ, theo đai cao và đặc trưng các miền tự nhiên.',
      'Tính toán nhiệt độ theo quy luật đai cao, biên độ nhiệt giữa các miền và đánh giá ảnh hưởng của phân hóa thiên nhiên đến quy hoạch phát triển kinh tế vùng.',
    ],
  },
  {
    pattern: /bài\s*5\b.*sử\s*dụng\s*hợp\s*l[íý]\s*tài\s*nguyên|bảo\s*vệ\s*môi\s*trường/i,
    s: [
      'Nêu được hiện trạng sử dụng các loại tài nguyên thiên nhiên (rừng, đất, đa dạng sinh học, nước) và các vấn đề môi trường ở Việt Nam.',
      'Giải thích được nguyên nhân làm suy giảm tài nguyên thiên nhiên và ô nhiễm môi trường ở nước ta.',
      'Tính toán tỉ lệ diện tích rừng, độ che phủ rừng và đề xuất giải pháp sử dụng hợp lí tài nguyên, bảo vệ môi trường bền vững.',
    ],
  },
  {
    pattern: /bài\s*7\b.*dân\s*số|dân\s*số\s*việt\s*nam/i,
    s: [
      'Trình bày được đặc điểm quy mô, gia tăng dân số, cơ cấu dân số (theo tuổi, giới tính, dân tộc) và phân bố dân cư ở Việt Nam.',
      'Phân tích được thế mạnh, hạn chế của dân số đối với phát triển kinh tế - xã hội và nguyên nhân phân bố dân cư chưa hợp lí.',
      'Tính toán mật độ dân số, tỉ suất gia tăng dân số và đề xuất giải pháp thực hiện chính sách dân số hiệu quả.',
    ],
  },
  {
    pattern: /bài\s*8\b.*lao\s*động\s*và\s*việc\s*làm/i,
    s: [
      'Trình bày được đặc điểm nguồn lao động, cơ cấu lao động và hiện trạng việc làm ở nước ta.',
      'Phân tích được nguyên nhân chuyển dịch cơ cấu lao động và vấn đề việc làm ở khu vực thành thị, nông thôn.',
      'Tính toán tỉ trọng cơ cấu lao động, tỉ lệ thất nghiệp và đề xuất hướng giải quyết việc làm ở Việt Nam.',
    ],
  },
  {
    pattern: /bài\s*9\b.*đô\s*thị\s*h[oó]a/i,
    s: [
      'Trình bày được đặc điểm quá trình đô thị hóa, tỉ lệ dân thành thị và sự phân bố mạng lưới đô thị ở Việt Nam.',
      'Phân tích được tác động tích cực và hạn chế của quá trình đô thị hóa đến phát triển kinh tế - xã hội và môi trường.',
      'Tính toán tỉ lệ dân thành thị, tốc độ tăng dân số đô thị và đề xuất giải pháp phát triển đô thị bền vững.',
    ],
  },
];

export function ensureOneLessonPerRow(rows: MatrixRow[]): MatrixRow[] {
  if (!rows || !rows.length) return rows;

  const result: MatrixRow[] = [];

  rows.forEach((r) => {
    if (!r.n || !r.n.trim()) {
      result.push(r);
      return;
    }

    // Expand inline "Bài X" markers e.g. "Bài 1. Tên 1. Bài 2. Tên 2"
    const expandedN = r.n
      .replace(/\r?\n/g, '\n')
      .replace(/\s*;\s*(?=(?:bài|bài\s*học)\s*(?:\d+|[ivx]+)[\:\.\-\–\—\s])/gi, '\n')
      .replace(/(?<=\S)\s+(?=(?:bài|bài\s*học)\s*(?:\d+|[ivx]+)[\:\.\-\–\—\s])/gi, '\n')
      .trim();

    let lessonLines = expandedN
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    // When splitting a multi-lesson chapter block, filter out pure "Thực hành: Viết báo cáo / Tuyên truyền..."
    // lines if core theory/skill lessons exist in the same block so written exam questions are assigned only to testable lessons.
    if (lessonLines.length > 1) {
      const nonPracticeLines = lessonLines.filter(
        (l) => !/^(?:bài\s*\d+[\:\.\-\–\—\s]*)?thực\s*hành\s*[\:\.\-\–\—]/i.test(l)
      );
      if (nonPracticeLines.length > 0) {
        lessonLines = nonPracticeLines;
      }
    }

    if (lessonLines.length <= 1) {
      const singleLesson = lessonLines[0] || r.n;
      const matchedSpec = LESSON_SPECIFIC_YCCD_MAP.find((item) => item.pattern.test(singleLesson));
      result.push({
        ...r,
        n: singleLesson,
        s: matchedSpec && (!r.s || !r.s[0] || isPlaceholderOrInvalidYccd(r.s[0], singleLesson))
          ? [...matchedSpec.s]
          : r.s,
      });
    } else {
      const numLines = lessonLines.length;
      const newV = r.v ? [...r.v] : getZeroVector();
      const newY = r.y ? [...r.y] : [0, 0, 0];
      const totalDsQuestions = Math.max(0, Math.round(((newY[0] || 0) + (newY[1] || 0) + (newY[2] || 0)) / 4));

      lessonLines.forEach((lessonText, idx) => {
        const scaleCell = (val: number, colOffset: number = 0) => {
          if (!val) return 0;
          const base = Math.floor(val / numLines);
          const remainder = val % numLines;
          const shiftedIdx = (idx - (colOffset % numLines) + numLines) % numLines;
          return base + (shiftedIdx < remainder ? 1 : 0);
        };

        const scaledV = newV.map((vVal, j) => {
          const f = (j / 3) | 0;
          if (f === 1) return 0;
          return scaleCell(vVal, j);
        });

        // Distribute whole 4-item True/False questions (each question = [2 Biết, 1 Hiểu, 1 Vận dụng])
        const dsQCount = scaleCell(totalDsQuestions, 1);
        const scaledY = dsQCount > 0 ? [dsQCount * 2, dsQCount * 1, dsQCount * 1] : [0, 0, 0];
        if (dsQCount > 0) {
          scaledV[3] = dsQCount;
          scaledV[4] = dsQCount;
          scaledV[5] = dsQCount;
        } else {
          scaledV[3] = 0;
          scaledV[4] = 0;
          scaledV[5] = 0;
        }

        const matchedSpec = LESSON_SPECIFIC_YCCD_MAP.find((item) => item.pattern.test(lessonText));
        const s0Lines = (r.s?.[0] || '').split(/\r?\n/);
        const s1Lines = (r.s?.[1] || '').split(/\r?\n/);
        const s2Lines = (r.s?.[2] || '').split(/\r?\n/);

        const subS: [string, string, string] = matchedSpec
          ? [...matchedSpec.s]
          : [
              s0Lines[idx] || s0Lines[0] || r.s?.[0] || '',
              s1Lines[idx] || s1Lines[0] || r.s?.[1] || '',
              s2Lines[idx] || s2Lines[0] || r.s?.[2] || '',
            ];

        result.push({
          c: r.c,
          n: lessonText,
          v: scaledV,
          y: scaledY,
          s: subS,
        });
      });
    }
  });

  return result;
}

export function standardizeMatrixAndSpecToCv7991(
  rows: MatrixRow[],
  mon: SubjectName,
  grade: string,
  semester: ExamSemester,
  structureMode: StructureMode,
  noTLN: boolean,
  points?: QuestionPointConfig,
  targetFormatPts?: number[],
  targetLevelPts?: number[],
  ppctData?: { text?: string; yccdText?: string },
  preserveExistingQuestions: boolean = false
): MatrixRow[] {
  if (!rows || rows.length === 0) {
    return ensureOneLessonPerRow(
      generateDefaultRows(mon, grade, semester, structureMode, noTLN, points, targetFormatPts, targetLevelPts)
    );
  }

  // 1. Sanitize Chapter titles and Lesson titles
  const cleanRows: MatrixRow[] = rows
    .map((r, i) => {
      const cleanC = r.c ? sanitizeChapterTitle(r.c, mon, i + 1) : `Chủ đề ${i + 1}`;
      const cleanN = r.n ? cleanLessonTitle(r.n) : cleanC;
      const cleanS: [string, string, string] = r.s && r.s.length === 3 ? [r.s[0] || '', r.s[1] || '', r.s[2] || ''] : ['', '', ''];
      return {
        ...r,
        c: cleanC,
        n: cleanN || cleanC,
        v: r.v && r.v.length === 12 ? [...r.v] : getZeroVector(),
        y: r.y && r.y.length === 3 ? [...r.y] : [0, 0, 0],
        s: cleanS,
      };
    })
    .filter((r) => r.c && !isDocumentTitleOrNoise(r.c) && r.n && !isDocumentTitleOrNoise(r.n));

  const validRows = cleanRows.length > 0 ? cleanRows : rows;

  const hasQuestions = preserveExistingQuestions || validRows.some((r) => (r.v && r.v.some((x) => x > 0)) || (r.y && r.y.some((x) => x > 0)));

  if (hasQuestions) {
    // PRESERVE ALL ROWS AND EXACT QUESTION COUNTS FROM UPLOADED FILE
    const finalStandardized = ensureValidYccd(validRows, mon, grade, ppctData, true);
    return ensureOneLessonPerRow(finalStandardized);
  }

  // 2. Consolidate rows by chapter to enforce chapter grouping
  const consolidated = consolidateRowsByChapter(validRows, mon, semester, ppctData?.text, true);

  // 3. Redistribute question counts across formats & cognitive levels
  const distributed = distributeQuestions(
    consolidated.length > 0 ? consolidated : validRows,
    mon,
    structureMode,
    noTLN,
    points,
    targetFormatPts,
    targetLevelPts,
    true
  );

  // 4. Fill and perfect 100% YCCĐ text in Specification table
  const finalStandardized = ensureValidYccd(distributed, mon, grade, ppctData, true);

  // 5. Ensure EVERY lesson is on its own separate row (1 row per lesson)
  return ensureOneLessonPerRow(finalStandardized);
}

