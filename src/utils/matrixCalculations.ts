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

  // 1. Explicit Chuyên đề keywords
  if (
    /chuyên\s*đề|cụm\s*chuyên\s*đề|chuyên\s*đề\s*học\s*tập|cđht|\b(?:cđ|cd)\s*\d+/i.test(lower)
  ) {
    return true;
  }

  // 2. Specific Chuyên đề Module Titles (GDPT 2018 Chuyên đề names)
  if (
    /vấn\s*đề\s*chung\s*về\s*báo\s*cáo\s*địa\s*l[íý]|báo\s*cáo\s*địa\s*l[íý]|đô\s*thị\s*hóa\b|chống\s*biến\s*đổi\s*khí\s*hậu|tác\s*động\s*của\s*biến\s*đổi\s*khí\s*hậu/i.test(lower)
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
    /các\s*lĩnh\s*vực\s*của\s*lịch\s*sử|lịch\s*sử\s*văn\s*minh|lịch\s*sử\s*đối\s*ngoại/i.test(lower)
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

  // 7. Table column header noise when encountered as cell text:
  if (
    /^(?:stt|tt|thứ\s*tự|tuần|tiết|tiết\s*ppct|tên\s*bài|tên\s*bài\s*học|bài\s*học|bài\s*dạy|nội\s*dung\s*(?:bài|dạy)?|yêu\s*cầu\s*cần\s*đạt|yccd|thiết\s*bị|địa\s*điểm|ghi\s*chú|số\s*tiết|thời\s*lượng)$/i.test(lower)
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

export function sanitizeChapterTitle(raw: string, fallbackIdx: number = 1): string {
  if (!raw) return `Chương ${fallbackIdx}`;

  let s = raw
    .replace(/^\[Bảng.*?\]\s*/i, '')
    .replace(/\[Sheet:[^\]]+\]/g, '')
    .replace(/\(.*?\)/g, '') // remove parenthetical notes
    .trim();

  // If raw matches document title or noise, DO NOT let it become a chapter!
  if (isDocumentTitleOrNoise(s)) {
    return `Chương ${fallbackIdx}`;
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
      return `Chương ${fallbackIdx}`;
    }
    return name ? `Chương ${numStr}. ${name}` : `Chương ${numStr}`;
  }

  // Fallback: format as "Chương fallbackIdx. cleanName"
  const cleanName = s.replace(/^(?:chương(?!\s*trình)|chủ\s*đề|phần)\s*/i, '').trim();
  if (isDocumentTitleOrNoise(cleanName)) {
    return `Chương ${fallbackIdx}`;
  }
  return cleanName ? `Chương ${fallbackIdx}. ${cleanName}` : `Chương ${fallbackIdx}`;
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
export function cleanLessonTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let clean = rawTitle.trim();
  if (isDocumentTitleOrNoise(clean)) return '';

  // CRITICAL FIX: Strip ALL repeated "Bài X." / "Bài" / "bài" prefixes e.g. "bài 5. Bài 5." -> ""
  clean = clean.replace(/^(?:bài\s*(?:\d+|[ivx]+)?[\:\.\-\–\—\s]*)+/gi, '').trim();

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
  // 1. Convert semicolons and newlines to uniform newlines
  // 2. Put inline "Bài X" markers on their own lines e.g. "Bài 6. Tên 6. Bài 7. Tên 7" -> separate lines
  let expandedRaw = raw
    .replace(/(?:\r?\n|;)+/g, '\n')
    .replace(/(?<=\S)\s+(?=(?:bài|bài\s*học)\s*(?:\d+|[ivx]+)[\:\.\-\–\—\s])/gi, '\n');

  // 3. Expand grouped "Bài 6, 7, 8: Tên bài" or "Bài 6, Bài 7, Bài 8: Tên bài" into separate lines
  expandedRaw = expandedRaw.replace(
    /\bbài\s*((?:\d+|[ivx]+)(?:\s*[\,\-\–\—\&]\s*(?:bài\s*)?(?:\d+|[ivx]+))+)\s*[\:\.\-\–\—\s]+([^\n\r]+)/gi,
    (match, numGroup, titleStr) => {
      const numMatches = numGroup.match(/\d+|[ivx]+/gi);
      if (!numMatches || numMatches.length === 0) return match;
      const cleanT = cleanLessonTitle(titleStr);
      return numMatches.map((n: string) => `Bài ${n}. ${cleanT}`).join('\n');
    }
  );

  // 4. Split multiple lesson topics separated by ". " if followed by Capital Letter topic e.g. "Thạch quyển. Nội lực và tác động..."
  const rawLines = expandedRaw.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed) return [];

    // Check if line contains inline "Bài X"
    if (/bài\s*\d+/i.test(trimmed)) {
      const parts = trimmed.split(/(?=\bbài\s*\d+[\:\.\-\s])/i).map((p) => p.trim()).filter(Boolean);
      if (parts.length > 1) return parts;
    }

    // Split on ". " followed by capital letter starting a new topic (e.g. "Thạch quyển. Nội lực và tác động...")
    const topicParts = trimmed.split(/(?<=[^\.\s]{2,}\.)\s+(?=[A-ZĐÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ][a-zà-ỹA-ZÀ-Ỹ0-9\s]{3,})/g);
    if (topicParts.length > 1) {
      const validParts = topicParts.map((p) => p.trim()).filter((p) => p.length >= 3 && !isYccdTextOrOutcome(p) && !isDocumentTitleOrNoise(p));
      if (validParts.length >= 2) return validParts;
    }

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
      const titleStr = cleanLessonTitle(baiMatch[2]);
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
      const titleStr = cleanLessonTitle(numMatch[2]);

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
    const titleStr = cleanLessonTitle(clean);
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

export function consolidateRowsByChapter<
  T extends { c: string; n: string; v?: number[]; y?: number[]; s?: [string, string, string] }
>(rows: T[]): T[] {
  if (!rows || !rows.length) return [];
  const map = new Map<string, T>();

  rows.forEach((row, idx) => {
    const rawChapter = (row.c || '').trim();
    if (!rawChapter || isChuyenDeTitle(rawChapter) || isChuyenDeTitle(row.n) || isDocumentTitleOrNoise(rawChapter)) return;

    const cleanChapter = sanitizeChapterTitle(rawChapter, idx + 1);
    if (!cleanChapter || isChuyenDeTitle(cleanChapter) || isDocumentTitleOrNoise(cleanChapter)) return;

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
        if (!combinedLines.some((l) => l.toLowerCase() === line.toLowerCase()) && !isChuyenDeTitle(line) && !isDocumentTitleOrNoise(line) && !isYccdTextOrOutcome(line)) {
          combinedLines.push(line);
        }
      });
      existing.n = combinedLines.join('\n');

      if (cleanChapter.length > existing.c.length) {
        existing.c = cleanChapter;
      }

      if (existing.v && row.v) {
        existing.v = existing.v.map((val, i) => val + (row.v![i] || 0));
      }

      if (existing.y && row.y) {
        existing.y = existing.y.map((val, i) => val + (row.y![i] || 0));
      }

      if (row.s && Array.isArray(row.s)) {
        if (!existing.s) {
          existing.s = [...row.s];
        } else {
          existing.s = [
            existing.s[0] || row.s[0] || '',
            existing.s[1] || row.s[1] || '',
            existing.s[2] || row.s[2] || '',
          ];
        }
      }
    }
  });

  // Final pass: enforce chapter title and lesson content formatting rules on all output rows with continuous PPCT lesson counter
  const outState = { nextLessonNum: 1 };
  return Array.from(map.values())
    .map((row, idx) => {
      const cleanC = sanitizeChapterTitle(row.c, idx + 1);
      const cleanN = sanitizeLessonContent(row.n, cleanC, outState.nextLessonNum, outState);
      return {
        ...row,
        c: cleanC,
        n: cleanN,
      };
    })
    .filter((r) => r.c && !isDocumentTitleOrNoise(r.c) && r.n && !isDocumentTitleOrNoise(r.n));
}

export function distributeQuestions(
  rows: MatrixRow[],
  mon: SubjectName,
  structureMode: StructureMode,
  noTLN: boolean,
  points?: QuestionPointConfig,
  targetFormatPts?: number[],
  targetLevelPts?: number[]
): MatrixRow[] {
  if (!rows.length) return rows;

  // Enforce 1 chapter = 1 row before distributing questions
  const targetRows = consolidateRowsByChapter(rows);

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

  for (const item of specs) {
    if (!item || item.length < 4) continue;
    const itemTitle = item[0].toLowerCase();

    if (
      (cleanC && (itemTitle.includes(cleanC) || cleanC.includes(itemTitle.slice(0, 15)))) ||
      (cleanN && (itemTitle.includes(cleanN) || cleanN.includes(itemTitle.slice(0, 15))))
    ) {
      return [item[1], item[2], item[3]];
    }
  }

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

export function findMatchingUploadedYccd(
  chapterTitle: string,
  subtopics: string,
  uploadedText?: string
): [string, string, string] | null {
  if (!uploadedText || uploadedText.trim().length < 10) return null;

  const lines = uploadedText.split('\n');
  const cleanChapter = (chapterTitle || '').trim();
  const cleanSubtopics = (subtopics || '').trim();
  if (!cleanChapter && !cleanSubtopics) return null;

  // Split multiple lessons inside the chapter row (by newline or semicolon)
  const individualLessons = cleanSubtopics
    .split(/\r?\n|;/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3);

  const targetsToSearch = individualLessons.length > 0 ? individualLessons : [cleanChapter];

  const detectLevelInCell = (text: string): { level: 'biet' | 'hieu' | 'vanDung'; content: string } | null => {
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
  };

  const allBiet: string[] = [];
  const allHieu: string[] = [];
  const allVanDung: string[] = [];

  for (const target of targetsToSearch) {
    const lessonNumMatch = target.match(/(?:bài|chương|chủ đề)\s*(\d+|[i|v|x]+)/i);
    const targetNum = lessonNumMatch ? lessonNumMatch[1].toLowerCase() : null;

    const phrases = target
      .split(/[\;\,\n\r]+|(?=\bbài\s*\d+)/i)
      .map((p) => p.replace(/^(chương|chủ đề|bài)\s*\d*[\:\.\-\s]*/gi, '').trim().toLowerCase())
      .filter((p) => p.length >= 3);

    let bestIdx = -1;
    let maxScore = 0;

    for (let i = 0; i < lines.length; i++) {
      const lLower = lines[i].toLowerCase().trim();
      if (!lLower) continue;

      let score = 0;
      if (targetNum) {
        const numRegex = new RegExp(`\\b(bài|chương|chủ đề)\\s*0*${targetNum}\\b`, 'i');
        if (numRegex.test(lLower)) {
          score += 80;
        }
      }

      for (const phrase of phrases) {
        if (lLower.includes(phrase)) {
          score += phrase.length * 3;
        } else {
          const words = phrase.split(/\s+/).filter((w) => w.length >= 3);
          let wordMatches = 0;
          for (const w of words) {
            if (lLower.includes(w)) wordMatches++;
          }
          if (words.length > 0 && wordMatches / words.length >= 0.5) {
            score += wordMatches * 4;
          }
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx !== -1) {
      const searchStart = Math.max(0, bestIdx - 1);
      const searchEnd = Math.min(lines.length, bestIdx + 70);
      const windowLines = lines.slice(searchStart, searchEnd);

      let currentLevel: 'biet' | 'hieu' | 'vanDung' | null = null;
      const lessonBiet: string[] = [];
      const lessonHieu: string[] = [];
      const lessonVanDung: string[] = [];

      for (let idx = 0; idx < windowLines.length; idx++) {
        const line = windowLines[idx].trim();
        if (!line) continue;

        // Stop if we hit a DIFFERENT lesson heading after a few lines
        if (idx > 2) {
          const nextNumMatch = line.match(/^(?:\[Bảng.*?\]\s*)?(?:chương|chủ đề|bài)\s*(\d+|[i|v|x]+)/i);
          if (nextNumMatch && targetNum && nextNumMatch[1].toLowerCase() !== targetNum) {
            break;
          }
        }

        // Check if line contains table cells (|)
        if (line.includes('|')) {
          const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
          for (const cell of cells) {
            const detected = detectLevelInCell(cell);
            if (detected && detected.content && !isPlaceholderOrInvalidYccd(detected.content, target)) {
              if (detected.level === 'biet') lessonBiet.push(detected.content);
              else if (detected.level === 'hieu') lessonHieu.push(detected.content);
              else if (detected.level === 'vanDung') lessonVanDung.push(detected.content);
            }
          }
          continue;
        }

        // Standard text lines
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
          if (cleanLine.length >= 5 && !isPlaceholderOrInvalidYccd(cleanLine, target)) {
            if (currentLevel === 'biet') lessonBiet.push(cleanLine);
            else if (currentLevel === 'hieu') lessonHieu.push(cleanLine);
            else if (currentLevel === 'vanDung') lessonVanDung.push(cleanLine);
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
      .filter((item) => item.length >= 5 && !isPlaceholderOrInvalidYccd(item, subtopics || chapterTitle));

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

  return rowsToProcess.map((r) => {
    const chapter = r.c || '';
    const lessons = r.n || '';
    const currentS = r.s ? [...r.s] : ['', '', ''];

    // Question counts per level across TNLC, DS, TLN, TL
    const q0 = (r.v[0] || 0) + (r.v[3] || 0) + (r.v[6] || 0) + (r.v[9] || 0);
    const q1 = (r.v[1] || 0) + (r.v[4] || 0) + (r.v[7] || 0) + (r.v[10] || 0);
    const q2 = (r.v[2] || 0) + (r.v[5] || 0) + (r.v[8] || 0) + (r.v[11] || 0);

    const uploadedTuple = findMatchingUploadedYccd(chapter, lessons, uploadedText);
    // CRITICAL: ONLY take Ministry specTuple if NO FILE was uploaded!
    // "nếu ko có file tải lên mới lấy của bộ, còn có tải lên thì lấy đúng 100% nội dung"
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

      // 2. If a file was uploaded, keep current valid text or synthesize tailored outcome for the uploaded lesson.
      // NEVER take the Ministry's foreign spec into uploaded files!
      if (hasUploadedFile) {
        if (!isCurInvalid) return cur;
        return defaultText;
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

    const newS: [string, string, string] = [
      q0 > 0 ? pickForLevel(0, defaultBiet) : '',
      q1 > 0 ? pickForLevel(1, defaultHieu) : '',
      q2 > 0 ? pickForLevel(2, defaultVanDung) : '',
    ];

    return {
      ...r,
      s: newS,
    };
  });
}

export function getMidtermSliceCount(mon: string, grade: string, semester: string, totalCount: number): number {
  if (totalCount <= 2) return Math.max(1, totalCount);

  const isSem1 = !semester.includes('II');

  if (mon === 'Địa lí') {
    if (grade === '10' && isSem1) return 4; // Chương 1, 2, 3, 4 (Tuần 1-9: Bài 1 đến Bài 8)
    if (grade === '11' && isSem1) return 4; // Chủ đề 1, 2, 3, 4
    if (grade === '12' && isSem1) return 4; // Chủ đề 1, 2, 3, 4
    if (grade === '10' && !isSem1) return 2; // Chương 7, 8
    if (grade === '11' && !isSem1) return 3; // Tây Nam Á, Hoa Kì, Nga
    if (grade === '12' && !isSem1) return 3; // Dịch vụ, TDMNBB & ĐBSH, BTB & DHNTB & TN
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

  const distributed = distributeQuestions(initialRows, mon, structureMode, noTLN, points, targetFormatPts, targetLevelPts);
  return ensureValidYccd(distributed, mon, grade);
}

