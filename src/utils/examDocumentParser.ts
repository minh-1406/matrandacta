import { ExamHeaderConfig, ExamSemester, GeneratedQuestion, SubjectName, TrueFalseSubItem } from '../types';

export type ExamPartCode = 'I' | 'II' | 'III' | 'IV';

export interface ParsedExamPartSummary {
  part: ExamPartCode;
  title: string;
  count: number;
}

export interface DeterministicExamParseResult {
  headerConfig: Partial<ExamHeaderConfig>;
  subject: SubjectName;
  grade: string;
  semester: ExamSemester;
  examCode: string;
  questions: GeneratedQuestion[];
  partSummaries: ParsedExamPartSummary[];
  hasExplicitAnswers: boolean;
}

const DEFAULT_PART_TITLES: Record<ExamPartCode, string> = {
  I: 'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn',
  II: 'PHẦN II. Câu trắc nghiệm đúng sai',
  III: 'PHẦN III. Câu trắc nghiệm trả lời ngắn',
  IV: 'PHẦN IV. Tự luận',
};

function stripUnderlineTags(text: string): string {
  return text.replace(/<\/?(?:u|ins|b|strong)\b[^>]*>/gi, '');
}

function normalizeWhitespaceKeepNewlines(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isExamFooterLine(plainLine: string): boolean {
  const s = plainLine.trim();
  if (!s) return true;
  if (/^-{3,}\s*HẾT\s*-{3,}$/i.test(s) || /^HẾT\.?$/i.test(s)) return true;
  if (/^học\s*sinh\s*không\s*được\s*sử\s*dụng\s*tài\s*liệu/i.test(s)) return true;
  if (/^thí\s*sinh\s*không\s*được\s*sử\s*dụng\s*tài\s*liệu/i.test(s)) return true;
  if (/^giáo\s*viên\s*không\s*được\s*giải\s*thích/i.test(s)) return true;
  if (/^cán\s*bộ\s*coi\s*thi\s*không\s*giải\s*thích/i.test(s)) return true;
  if (/^\[Trang\s*\d+\]$/i.test(s)) return true;
  if (/^Trang\s*\d+\s*\/\s*\d+$/i.test(s)) return true;
  return false;
}

function isAnswerGuideDividerLine(plainLine: string): boolean {
  const s = plainLine.trim();
  return /^(?:BẢNG\s*ĐÁP\s*ÁN|HƯỚNG\s*DẪN\s*CHẤM|ĐÁP\s*ÁN\s*(?:VÀ|&)\s*THANG\s*ĐIỂM|HƯỚNG\s*DẪN\s*CHẤM\s*VÀ\s*BIỂU\s*ĐIỂM|ĐÁP\s*ÁN\s*CHI\s*TIẾT|ĐÁP\s*ÁN\s*ĐỀ\s*(?:THI|KIỂM\s*TRA))\b/i.test(
    s
  );
}

/**
 * Strictly detects section headers ONLY at line starts.
 * Prevents false positives on ordinary sentences containing "phần đất liền", "phần lãnh thổ", "phần trăm", "đúng hoặc sai", etc.
 */
function detectSectionHeader(plainLine: string): { part: ExamPartCode; title: string } | null {
  const s = plainLine.trim();
  if (!s) return null;

  // 1. Explicit "PHẦN I / II / III / IV" or "Phần 1 / 2 / 3 / 4" or "PART 1..4" at start of line
  const explicitMatch = s.match(
    /^(?:PHẦN|Phần|phần|PART|Part)\s+(IV|III|II|I|4|3|2|1)(?=\s*[\.\:\-\–\—\(]|\s|$)(.*)$/
  );
  if (explicitMatch) {
    const token = explicitMatch[1].toUpperCase();
    const rest = (explicitMatch[2] || '').trim();
    const restLower = rest.toLowerCase();

    let part: ExamPartCode;
    if (token === 'IV' || token === '4') part = 'IV';
    else if (token === 'III' || token === '3') part = 'III';
    else if (token === 'II' || token === '2') part = 'II';
    else part = 'I';

    // Also double-check semantic hint if a teacher numbered parts differently (e.g. skipped Part III and wrote "PHẦN III. Tự luận")
    if (/tự\s*luận/i.test(restLower) && !/trắc\s*nghiệm/i.test(restLower)) {
      part = 'IV';
    } else if (/trả\s*lời\s*ngắn/i.test(restLower)) {
      part = 'III';
    } else if (/đúng\s*[\-\/]?\s*sai/i.test(restLower)) {
      part = 'II';
    } else if (/nhiều\s*phương\s*án\s*lựa\s*chọn/i.test(restLower)) {
      part = 'I';
    }

    // Extract concise part title (up to "Học sinh trả lời..." or "Thí sinh trả lời...")
    const cleanTitle = s
      .replace(/\s*(?:Học\s*sinh|Thí\s*sinh)\s+trả\s+lời\s+từ\s+câu[\s\S]*$/i, '')
      .replace(/\.\s*$/, '')
      .trim();

    return { part, title: cleanTitle || DEFAULT_PART_TITLES[part] };
  }

  // 2. Standalone Roman/Arabic heading like "I. TRẮC NGHIỆM...", "II. ĐÚNG SAI...", "III. TRẢ LỜI NGẮN...", "IV. TỰ LUẬN..."
  const romanMatch = s.match(/^(IV|III|II|I|[1-4])\s*[\.\:\)]\s*(.+)$/);
  if (romanMatch) {
    const rest = romanMatch[2].trim();
    if (/^(?:câu\s*trắc\s*nghiệm|trắc\s*nghiệm\s*nhiều\s*phương\s*án|trắc\s*nghiệm\s*khách\s*quan)/i.test(rest)) {
      return { part: 'I', title: s.replace(/\s*(?:Học\s*sinh|Thí\s*sinh)\s+trả\s+lời[\s\S]*$/i, '').trim() };
    }
    if (/^(?:câu\s*trắc\s*nghiệm\s*đúng|trắc\s*nghiệm\s*đúng|đúng\s*[\-\/]?\s*sai)/i.test(rest)) {
      return { part: 'II', title: s.replace(/\s*(?:Học\s*sinh|Thí\s*sinh)\s+trả\s+lời[\s\S]*$/i, '').trim() };
    }
    if (/^(?:câu\s*trắc\s*nghiệm\s*(?:yêu\s*cầu\s*)?trả\s*lời\s*ngắn|trả\s*lời\s*ngắn)/i.test(rest)) {
      return { part: 'III', title: s.replace(/\s*(?:Học\s*sinh|Thí\s*sinh)\s+trả\s+lời[\s\S]*$/i, '').trim() };
    }
    if (/^(?:tự\s*luận|phần\s*tự\s*luận)/i.test(rest)) {
      return { part: 'IV', title: s.replace(/\s*(?:Học\s*sinh|Thí\s*sinh)\s+trả\s+lời[\s\S]*$/i, '').trim() };
    }
  }

  return null;
}

function isPartInstructionContinuation(plainLine: string): boolean {
  const s = plainLine.trim();
  if (!s) return true;
  return (
    /^(?:học\s*sinh|thí\s*sinh)\s+trả\s+lời\s+từ\s+câu/i.test(s) ||
    /^mỗi\s+câu\s+hỏi\s+(?:học\s*sinh|thí\s*sinh)\s+chỉ\s+chọn/i.test(s) ||
    /^câu\s+hỏi\s+(?:học\s*sinh|thí\s*sinh)\s+chỉ\s+chọn/i.test(s) ||
    /^trong\s+mỗi\s+ý\s+a[\)\.]?\s*,\s*b[\)\.]?/i.test(s) ||
    /^ở\s+mỗi\s+câu\s*,?\s*(?:học\s*sinh|thí\s*sinh)\s+chọn\s+đúng\s+hoặc\s+sai/i.test(s)
  );
}

/**
 * Matches a question start ONLY at line start: "Câu 1.", "Câu 12:", "Question 1.", "Q1.", "Bài 1."
 */
function matchQuestionStart(rawLine: string): { num: number; restRaw: string } | null {
  const plain = stripUnderlineTags(rawLine).trim();
  const m = plain.match(/^(?:Câu|CÂU|câu|Question|Q|Bài|BÀI)\s*\.?\s*(\d+)\s*([\.\:\-\)])(?:\s+(.*)|$)/);
  if (!m) return null;

  // Strip the exact prefix from the raw line while preserving any <u> tags in the remainder
  const num = parseInt(m[1], 10);
  const restRaw = rawLine
    .replace(/^\s*(?:<\/?(?:u|ins|b|strong)\b[^>]*>\s*)*(?:Câu|CÂU|câu|Question|Q|Bài|BÀI)\s*\.?\s*\d+\s*(?:<\/?(?:u|ins|b|strong)\b[^>]*>\s*)*[\.\:\-\)]\s*/i, '')
    .trim();

  return { num, restRaw };
}

interface RawQuestionBlock {
  part: ExamPartCode;
  originalNum: number;
  seqNum: number; // Strictly 1-based counter reset at every new part
  lines: string[];
  sharedPreamble: string;
}

/**
 * Parses answer keys from an appended answer/rubric section (if present at end of exam).
 */
function parseGuideAnswerMaps(guideText: string) {
  const partI: Record<number, string> = {};
  const partII: Record<number, Record<'a' | 'b' | 'c' | 'd', boolean>> = {};
  const partIII: Record<number, string> = {};
  const partIV: Record<number, string> = {};

  if (!guideText.trim()) {
    return { partI, partII, partIII, partIV };
  }

  const lines = guideText.split('\n');
  let activePart: ExamPartCode = 'I';
  let currentEssayNum: number | null = null;
  let currentEssayLines: string[] = [];

  const flushEssay = () => {
    if (currentEssayNum !== null && currentEssayLines.length > 0 && !partIV[currentEssayNum]) {
      partIV[currentEssayNum] = currentEssayLines.join('\n').trim();
    }
    currentEssayNum = null;
    currentEssayLines = [];
  };

  for (const rawLine of lines) {
    const plain = stripUnderlineTags(rawLine).trim();
    if (!plain) continue;

    const sec = detectSectionHeader(plain);
    if (sec) {
      flushEssay();
      activePart = sec.part;
      continue;
    }

    if (activePart === 'I') {
      const matches = plain.matchAll(/(?:câu\s*)?(\d+)\s*[\.\:\-\|\s]\s*([A-D])(?=\s|$|[,;|])/gi);
      for (const m of matches) {
        const qn = parseInt(m[1], 10);
        if (qn > 0 && qn <= 100 && !partI[qn]) {
          partI[qn] = m[2].toUpperCase();
        }
      }
    } else if (activePart === 'II') {
      const m = plain.match(
        /(?:câu\s*)?(\d+)[\s\S]*?a[\s\)\.\:\-]+(đúng|sai|đ|s)\b[\s\S]*?b[\s\)\.\:\-]+(đúng|sai|đ|s)\b[\s\S]*?c[\s\)\.\:\-]+(đúng|sai|đ|s)\b[\s\S]*?d[\s\)\.\:\-]+(đúng|sai|đ|s)\b/i
      );
      if (m) {
        const qn = parseInt(m[1], 10);
        if (qn > 0 && !partII[qn]) {
          partII[qn] = {
            a: /^đ/i.test(m[2]),
            b: /^đ/i.test(m[3]),
            c: /^đ/i.test(m[4]),
            d: /^đ/i.test(m[5]),
          };
        }
      }
    } else if (activePart === 'III') {
      const matches = plain.matchAll(/(?:câu\s*)?(\d+)\s*[\.\:\-\|]\s*([\-+]?\d+(?:[.,]\d+)?)/gi);
      for (const m of matches) {
        const qn = parseInt(m[1], 10);
        if (qn > 0 && qn <= 50 && !partIII[qn]) {
          partIII[qn] = m[2].trim();
        }
      }
    } else if (activePart === 'IV') {
      const qStart = matchQuestionStart(rawLine);
      if (qStart) {
        flushEssay();
        currentEssayNum = qStart.num;
        if (qStart.restRaw) currentEssayLines.push(stripUnderlineTags(qStart.restRaw));
      } else if (currentEssayNum !== null) {
        currentEssayLines.push(plain);
      }
    }
  }
  flushEssay();

  return { partI, partII, partIII, partIV };
}

/**
 * Extracts Part I (Multiple Choice) question stem, 4 verbatim options, and underlined/marked answer.
 */
function parsePartIQuestion(
  block: RawQuestionBlock,
  guideAnswer?: string
): { question: GeneratedQuestion; explicitAnswerFound: boolean } {
  const joinedRaw = block.lines.join('\n');

  // Match A. / B. / C. / D. markers (optionally wrapped inside <u>...</u> or <b>...</b>)
  // Must occur at start of string, after whitespace, or after a closing tag
  const optMarkerRegex = /(?:^|[\s>])((?:<(?:u|b)>\s*)?([A-D])(?:\s*<\/(?:u|b)>)?\s*[\.\)](?:\s*<\/(?:u|b)>)?)(?=\s|$)/g;
  const markers: { letter: string; startIdx: number; afterMarkerIdx: number; labelUnderlined: boolean; labelBold: boolean }[] = [];

  let m: RegExpExecArray | null;
  while ((m = optMarkerRegex.exec(joinedRaw)) !== null) {
    const fullPrefix = m[0];
    const token = m[1];
    const letter = m[2].toUpperCase();
    const leadingOffset = fullPrefix.length - token.length;
    const startIdx = m.index + leadingOffset;
    const afterMarkerIdx = m.index + fullPrefix.length;
    const labelUnderlined = /<u>/i.test(token);
    const labelBold = /<b>/i.test(token);

    // Ensure markers follow sequential order A -> B -> C -> D (avoid matching capital letters like "B." inside text unless valid)
    const expectedOrder = ['A', 'B', 'C', 'D'];
    if (markers.length === 0 && letter === 'A') {
      markers.push({ letter, startIdx, afterMarkerIdx, labelUnderlined, labelBold });
    } else if (markers.length > 0 && markers.length < 4 && letter === expectedOrder[markers.length]) {
      markers.push({ letter, startIdx, afterMarkerIdx, labelUnderlined, labelBold });
    }
  }

  let stem = '';
  const opts: string[] = [];
  let underlinedLetter = '';
  const boldLetters: string[] = [];

  if (markers.length >= 2) {
    stem = stripUnderlineTags(joinedRaw.slice(0, markers[0].startIdx))
      .replace(/\s*\n\s*/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();

    for (let i = 0; i < markers.length; i++) {
      const cur = markers[i];
      const next = markers[i + 1];
      const rawBody = joinedRaw.slice(cur.afterMarkerIdx, next ? next.startIdx : joinedRaw.length);

      // Check if either the option label ("<u>B.</u>") or the option text ("<u>Đông Dương.</u>") is underlined
      if (cur.labelUnderlined || /<u>[\s\S]*?<\/u>/i.test(rawBody)) {
        underlinedLetter = cur.letter;
      }
      if (cur.labelBold || /<b>[\s\S]*?<\/b>/i.test(rawBody)) {
        boldLetters.push(cur.letter);
      }

      const cleanOpt = stripUnderlineTags(rawBody)
        .replace(/\s*\n\s*/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim();
      opts.push(cleanOpt);
    }
  } else {
    stem = stripUnderlineTags(joinedRaw).replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim();
  }

  while (opts.length < 4) {
    opts.push('[KHÔNG ĐỌC ĐƯỢC DỮ LIỆU GỐC]');
  }

  // If no underline was found, check if exactly ONE option was marked bold (e.g. bold correct answer)
  const boldAnswer = !underlinedLetter && boldLetters.length === 1 ? boldLetters[0] : '';
  const resolvedAns = underlinedLetter || boldAnswer || guideAnswer || '';
  const explicitAnswerFound = Boolean(resolvedAns);

  return {
    question: {
      d: 'NLC',
      m: 'B',
      stem: stem || `[KHÔNG ĐỌC ĐƯỢC DỮ LIỆU GỐC]`,
      opts: opts.slice(0, 4),
      ans: 'ABCD'.includes(resolvedAns) ? resolvedAns : '',
      gt: explicitAnswerFound ? undefined : '[AI giải]',
    },
    explicitAnswerFound,
  };
}

/**
 * Extracts Part II (True/False) verbatim stem and 4 sub-items a, b, c, d with underlined truth detection.
 */
function parsePartIIQuestion(
  block: RawQuestionBlock,
  guideAns?: Record<'a' | 'b' | 'c' | 'd', boolean>
): { question: GeneratedQuestion; explicitAnswerFound: boolean } {
  const joinedRaw = block.lines.join('\n');

  // Match a) / b) / c) / d) or a. / b. / c. / d. at line start (optionally wrapped in <u>...</u>)
  const subMarkerRegex = /(?:^|\n)\s*((?:<u>\s*)?([a-d])(?:\s*<\/u>)?\s*[\)\.](?:\s*<\/u>)?)\s+/g;
  const markers: { letter: 'a' | 'b' | 'c' | 'd'; startIdx: number; afterMarkerIdx: number; labelUnderlined: boolean }[] = [];
  const expected = ['a', 'b', 'c', 'd'] as const;

  let m: RegExpExecArray | null;
  while ((m = subMarkerRegex.exec(joinedRaw)) !== null) {
    const token = m[1];
    const letter = m[2].toLowerCase() as 'a' | 'b' | 'c' | 'd';
    const startIdx = m.index;
    const afterMarkerIdx = m.index + m[0].length;
    const labelUnderlined = /<u>/i.test(token);

    if (markers.length < 4 && letter === expected[markers.length]) {
      markers.push({ letter, startIdx, afterMarkerIdx, labelUnderlined });
    }
  }

  let stem = '';
  const items: TrueFalseSubItem[] = [];
  let anyExplicitMark = Boolean(guideAns);

  if (markers.length >= 2) {
    stem = stripUnderlineTags(joinedRaw.slice(0, markers[0].startIdx))
      .replace(/[ \t]+\n/g, '\n')
      .trim();

    for (let i = 0; i < markers.length; i++) {
      const cur = markers[i];
      const next = markers[i + 1];
      const rawBody = joinedRaw.slice(cur.afterMarkerIdx, next ? next.startIdx : joinedRaw.length);

      const isUnderlined = cur.labelUnderlined || /<u>[\s\S]*?<\/u>/i.test(rawBody);
      const hasInlineTrue = /\((?:đúng|đ)\)\s*$/i.test(stripUnderlineTags(rawBody).trim());
      const hasInlineFalse = /\((?:sai|s)\)\s*$/i.test(stripUnderlineTags(rawBody).trim());

      if (isUnderlined || hasInlineTrue || hasInlineFalse) {
        anyExplicitMark = true;
      }

      let isTrue = false;
      if (guideAns && guideAns[cur.letter] !== undefined) {
        isTrue = guideAns[cur.letter];
      } else if (hasInlineFalse) {
        isTrue = false;
      } else {
        isTrue = isUnderlined || hasInlineTrue;
      }

      const cleanText = stripUnderlineTags(rawBody)
        .replace(/\s*\((?:đúng|sai|đ|s)\)\s*$/i, '')
        .replace(/\s*\n\s*/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim();

      items.push({
        t: cleanText || '[KHÔNG ĐỌC ĐƯỢC DỮ LIỆU GỐC]',
        a: isTrue,
        m: i < 2 ? 'B' : i === 2 ? 'H' : 'V',
      });
    }
  } else {
    stem = stripUnderlineTags(joinedRaw).trim();
  }

  while (items.length < 4) {
    const idx = items.length;
    items.push({
      t: '[KHÔNG ĐỌC ĐƯỢC DỮ LIỆU GỐC]',
      a: false,
      m: idx < 2 ? 'B' : idx === 2 ? 'H' : 'V',
    });
  }

  return {
    question: {
      d: 'DS',
      m: 'H',
      stem: stem || `[KHÔNG ĐỌC ĐƯỢC DỮ LIỆU GỐC]`,
      items: items.slice(0, 4),
      gt: anyExplicitMark ? undefined : '[AI giải]',
    },
    explicitAnswerFound: anyExplicitMark,
  };
}

/**
 * Extracts Part III (Short Answer) verbatim stem + answer right below the question (e.g. "A. 4,2", "Đáp án: 306").
 */
function parsePartIIIQuestion(
  block: RawQuestionBlock,
  guideAnswer?: string
): { question: GeneratedQuestion; explicitAnswerFound: boolean } {
  const cleanLines: string[] = [];
  let extractedAns = guideAnswer || '';

  for (const rawLine of block.lines) {
    const plain = stripUnderlineTags(rawLine).trim();
    if (!plain) continue;

    // Detect standalone short-answer line right below the question: "A. 4,2", "A. 306", "Đáp án: 48,6", "KQ: -3,5"
    const ansLineMatch =
      plain.match(/^(?:A|Đáp\s*án|ĐA|KQ|Kết\s*quả|Ans)\s*[\.\:\-]\s*([\-+]?\d+(?:[.,]\d+)?(?:\s*%?)?)\s*$/i) ||
      rawLine.trim().match(/^<u>\s*([\-+]?\d+(?:[.,]\d+)?)\s*<\/u>$/i);

    if (ansLineMatch) {
      extractedAns = ansLineMatch[1].trim();
      continue; // Remove answer line from stem so stem stays clean verbatim
    }

    cleanLines.push(plain);
  }

  let stem = cleanLines.join('\n').trim();

  // If this question references a shared table/stimulus that appeared before Câu 1 in Part III, attach it cleanly
  const srcs =
    block.sharedPreamble &&
    (block.seqNum === 1 || /bảng\s*số\s*liệu\s*(?:trên|tên)|thông\s*tin\s*trên/i.test(stem))
      ? [{ k: 'text' as const, text: block.sharedPreamble }]
      : undefined;

  // Fallback check for inline "Đáp án: ..." at the end of a single-line question
  if (!extractedAns) {
    const inlineAns = stem.match(/(?:đáp\s*án|kết\s*quả|kq)\s*[:\-]\s*([\-+]?\d+(?:[.,]\d+)?)\s*$/i);
    if (inlineAns) {
      extractedAns = inlineAns[1].trim();
      stem = stem.slice(0, inlineAns.index).trim();
    }
  }

  const explicitAnswerFound = Boolean(extractedAns);

  return {
    question: {
      d: 'TLN',
      m: 'V',
      stem: stem || '[KHÔNG ĐỌC ĐƯỢC DỮ LIỆU GỐC]',
      srcs,
      ans: extractedAns || '',
      gt: explicitAnswerFound ? undefined : '[AI giải]',
    },
    explicitAnswerFound,
  };
}

/**
 * Extracts Part IV (Essay) verbatim prompt including score markers, tables, and sub-items a), b).
 */
function parsePartIVQuestion(
  block: RawQuestionBlock,
  guideAnswer?: string
): { question: GeneratedQuestion; explicitAnswerFound: boolean } {
  const stem = block.lines
    .map((l) => stripUnderlineTags(l).trim())
    .filter(Boolean)
    .join('\n')
    .trim();

  const explicitAnswerFound = Boolean(guideAnswer && guideAnswer.trim().length > 0);

  return {
    question: {
      d: 'TL',
      m: 'V',
      stem: stem || '[KHÔNG ĐỌC ĐƯỢC DỮ LIỆU GỐC]',
      ans: explicitAnswerFound ? guideAnswer!.trim() : '',
      gt: explicitAnswerFound ? undefined : '[AI giải]',
    },
    explicitAnswerFound,
  };
}

/**
 * Main Layout-Aware Finite State Machine (FSM) Exam Parser.
 * Reads top-to-bottom, splits strictly on line-start section headers (PHẦN I / II / III / IV),
 * resets question counter to 1 at EVERY new section, and preserves 100% verbatim text & real answers.
 */
export function parseExamDocumentFSM(
  formattedText: string,
  defaultSubject: SubjectName,
  defaultGrade: string,
  defaultSemester: ExamSemester
): DeterministicExamParseResult {
  const normalized = normalizeWhitespaceKeepNewlines(formattedText || '');
  const allLines = normalized.split('\n');

  // 1. Extract metadata from top lines (before first section header)
  let soGiaoDuc = '';
  let truongThpt = '';
  let tenKyThi = '';
  let namHoc = '2025 - 2026';
  let thoiGianLamBai = '50';
  let ghiChuDeThi = '(Đề thi có ... trang)';
  let examCode = '101';

  for (const rawLine of allLines.slice(0, 30)) {
    const l = stripUnderlineTags(rawLine).trim();
    if (detectSectionHeader(l)) break;
    if (/sở\s*giáo\s*dục/i.test(l) && !soGiaoDuc) soGiaoDuc = l;
    if (/trường\s*(?:thpt|thcs|gdtx)/i.test(l) && !truongThpt) truongThpt = l;
    if (/đề\s*(?:kiểm\s*tra|thi)|kì\s*thi|kỳ\s*thi/i.test(l) && !tenKyThi) tenKyThi = l;
    const nhMatch = l.match(/năm\s*học\s*[:\-]?\s*(\d{4}\s*[\-\–]\s*\d{4})/i);
    if (nhMatch) namHoc = nhMatch[1];
    const tgMatch = l.match(/thời\s*gian\s*(?:làm\s*bài)?\s*[:\-]?\s*(\d+)\s*phút/i);
    if (tgMatch) thoiGianLamBai = tgMatch[1];
    const codeMatch = l.match(/mã\s*đề(?:\s*thi)?\s*[:\-]?\s*(\d+)/i);
    if (codeMatch) examCode = codeMatch[1];
  }

  // 2. Separate Exam Body vs. Answer Guide / Rubric (if appended at the end)
  const bodyLines: string[] = [];
  const guideLines: string[] = [];
  let inGuide = false;

  for (const rawLine of allLines) {
    const plain = stripUnderlineTags(rawLine).trim();
    if (!plain) continue;
    if (!inGuide && bodyLines.length > 5 && isAnswerGuideDividerLine(plain)) {
      inGuide = true;
      continue;
    }
    if (inGuide) {
      guideLines.push(rawLine);
    } else if (!isExamFooterLine(plain)) {
      bodyLines.push(rawLine);
    }
  }

  const guideMaps = parseGuideAnswerMaps(guideLines.join('\n'));

  // 3. Finite State Machine (FSM) Pass: Top-to-Bottom Section & Question Segmentation
  let currentPart: ExamPartCode | null = null;
  const partTitles: Partial<Record<ExamPartCode, string>> = {};
  const partOrder: ExamPartCode[] = [];
  let partQuestionCounter = 0; // Resets to 0 on EVERY new section!
  let sharedPreambleLines: string[] = [];
  let activeBlock: RawQuestionBlock | null = null;
  const rawBlocks: RawQuestionBlock[] = [];

  const flushActiveBlock = () => {
    if (activeBlock) {
      rawBlocks.push(activeBlock);
      activeBlock = null;
    }
  };

  for (const rawLine of bodyLines) {
    const plain = stripUnderlineTags(rawLine).trim();
    if (!plain) continue;

    // State Transition A: Section Header detected at line start
    const secHeader = detectSectionHeader(plain);
    if (secHeader) {
      flushActiveBlock();
      currentPart = secHeader.part;
      partQuestionCounter = 0; // STRICT RESET to 0 when entering a new part
      sharedPreambleLines = [];
      if (!partTitles[currentPart]) {
        partTitles[currentPart] = secHeader.title;
      }
      if (!partOrder.includes(currentPart)) {
        partOrder.push(currentPart);
      }
      continue;
    }

    // State Transition B: Question Start detected at line start
    const qStart = matchQuestionStart(rawLine);
    if (qStart) {
      flushActiveBlock();
      if (!currentPart) {
        // Exam without explicit section header defaults to Part I
        currentPart = 'I';
        partTitles.I = DEFAULT_PART_TITLES.I;
        if (!partOrder.includes('I')) partOrder.push('I');
      }
      partQuestionCounter += 1;
      activeBlock = {
        part: currentPart,
        originalNum: qStart.num,
        seqNum: partQuestionCounter,
        lines: qStart.restRaw ? [qStart.restRaw] : [],
        sharedPreamble: sharedPreambleLines.join('\n').trim(),
      };
      continue;
    }

    // State Transition C: Content line inside an active question
    if (activeBlock) {
      activeBlock.lines.push(rawLine);
      continue;
    }

    // State Transition D: Preamble lines inside a part BEFORE Câu 1 (e.g., shared data table / passage)
    if (currentPart && !isPartInstructionContinuation(plain)) {
      sharedPreambleLines.push(plain);
    }
  }
  flushActiveBlock();

  // 4. Parse each raw question block verbatim according to its part type
  const questions: GeneratedQuestion[] = [];
  let explicitAnswersCount = 0;

  for (const block of rawBlocks) {
    if (block.part === 'I') {
      const { question, explicitAnswerFound } = parsePartIQuestion(
        block,
        guideMaps.partI[block.originalNum] || guideMaps.partI[block.seqNum]
      );
      if (explicitAnswerFound) explicitAnswersCount++;
      questions.push(question);
    } else if (block.part === 'II') {
      const { question, explicitAnswerFound } = parsePartIIQuestion(
        block,
        guideMaps.partII[block.originalNum] || guideMaps.partII[block.seqNum]
      );
      if (explicitAnswerFound) explicitAnswersCount++;
      questions.push(question);
    } else if (block.part === 'III') {
      const { question, explicitAnswerFound } = parsePartIIIQuestion(
        block,
        guideMaps.partIII[block.originalNum] || guideMaps.partIII[block.seqNum]
      );
      if (explicitAnswerFound) explicitAnswersCount++;
      questions.push(question);
    } else if (block.part === 'IV') {
      const { question, explicitAnswerFound } = parsePartIVQuestion(
        block,
        guideMaps.partIV[block.originalNum] || guideMaps.partIV[block.seqNum]
      );
      if (explicitAnswerFound) explicitAnswersCount++;
      questions.push(question);
    }
  }

  const partSummaries: ParsedExamPartSummary[] = (['I', 'II', 'III', 'IV'] as ExamPartCode[])
    .map((p) => {
      const dMap: Record<ExamPartCode, GeneratedQuestion['d']> = {
        I: 'NLC',
        II: 'DS',
        III: 'TLN',
        IV: 'TL',
      };
      const count = questions.filter((q) => q.d === dMap[p]).length;
      return {
        part: p,
        title: partTitles[p] || DEFAULT_PART_TITLES[p],
        count,
      };
    })
    .filter((s) => s.count > 0);

  return {
    headerConfig: {
      soGiaoDuc: soGiaoDuc || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO',
      truongThpt: truongThpt || 'TRƯỜNG THPT',
      tenKyThi: tenKyThi || 'ĐỀ KIỂM TRA ĐỊNH KÌ',
      namHoc,
      thoiGianLamBai,
      ghiChuDeThi,
    },
    subject: defaultSubject,
    grade: defaultGrade,
    semester: defaultSemester,
    examCode,
    questions,
    partSummaries,
    hasExplicitAnswers: explicitAnswersCount > 0,
  };
}

/**
 * Formats extracted questions into the exact 100% verbatim structured text report:
 * === [TÊN PHẦN] (Tổng số: [X] câu) ===
 * Câu [Số]: [Nội dung nguyên văn]
 * [Các phương án nếu có]
 * -> Đáp án đúng: [...]
 */
export function formatVerbatimExamReport(
  questions: GeneratedQuestion[],
  partSummaries?: ParsedExamPartSummary[]
): string {
  const sections: { code: ExamPartCode; d: GeneratedQuestion['d']; fallbackTitle: string }[] = [
    { code: 'I', d: 'NLC', fallbackTitle: DEFAULT_PART_TITLES.I },
    { code: 'II', d: 'DS', fallbackTitle: DEFAULT_PART_TITLES.II },
    { code: 'III', d: 'TLN', fallbackTitle: DEFAULT_PART_TITLES.III },
    { code: 'IV', d: 'TL', fallbackTitle: DEFAULT_PART_TITLES.IV },
  ];

  const blocks: string[] = [];

  for (const sec of sections) {
    const qs = questions.filter((q) => q.d === sec.d);
    if (qs.length === 0) continue;

    const customTitle = partSummaries?.find((s) => s.part === sec.code)?.title || sec.fallbackTitle;
    const lines: string[] = [`=== ${customTitle} (Tổng số: ${qs.length} câu) ===`];

    qs.forEach((q, idx) => {
      const qNum = idx + 1;
      if (q.srcs && q.srcs.length > 0 && idx === 0) {
        q.srcs.forEach((src) => {
          if (src.text) {
            lines.push(src.text);
          }
        });
      }

      lines.push(`Câu ${qNum}: ${q.stem}`);

      const aiSolvedTag = q.gt && /\[AI\s*giải\]/i.test(q.gt) ? ' [AI giải]' : '';

      if (q.d === 'NLC' && Array.isArray(q.opts)) {
        const labels = ['A', 'B', 'C', 'D'];
        q.opts.slice(0, 4).forEach((opt, oi) => {
          lines.push(`${labels[oi]}. ${opt}`);
        });
        lines.push(`-> Đáp án đúng: ${q.ans || '[KHÔNG ĐỌC ĐƯỢC DỮ LIỆU GỐC]'}${aiSolvedTag}`);
      } else if (q.d === 'DS' && Array.isArray(q.items)) {
        const labels = ['a', 'b', 'c', 'd'];
        q.items.slice(0, 4).forEach((it, ii) => {
          lines.push(`${labels[ii]}) ${it.t}`);
        });
        const ansStr = q.items
          .slice(0, 4)
          .map((it, ii) => `${labels[ii]}) ${it.a ? 'ĐÚNG' : 'SAI'}`)
          .join(' | ');
        lines.push(`-> Đáp án đúng: ${ansStr}${aiSolvedTag}`);
      } else if (q.d === 'TLN') {
        lines.push(`-> Đáp án đúng: ${q.ans || '[KHÔNG ĐỌC ĐƯỢC DỮ LIỆU GỐC]'}${aiSolvedTag}`);
      } else if (q.d === 'TL') {
        lines.push(`-> Đáp án đúng: ${q.ans || '[KHÔNG ĐỌC ĐƯỢC DỮ LIỆU GỐC]'}${aiSolvedTag}`);
      }
      lines.push('');
    });

    blocks.push(lines.join('\n').trim());
  }

  return blocks.join('\n\n');
}
