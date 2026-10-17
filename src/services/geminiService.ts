import { MatrixRow, QuestionPointConfig } from '../types';
import { CALC_GUIDELINES, QUESTION_RULES_TEXT, CURRICULUM_DATA, DETAILED_SPECS } from '../constants/curriculumData';
import { dsOf, consolidateRowsByChapter, isPlaceholderOrInvalidYccd, findMatchingUploadedYccd, findMatchingSpec, sanitizeChapterTitle, cleanLessonTitle, isChuyenDeTitle, getChapterKey, isYccdTextOrOutcome, isDocumentTitleOrNoise, getMidtermSliceCount } from '../utils/matrixCalculations';

export function safeJsonParse(str: string, fallback: any): any {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    try {
      let cleaned = str.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const firstBracket = cleaned.indexOf('[');
      let startIndex = 0;
      if (firstBrace !== -1 && firstBracket !== -1) {
        startIndex = Math.min(firstBrace, firstBracket);
      } else if (firstBrace !== -1) {
        startIndex = firstBrace;
      } else if (firstBracket !== -1) {
        startIndex = firstBracket;
      }

      const lastBrace = cleaned.lastIndexOf('}');
      const lastBracket = cleaned.lastIndexOf(']');
      const endIndex = Math.max(lastBrace, lastBracket);

      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        cleaned = cleaned.slice(startIndex, endIndex + 1);
      }
      return JSON.parse(cleaned);
    } catch {
      return fallback;
    }
  }
}

export async function callGemini(
  prompt: string,
  systemInstruction?: string,
  responseMimeType: string = 'application/json',
  useSearch: boolean = false,
  fileBase64?: string,
  fileMimeType?: string
): Promise<string> {
  // Always call Gemini via server-side endpoint (/api/gemini/generate)
  try {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        systemInstruction,
        responseMimeType,
        useSearch,
        fileBase64,
        fileMimeType,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.text) {
        return data.text;
      }
    }
  } catch (err) {
    console.warn('Server proxy call notice:', err);
  }

  return '';
}

function generateDefaultRowsForReconcile(mon: string, kh: string, ki: string): { c: string; n: string; s: [string, string, string] }[] {
  const subjectsData = CURRICULUM_DATA[mon];
  if (!subjectsData) return [];
  const gradeData = (subjectsData as any)[kh];
  if (!gradeData || !Array.isArray(gradeData)) return [];

  const targetSemNum = ki.includes('II') ? 2 : 1;
  const isMidterm = ki.startsWith('Giữa');

  // Map items preserving original index in gradeData so specList matches correctly
  const mappedItems = gradeData
    .map((item: any, origIdx: number) => ({ item, origIdx }))
    .filter(({ item }) => {
      const title = Array.isArray(item) ? item[0] : String(item);
      if (/chuyên\s*đề/i.test(title)) return false;
      if (Array.isArray(item) && typeof item[1] === 'number') {
        return item[1] === targetSemNum;
      }
      return true;
    });

  let activeItems = mappedItems;
  if (isMidterm) {
    const sliceCount = getMidtermSliceCount(mon, kh, ki, activeItems.length);
    activeItems = activeItems.slice(0, sliceCount);
  }

  const specList = DETAILED_SPECS[mon] && (DETAILED_SPECS[mon] as any)[kh];

  return activeItems.map(({ item, origIdx }, idx: number) => {
    const title = Array.isArray(item) ? item[0] : `Chủ đề ${idx + 1}`;
    const t = specList && specList[origIdx];
    return {
      c: title,
      n: t ? t[0] : `${title}: Các bài học, nội dung kiến thức trọng tâm`,
      s: t ? [t[1], t[2], t[3]] : [
        `Nhận biết các khái niệm cơ bản trong ${title}`,
        `Hiểu và vận dụng công thức/tính chất của ${title}`,
        `Vận dụng cao giải quyết bài toán thực tế liên quan đến ${title}`
      ]
    };
  });
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim();
  if (trimmed.includes('|')) {
    return trimmed.split('|').map((c) => c.trim()).filter(Boolean);
  }
  if (trimmed.includes('\t')) {
    return trimmed.split('\t').map((c) => c.trim()).filter(Boolean);
  }
  if (trimmed.includes(',')) {
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells.filter(Boolean);
  }
  if (trimmed.includes(';')) {
    return trimmed.split(';').map((c) => c.trim()).filter(Boolean);
  }
  return [trimmed];
}

function inferChapterFromLesson(lessonText: string, mon: string, kh: string): string | null {
  const specList = DETAILED_SPECS[mon] && (DETAILED_SPECS[mon] as any)[kh];
  const curList = CURRICULUM_DATA[mon] && (CURRICULUM_DATA[mon] as any)[kh];
  if (!specList || !curList) return null;

  const cleanL = lessonText.toLowerCase().replace(/^bài\s*\d*[\:\.\-\s]*/i, '').trim();
  const lessonNumMatch = lessonText.match(/^bài\s*(\d+)/i);
  const lessonNum = lessonNumMatch ? lessonNumMatch[1] : null;

  for (let i = 0; i < specList.length; i++) {
    const specLessons = specList[i][0].toLowerCase();
    const chName = Array.isArray(curList[i]) ? curList[i][0] : curList[i];

    // 1. Exact match by lesson number in spec (e.g. "Bài 4." or "Bài 4:" or "Bài 4\n")
    if (lessonNum) {
      const numPattern = new RegExp(`\\bbài\\s*${lessonNum}[\\:\\.\\-\\–\\—\\s]`, 'i');
      if (numPattern.test(specLessons)) {
        return chName;
      }
    }

    // 2. Title keyword substring match
    if (cleanL.length > 5) {
      const specLines = specLessons.split(/\r?\n/).map((l: string) => l.toLowerCase().replace(/^bài\s*\d*[\:\.\-\s]*/i, '').trim());
      for (const sLine of specLines) {
        if (sLine && (sLine.includes(cleanL) || cleanL.includes(sLine) || (cleanL.length > 8 && sLine.slice(0, 15) === cleanL.slice(0, 15)))) {
          return chName;
        }
      }
    }
  }
  return null;
}

function isEquipmentOrLocationOrNoise(str: string): boolean {
  if (!str) return true;
  const s = str.trim().toLowerCase();
  if (s.length < 2) return true;

  // Equipment / Teaching aids
  if (/^(?:máy\s*chiếu|tivi|ti\s*vi|bản\s*đồ|tranh\s*ảnh|sgk|sgv|sách\s*giáo\s*khoa|phiếu\s*học\s*tập|bảng\s*phụ|dụng\s*cụ|thiết\s*bị|video|mô\s*hình|vật\s*mẫu|phấn|bút|máy\s*tính|kế\s*hoạch\s*bài\s*dạy)\b/i.test(s)) {
    return true;
  }

  // Location / Classroom
  if (/^(?:phòng\s*học|lớp\s*học|phòng\s*bộ\s*môn|phòng\s*tin\s*học|phòng\s*thực\s*hành|sân\s*trường|hội\s*trường|nhà\s*đa\s*năng|thư\s*viện|thực\s*địa)\b/i.test(s)) {
    return true;
  }

  // Methodology / organization / notes
  if (/^(?:dạy\s*học|trực\s*tiếp|trực\s*tuyến|kết\s*hợp|thuyết\s*trình|thảo\s*luận|làm\s*việc\s*nhóm|dạy\s*học\s*dự\s*án|stem|steam|lồng\s*ghép|tích\s*hợp|tự\s*học|hướng\s*dẫn\s*tự\s*học|ôn\s*tập|ghi\s*chú)\b/i.test(s)) {
    return true;
  }

  // Pure time or period counts e.g. "2 tiết", "tiết 1, 2"
  if (/^(?:\d+\s*tiết|tiết\s*[\d\,\-\s]+|thời\s*lượng\s*[\:\d\s\w]+)$/i.test(s)) {
    return true;
  }

  return false;
}

export function extractCurriculumFromText(
  ppctText: string,
  yccdText: string,
  mon: string,
  kh: string,
  ki: string
): { c: string; n: string; s: [string, string, string] }[] {
  const combinedPPCT = (ppctText || '').replace(/\[Sheet:[^\]]+\]/g, '').trim();
  const combinedYCCD = (yccdText || '').replace(/\[Sheet:[^\]]+\]/g, '').trim();
  // CRITICAL: If PPCT text is available, extract lessons strictly from PPCT!
  // YCCĐ text is only used for extracting learning outcomes for the Specification Table.
  const sourceForLessons = (combinedPPCT && combinedPPCT.length > 20) ? combinedPPCT : combinedYCCD;

  if (!sourceForLessons || sourceForLessons.length < 10) {
    return [];
  }

  // 1. Strictly exclude Chuyên đề / Chuyên đề học tập / CĐ / CĐHT and known Chuyên đề module titles
  const isChuyenDe = (str: string) => isChuyenDeTitle(str);

  const isHeaderNoise = (l: string) =>
    /^(sở|trường|phòng|bộ giáo dục|kế hoạch|bảng phân phối|phân phối chương trình|năm học|môn|lớp|stt|tên bài|ghi chú|họ và tên|giáo viên|tổ chuyên môn|cộng hòa xã hội|độc lập tự do)\b/i.test(l) ||
    /^(trường thpt|thcs|gdtx)\b/i.test(l);

  const isTestMarker = (l: string) =>
    /(?:kiểm\s*tra|đánh\s*giá|kttx|ktgk|đggk|ktck|đgck)\s*(?:định\s*k[ìỳ]\s*)?(?:giữa|cuối|thường\s*xuyên)?/i.test(l);

  const rawLines = sourceForLessons
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => Boolean(l) && !isDocumentTitleOrNoise(l) && !isHeaderNoise(l));

  // Check if document has table rows (Word table or Excel sheet)
  const hasTableStructure = rawLines.some((l) => l.includes('|') || l.includes('\t'));

  interface ParsedLessonItem {
    chapter: string;
    lesson: string;
    semester: 1 | 2;
    isMidterm: boolean;
    week: number | null;
  }

  const parsedLessons: ParsedLessonItem[] = [];
  let currentChapter = '';
  let currentSemester: 1 | 2 = 1;
  let currentIsMidterm: boolean = true;
  let inChuyenDeBlock = false;
  let explicitChapterCount = 0;

  // Track table column indices if header row is detected
  let detectedLessonColIdx = -1;
  let detectedChapterColIdx = -1;
  let detectedWeekColIdx = -1;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    // Check if line enters or is in Chuyên đề section
    if (isChuyenDe(line)) {
      inChuyenDeBlock = true;
      continue;
    }

    // Check if line switches into Semester 1 or Semester 2
    const isSem1Header = /học\s*k[ìỳ]\s*(?:1|i)\b|hk\s*(?:1|i)\b|học\s*kỳ\s*(?:1|i)\b/i.test(line);
    const isSem2Header = /học\s*k[ìỳ]\s*(?:2|ii)\b|hk\s*(?:2|ii)\b|học\s*kỳ\s*(?:2|ii)\b/i.test(line);

    if (isSem2Header) {
      currentSemester = 2;
      currentIsMidterm = true;
      inChuyenDeBlock = false;
      continue;
    } else if (isSem1Header) {
      currentSemester = 1;
      currentIsMidterm = true;
      inChuyenDeBlock = false;
      continue;
    }

    if (inChuyenDeBlock) {
      const isNewMainChapter =
        /^(?:chương(?!\s*trình)|chủ\s*đề)\s*([0-9ivxabc]+)?[\:\.\-\–\—\s]/i.test(line) && !isChuyenDe(line) && !isDocumentTitleOrNoise(line);
      if (isNewMainChapter) {
        inChuyenDeBlock = false;
      } else {
        continue;
      }
    }

    // Check mid-term test marker in line (ONLY switch isMidterm if we already parsed at least 2 lessons)
    if (/(?:kiểm\s*tra|đánh\s*giá|ktgk|đggk)\s*(?:định\s*k[ìỳ]\s*)?(?:giữa\s*k[ìỳ]|giữa\s*học\s*k[ìỳ])/i.test(line)) {
      if (parsedLessons.length >= 2) {
        currentIsMidterm = false;
      }
      continue;
    }

    // Check end-of-term test marker in line
    if (/(?:kiểm\s*tra|đánh\s*giá|ktck|đgck)\s*(?:định\s*k[ìỳ]\s*)?(?:cuối\s*k[ìỳ]|cuối\s*học\s*k[ìỳ]|cuối\s*năm)/i.test(line)) {
      continue;
    }

    // Check week number in line text
    const weekMatch = line.match(/tuần\s*(\d+)/i);
    let lineWeek: number | null = null;
    if (weekMatch) {
      lineWeek = parseInt(weekMatch[1], 10);
      if (lineWeek > 18) {
        currentSemester = 2;
        currentIsMidterm = lineWeek <= 27;
      } else {
        currentSemester = 1;
        currentIsMidterm = lineWeek <= 9;
      }
    }

    // Case 1: Table row delimited by |, tab, comma (CSV), or semicolon
    const isTableRow = line.includes('|') || line.includes('\t') || (line.includes(',') && !line.startsWith('(')) || line.includes(';');
    if (isTableRow) {
      const cells = splitTableRow(line);
      if (cells.some((c) => isChuyenDe(c))) continue;

      // Skip document title rows inside table (e.g., Trường THPT | Quốc hiệu tiêu ngữ)
      if (cells.every((c) => isDocumentTitleOrNoise(c)) || (cells.length <= 2 && cells.some((c) => isDocumentTitleOrNoise(c) && !/\bbài\s*\d+/i.test(c)))) {
        continue;
      }

      // Check if this row is a table header row (e.g., STT, Tuần, Tiết, Tên bài/Nội dung...)
      const isHeaderRow =
        cells.some((c) => /^(?:stt|tt|thứ\s*tự|tuần|tiết|tiết\s*ppct|tên\s*bài|tên\s*bài\s*học|bài\s*học|bài\s*dạy|nội\s*dung|nội\s*dung\s*(?:bài|dạy)?|chủ\s*đề|chương|yêu\s*cầu\s*cần\s*đạt|yccd|thiết\s*bị|địa\s*điểm|ghi\s*chú|thời\s*lượng|số\s*tiết)\b/i.test(c.trim()));
      if (isHeaderRow) {
        const headerCells = cells.map((c) => c.toLowerCase().trim());
        const lIdx = headerCells.findIndex((c) => /^(?:tên\s*bài|tên\s*bài\s*học|bài\s*học|bài\s*dạy|nội\s*dung\s*(?:bài|dạy)?)/i.test(c));
        if (lIdx >= 0) detectedLessonColIdx = lIdx;
        const cIdx = headerCells.findIndex((c) => /^(?:chương(?!\s*trình)|chủ\s*đề|phần|mạch\s*kiến\s*thức)/i.test(c));
        if (cIdx >= 0) detectedChapterColIdx = cIdx;
        const wIdx = headerCells.findIndex((c) => /^(?:tuần|thời\s*gian)/i.test(c));
        if (wIdx >= 0) detectedWeekColIdx = wIdx;
        continue;
      }

      // Check if row is a Chapter banner or contains a Chapter cell
      const chCell = cells.find((c) => {
        if (isDocumentTitleOrNoise(c) || isChuyenDe(c)) return false;
        return (
          /^(?:\[Bảng.*?\]\s*)?(?:chương(?!\s*trình)|chủ\s*đề|phần|mạch\s*kiến\s*thức|mô\s*đun|module)\s*([0-9ivxabc]+)?(?:\b|[\:\.\-\–\—\s]|$)/i.test(c) ||
          (/^([i|v|x]+)[\.\-\–\—\s]+([^\n\r]+)/i.test(c) && !/bài/i.test(c) && c.length < 80 && !isDocumentTitleOrNoise(c))
        );
      });

      // Check if this row has an explicit lesson cell starting with "Bài"
      const hasLessonInRow = cells.some((c) => /\bbài\s*(?:\d+|[ivx]+)[\:\.\-\–\—\s]/i.test(c));

      if (chCell && !hasLessonInRow) {
        // Pure chapter header row spanning table
        const cleanCh = chCell.replace(/^\[Bảng.*?\]\s*/i, '').trim();
        if (cleanCh && !isChuyenDe(cleanCh) && !isDocumentTitleOrNoise(cleanCh)) {
          currentChapter = cleanCh;
          explicitChapterCount++;
        }
        continue;
      } else if (chCell) {
        const cleanCh = chCell.replace(/^\[Bảng.*?\]\s*/i, '').trim();
        if (cleanCh && !isChuyenDe(cleanCh) && !isDocumentTitleOrNoise(cleanCh)) {
          currentChapter = cleanCh;
          explicitChapterCount++;
        }
      } else if (detectedChapterColIdx >= 0 && cells[detectedChapterColIdx]) {
        const candCh = cells[detectedChapterColIdx].trim();
        if (candCh && candCh.length > 2 && !isDocumentTitleOrNoise(candCh) && !isHeaderNoise(candCh) && !isChuyenDe(candCh)) {
          currentChapter = candCh;
          explicitChapterCount++;
        }
      }

      // Check mid-term test marker inside cells
      if (cells.some((c) => /(?:kiểm\s*tra|đánh\s*giá|ktgk|đggk)\s*(?:định\s*k[ìỳ]\s*)?(?:giữa\s*k[ìỳ]|giữa\s*học\s*k[ìỳ])/i.test(c))) {
        if (parsedLessons.length >= 2) {
          currentIsMidterm = false;
        }
        continue;
      }
      if (cells.some((c) => /(?:kiểm\s*tra|đánh\s*giá|ktck|đgck)\s*(?:định\s*k[ìỳ]\s*)?(?:cuối\s*k[ìỳ]|cuối\s*học\s*k[ìỳ]|cuối\s*năm)/i.test(c))) {
        continue;
      }

      // Extract week number from cell if not already found
      if (lineWeek === null) {
        if (detectedWeekColIdx >= 0 && cells[detectedWeekColIdx]) {
          const wMatch = cells[detectedWeekColIdx].match(/\d+/);
          if (wMatch) {
            const candidateWeek = parseInt(wMatch[0], 10);
            if (candidateWeek >= 1 && candidateWeek <= 35) lineWeek = candidateWeek;
          }
        }
        if (lineWeek === null && cells.length >= 2) {
          const firstNum = parseInt(cells[0], 10);
          const secondNum = parseInt(cells[1], 10);
          const candidateWeek = (firstNum >= 1 && firstNum <= 35) ? firstNum : (secondNum >= 1 && secondNum <= 35 ? secondNum : null);
          if (candidateWeek !== null) lineWeek = candidateWeek;
        }
        if (lineWeek !== null) {
          if (lineWeek > 18) {
            currentSemester = 2;
            currentIsMidterm = lineWeek <= 27;
          } else {
            currentSemester = 1;
            currentIsMidterm = lineWeek <= 9;
          }
        }
      }

      // CRITICAL: LOCATE THE LESSON CELL (BÀI) IN THIS ROW!
      // The user requires: "ma trận đừng lấy tiêu đề của file mà lấy nội dung trong bảng"
      // Priority 1: Cell that starts with "Bài X" or "Bài [IVX]"
      let candidateCells: string[] = [];
      const explicitBaiCell = cells.find((c) => /^bài\s*(?:\d+|[ivx]+)[\:\.\-\–\—\s]/i.test(c.trim()) && !isDocumentTitleOrNoise(c));
      if (explicitBaiCell) {
        candidateCells = [explicitBaiCell];
      } else {
        const containsBaiCell = cells.find((c) => /\bbài\s*\d+[\:\.\-\–\—\s]/i.test(c.trim()) && !isYccdTextOrOutcome(c) && !isEquipmentOrLocationOrNoise(c) && !isDocumentTitleOrNoise(c));
        if (containsBaiCell) {
          candidateCells = [containsBaiCell];
        } else if (detectedLessonColIdx >= 0 && cells[detectedLessonColIdx]) {
          const colCell = cells[detectedLessonColIdx].trim();
          if (colCell && !isDocumentTitleOrNoise(colCell) && !isHeaderNoise(colCell) && !isChuyenDe(colCell) && !isEquipmentOrLocationOrNoise(colCell) && !isYccdTextOrOutcome(colCell)) {
            candidateCells = [colCell];
          }
        } else {
          // Fallback: Pick cells that are NOT noise, NOT equipment, NOT YCCD, NOT pure numbers/weeks
          candidateCells = cells.filter((c) => {
            if (chCell && c === chCell) return false;
            const trimmed = c.trim();
            if (!trimmed || trimmed.length < 3) return false;
            if (isHeaderNoise(trimmed) || isChuyenDe(trimmed) || isTestMarker(trimmed) || isYccdTextOrOutcome(trimmed) || isEquipmentOrLocationOrNoise(trimmed) || isDocumentTitleOrNoise(trimmed)) return false;
            if (/^\d+$/.test(trimmed) || /^(?:tuần|tiết|stt|ghi\s*chú)\s*[\d\:\.\-]*$/i.test(trimmed)) return false;
            return true;
          });
        }
      }

      for (const candidateCell of candidateCells) {
        const cleanCell = candidateCell
          .replace(/^\[Bảng.*?\]\s*/i, '')
          .replace(/^tiết\s*[\d\,\-\s]+[\:\.\-\–\—\s]*/i, '')
          .trim();

        if (!cleanCell || isDocumentTitleOrNoise(cleanCell) || isChuyenDe(cleanCell) || isTestMarker(cleanCell) || isHeaderNoise(cleanCell) || isEquipmentOrLocationOrNoise(cleanCell) || isYccdTextOrOutcome(cleanCell)) {
          continue;
        }

        // Expand inline "Bài X" markers and grouped lesson numbers onto separate lines before splitting
        const expandedCell = cleanCell
          .replace(/(?<=\S)\s+(?=(?:bài|bài\s*học)\s*(?:\d+|[ivx]+)[\:\.\-\–\—\s])/gi, '\n')
          .replace(
            /\bbài\s*((?:\d+|[ivx]+)(?:\s*[\,\-\–\—\&]\s*(?:bài\s*)?(?:\d+|[ivx]+))+)\s*[\:\.\-\–\—\s]+([^\n\r]+)/gi,
            (match, numGroup, titleStr) => {
              const numMatches = numGroup.match(/\d+|[ivx]+/gi);
              if (!numMatches || numMatches.length === 0) return match;
              return numMatches.map((n: string) => `Bài ${n}. ${titleStr}`).join('\n');
            }
          );

        // Split multiple lessons if contained in same cell
        const cellLessons = expandedCell
          .split(/\r?\n|;/)
          .map((s) => s.trim())
          .filter((s) => s.length > 2 && !isDocumentTitleOrNoise(s) && !isHeaderNoise(s) && !isChuyenDe(s) && !isTestMarker(s) && !isEquipmentOrLocationOrNoise(s) && !isYccdTextOrOutcome(s));

        for (const subL of cellLessons) {
          const pureLessonTitle = cleanLessonTitle(subL);
          if (!pureLessonTitle || pureLessonTitle.length < 2 || isDocumentTitleOrNoise(pureLessonTitle) || isEquipmentOrLocationOrNoise(pureLessonTitle) || isYccdTextOrOutcome(pureLessonTitle)) {
            continue;
          }

          let lessonChapter = currentChapter;
          // ONLY infer chapter if document provided NO chapters at all AND currentChapter is currently empty/noise
          if (explicitChapterCount === 0 && (!currentChapter || isDocumentTitleOrNoise(currentChapter))) {
            const inferred = inferChapterFromLesson(subL, mon, kh);
            if (inferred) {
              currentChapter = inferred;
              lessonChapter = inferred;
            }
          }

          if (lessonChapter && !isDocumentTitleOrNoise(lessonChapter)) {
            const baiNumMatch = subL.match(/^bài\s*(\d+|[ivx]+)/i);
            const formattedLesson = baiNumMatch ? `Bài ${baiNumMatch[1]}. ${pureLessonTitle}` : pureLessonTitle;

            parsedLessons.push({
              chapter: lessonChapter,
              lesson: formattedLesson,
              semester: currentSemester,
              isMidterm: currentIsMidterm,
              week: lineWeek,
            });
          }
        }
      }

      // Always continue after processing a table row
      continue;
    }

    // Case 2: Paragraph text lines
    const isChapterHeading =
      (!isDocumentTitleOrNoise(line) && !isChuyenDe(line)) &&
      (/^(?:\[Bảng.*?\]\s*)?(?:chương(?!\s*trình)|chủ\s*đề|phần|mạch\s*kiến\s*thức|mô\s*đun|module)\s*([0-9ivxabc]+)?(?:\b|[\:\.\-\–\—\s]|$)/i.test(line) ||
      (/^([i|v|x]+)[\.\-\–\—\s]+([^\n\r]+)/i.test(line) && line.length < 80 && !line.toLowerCase().includes('bài') && !isDocumentTitleOrNoise(line)));

    if (isChapterHeading) {
      const cleanCh = line.replace(/^\[Bảng.*?\]\s*/i, '').trim();
      if (!isChuyenDe(cleanCh) && !isDocumentTitleOrNoise(cleanCh)) {
        currentChapter = cleanCh;
        explicitChapterCount++;
      }
      continue;
    }

    const isLessonHeading =
      !isDocumentTitleOrNoise(line) &&
      (/^(?:\[Bảng.*?\]\s*)?(?:bài)\s*([0-9ivxabc]+)?[\:\.\-\–\—\s]/i.test(line) ||
      /^tiết\s*[\d\,\-\s]+[\:\.\-\–\—\s]+(?:bài\s*\d*[\:\.\-\–\—\s]*)?([^\n\r]+)/i.test(line) ||
      /^\d+[\.\)]\s*(?:bài)\s*([0-9ivxabc]+)?/i.test(line));

    if (isLessonHeading) {
      const cleanL = line
        .replace(/^\[Bảng.*?\]\s*/i, '')
        .replace(/^tiết\s*[\d\,\-\s]+[\:\.\-\–\—\s]*/i, '')
        .replace(/^\d+[\.\)]\s*/, '')
        .trim();
      if (!isDocumentTitleOrNoise(cleanL) && !isChuyenDe(cleanL) && !isTestMarker(cleanL) && !isEquipmentOrLocationOrNoise(cleanL) && !isYccdTextOrOutcome(cleanL)) {
        const subLessons = cleanL
          .split(/\r?\n|;/)
          .map((s) => s.trim())
          .filter((s) => s.length > 2 && !isDocumentTitleOrNoise(s) && !isChuyenDe(s) && !isTestMarker(s) && !isEquipmentOrLocationOrNoise(s) && !isYccdTextOrOutcome(s));
        subLessons.forEach((subL) => {
          let lessonChapter = currentChapter;
          if (explicitChapterCount === 0 && (!currentChapter || isDocumentTitleOrNoise(currentChapter))) {
            const inferred = inferChapterFromLesson(subL, mon, kh);
            if (inferred) {
              currentChapter = inferred;
              lessonChapter = inferred;
            }
          }
          if (lessonChapter && !isDocumentTitleOrNoise(lessonChapter) && subL && !isDocumentTitleOrNoise(subL)) {
            parsedLessons.push({
              chapter: lessonChapter,
              lesson: subL,
              semester: currentSemester,
              isMidterm: currentIsMidterm,
              week: lineWeek,
            });
          }
        });
      }
      continue;
    }

    // Fallback: strictly ONLY if the document has NO table structure!
    // When a document has a table, all lessons MUST come from the table rows!
    if (!hasTableStructure && line.length > 3 && !line.startsWith('[') && !line.includes('---') && !isChuyenDe(line) && !isTestMarker(line) && !isEquipmentOrLocationOrNoise(line) && !isYccdTextOrOutcome(line) && !isDocumentTitleOrNoise(line)) {
      const cleanL = line.replace(/^[+\*\-•\–\—]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();
      if (cleanL.length > 3 && !isHeaderNoise(cleanL) && !isDocumentTitleOrNoise(cleanL) && !isEquipmentOrLocationOrNoise(cleanL) && !isYccdTextOrOutcome(cleanL)) {
        let lessonChapter = currentChapter;
        if (!currentChapter || explicitChapterCount === 0 || isDocumentTitleOrNoise(currentChapter)) {
          const inferred = inferChapterFromLesson(cleanL, mon, kh);
          if (inferred) {
            currentChapter = inferred;
            lessonChapter = inferred;
          }
        }
        if (lessonChapter && !isDocumentTitleOrNoise(lessonChapter) && cleanL && !isDocumentTitleOrNoise(cleanL)) {
          parsedLessons.push({
            chapter: lessonChapter,
            lesson: cleanL,
            semester: currentSemester,
            isMidterm: currentIsMidterm,
            week: lineWeek,
          });
        }
      }
    }
  }

  // Deduplicate identical lessons in same chapter
  const uniqueLessons: ParsedLessonItem[] = [];
  const seenLessons = new Set<string>();
  parsedLessons.forEach((item) => {
    const key = `${item.chapter}:::${item.lesson}`.toLowerCase();
    if (!seenLessons.has(key)) {
      seenLessons.add(key);
      uniqueLessons.push(item);
    }
  });

  // Filter out any remaining Chuyên đề
  const nonChuyenDeLessons = uniqueLessons.filter((item) => !isChuyenDe(item.chapter) && !isChuyenDe(item.lesson));

  if (nonChuyenDeLessons.length === 0) {
    return [];
  }

  // Target semester & midterm requirement
  const targetSem: 1 | 2 = ki.includes('II') ? 2 : 1;
  const isMidtermReq = ki.startsWith('Giữa');

  // Check if file explicitly contains Semester 2 / HK2 markers or week numbers > 18
  const fileHasSem2Explicit =
    /học\s*k[ìỳ]\s*(?:2|ii)\b|hk\s*(?:2|ii)\b|học\s*kỳ\s*(?:2|ii)\b/i.test(sourceForLessons) ||
    nonChuyenDeLessons.some((item) => item.semester === 2 || (item.week !== null && item.week > 18));

  let filteredLessons: ParsedLessonItem[] = [];

  if (fileHasSem2Explicit) {
    // File clearly contains Semester 2 or full year
    const sem1 = nonChuyenDeLessons.filter((item) => item.semester === 1);
    const sem2 = nonChuyenDeLessons.filter((item) => item.semester === 2 || (item.week !== null && item.week > 18));
    const targetPool = targetSem === 1 ? (sem1.length > 0 ? sem1 : nonChuyenDeLessons) : (sem2.length > 0 ? sem2 : nonChuyenDeLessons);

    if (isMidtermReq) {
      const mid = targetPool.filter((item) => item.isMidterm || (item.week !== null && (targetSem === 1 ? item.week <= 9 : item.week <= 27)));
      if (mid.length > 0) {
        filteredLessons = mid;
      } else {
        const uniqueChapters = Array.from(new Set(targetPool.map((l) => getChapterKey(l.chapter) || l.chapter)));
        if (uniqueChapters.length >= 5 && targetPool.length >= 10) {
          const targetChapCount = getMidtermSliceCount(mon, kh, ki, uniqueChapters.length);
          const allowedChapters = new Set(uniqueChapters.slice(0, targetChapCount));
          filteredLessons = targetPool.filter((l) => allowedChapters.has(getChapterKey(l.chapter) || l.chapter));
        } else {
          filteredLessons = targetPool;
        }
      }
    } else {
      filteredLessons = targetPool;
    }
  } else {
    // File does NOT explicitly mention Semester 2.
    // Check if file has explicit week numbers extending past week 12
    const maxWeek = Math.max(0, ...nonChuyenDeLessons.map((l) => l.week || 0));
    const hasExplicitTestMarker = nonChuyenDeLessons.some((l) => !l.isMidterm);

    if (isMidtermReq) {
      if (maxWeek > 12) {
        // Full semester file with week numbers -> filter up to week 9
        const mid = nonChuyenDeLessons.filter((item) => (item.week !== null && item.week <= 9) || item.isMidterm);
        filteredLessons = mid.length > 0 ? mid : nonChuyenDeLessons;
      } else if (hasExplicitTestMarker) {
        // File has a midterm test row dividing the lessons
        const mid = nonChuyenDeLessons.filter((item) => item.isMidterm);
        filteredLessons = mid.length > 0 ? mid : nonChuyenDeLessons;
      } else {
        // File has no week numbers and no test marker.
        // Check if file contains full-semester lessons (5+ chapters or 10+ lessons)
        const uniqueChapters = Array.from(new Set(nonChuyenDeLessons.map((l) => getChapterKey(l.chapter) || l.chapter)));
        if (uniqueChapters.length >= 5 && nonChuyenDeLessons.length >= 10) {
          const targetChapCount = getMidtermSliceCount(mon, kh, ki, uniqueChapters.length);
          const allowedChapters = new Set(uniqueChapters.slice(0, targetChapCount));
          filteredLessons = nonChuyenDeLessons.filter((l) => allowedChapters.has(getChapterKey(l.chapter) || l.chapter));
        } else {
          // The teacher uploaded their focused syllabus for this exam -> TAKE 100% OF LESSONS!
          filteredLessons = nonChuyenDeLessons;
        }
      }
    } else {
      // Cuối học kì: TAKE 100% OF LESSONS IN THE FILE!
      filteredLessons = nonChuyenDeLessons;
    }
  }

  if (filteredLessons.length === 0) {
    return [];
  }

  // GROUP ALL LESSONS IN THE SAME CHAPTER INTO 1 ROW (1 HÀNG DUY NHẤT)
  const chapterMap = new Map<string, { displayTitle: string; lessons: string[] }>();
  filteredLessons.forEach((item) => {
    const rawCh = item.chapter.trim();
    if (!rawCh || isChuyenDe(rawCh)) return;
    const cleanTitle = sanitizeChapterTitle(rawCh);
    const key = getChapterKey(cleanTitle) || getChapterKey(rawCh);
    if (!key) return;

    if (!chapterMap.has(key)) {
      chapterMap.set(key, { displayTitle: cleanTitle, lessons: [] });
    }
    const entry = chapterMap.get(key)!;
    if (cleanTitle.length > entry.displayTitle.length) {
      entry.displayTitle = cleanTitle;
    }

    const subLessons = item.lesson.split(/\r?\n|;/).map((l) => l.trim()).filter(Boolean);
    subLessons.forEach((subL) => {
      if (!isChuyenDe(subL) && !isTestMarker(subL) && !isEquipmentOrLocationOrNoise(subL) && !entry.lessons.some((l) => l.toLowerCase() === subL.toLowerCase())) {
        entry.lessons.push(subL);
      }
    });
  });

  if (chapterMap.size === 0) {
    return [];
  }

  const uploadedFullText = `${combinedYCCD}\n${combinedPPCT}`;

  const rows = Array.from(chapterMap.values()).map(({ displayTitle: chapterName, lessons: lessonsList }) => {
    const validLessons = lessonsList.filter((l) => !isChuyenDe(l) && !isYccdTextOrOutcome(l));
    const lessonText = validLessons.length > 0 ? validLessons.join('\n') : (lessonsList.length > 0 ? lessonsList.join('\n') : chapterName);

    const matchedYccd = findMatchingUploadedYccd(chapterName, lessonText, uploadedFullText);
    const fallbackSpec = findMatchingSpec(mon, kh, chapterName, lessonText);

    const defaultBiet = (fallbackSpec && fallbackSpec[0]) || `Nhận biết kiến thức cốt lõi của ${chapterName}`;
    const defaultHieu = (fallbackSpec && fallbackSpec[1]) || `Hiểu và giải thích các nội dung trong ${chapterName}`;
    const defaultVanDung = (fallbackSpec && fallbackSpec[2]) || `Vận dụng kiến thức ${chapterName} giải quyết bài tập, tình huống thực tế`;

    const s0 = (matchedYccd && matchedYccd[0] && !isPlaceholderOrInvalidYccd(matchedYccd[0], lessonText))
      ? matchedYccd[0]
      : defaultBiet;
    const s1 = (matchedYccd && matchedYccd[1] && !isPlaceholderOrInvalidYccd(matchedYccd[1], lessonText))
      ? matchedYccd[1]
      : defaultHieu;
    const s2 = (matchedYccd && matchedYccd[2] && !isPlaceholderOrInvalidYccd(matchedYccd[2], lessonText))
      ? matchedYccd[2]
      : defaultVanDung;

    return {
      c: chapterName,
      n: lessonText,
      s: [s0, s1, s2] as [string, string, string],
    };
  });

  return consolidateRowsByChapter(rows);
}

export function parseTextToRows(
  ppctText: string,
  yccdText: string,
  mon: string,
  ki: string,
  kh: string = '10'
): { c: string; n: string; s: [string, string, string] }[] {
  return extractCurriculumFromText(ppctText, yccdText, mon, kh, ki);
}

function applyUserPromptLocally(currentRows: MatrixRow[], userPrompt: string): MatrixRow[] {
  if (!userPrompt) return consolidateRowsByChapter(currentRows);

  let updated = JSON.parse(JSON.stringify(currentRows)) as MatrixRow[];

  // 1. Remove specific lesson or chapter if requested
  const removeMatches = userPrompt.match(/(?:bỏ|xóa|loại bỏ)\s+(?:bài|nội dung|chủ đề|chương|phần)?\s*([0-9a-zà-ỹ\s,]+)/gi);
  if (removeMatches) {
    removeMatches.forEach((m) => {
      const target = m.replace(/(?:bỏ|xóa|loại bỏ)\s+(?:bài|nội dung|chủ đề|chương|phần)?\s*/i, '').trim().toLowerCase();
      if (!target) return;

      const isExplicitChapterRemove = /(?:xóa|bỏ|loại bỏ)\s+(?:toàn bộ\s+)?(?:chương|chủ đề)\b/i.test(m);

      if (isExplicitChapterRemove) {
        const filtered = updated.filter((r) => !r.c.toLowerCase().includes(target));
        if (filtered.length > 0) updated = filtered;
      } else {
        // Remove only the matching lesson line inside the chapter row, preserving 1 chapter = 1 row
        updated.forEach((r) => {
          const lines = r.n.split('\n');
          const remainingLines = lines.filter((l) => !l.toLowerCase().includes(target));
          if (remainingLines.length > 0) {
            r.n = remainingLines.join('\n');
          }
        });
      }
    });
  }

  // 2. Add or insert lesson into a chapter if requested
  const addMatches = userPrompt.match(/(?:thêm|bổ sung|nhập)\s+(?:bài|nội dung)?\s*([^\n\r]+?)\s*(?:vào|trong)\s*(?:chương|chủ đề)?\s*([0-9a-zà-ỹ\s]+)/gi);
  if (addMatches) {
    addMatches.forEach((m) => {
      const parts = m.match(/(?:thêm|bổ sung|nhập)\s+(?:bài|nội dung)?\s*(.+?)\s+(?:vào|trong)\s+(?:chương|chủ đề)?\s*(.+)/i);
      if (parts && parts[1] && parts[2]) {
        const lessonToAdd = parts[1].trim();
        const targetChapter = parts[2].trim().toLowerCase();

        updated.forEach((r) => {
          if (r.c.toLowerCase().includes(targetChapter)) {
            const existingLines = r.n.split('\n').map((l) => l.trim());
            if (!existingLines.some((l) => l.toLowerCase().includes(lessonToAdd.toLowerCase()))) {
              r.n = r.n ? `${r.n}\n${lessonToAdd}` : lessonToAdd;
            }
          }
        });
      }
    });
  }

  return consolidateRowsByChapter(updated);
}

export async function reconcileCurriculum(
  mon: string,
  kh: string,
  ki: string,
  currentRows: MatrixRow[],
  ppctText: string,
  yccdText: string,
  ppctBase64?: string,
  ppctMimeType?: string
): Promise<{ rows: { c: string; n: string; s: [string, string, string] }[]; notes: string }> {
  try {
    const prompt = `Bạn là hệ thống trích xuất và đối chiếu chương trình giáo dục phổ thông 2018 chính xác 100%. Môn ${mon}, lớp ${kh}, kì ${ki}.
Nhiệm vụ: ĐỐI CHIẾU TỆP VÀ TRÍCH XUẤT ĐÚNG 100% NỘI DUNG TỪ TỆP CỦA NGƯỜI DÙNG TẢI LÊN CHO KÌ "${ki}".

CÁC NGUYÊN TẮC BẮT BUỘC:
1. TUYỆT ĐỐI CHỈ LẤY TÊN BÀI VÀ TÊN CHƯƠNG TỪ TỆP TẢI LÊN (KHÔNG TỰ Ý BỊA TRÔN SÁCH KHÁC):
   - Tuyệt đối không lấy các tiêu đề văn bản, tên tệp, tên trường, quốc hiệu, tiêu đề bên ngoài bảng (như: "Kế hoạch dạy học môn...", "Phân phối chương trình...", "Kế hoạch giáo dục của tổ chuyên môn", "Khung kế hoạch dạy học", "Trường THPT...", "Năm học...", "Phụ lục...", "I. Kế hoạch dạy học"...) để đưa vào làm tên chương hoặc tên bài!
   - BẮT BUỘC CHỈ LẤY NỘI DUNG NẰM TRONG BẢNG PHÂN PHỐI CHƯƠNG TRÌNH TRONG TỆP ĐƯỢC TẢI LÊN:
     + Cột "c" (Chương/Chủ đề): Tìm đúng tên Chương/Chủ đề NẰM TRONG BẢNG TỆP TẢI LÊN.
     + Cột "n" (Nội dung/Đơn vị kiến thức): TÌM CHÍNH XÁC ĐẾN TỪNG BÀI NẰM TRONG BẢNG TỆP TẢI LÊN. LẤY ĐÚNG 100% TÊN BÀI TỪ TỆP TẢI LÊN (phân tách các bài trong cùng 1 chương bằng xuống dòng \\n).
   - Bỏ qua hoàn toàn dòng tiêu đề cột của bảng (như STT, Tuần, Tiết, Tên bài, Số tiết, YCCĐ...)!
   - TUYỆT ĐỐI KHÔNG LẤY CÁC CỘT KHÁC CỦA BẢNG NHƯ: Thiết bị dạy học, Địa điểm, Tiết học ((2 tiết), Tiết 1, 2...), Ghi chú!
   - TUYỆT ĐỐI KHÔNG ĐƯA YÊU CẦU CẦN ĐẠT (YCCĐ) VÀO CỘT "n". Ma trận không bao gồm YCCĐ!
   - Gom tất cả bài học trong cùng một chương vào chung 1 ô "n" (phân tách bằng xuống dòng \\n, mỗi bài 1 dòng: Bài 1. [Tên bài 1 từ tệp]\\nBài 2. [Tên bài 2 từ tệp]).
2. CHỈ CÓ BẢN ĐẶC TẢ MỚI LẤY YCCĐ (ĐIỀN VÀO CỘT "s"):
   - Mảng 3 chuỗi "s": ["Mức độ Nhận biết...", "Mức độ Thông hiểu...", "Mức độ Vận dụng..."] trích xuất từ tệp YCCĐ tương ứng với các bài học trong chương đó.
3. TUYỆT ĐỐI KHÔNG LẤY CHUYÊN ĐỀ HỌC TẬP:
   - Bỏ hoàn toàn tất cả các bài thuộc "Chuyên đề", "Chuyên đề học tập", "Chuyên đề 1", "Chuyên đề 2", "Chuyên đề 3", "CĐ 1", "CĐ 2", "CĐ 3". Chỉ lấy nội dung môn học cốt lõi dùng cho kiểm tra định kì.
4. GIỚI HẠN CHÍNH XÁC THEO KÌ KIỂM TRA ("${ki}"):
   - "Giữa Học kì I": CHỈ trích xuất các bài thuộc nửa đầu Học kì 1 (tuần 1 đến tuần 9).
   - "Cuối Học kì I": Trích xuất toàn bộ các bài trong Học kì 1 (tuần 1 đến tuần 18).
   - "Giữa Học kì II": CHỈ trích xuất các bài thuộc nửa đầu Học kì 2 (tuần 19 đến tuần 27).
   - "Cuối Học kì II": Trích xuất toàn bộ các bài trong Học kì 2 (tuần 19 đến tuần 35).
5. CÁC BÀI CÙNG CHƯƠNG BẮT BUỘC NẰM CHUNG TRONG 1 HÀNG DUY NHẤT:
   - Cột "c" (Chủ đề/Chương): CHỈ ghi Chương mấy kèm tên chương từ tệp tải lên. Tuyệt đối không đưa tên bài hay nội dung khác vào cột này!

Trả về đúng cấu trúc JSON với TẤT CẢ tên bài trích xuất 100% từ TỆP TẢI LÊN:
{
  "rows": [
    {
      "c": "Chương 1. [Tên Chương 1 từ tệp tải lên]",
      "n": "Bài 1. [Tên Bài 1 chính xác từ tệp tải lên]\\nBài 2. [Tên Bài 2 chính xác từ tệp tải lên]",
      "s": ["Mức độ Nhận biết từ YCCĐ", "Mức độ Thông hiểu từ YCCĐ", "Mức độ Vận dụng từ YCCĐ"]
    },
    {
      "c": "Chương 2. [Tên Chương 2 từ tệp tải lên]",
      "n": "Bài 3. [Tên Bài 3 chính xác từ tệp tải lên]\\nBài 4. [Tên Bài 4 chính xác từ tệp tải lên]",
      "s": ["Mức độ Nhận biết từ YCCĐ", "Mức độ Thông hiểu từ YCCĐ", "Mức độ Vận dụng từ YCCĐ"]
    }
  ],
  "notes": "Đã trích xuất đầy đủ 100% nội dung bài học từ tệp tải lên cho kì ${ki}."
}

=== TỆP PPCT ===
${ppctText || '(Không có)'}

=== TỆP YCCĐ ===
${yccdText || '(Không có)'}`;

    const sysInstruction = `Bạn là hệ thống trích xuất dữ liệu GDPT 2018 chuyên sâu. Nhiệm vụ tối cao: Trích xuất chính xác theo đúng giới hạn học kì được yêu cầu, TUYỆT ĐỐI KHÔNG lấy chuyên đề học tập, và gom tất cả bài cùng chương vào 1 hàng duy nhất.`;
    
    // Step 1: Pre-compute deterministic local extraction for instant accuracy & strict boundary checks
    const smartRows = extractCurriculumFromText(ppctText, yccdText, mon, kh, ki);

    const jsonStr = await callGemini(prompt, sysInstruction, 'application/json', false, ppctBase64, ppctMimeType);
    if (jsonStr) {
      const parsed = safeJsonParse(jsonStr, {});
      if (parsed && parsed.rows && parsed.rows.length > 0) {
        // Filter out any chuyên đề rows that might have leaked
        let geminiRows = parsed.rows.filter((r: any) => !isChuyenDeTitle(r.c) && !isChuyenDeTitle(r.n));

        // Enforce 1 chapter = 1 row
        geminiRows = consolidateRowsByChapter(geminiRows);

        // Filter out wrong semester leakage
        const targetSem = ki.includes('II') ? 2 : 1;
        const isMidtermReq = ki.startsWith('Giữa');

        geminiRows = geminiRows.filter((r: any) => {
          const cLower = (r.c || '').toLowerCase();
          if (targetSem === 1 && (cLower.includes('học kì 2') || cLower.includes('học kì ii') || cLower.includes('hk2') || cLower.includes('hk ii'))) {
            return false;
          }
          if (targetSem === 2 && (cLower.includes('học kì 1') || cLower.includes('học kì i') || cLower.includes('hk1') || cLower.includes('hk i'))) {
            return false;
          }
          return true;
        });

        if (smartRows.length > 0) {
          // smartRows contains the EXACT chapters and lessons from the uploaded file!
          // We iterate over smartRows to guarantee that 100% of the matrix content (c and n)
          // comes strictly from the uploaded file without any AI modifications or foreign lessons!
          const mergedRows: { c: string; n: string; s: [string, string, string] }[] = [];

          smartRows.forEach((sr) => {
            const key = getChapterKey(sr.c) || sr.c.toLowerCase();
            // Find if Gemini provided high-quality YCCĐ (s) for this chapter
            const gr = geminiRows.find((g: any) => {
              const gKey = getChapterKey(g.c) || (g.c ? g.c.toLowerCase() : '');
              return gKey === key || (g.c && sr.c && (g.c.includes(sr.c) || sr.c.includes(g.c)));
            });

            const sTuple: [string, string, string] = [
              (gr && gr.s && gr.s[0] && !isPlaceholderOrInvalidYccd(gr.s[0])) ? gr.s[0] : sr.s[0],
              (gr && gr.s && gr.s[1] && !isPlaceholderOrInvalidYccd(gr.s[1])) ? gr.s[1] : sr.s[1],
              (gr && gr.s && gr.s[2] && !isPlaceholderOrInvalidYccd(gr.s[2])) ? gr.s[2] : sr.s[2],
            ];

            mergedRows.push({
              c: sr.c, // 100% from uploaded file!
              n: sr.n, // 100% from uploaded file!
              s: sTuple,
            });
          });

          geminiRows = consolidateRowsByChapter(mergedRows);
        }

        if (geminiRows.length > 0) {
          return {
            rows: geminiRows,
            notes: `Đã trích xuất và đối chiếu đầy đủ 100% nội dung cho ${ki} (mỗi chương 1 hàng, không bỏ sót bài).`,
          };
        }
      }
    }

    if (smartRows.length > 0) {
      return {
        rows: consolidateRowsByChapter(smartRows),
        notes: `Đã trích xuất và cập nhật ma trận chính xác từ tệp PPCT/YCCĐ cho kì ${ki} (các bài cùng chương nằm chung 1 hàng, không lấy chuyên đề).`
      };
    }

    // Fallback to standard curriculum for mon/grade/semester if no rows yet
    const fallbackRows = generateDefaultRowsForReconcile(mon, kh, ki);
    if (fallbackRows.length > 0) {
      return {
        rows: consolidateRowsByChapter(fallbackRows),
        notes: `Hiển thị danh mục tiêu chuẩn cho ${mon} lớp ${kh} (${ki}).`
      };
    }

    return {
      rows: consolidateRowsByChapter(currentRows.map((r) => ({ c: r.c, n: r.n, s: (r.s || ['', '', '']) as [string, string, string] }))),
      notes: 'Giữ nguyên ma trận chuẩn GDPT 2018.',
    };
  } catch {
    const smartRows = extractCurriculumFromText(ppctText, yccdText, mon, kh, ki);
    if (smartRows.length > 0) {
      return {
        rows: consolidateRowsByChapter(smartRows),
        notes: `Đã trích xuất và cập nhật ma trận chính xác từ tệp PPCT/YCCĐ cho kì ${ki}.`
      };
    }
    return {
      rows: consolidateRowsByChapter(currentRows.map((r) => ({ c: r.c, n: r.n, s: (r.s || ['', '', '']) as [string, string, string] }))),
      notes: 'Giữ nguyên ma trận hiện tại.',
    };
  }
}

export async function adjustMatrixWithAI(
  mon: string,
  kh: string,
  ki: string,
  currentRows: MatrixRow[],
  points: QuestionPointConfig,
  userPrompt: string,
  fileText: string,
  fileBase64?: string,
  fileMimeType?: string
): Promise<{
  rows: { c: string; n: string; v: number[]; ds?: number[][]; s?: [string, string, string] }[];
  pts?: Partial<QuestionPointConfig>;
  requests?: { t: string; done: boolean; why?: string }[];
  notes?: string;
}> {
  try {
    const cur = currentRows.map((r, i) => ({
      stt: i + 1,
      c: r.c,
      n: r.n,
      v: r.v,
      y: r.y,
      s: r.s,
    }));

    const prompt = `Bạn là chuyên gia kiểm tra đánh giá cấp THPT, Chương trình giáo dục phổ thông 2018. Môn ${mon}, lớp ${kh}, ${ki}.
Mục tiêu: ĐỐI CHIẾU TỆP VÀ CẬP NHẬT CHÍNH XÁC NỘI DUNG BẢNG MA TRẬN & BẢN ĐẶC TẢ.

YÊU CẦU VÀ TÀI LIỆU CỦA GIÁO VIÊN:
- Yêu cầu gõ trực tiếp: ${userPrompt || '(Không có)'}
- Tệp PPCT / YCCĐ do giáo viên tải lên:
${fileText ? fileText : '(Không có tệp tải lên)'}

QUY TRÌNH BẮT BUỘC KHI CÓ TỆP TẢI LÊN (THAY THẾ TOÀN BỘ CÁC DÒNG):
0. TUYỆT ĐỐI KHÔNG LẤY TIÊU ĐỀ CỦA FILE (BẮT BUỘC CHỈ LẤY NỘI DUNG TRONG BẢNG):
   - Tuyệt đối không lấy tiêu đề văn bản, tên tệp, tên trường, quốc hiệu, tiêu đề bên ngoài bảng (như: "Kế hoạch dạy học môn...", "Phân phối chương trình...", "Kế hoạch giáo dục của tổ chuyên môn", "Khung kế hoạch dạy học", "Trường THPT...", "Năm học...", "Phụ lục...", "I. Kế hoạch dạy học"...) để đưa vào làm tên chương hoặc tên bài!
   - BẮT BUỘC CHỈ LẤY NỘI DUNG NẰM TRONG BẢNG PHÂN PHỐI CHƯƠNG TRÌNH TRONG TỆP ĐƯỢC TẢI LÊN:
     + Cột "c": Tên Chương/Chủ đề NẰM TRONG BẢNG TỆP TẢI LÊN.
     + Cột "n": Tên các Bài học NẰM TRONG BẢNG TỆP TẢI LÊN (Ví dụ: "Bài 1. [Tên bài 1 từ tệp]\\nBài 2. [Tên bài 2 từ tệp]").
   - Bỏ qua hoàn toàn các dòng tiêu đề cột của bảng (STT, Tuần, Tiết, Tên bài, Số tiết, YCCĐ...)!
1. BƯỚC 1 - TÌM ĐÚNG TÊN VÀ NỘI DUNG CHƯƠNG/CHỦ ĐỀ ĐIỀN VÀO CỘT "c":
   - Trích xuất chính xác tên Chương/Chủ đề từ bảng tệp tải lên.
   - Mỗi Chương/Chủ đề BẮT BUỘC là 1 dòng duy nhất trong ma trận.
2. BƯỚC 2 - TÌM CHÍNH XÁC ĐẾN TỪNG BÀI ĐỂ ĐIỀN VÀO CỘT "n" (MA TRẬN TUYỆT ĐỐI KHÔNG BAO GỒM YCCĐ):
   - NỘI DUNG MA TRẬN TUYỆT ĐỐI KHÔNG BAO GỒM YCCĐ!
   - CHỈ tìm đến cột bài học hoặc tên bài trong bảng tệp tải lên, trích xuất "Bài mấy kèm tên bài" theo PPCT trong tệp.
   - TUYỆT ĐỐI KHÔNG LẤY CÁC CỘT KHÁC CỦA BẢNG NHƯ: Thiết bị dạy học, Địa điểm phòng học, Ghi chú, Số tiết...
   - TUYỆT ĐỐI KHÔNG đưa YCCĐ vào cột "n".
   - KHÔNG GHI tiết học, số tiết (như '(2 tiết)', 'Tiết 1..'), KHÔNG GHI mục con (a, b, c, 1.1...), KHÔNG GHI bất kỳ nội dung/ghi chú nào khác.
   - Số thứ tự các bài học phải liên tục tuân thủ theo PPCT (Bài 1, Bài 2, Bài 3, ... Bài n).
   - Gom TẤT CẢ các bài học thuộc 1 chương vào CHUNG MỘT Ô "n" (phân tách bởi xuống dòng \n).
3. BƯỚC 3 - CỘT "s" (YÊU CẦU CẦN ĐẠT - CHỈ DÀNH CHO BẢN ĐẶC TẢ):
   - CHỈ CÓ BẢN ĐẶC TẢ MỚI LẤY YCCĐ.
   - Đối chiếu với tệp YCCĐ để điền đúng mảng "s": ["Nhận biết...", "Thông hiểu...", "Vận dụng..."] cho từng chương.
4. GIỚI HẠN CHÍNH XÁC THEO HỌC KÌ ("${ki}"):
   - "Giữa Học kì I": CHỈ trích xuất các bài thuộc nửa đầu Học kì 1 (tuần 1 đến tuần 9). Tuyệt đối không lấy bài của nửa sau HK1 và không lấy HK2.
   - "Cuối Học kì I": Trích xuất toàn bộ các bài trong Học kì 1 (tuần 1 đến tuần 18). Tuyệt đối không lấy bài của Học kì 2.
   - "Giữa Học kì II": CHỈ trích xuất các bài thuộc nửa đầu Học kì 2 (tuần 19 đến tuần 27). Tuyệt đối không lấy bài của Học kì 1 và không lấy nửa sau HK2.
   - "Cuối Học kì II": Trích xuất toàn bộ các bài trong Học kì 2 (tuần 19 đến tuần 35). Tuyệt đối không lấy bài của Học kì 1.
5. TUYỆT ĐỐI BỎ TẤT CẢ CHUYÊN ĐỀ HỌC TẬP:
   - Không lấy bất kì bài hay chuyên đề nào (Chuyên đề 1, 2, 3, CĐ 1, CĐ 2...). Chỉ lấy nội dung môn học cốt lõi dùng cho kiểm tra định kì.
6. PHẠM VI GIỮA KÌ HOẶC CUỐI KÌ PHẢI GỒM ĐẦY ĐỦ CÁC CHƯƠNG (KHÔNG ĐƯỢC CHỈ CÓ 1 DÒNG):
   - Đề kiểm tra Giữa kì môn Địa lí (và các môn khác) bao gồm toàn bộ các bài từ tuần 1 đến tuần 9, trải dài trên 3 đến 4 chương (Ví dụ: Chương 1, Chương 2, Chương 3, Chương 4).
   - TUYỆT ĐỐI KHÔNG ĐƯỢC chỉ trả về 1 chương! Mỗi chương phải là 1 dòng riêng trong danh sách "rows".

Chỉ trả về JSON định dạng:
{
  "rows": [
    {
      "c": "Chương 1. Tên chương 1",
      "n": "Bài 1. Tên bài 1\\nBài 2. Tên bài 2",
      "v": [12 số nguyên],
      "ds": [[2, 1, 1]],
      "s": ["Biết", "Hiểu", "Vận dụng"]
    },
    {
      "c": "Chương 2. Tên chương 2",
      "n": "Bài 3. Tên bài 3\\nBài 4. Tên bài 4",
      "v": [12 số nguyên],
      "ds": [[2, 1, 1]],
      "s": ["Biết", "Hiểu", "Vận dụng"]
    },
    {
      "c": "Chương 3. Tên chương 3",
      "n": "Bài 5. Tên bài 5\\nBài 6. Tên bài 6",
      "v": [12 số nguyên],
      "ds": [[2, 1, 1]],
      "s": ["Biết", "Hiểu", "Vận dụng"]
    }
  ],
  "pts": { "tn": 0.25, "ds": 1, "tln": 0.5, "tl": 1 },
  "requests": [
    { "t": "yêu cầu ngắn gọn", "done": true, "why": "" }
  ],
  "notes": "Đã đối chiếu đầy đủ các chương/chủ đề trong kì ${ki}."
}`;

    const sysInstruction = `Bạn là chuyên gia trích xuất và điều chỉnh ma trận, bản đặc tả kiểm tra định kì GDPT 2018. Nhiệm vụ: Đọc kĩ tệp tài liệu giáo viên cung cấp, trích xuất chính xác danh mục bài học và yêu cầu cần đạt vào bảng ma trận và bản đặc tả.`;
    const jsonStr = await callGemini(prompt, sysInstruction, 'application/json', false, fileBase64, fileMimeType);
    if (jsonStr) {
      const parsed = safeJsonParse(jsonStr, null);
      if (parsed && parsed.rows && parsed.rows.length > 0) {
        parsed.rows = parsed.rows.filter((r: any) => {
          const text = `${r.c || ''} ${r.n || ''}`.toLowerCase();
          return !text.includes('chuyên đề') && !text.includes('cụm chuyên đề') && !/^(?:cđ|cd)\s*\d+/i.test((r.c || '').trim());
        });
        parsed.rows = consolidateRowsByChapter(parsed.rows);
        if (parsed.rows.length > 0) {
          return parsed;
        }
      }
    }

    if (fileText) {
      const fileRows = parseTextToRows(fileText, '', mon, ki);
      if (fileRows.length > 0) {
        return {
          rows: consolidateRowsByChapter(fileRows.map((r) => ({
            c: r.c,
            n: r.n,
            v: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ds: [[2, 1, 1]],
            s: r.s
          }))),
          notes: `Đã cập nhật ma trận chính xác theo tệp tải lên và yêu cầu: "${userPrompt || 'điều chỉnh'}"`
        };
      }
    }

    const adjustedRows = applyUserPromptLocally(currentRows, userPrompt);
    return {
      rows: consolidateRowsByChapter(adjustedRows.map((r) => ({ c: r.c, n: r.n, v: r.v, ds: dsOf(r), s: r.s }))),
      notes: userPrompt ? `Đã thực hiện yêu cầu: "${userPrompt}" và bảo toàn cấu trúc ma trận.` : 'Đã bảo toàn cấu trúc ma trận chuẩn 10 điểm.',
    };
  } catch {
    if (fileText) {
      const fileRows = parseTextToRows(fileText, '', mon, ki);
      if (fileRows.length > 0) {
        return {
          rows: consolidateRowsByChapter(fileRows.map((r) => ({
            c: r.c,
            n: r.n,
            v: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ds: [[2, 1, 1]],
            s: r.s
          }))),
          notes: `Đã cập nhật ma trận theo tệp tải lên và yêu cầu: "${userPrompt || 'điều chỉnh'}"`
        };
      }
    }
    const adjustedRows = applyUserPromptLocally(currentRows, userPrompt);
    return {
      rows: consolidateRowsByChapter(adjustedRows.map((r) => ({ c: r.c, n: r.n, v: r.v, ds: dsOf(r), s: r.s }))),
      notes: userPrompt ? `Đã thực hiện yêu cầu: "${userPrompt}" và bảo toàn cấu trúc ma trận.` : 'Đã bảo toàn cấu trúc ma trận chuẩn 10 điểm.',
    };
  }
}

// Generate realistic subject-specific excerpt and items for Part II (True/False) per Ministry guidelines
function buildPartIIStimulus(
  mon: string,
  kh: string,
  row: MatrixRow,
  idx: number,
  subItemLevels: string[],
  referenceTexts: { name: string; text: string }[] = [],
  kind?: 'text' | 'data'
): { stem: string; text?: string; srcs?: any[]; src?: string; items: { t: string; a: boolean; m: 'B' | 'H' | 'V' }[] } {
  const l0 = (subItemLevels[0] || 'B') as 'B' | 'H' | 'V';
  const l1 = (subItemLevels[1] || 'B') as 'B' | 'H' | 'V';
  const l2 = (subItemLevels[2] || 'H') as 'B' | 'H' | 'V';
  const l3 = (subItemLevels[3] || 'V') as 'B' | 'H' | 'V';

  if (kind === 'data') {
    return {
      stem: `Dựa vào bảng số liệu và thông tin về ${row.n}:`,
      srcs: [
        {
          k: 'table',
          table: {
            title: `Bảng số liệu thống kê về ${row.n} (${row.c})`,
            head: ['Năm', 'Chỉ tiêu 1', 'Chỉ tiêu 2', 'Tốc độ tăng trưởng (%)'],
            rows: [
              ['2020', '125,4', '45,2', '100,0'],
              ['2021', '132,0', '48,1', '105,3'],
              ['2022', '141,5', '52,6', '107,2'],
              ['2023', '150,2', '56,8', '106,1'],
            ],
          },
          src: 'Nguồn: Tổng cục Thống kê',
        },
      ],
      items: [
        { t: `Cả hai chỉ tiêu trong bảng số liệu đều có xu hướng tăng liên tục qua các năm.`, a: true, m: l0 },
        { t: `Tốc độ tăng trưởng năm 2023 đạt mức 106,1% so với năm cơ sở 2020.`, a: true, m: l1 },
        { t: `Chỉ tiêu 2 luôn chiếm tỉ trọng lớn hơn 80% so với chỉ tiêu 1 trong mọi năm.`, a: false, m: l2 },
        { t: `Việc phân tích bảng số liệu minh họa rõ bản chất của chủ đề ${row.c}.`, a: true, m: l3 },
      ],
    };
  }

  // Check if reference file content exists and can be leveraged
  if (referenceTexts.length > 0 && referenceTexts[0].text) {
    const rawRef = referenceTexts[0].text;
    const cleanExcerpt = rawRef.slice(0, 320).replace(/\s+/g, ' ').trim();
    if (cleanExcerpt.length > 50) {
      return {
        stem: `Cho đoạn thông tin trích từ tài liệu chuyên môn về ${row.n}:`,
        text: cleanExcerpt,
        src: 'Nguồn: Tài liệu chuyên môn giáo viên',
        items: [
          { t: `Nội dung trên đề cập trực tiếp đến kiến thức cốt lõi của ${row.n}.`, a: true, m: l0 },
          { t: `Các dữ liệu và luận điểm trong đoạn văn bản giải thích rõ bản chất của chủ đề ${row.c}.`, a: true, m: l1 },
          { t: `Nội dung tài liệu hoàn toàn phủ nhận các nguyên tắc cơ bản của môn ${mon} lớp ${kh}.`, a: false, m: l2 },
          { t: `Kiến thức trong đoạn trích có giá trị ứng dụng thiết thực trong kiểm tra đánh giá và thực tiễn.`, a: true, m: l3 },
        ],
      };
    }
  }

  // Domain-specific tailored stimulus matching Ministry exam style
  if (mon === 'Địa lí') {
    return {
      stem: `Cho đoạn thông tin và số liệu kinh tế - xã hội sau:`,
      text: `Theo Niên giám Thống kê Việt Nam, trong giai đoạn 2015 – 2023, cơ cấu kinh tế cả nước tiếp tục chuyển dịch tích cực gắn liền với quá trình công nghiệp hóa và hiện đại hóa. Khu vực nông, lâm nghiệp và thủy sản chiếm tỉ trọng khoảng 11,96%; khu vực công nghiệp và xây dựng chiếm 37,12%; khu vực dịch vụ chiếm 42,54%; thuế sản phẩm trừ trợ cấp sản phẩm chiếm 8,38%. Tỉ lệ dân số đô thị tăng đều đặn đạt trên 42,6%, phản ánh tiến trình đô thị hóa sâu rộng tại các vùng kinh tế trọng điểm.`,
      src: 'Nguồn: Tổng cục Thống kê',
      items: [
        { t: `Trong cơ cấu kinh tế năm 2023, khu vực dịch vụ chiếm tỉ trọng cao nhất.`, a: true, m: l0 },
        { t: `Xu hướng giảm tỉ trọng nông nghiệp và tăng dịch vụ phù hợp với quy luật phát triển kinh tế hiện đại.`, a: true, m: l1 },
        { t: `Tỉ lệ dân số đô thị đạt 42,6% chứng minh quá trình đô thị hóa ở nước ta đã hoàn tất và đạt mức cao nhất châu Á.`, a: false, m: l2 },
        { t: `Để thúc đẩy tăng trưởng bền vững, cần tiếp tục đẩy mạnh chuyển đổi số và nâng cao năng suất lao động xã hội.`, a: true, m: l3 },
      ],
    };
  }

  if (mon === 'Lịch sử') {
    return {
      stem: `Đọc đoạn tư liệu lịch sử sau đây:`,
      text: `Tại Hội nghị Ban Chấp hành Trung ương Đảng Cộng sản Đông Dương lần thứ 8 (tháng 5/1941) tại Pác Bó (Cao Bằng), lãnh tụ Nguyễn Ái Quốc đã chủ trì và khẳng định: "Trong lúc này quyền lợi của bộ phận, của giai cấp phải đặt dưới sự sinh tử, tồn vong của quốc gia, của dân tộc. Trong lúc này nếu không giải quyết được vấn đề dân tộc giải phóng, không đòi được độc lập, tự do cho toàn thể dân tộc, thì chẳng những toàn thể quốc gia dân tộc còn chịu mãi kiếp ngựa trâu, mà quyền lợi của bộ phận, giai cấp đến vạn năm cũng không đòi lại được".`,
      src: 'Nguồn: Văn kiện Đảng Cộng sản Việt Nam',
      items: [
        { t: `Hội nghị Trung ương 8 (tháng 5/1941) diễn ra tại Pác Bó dưới sự chủ trì của lãnh tụ Nguyễn Ái Quốc.`, a: true, m: l0 },
        { t: `Đoạn tư liệu khẳng định Đảng đặt nhiệm vụ giải phóng dân tộc lên hàng đầu và cấp thiết nhất.`, a: true, m: l1 },
        { t: `Hội nghị chủ trương tiếp tục phát động phong trào đấu tranh giai cấp và cải cách ruộng đất triệt để ngay lúc này.`, a: false, m: l2 },
        { t: `Bài học giương cao ngọn cờ dân tộc và đại đoàn kết toàn dân của Hội nghị giữ nguyên giá trị trong thời đại ngày nay.`, a: true, m: l3 },
      ],
    };
  }

  if (mon === 'Giáo dục kinh tế và pháp luật') {
    return {
      stem: `Đọc thông tin và tình huống thực tiễn sau:`,
      text: `Công ty cổ phần An Bình do ông T làm giám đốc chuyên sản xuất thực phẩm hữu cơ xuất khẩu. Trong năm vừa qua, công ty đã ký kết hợp đồng lao động bằng văn bản, bảo đảm mức lương tối thiểu vùng và đóng bảo hiểm xã hội bắt buộc đầy đủ cho toàn bộ 45 người lao động. Đồng thời, doanh nghiệp chủ động lập báo cáo đánh giá tác động môi trường, đầu tư hệ thống xử lý nước thải đạt chuẩn trước khi xả thải ra môi trường tự nhiên.`,
      src: 'Nguồn: Bộ Tài chính nước Cộng hòa xã hội chủ nghĩa Việt Nam',
      items: [
        { t: `Công ty cổ phần An Bình hoạt động dưới hình thức doanh nghiệp có tư cách pháp nhân.`, a: true, m: l0 },
        { t: `Việc đóng bảo hiểm xã hội đầy đủ cho người lao động là thực hiện đúng nghĩa vụ pháp lý của người sử dụng lao động.`, a: true, m: l1 },
        { t: `Doanh nghiệp có quyền tự ý miễn trừ đóng bảo hiểm xã hội nếu người lao động có cam kết tự nguyện từ chối bằng văn bản.`, a: false, m: l2 },
        { t: `Đầu tư xử lý nước thải đạt chuẩn thể hiện trách nhiệm xã hội và định hướng phát triển kinh tế bền vững của doanh nghiệp.`, a: true, m: l3 },
      ],
    };
  }

  if (mon === 'Vật lí') {
    return {
      stem: `Cho thông tin về thí nghiệm và hiện tượng vật lí sau:`,
      text: `Một con lắc lò xo gồm vật nhỏ có khối lượng m = 200 g và lò xo nhẹ có độ cứng k = 50 N/m, dao động điều hòa trên mặt phẳng nằm ngang không ma sát. Tại thời điểm t = 0, vật đi qua vị trí cân bằng theo chiều dương với tốc độ v_max = 40 cm/s. Lấy π² = 10 và bỏ qua mọi lực cản của không khí.`,
      src: 'Nguồn: Sách giáo khoa Vật lí, Nhà xuất bản Giáo dục Việt Nam',
      items: [
        { t: `Tần số góc dao động riêng của con lắc lò xo là ω = 5√10 rad/s (xấp xỉ 15,8 rad/s).`, a: true, m: l0 },
        { t: `Cơ năng của con lắc lò xo được bảo toàn và có độ lớn tỉ lệ thuận với bình phương biên độ dao động.`, a: true, m: l1 },
        { t: `Khi vật đi qua vị trí cân bằng, lực đàn hồi của lò xo tác dụng lên vật đạt giá trị lớn nhất.`, a: false, m: l2 },
        { t: `Nếu tăng khối lượng vật nặng lên gấp 4 lần thì chu kì dao động của con lắc sẽ tăng lên gấp 2 lần.`, a: true, m: l3 },
      ],
    };
  }

  if (mon === 'Hóa học') {
    return {
      stem: `Cho thông tin về quá trình hóa học và thực nghiệm sau:`,
      text: `Trong công nghiệp hóa chất, ammonia (NH₃) được tổng hợp trực tiếp từ nitrogen và hydrogen theo phương trình hóa học: N₂(k) + 3H₂(k) ⇌ 2NH₃(k), có biến thiên enthalpy chuẩn ΔrH°₂₉₈ = -92 kJ. Quá trình sản xuất thường được tiến hành ở nhiệt độ khoảng 400 °C - 450 °C, áp suất cao 150 - 200 bar và sử dụng xúc tác là sắt (Fe) có trộn thêm các oxide kim loại để tăng hiệu quả.`,
      src: 'Nguồn: Sách giáo khoa Hóa học, Nhà xuất bản Giáo dục Việt Nam',
      items: [
        { t: `Phản ứng tổng hợp ammonia từ N₂ và H₂ là một phản ứng thuận nghịch tỏa nhiệt.`, a: true, m: l0 },
        { t: `Theo nguyên lí Le Chatelier, việc tăng áp suất của hệ làm cân bằng chuyển dịch theo chiều thuận.`, a: true, m: l1 },
        { t: `Chất xúc tác bột sắt có tác dụng làm chuyển dịch vị trí cân bằng hóa học sang chiều thuận.`, a: false, m: l2 },
        { t: `Nhiệt độ 400 - 450 °C được lựa chọn là nhiệt độ tối ưu cân đối giữa tốc độ phản ứng và độ bền nhiệt của NH₃.`, a: true, m: l3 },
      ],
    };
  }

  if (mon === 'Sinh học') {
    return {
      stem: `Cho thông tin về nghiên cứu sinh học và di truyền thực nghiệm sau:`,
      text: `Ở một loài thực vật lưỡng bội giao phấn ngẫu nhiên, alen A quy định thân cao trội hoàn toàn so với alen a quy định thân thấp; alen B quy định hoa đỏ trội hoàn toàn so với alen b quy định hoa trắng. Hai cặp gen này nằm trên hai cặp nhiễm sắc thể thường phân li độc lập. Khi khảo sát một quần thể ở trạng thái cân bằng di truyền Hardy - Weinberg, người ta xác định được tần số alen A = 0,7 và tần số alen B = 0,6.`,
      src: 'Nguồn: Sách giáo khoa Sinh học, Nhà xuất bản Giáo dục Việt Nam',
      items: [
        { t: `Hai cặp tính trạng chiều cao thân và màu sắc hoa di truyền tuân theo quy luật phân li độc lập của Mendel.`, a: true, m: l0 },
        { t: `Tần số alen lặn a trong quần thể là 0,3 và tần số alen lặn b là 0,4.`, a: true, m: l1 },
        { t: `Tỉ lệ kiểu hình cây thân thấp, hoa trắng (aabb) trong quần thể đạt giá trị lớn hơn 20%.`, a: false, m: l2 },
        { t: `Nếu quần thể chịu tác động của chọn lọc tự nhiên chống lại alen trội A thì tần số alen A sẽ giảm dần qua các thế hệ.`, a: true, m: l3 },
      ],
    };
  }

  if (mon === 'Toán') {
    return {
      stem: `Cho bài toán thực tế ứng dụng kiến thức toán học sau:`,
      text: `Một doanh nghiệp sản xuất một loại thiết bị công nghệ với hàm tổng chi phí sản xuất theo số lượng sản phẩm là C(x) = x³ - 9x² + 30x + 40 (triệu đồng), trong đó x là số lượng sản phẩm (đơn vị: trăm sản phẩm, 0 < x ≤ 10). Giá bán trên thị trường của mỗi trăm sản phẩm cố định là 30 triệu đồng, tương ứng với hàm tổng doanh thu R(x) = 30x (triệu đồng).`,
      src: 'Nguồn: Sách giáo khoa Toán, Nhà xuất bản Giáo dục Việt Nam',
      items: [
        { t: `Hàm số biểu diễn lợi nhuận của doanh nghiệp theo số lượng sản phẩm là P(x) = R(x) - C(x) = -x³ + 9x² - 40 (triệu đồng).`, a: true, m: l0 },
        { t: `Đạo hàm của hàm lợi nhuận là P'(x) = -3x² + 18x.`, a: true, m: l1 },
        { t: `Để lợi nhuận đạt giá trị lớn nhất, doanh nghiệp cần sản xuất đúng x = 10 (nghìn sản phẩm).`, a: false, m: l2 },
        { t: `Lợi nhuận tối đa của doanh nghiệp đạt được là 68 triệu đồng khi sản xuất 6 trăm sản phẩm.`, a: true, m: l3 },
      ],
    };
  }

  // Default robust generator for other subjects (Tin học, GDQP&AN, Ngoại ngữ, Công nghệ, etc.)
  return {
    stem: `Cho đoạn thông tin về chủ đề ${row.c} (nội dung: ${row.n}):`,
    text: `Trong chương trình giáo dục phổ thông 2018 môn ${mon} lớp ${kh}, nội dung ${row.n} thuộc chủ đề ${row.c} giữ vai trò trọng tâm trong việc phát triển phẩm chất và năng lực giải quyết vấn đề của học sinh. Các nguyên lí khoa học cơ bản, quy chuẩn kĩ thuật và dẫn chứng thực tiễn về ${row.n} được hệ thống hóa chặt chẽ theo hướng liên hệ thực tế đời sống, bảo đảm tính hiện đại và khoa học.`,
    src: 'Nguồn: Sách giáo khoa Chương trình Giáo dục Phổ thông 2018',
    items: [
      { t: `Khái niệm và đặc điểm cốt lõi của ${row.n} được định hình rõ ràng trong chương trình chuẩn.`, a: true, m: l0 },
      { t: `Nội dung ${row.n} có mối liên hệ mật thiết với các kiến thức và kĩ năng trong chủ đề ${row.c}.`, a: true, m: l1 },
      { t: `Toàn bộ các quy tắc liên quan đến ${row.n} hoàn toàn mang tính giả định và không có ứng dụng thực tế.`, a: false, m: l2 },
      { t: `Việc nắm vững ${row.n} giúp người học hình thành tư duy phân tích và vận dụng hiệu quả vào đời sống.`, a: true, m: l3 },
    ],
  };
}

// Subject-specific short calculation question generator for Part III per Ministry format
function buildPartIIIShortAnswer(mon: string, kh: string, row: MatrixRow, idx: number): { stem: string; ans: string } {
  if (mon === 'Địa lí') {
    return {
      stem: `Cho biết năm 2023, diện tích gieo trồng cây lương thực có hạt của một tỉnh là 125,4 nghìn ha, sản lượng đạt 727,32 nghìn tấn. Năng suất lúa của tỉnh đó đạt bao nhiêu tạ/ha? (làm tròn kết quả đến hàng phần mười; thí sinh chỉ điền phần số).`,
      ans: '58.0',
    };
  }

  if (mon === 'Toán') {
    return {
      stem: `Cho hàm số y = f(x) có đạo hàm f'(x) = (x - 1)(x + 2)²(x - 3)³. Số điểm cực trị của hàm số đã cho là bao nhiêu? (thí sinh chỉ điền phần số).`,
      ans: '2',
    };
  }

  if (mon === 'Vật lí') {
    return {
      stem: `Một vật có khối lượng m = 500 g thực hiện dao động điều hòa với biên độ A = 6 cm và tần số f = 5 Hz. Lấy π² = 10. Động năng cực đại của vật có giá trị là bao nhiêu Jun? (làm tròn kết quả đến hàng phần mười; thí sinh chỉ điền phần số).`,
      ans: '0.9',
    };
  }

  if (mon === 'Hóa học') {
    return {
      stem: `Đốt cháy hoàn toàn 4,6 gam một alcohol no, đơn chức, mạch hở X cần dùng vừa đủ 6,72 lít khí O₂ (đktc). Phân tử khối của X bằng bao nhiêu g/mol? (thí sinh chỉ điền phần số).`,
      ans: '46',
    };
  }

  if (mon === 'Sinh học') {
    return {
      stem: `Một phân tử ADN mạch kép có 3000 nuclêôtit và có số nuclêôtit loại A chiếm 20% tổng số nuclêôtit. Số liên kết hiđrô của phân tử ADN này bằng bao nhiêu? (thí sinh chỉ điền phần số).`,
      ans: '3900',
    };
  }

  if (mon === 'Giáo dục kinh tế và pháp luật') {
    return {
      stem: `Doanh nghiệp Y có doanh thu trong năm là 15,5 tỉ đồng, tổng chi phí sản xuất hợp lí là 12,0 tỉ đồng. Biết thuế suất thuế thu nhập doanh nghiệp là 20%, số tiền thuế thu nhập doanh nghiệp mà công ty phải nộp trong năm là bao nhiêu tỉ đồng? (làm tròn kết quả đến hàng phần mười; thí sinh chỉ điền phần số).`,
      ans: '0.7',
    };
  }

  // Default calculation
  return {
    stem: `Từ số liệu thực nghiệm liên quan đến nội dung ${row.n}, hãy tính toán giá trị chỉ số định lượng cơ bản (làm tròn kết quả đến hàng phần mười; thí sinh chỉ điền phần số).`,
    ans: '12.5',
  };
}

export function generateFallbackQuestionsForTopic(
  mon: string,
  kh: string,
  row: MatrixRow,
  needItems: any[],
  withExplanation: boolean,
  referenceTexts: { name: string; text: string }[] = [],
  essayPoint: number = 1
): any[] {
  const result: any[] = [];

  needItems.forEach((item, idx) => {
    const count = item.n || 1;
    for (let c = 0; c < count; c++) {
      if (item.d === 'NLC') {
        // Part I - Multiple Choice
        const optA = `Khẳng định chính xác về bản chất khoa học của ${row.n}.`;
        const optB = `Đặc điểm này chỉ áp dụng trong trường hợp hẹp của ${row.c}.`;
        const optC = `Quan điểm chưa chuẩn xác về phương pháp luận của ${row.n}.`;
        const optD = `Nhận định trái ngược với quy chuẩn kiến thức chuẩn GDPT 2018.`;

        result.push({
          d: 'NLC',
          m: item.m || 'B',
          stem: `[${row.c}] Theo Chương trình GDPT 2018 môn ${mon} lớp ${kh}, khẳng định nào sau đây là ĐÚNG về ${row.n}?`,
          opts: [optA, optB, optC, optD],
          ans: 'A',
          gt: withExplanation
            ? `Giải thích: Theo chuẩn kiến thức môn ${mon} lớp ${kh}, nội dung ${row.n} thuộc chủ đề ${row.c} được quy định cụ thể tại SGK Kết nối tri thức.`
            : undefined,
        });
      } else if (item.d === 'DS') {
        // Part II - True/False: strictly adheres to Ministry requirements with rich excerpt & shortened source
        const stimulus = buildPartIIStimulus(mon, kh, row, idx, item.yl || ['B', 'H', 'V', 'V'], referenceTexts, item.kind);
        result.push({
          d: 'DS',
          m: item.m || 'H',
          stem: stimulus.stem,
          srcs: stimulus.srcs || [
            {
              k: 'text',
              text: stimulus.text,
              src: stimulus.src,
            },
          ],
          items: stimulus.items,
          chk: false,
          gt: withExplanation
            ? 'Giải thích: Các ý a, b đúng dựa trên đối chiếu ngữ liệu khoa học chính thống; ý c sai do mâu thuẫn với quy luật thực tế; ý d đúng về định hướng giải pháp.'
            : undefined,
        });
      } else if (item.d === 'TLN') {
        // Part III - Short answer numerical calculation per Ministry format
        const tlnData = buildPartIIIShortAnswer(mon, kh, row, idx);
        result.push({
          d: 'TLN',
          m: item.m || 'V',
          stem: `[${row.c}] ${tlnData.stem}`,
          ans: tlnData.ans,
          gt: withExplanation
            ? `Hướng dẫn: Áp dụng công thức tính toán đặc thù của môn ${mon}, ta thu được kết quả đáp số là ${tlnData.ans}.`
            : undefined,
        });
      } else if (item.d === 'TL') {
        // Part IV - Essay: Concrete subject content for answers and rubrics
        const halfPoint = Math.round((essayPoint / 2) * 100) / 100;
        const remainPoint = Math.round((essayPoint - halfPoint) * 100) / 100;

        let specificStem = `[${row.c}] Trình bày các nội dung cơ bản của ${row.n}. Từ đó, hãy phân tích ý nghĩa thực tiễn đối với đời sống hoặc giải pháp phát triển bền vững.`;
        let specificAns = `Đáp án chi tiết cho nội dung "${row.n}" (${row.c}):\n` +
          `1. Khái niệm và đặc điểm cốt lõi: ${row.n} phản ánh các quy luật và thuộc tính cơ bản của ${row.c}. Trình bày chi tiết thành phần, cơ chế phát sinh, diễn biến và các mối liên hệ nội tại trong hệ thống kiến thức chuẩn GDPT 2018.\n` +
          `2. Giá trị thực tiễn và giải pháp vận dụng: Làm rõ tác động tích cực và hạn chế trong đời sống, đề xuất biện pháp tổ chức, khai thác hiệu quả hoặc khắc phục khó khăn gắn liền với thực tiễn.`;
        let specificRubric = [
          { y: `Trình bày chính xác, đầy đủ các khái niệm, cơ chế và đặc điểm bản chất của ${row.n}`, d: halfPoint },
          { y: `Phân tích sâu sắc dẫn chứng thực tế, ý nghĩa kinh tế - xã hội hoặc đề xuất giải pháp phát triển bền vững`, d: remainPoint },
        ];

        if (mon === 'Địa lí') {
          if (/vai trò.*địa lí|ngành nghề|nghề nghiệp|kiến thức địa lí/i.test(row.n + ' ' + row.c)) {
            specificStem = `[${row.c}] Trình bày vai trò của môn Địa lí đối với đời sống, khoa học và định hướng nghề nghiệp. Phân tích các ngành nghề có liên quan đến kiến thức địa lí và thuận lợi mà môn Địa lí mang lại cho sự phát triển kinh tế - xã hội.`;
            specificAns = `1. Vai trò của môn Địa lí đối với đời sống, khoa học và định hướng nghề nghiệp:\n` +
              `- Cung cấp hệ thống tri thức khoa học toàn diện về môi trường tự nhiên, dân cư và kinh tế - xã hội; hình thành thế giới quan khoa học và tư duy không gian đa chiều.\n` +
              `- Rèn luyện các kĩ năng thực hành thiết yếu: sử dụng bản đồ, Atlat, biểu đồ, tranh ảnh, công nghệ định vị GPS, bản đồ số và Hệ thống thông tin địa lí (GIS) phục vụ trực tiếp học tập và đời sống.\n` +
              `2. Các ngành nghề liên quan và thuận lợi đối với phát triển kinh tế - xã hội:\n` +
              `- Tạo ra nguồn lao động chất lượng cho nhiều ngành nghề thiết yếu: quy hoạch không gian lãnh thổ, quản lí đô thị, quản lí tài nguyên thiên nhiên và môi trường, trắc địa bản đồ, khí tượng thủy văn, giao thông vận tải, logistics, du lịch lữ hành, an ninh quốc phòng.\n` +
              `- Giúp người học định hướng nghề nghiệp đúng đắn, thích ứng linh hoạt với thị trường lao động; bố trí sản xuất hợp lí và ứng phó hiệu quả với biến đổi khí hậu.`;
            specificRubric = [
              { y: `Trình bày đầy đủ vai trò của môn Địa lí: cung cấp tri thức tự nhiên - kinh tế - xã hội, tư duy không gian và các kĩ năng thực hành (bản đồ, GPS, GIS)`, d: halfPoint },
              { y: `Nêu rõ các ngành nghề liên quan và thuận lợi cụ thể: tạo nguồn lao động chất lượng cho quy hoạch đô thị, tài nguyên môi trường, du lịch, logistics; định hướng nghề nghiệp và thích ứng biến đổi khí hậu`, d: remainPoint },
            ];
          } else if (/phương pháp.*bản đồ|sử dụng bản đồ|kí hiệu bản đồ|atlat|bản đồ/i.test(row.n + ' ' + row.c)) {
            specificStem = `[${row.c}] Trình bày các phương pháp biểu hiện đối tượng địa lí trên bản đồ theo SGK bộ Kết nối tri thức. Phân tích ý nghĩa của việc sử dụng bản đồ, Atlat và công nghệ bản đồ số trong thực tiễn.`;
            specificAns = `1. Các phương pháp biểu hiện đối tượng địa lí trên bản đồ (chuẩn SGK Kết nối tri thức):\n` +
              `- Phương pháp kí hiệu: Biểu hiện các đối tượng phân bố theo điểm cụ thể (khoáng sản, đô thị, sân bay, hải cảng); phản ánh vị trí, số lượng, chất lượng, cấu trúc đối tượng qua kí hiệu hình học, chữ hoặc tượng hình.\n` +
              `- Phương pháp đường chuyển động: Biểu hiện sự di chuyển của các quá trình, hiện tượng tự nhiên và kinh tế - xã hội (hướng gió, bão, dòng biển, luồng di dân, tuyến vận tải hàng hóa) bằng các mũi tên có hướng, màu sắc và độ lớn khác nhau.\n` +
              `- Phương pháp chấm điểm: Biểu hiện các hiện tượng phân bố phân tán, rải rác trên lãnh thổ bằng các điểm chấm (mỗi điểm tương ứng một số lượng cá thể nhất định như điểm dân cư, đàn gia súc).\n` +
              `- Phương pháp bản đồ - biểu đồ: Thể hiện giá trị tổng cộng của hiện tượng trên từng đơn vị lãnh thổ bằng biểu đồ đặt trực tiếp vào phạm vi đơn vị đó (diện tích lúa, sản lượng công nghiệp của từng tỉnh).\n` +
              `2. Ý nghĩa và vận dụng trong học tập, đời sống:\n` +
              `- Xác định phương hướng, định vị toạ độ, tìm đường đi, đo tính khoảng cách và phân tích mối quan hệ không gian giữa các hiện tượng địa lí.\n` +
              `- Ứng dụng rộng rãi trong quy hoạch lãnh thổ, phòng chống thiên tai, cứu hộ cứu nạn và định vị vệ tinh GPS, hệ thống thông tin địa lí (GIS).`;
            specificRubric = [
              { y: `Trình bày đúng và đủ đặc điểm, đối tượng biểu hiện của các phương pháp trên bản đồ (kí hiệu, đường chuyển động, chấm điểm, bản đồ - biểu đồ)`, d: halfPoint },
              { y: `Phân tích ý nghĩa thực tiễn: xác định phương hướng, đo tính khoảng cách, phục vụ quy hoạch và ứng dụng công nghệ GPS, GIS`, d: remainPoint },
            ];
          } else if (/thạch quyển|vỏ trái đất|nội lực|ngoại lực|địa hình/i.test(row.n + ' ' + row.c)) {
            specificStem = `[${row.c}] Trình bày khái niệm và cấu trúc của thạch quyển. Phân tích tác động của nội lực và ngoại lực đến sự hình thành địa hình bề mặt Trái Đất.`;
            specificAns = `1. Khái niệm và cấu trúc thạch quyển:\n` +
              `- Thạch quyển là phần cứng ngoài cùng của Trái Đất, bao gồm vỏ Trái Đất và phần trên của lớp manti (giới hạn độ dày trung bình khoảng 100 km).\n` +
              `- Ranh giới dưới của thạch quyển tiếp xúc với tầng mềm quánh dẻo (asthenosphere) của lớp manti trên.\n` +
              `2. Tác động của nội lực và ngoại lực đến địa hình bề mặt thạch quyển:\n` +
              `- Nội lực (vận động uốn nếp, đứt gãy, núi lửa, động đất) làm bề mặt Trái Đất gồ ghề, tạo nên các dãy núi cao, sơn nguyên, bồn trũng lớn.\n` +
              `- Ngoại lực (phong hóa, bóc mòn, vận chuyển, bồi tụ do nước, gió, nhiệt độ) san bằng các chỗ gồ ghề; hình thành thung lũng, đồng bằng châu thổ bồi tụ màu mỡ, địa hình cacxtơ đá vôi.`;
            specificRubric = [
              { y: `Trình bày chính xác khái niệm thạch quyển gồm vỏ Trái Đất và phần trên manti trên, dày khoảng 100 km, tiếp giáp tầng asthenosphere`, d: halfPoint },
              { y: `Phân tích cụ thể tác động của nội lực (uốn nếp, đứt gãy tạo núi, sơn nguyên) và ngoại lực (phong hóa, bóc mòn, bồi tụ tạo đồng bằng, hang động cacxtơ)`, d: remainPoint },
            ];
          } else if (/khí quyển|khí hậu|thời tiết|khí áp|gió|mưa/i.test(row.n + ' ' + row.c)) {
            specificStem = `[${row.c}] Trình bày cấu trúc khí quyển và các hoàn lưu khí quyển. Phân tích tác động của khí hậu đối với sản xuất nông nghiệp và giải pháp thích ứng biến đổi khí hậu.`;
            specificAns = `1. Cấu trúc khí quyển và các hoàn lưu khí quyển:\n` +
              `- Khí quyển gồm các tầng: tầng đối lưu (tập trung 80% khối lượng không khí, nơi diễn ra toàn bộ hiện tượng thời tiết như mây, mưa, gió bão), bình lưu, tầng giữa, nhiệt quyển và khuếch tán.\n` +
              `- Hoàn lưu khí quyển gồm các đai khí áp xen kẽ và hệ thống gió hành tinh (gió Tín phong, gió Tây ôn đới, gió mùa) chi phối chế độ nhiệt ẩm toàn cầu.\n` +
              `2. Tác động đến sinh hoạt, sản xuất và giải pháp thích ứng:\n` +
              `- Thuận lợi: Tạo điều kiện phát triển nông nghiệp nhiệt đới đa dạng cây trồng, vật nuôi; khai thác nguồn năng lượng tái tạo sạch (năng lượng gió, điện mặt trời).\n` +
              `- Giải pháp: Nâng cao chất lượng dự báo khí tượng, chuyển đổi cơ cấu cây trồng phù hợp mùa vụ, xây dựng đê điều phòng chống bão lũ, hạn hán và thích ứng biến đổi khí hậu.`;
            specificRubric = [
              { y: `Trình bày cấu trúc khí quyển (tầng đối lưu chứa 80% không khí, hiện tượng thời tiết) và các đai khí áp, hệ thống gió hành tinh`, d: halfPoint },
              { y: `Phân tích thuận lợi cho nông nghiệp, năng lượng tái tạo và giải pháp dự báo, ứng phó thiên tai, thích ứng biến đổi khí hậu`, d: remainPoint },
            ];
          } else if (/thủy quyển|nước ngầm|sông|hồ|biển|đại dương|tuần hoàn nước/i.test(row.n + ' ' + row.c)) {
            specificStem = `[${row.c}] Trình bày các nhân tố ảnh hưởng đến chế độ nước sông. Phân tích vai trò của tài nguyên nước đối với phát triển kinh tế và các giải pháp bảo vệ nguồn nước ngọt.`;
            specificAns = `1. Các nhân tố ảnh hưởng đến chế độ nước sông:\n` +
              `- Chế độ mưa và nguồn cấp nước: Nơi có mưa theo mùa thì sông có mùa lũ và mùa cạn tương ứng; vùng băng tuyết tan sông lũ vào mùa xuân - hạ; nước ngầm điều hòa dòng chảy sông.\n` +
              `- Địa hình và thảm thực vật: Địa hình dốc nước chảy xiết; rừng đầu nguồn giúp giữ nước, giảm lũ quét và điều hòa dòng chảy mặt.\n` +
              `2. Vai trò kinh tế và giải pháp bảo vệ nguồn nước:\n` +
              `- Thuận lợi: Cung cấp nước tưới cho nông nghiệp, phát triển thủy điện, giao thông đường thủy nội địa, nuôi trồng thủy sản và du lịch sinh thái.\n` +
              `- Giải pháp: Xây dựng hồ chứa điều tiết nước, trồng rừng phòng hộ đầu nguồn, kiểm soát và xử lí triệt để nước thải bảo vệ nguồn nước sạch.`;
            specificRubric = [
              { y: `Trình bày các nhân tố ảnh hưởng đến chế độ dòng chảy sông ngòi (chế độ mưa, băng tuyết, nước ngầm, địa hình, thảm thực vật rừng)`, d: halfPoint },
              { y: `Nêu rõ vai trò kinh tế (tưới tiêu, thủy điện, giao thông thủy) và giải pháp trồng rừng phòng hộ, chống ô nhiễm nguồn nước`, d: remainPoint },
            ];
          } else if (/thổ nhưỡng|đất|sinh quyển|sinh vật|rừng/i.test(row.n + ' ' + row.c)) {
            specificStem = `[${row.c}] Phân tích các nhân tố hình thành đất. Nêu ý nghĩa của tài nguyên đất và sinh vật đối với phát triển nông nghiệp và biện pháp canh tác bền vững.`;
            specificAns = `1. Các nhân tố hình thành đất và đặc điểm sinh quyển:\n` +
              `- Đất được hình thành dưới tác động của 6 nhân tố: đá mẹ (cung cấp chất khoáng), khí hậu (quy định nhiệt ẩm và tốc độ phong hóa), sinh vật (cung cấp chất hữu cơ, mùn), địa hình (chi phối dòng chảy và tích tụ), thời gian và hoạt động canh tác của con người.\n` +
              `2. Ý nghĩa kinh tế và biện pháp canh tác bền vững:\n` +
              `- Thuận lợi: Cung cấp tư liệu sản xuất chủ yếu cho nông nghiệp (đất phù sa phát triển lúa nước, đất badan phát triển cây công nghiệp lâu năm) và phát triển lâm nghiệp sinh thái.\n` +
              `- Biện pháp bảo vệ: Bón phân hữu cơ vi sinh, hạn chế phân hóa học; làm ruộng bậc thang, nông lâm kết hợp chống xói mòn rửa trôi đất dốc; bảo tồn đa dạng sinh học.`;
            specificRubric = [
              { y: `Phân tích các nhân tố hình thành đất (đá mẹ, khí hậu, sinh vật, địa hình, thời gian, con người)`, d: halfPoint },
              { y: `Nêu rõ thuận lợi cho nông - lâm nghiệp (đất phù sa, đất badan) và biện pháp canh tác bền vững, chống xói mòn, bảo vệ đa dạng sinh học`, d: remainPoint },
            ];
          } else if (/dân cư|dân số|đô thị hóa|lao động/i.test(row.n + ' ' + row.c)) {
            specificStem = `[${row.c}] Phân tích đặc điểm cơ cấu dân số và phân bố dân cư. Nêu thuận lợi, thách thức và giải pháp nâng cao chất lượng nguồn nhân lực.`;
            specificAns = `1. Đặc điểm cơ cấu dân số và phân bố dân cư:\n` +
              `- Cơ cấu dân số gồm cơ cấu sinh học (giới tính, độ tuổi với giai đoạn dân số vàng) và cơ cấu xã hội (trình độ học vấn, cơ cấu lao động theo ngành kinh tế).\n` +
              `- Dân cư phân bố không đều giữa đồng bằng với miền núi; quá trình đô thị hóa mở rộng quy mô dân số và lối sống văn minh đô thị.\n` +
              `2. Thuận lợi và giải pháp nâng cao chất lượng nguồn nhân lực:\n` +
              `- Thuận lợi: Cung cấp lực lượng lao động dồi dào, cần cù, nhanh nhạy tiếp thu khoa học kĩ thuật; thị trường tiêu thụ nội địa rộng lớn thu hút đầu tư.\n` +
              `- Giải pháp: Đẩy mạnh đào tạo nghề chất lượng cao, chuyển dịch việc làm từ nông nghiệp sang công nghiệp - dịch vụ; phân bố lại dân cư và việc làm hợp lí.`;
            specificRubric = [
              { y: `Trình bày cơ cấu dân số (tuổi, giới tính, dân số vàng) và xu hướng phân bố dân cư, đô thị hóa`, d: halfPoint },
              { y: `Nêu rõ thuận lợi (lao động dồi dào, thị trường lớn) và giải pháp đào tạo nghề chất lượng cao, phân bố lại lao động hợp lí`, d: remainPoint },
            ];
          } else if (/vùng|kinh tế|công nghiệp|nông nghiệp|dịch vụ/i.test(row.n + ' ' + row.c)) {
            specificStem = `[${row.c}] Phân tích thế mạnh và hiện trạng phát triển đối với ${row.n}. Đề xuất các giải pháp phát triển kinh tế bền vững gắn liền với bảo vệ môi trường.`;
            specificAns = `1. Thế mạnh và hiện trạng phát triển ngành/vùng đối với ${row.n}:\n` +
              `- Vị trí địa lí chiến lược cùng tài nguyên thiên nhiên tạo tiền đề chuyên môn hóa sản xuất (tài nguyên đất phù sa/badan, nguồn nước, khoáng sản, tài nguyên du lịch biển - sinh thái).\n` +
              `- Kết cấu hạ tầng giao thông, mạng lưới đô thị và nguồn lao động dồi dào thúc đẩy chuyển dịch cơ cấu ngành kinh tế theo hướng hiện đại hóa.\n` +
              `2. Định hướng và giải pháp phát triển bền vững:\n` +
              `- Đẩy mạnh công nghiệp chế biến sâu, ứng dụng công nghệ cao trong sản xuất và hoàn thiện chuỗi logistics hiện đại.\n` +
              `- Gắn tăng trưởng kinh tế với bảo vệ tài nguyên môi trường, phát triển kinh tế xanh, kinh tế tuần hoàn và giữ vững an ninh quốc phòng.`;
            specificRubric = [
              { y: `Trình bày thế mạnh tài nguyên tự nhiên, vị trí địa lí và hạ tầng phục vụ chuyên môn hóa đối với ${row.n}`, d: halfPoint },
              { y: `Nêu cụ thể định hướng phát triển bền vững: chế biến sâu, công nghệ cao, chuỗi logistics và kinh tế xanh`, d: remainPoint },
            ];
          } else {
            specificStem = `[${row.c}] Trình bày bản chất khoa học và đặc điểm phân bố của ${row.n}. Phân tích ý nghĩa thực tiễn đối với sự phát triển kinh tế - xã hội và giải pháp bảo vệ môi trường.`;
            specificAns = `1. Bản chất khoa học và đặc điểm phân bố của ${row.n}:\n` +
              `- Xác định rõ thuộc tính cấu thành, các yếu tố tự nhiên và quy luật địa lí chi phối sự hình thành, phân bố của ${row.n} trong hệ thống kiến thức ${row.c}.\n` +
              `- Phân tích mối quan hệ tương hỗ chặt chẽ giữa các thành phần địa lí tự nhiên với môi trường sống và hoạt động sản xuất.\n` +
              `2. Ý nghĩa thực tiễn và giải pháp khai thác, phát triển bền vững:\n` +
              `- Giá trị thực tiễn: Cung cấp tư liệu sản xuất thiết yếu, phục vụ công tác quy hoạch không gian lãnh thổ và nâng cao chất lượng đời sống cư dân.\n` +
              `- Giải pháp: Tăng cường ứng dụng khoa học kĩ thuật, khai thác hợp lí đi đôi với bảo vệ tài nguyên và giữ gìn cân bằng môi trường sinh thái.`;
            specificRubric = [
              { y: `Trình bày chính xác bản chất khoa học, cấu trúc và quy luật phân bố của ${row.n}`, d: halfPoint },
              { y: `Nêu cụ thể giá trị thực tiễn (tư liệu sản xuất, quy hoạch lãnh thổ) và giải pháp ứng dụng khoa học, bảo vệ môi trường sinh thái`, d: remainPoint },
            ];
          }
        } else if (mon === 'Lịch sử') {
          specificStem = `[${row.c}] Trình bày bối cảnh lịch sử và diễn biến cốt lõi của sự kiện liên quan đến ${row.n}. Phân tích ý nghĩa lịch sử và bài học kinh nghiệm rút ra.`;
          specificAns = `1. Bối cảnh lịch sử và diễn biến cốt lõi của sự kiện liên quan đến ${row.n}:\n` +
            `- Phân tích điều kiện khách quan và chủ quan dẫn đến sự kiện thuộc chủ đề ${row.c}; làm rõ vai trò lãnh đạo và các mốc bước ngoặt lịch sử quan trọng.\n` +
            `2. Nguyên nhân thắng lợi, ý nghĩa lịch sử và bài học kinh nghiệm:\n` +
            `- Khẳng định đóng góp quyết định của quần chúng nhân dân và đường lối đúng đắn, sáng tạo.\n` +
            `- Rút ra bài học lịch sử về củng cố khối đại đoàn kết toàn dân, tranh thủ thời cơ và vận dụng sáng tạo vào công cuộc bảo vệ, xây dựng đất nước thời kì hội nhập.`;
          specificRubric = [
            { y: `Trình bày bối cảnh lịch sử, nguyên nhân và diễn biến mốc then chốt của sự kiện liên quan đến ${row.n}`, d: halfPoint },
            { y: `Phân tích nguyên nhân thắng lợi, ý nghĩa lịch sử và bài học kinh nghiệm đại đoàn kết dân tộc`, d: remainPoint },
          ];
        }

        result.push({
          d: 'TL',
          m: item.m || 'H',
          stem: specificStem,
          ans: specificAns,
          rubric: specificRubric,
          gt: withExplanation
            ? `Hướng dẫn chấm chi tiết bám sát nội dung ${row.n} theo thang điểm ${essayPoint} điểm của Bộ Giáo dục và Đào tạo.`
            : undefined,
        });
      }
    }
  });

  return result;
}

export async function generateQuestionsForTopic(
  mon: string,
  kh: string,
  ki: string,
  row: MatrixRow,
  needItems: any[],
  setIndex: number,
  totalSets: number,
  prevStems: string[],
  referenceTexts: { name: string; text: string }[],
  externalInfo: any[] = [],
  withExplanation: boolean = false,
  essayPoint: number = 1,
  useSearch: boolean = true
): Promise<any[]> {
  try {
    const sp = row.s || ['', '', ''];
    const rf = referenceTexts.length
      ? `=== TÀI LIỆU THAM KHẢO DO GIÁO VIÊN TẢI LÊN ===\n${referenceTexts.map((f) => '--- ' + f.name + ' ---\n' + f.text).join('\n')}`
      : '(Không có tài liệu tải lên: căn cứ SGK Kết nối tri thức hiện hành kết hợp thông tin uy tín trên internet; đặt chk:true khi không chắc nội dung khớp SGK.)';

    const ext = externalInfo.length
      ? `=== THÔNG TIN UY TÍN LIÊN QUAN ===\n${externalInfo.map((x) => `- ${x.t} (nguồn: ${x.n})`).join('\n')}`
      : '';

    const prompt = `Bạn là giáo viên giỏi, biên soạn câu hỏi kiểm tra định kì theo Chương trình giáo dục phổ thông 2018. Môn ${mon}, lớp ${kh}, ${ki}.
NGUỒN KIẾN THỨC VÀ THÔNG TIN BẮT BUỘC: Sách giáo khoa bộ Kết nối tri thức mới nhất (cập nhật đầy đủ các cấu trúc, thuật ngữ, số liệu và các thay đổi mới nhất về địa lí hành chính, kinh tế - xã hội tính đến năm 2026). Kết hợp thu thập thông tin, ngữ liệu, biểu đồ từ SGK và các nguồn thống kê chính thống.
${
  totalSets > 1
    ? `Đây là NGUỒN SỐ ${setIndex + 1} trong ${totalSets} nguồn tương đương cùng được tạo từ một ma trận: các nguồn có cùng số câu, dạng, mức độ, độ khó nhưng khác nội dung cụ thể.
${prevStems.length ? `Các câu đã có ở nguồn trước, KHÔNG được trùng: ${JSON.stringify(prevStems)}` : ''}`
    : ''
}
Chủ đề/Chương: ${row.c}
Nội dung/đơn vị kiến thức: ${row.n}
Yêu cầu cần đạt:
- Biết: ${sp[0]}
- Hiểu: ${sp[1]}
- Vận dụng: ${sp[2]}

Soạn ĐÚNG số câu sau:
${JSON.stringify(needItems)}

NGUYÊN TẮC RA ĐỀ BẮT BUỘC:
${QUESTION_RULES_TEXT}

PHẦN III (d = TLN) CHỈ gồm câu tính toán số liệu đặc thù của môn ${mon}: ${CALC_GUIDELINES[mon] || 'tính toán số liệu đặc thù của môn học ra một số'}; số liệu cho sẵn trong đề; đáp án là một số (nếu có số thập phân thì viết dấu phẩy, ví dụ: 12,5).
${withExplanation ? 'Bao gồm giải thích đáp án ngắn gọn ở trường "gt".' : 'KHÔNG viết giải thích (không có trường "gt").'}
Với câu TL (Tự luận):
- Phải đưa ra ĐÁP ÁN NỘI DUNG CỤ THỂ, ĐẦY ĐỦ KIẾN THỨC VÀ Ý TRẢ LỜI CHI TIẾT để dựa vào đó chấm điểm chính xác.
- TUYỆT ĐỐI KHÔNG ghi chung chung như "đặc điểm kinh tế...", "Học sinh trình bày đầy đủ...", "nêu ý nghĩa thực tiễn...", "Đánh giá thuận lợi và thách thức của... đối với sự phát triển kinh tế và đời sống cư dân" hay chép lại yêu cầu cần đạt (YCCĐ).
- BẮT BUỘC ghi rõ kiến thức cụ thể: nêu rõ các số liệu, tên vùng, tên ngành, cơ cấu, nguyên nhân, dẫn chứng cụ thể. Ví dụ:
  + Nếu đề hỏi về vai trò của môn Địa lí hoặc các ngành nghề liên quan đến kiến thức địa lí: BẮT BUỘC ghi rõ thuận lợi cụ thể như tạo ra nguồn lao động chất lượng cho các ngành nghề (quy hoạch không gian lãnh thổ, quản lí đô thị, quản lí tài nguyên thiên nhiên và môi trường, trắc địa bản đồ, khí tượng thủy văn, giao thông vận tải, logistics, du lịch lữ hành, an ninh quốc phòng...); rèn luyện tư duy không gian và kĩ năng sử dụng bản đồ, Atlat, định vị vệ tinh GPS, hệ thống thông tin địa lí (GIS) vào thực tiễn đời sống.
  + Nếu đề hỏi về thạch quyển thì đáp án ("ans") phải ghi rõ: "Thạch quyển là phần cứng ngoài cùng của Trái Đất, bao gồm vỏ Trái Đất và phần trên của lớp manti (độ dày khoảng 100 km). Giới hạn dưới tiếp xúc với tầng asthenosphere (tầng mềm quánh dẻo)...".
  + Nếu đề hỏi về đặc điểm kinh tế một vùng thì đáp án phải nêu rõ từng ngành, thế mạnh cụ thể (ví dụ: công nghiệp khai khoáng và thủy điện phát triển nhờ giàu khoáng sản than đá Quảng Ninh, trữ năng thủy điện sông Đà; nông nghiệp thế mạnh cây công nghiệp lâu năm chè, quế, hồi; vùng chuyên canh cây ăn quả cận nhiệt... chứ không chỉ nói chung chung 'kinh tế phát triển').
- Trường "rubric" phải liệt kê từng ý kiến thức cụ thể kèm điểm (tổng điểm bằng ${essayPoint} điểm), mỗi ý nêu rõ nội dung kiến thức cần đạt để giáo viên nhìn vào cho điểm chính xác.
- Trường bảng số liệu ("table") nếu có số thập phân BẮT BUỘC dùng dấu phẩy (ví dụ: "12,5", "45,2", "100,0"), tuyệt đối không dùng dấu chấm.

YÊU CẦU ĐẶC BIỆT BẮT BUỘC CHO PHẦN II (ĐÚNG/SAI - d = DS) THEO CÁCH RA ĐỀ CỦA BỘ GD&ĐT:
1. ĐOẠN TRÍCH NGỮ LIỆU CỤ THỂ: Phải đưa NỘI DUNG CỤ THỂ, ĐẦY ĐỦ VÀ CHI TIẾT của đoạn trích dẫn, văn bản, số liệu vào trường "srcs" (với "text" tối thiểu 80-150 từ có thông tin thực tế/khoa học cụ thể, HOẶC "table" chứa bảng số liệu có số liệu thực). TUYỆT ĐỐI KHÔNG viết câu dẫn chung chung.
2. NGUỒN TRÍCH DẪN ĐẦY ĐỦ, RÕ RÀNG, HẠN CHẾ TỐI ĐA VIẾT TẮT: Nguồn ở trường "src" BẮT BUỘC ghi đầy đủ, rõ ràng tên cơ quan, tổ chức, nhà xuất bản hoặc tài liệu chính thống (tuyệt đối không viết tắt như TCTK, SGK, GDĐT mà phải viết rõ như: 'Nguồn: Tổng cục Thống kê', 'Nguồn: Sách giáo khoa Địa lí 12, Nhà xuất bản Giáo dục Việt Nam', 'Nguồn: Bộ Giáo dục và Đào tạo', 'Nguồn: Niên giám Thống kê năm 2023').
3. BỐN Ý a, b, c, d: Khai thác trực tiếp từ ngữ liệu trên. BẮT BUỘC LUÔN GỒM 2 Ý BIẾT, 1 Ý HIỂU, 1 Ý VẬN DỤNG (Ý a mức Biết 'B', Ý b mức Biết 'B', Ý c mức Hiểu 'H', Ý d mức Vận dụng 'V'). Ghi rõ mức độ 'B', 'B', 'H', 'V' tương ứng vào trường "m" của từng ý.

Chỉ trả về JSON định dạng:
{
  "questions": [
    {
      "d": "NLC",
      "m": "B",
      "stem": "phần dẫn",
      "opts": ["phương án A", "phương án B", "phương án C", "phương án D"],
      "ans": "A"
    },
    {
      "d": "DS",
      "m": "H",
      "stem": "phần dẫn",
      "srcs": [{"k": "text", "text": "đoạn trích dẫn ngữ liệu cụ thể đầy đủ chi tiết...", "src": "Nguồn: TCTK"}],
      "items": [
        {"t": "khẳng định a", "a": true, "m": "B"},
        {"t": "khẳng định b", "a": false, "m": "H"},
        {"t": "khẳng định c", "a": true, "m": "H"},
        {"t": "khẳng định d", "a": false, "m": "V"}
      ],
      "chk": false
    },
    {
      "d": "TLN",
      "m": "V",
      "stem": "bài toán tính toán... (quy ước làm tròn)",
      "ans": "12.5"
    },
    {
      "d": "TL",
      "m": "H",
      "stem": "câu hỏi tự luận...",
      "ans": "tóm tắt đáp án",
      "rubric": [{"y": "ý cần đạt", "d": 0.5}]
    }
  ]
}

${rf}
${ext}`;

    const jsonStr = await callGemini(prompt, undefined, 'application/json', useSearch);
    if (jsonStr) {
      const parsed = safeJsonParse(jsonStr, {});
      if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return parsed.questions;
      }
    }
  } catch {
    // Graceful fallback to domain-specific question generator
  }

  return generateFallbackQuestionsForTopic(mon, kh, row, needItems, withExplanation, referenceTexts, essayPoint);
}

export async function suggestExternalSources(
  mon: string,
  kh: string,
  rows: MatrixRow[]
): Promise<{ topic: string; items: { nguon: string; loai: string; tim: string; tukhoa?: string }[] }[]> {
  try {
    const prompt = `Bạn là chuyên gia bộ môn ${mon} lớp ${kh} cấp THPT.
Hãy gợi ý 2-3 nguồn uy tín NGOÀI sách giáo khoa cho các chủ đề sau để giáo viên tra cứu số liệu, biểu đồ, văn bản chính thống ra đề (tên cơ quan hoặc tổ chức ghi đầy đủ, rõ ràng, hạn chế tối đa viết tắt):
${rows.map((r, i) => `${i + 1}. ${r.c} (${r.n})`).join('\n')}

Chỉ trả về JSON định dạng:
{
  "results": [
    {
      "topic": "tên chủ đề",
      "items": [
        {
          "nguon": "tên cơ quan hoặc tổ chức đầy đủ, rõ ràng, hạn chế viết tắt (ví dụ: Tổng cục Thống kê, Bộ Kế hoạch và Đầu tư, Ngân hàng Thế giới, Bộ Y tế)",
          "loai": "số liệu | văn bản | bản đồ | báo cáo",
          "tim": "nội dung cần tìm",
          "tukhoa": "từ khóa"
        }
      ]
    }
  ]
}`;

    const jsonStr = await callGemini(prompt);
    if (jsonStr) {
      const parsed = safeJsonParse(jsonStr, {});
      if (parsed.results && Array.isArray(parsed.results)) {
        return parsed.results;
      }
    }
  } catch {
    // Fallback gracefully
  }

  return rows.map((r) => ({
    topic: r.c,
    items: [
      {
        nguon: 'Tổng cục Thống kê (TCTK)',
        loai: 'số liệu',
        tim: `Niên giám thống kê về ${r.n}`,
        tukhoa: r.n,
      },
      {
        nguon: 'Bộ Giáo dục và Đào tạo',
        loai: 'văn bản',
        tim: `Tài liệu hướng dẫn chuyên môn môn ${mon} lớp ${kh}`,
        tukhoa: mon,
      },
    ],
  }));
}
