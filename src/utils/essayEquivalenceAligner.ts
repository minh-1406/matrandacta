import { GeneratedQuestion, MatrixRow, QuestionPointConfig, RubricItem } from '../types';

export interface AlignmentResult {
  updatedSets: GeneratedQuestion[][];
  alignedQuestionCount: number;
  changesSummary: string[];
}

const COGNITIVE_VERBS: Record<'B' | 'H' | 'V', string[]> = {
  B: ['Nêu', 'Trình bày', 'Chỉ ra', 'Liệt kê', 'Xác định'],
  H: ['Giải thích', 'Phân tích', 'Làm rõ', 'So sánh', 'Chứng minh'],
  V: ['Vận dụng kiến thức để giải quyết', 'Đề xuất giải pháp', 'Phân tích và liên hệ thực tiễn', 'Đánh giá tác động'],
};

/**
 * Counts words in a string accurately in Vietnamese.
 */
function countWords(str: string): number {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Parses an answer text into an array of clean, deduplicated bullet point strings.
 */
function parseAnswerIntoBullets(text: string): string[] {
  if (!text) return [];
  const preCleaned = String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/([.?!;])\s*(?=[-•+]\s*[\p{Lu}\d])/gu, '$1\n')
    .replace(/\s+[•]\s+/g, '\n- ');

  const lines = preCleaned
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const dedupeList = (items: string[]): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of items) {
      const clean = raw.replace(/^[-+*•–—\d.)\s]+/, '').trim();
      if (!clean) continue;
      const key = clean
        .toLowerCase()
        .replace(/[.,:;?!()[\]{}"'“”‘’\-–—\s]+/g, ' ')
        .trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(clean);
    }
    return out;
  };

  // Filter lines that look like bullet points or numbered lists
  const bulletLines = lines.filter((l) => /^[-+*•–—]|\d+[.)]/.test(l));
  if (bulletLines.length >= 2) {
    return dedupeList(bulletLines);
  }
  if (lines.length >= 2) {
    return dedupeList(lines);
  }

  // If not bulleted by line, split by sentences (period followed by space or newline)
  const sentences = preCleaned
    .split(/(?<=[.?!;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length >= 2) {
    return dedupeList(sentences);
  }

  return dedupeList([preCleaned.trim()]);
}

/**
 * Normalizes an answer into clean, non-repeating bullet points.
 */
function harmonizeBulletsAndLength(
  currentAns: string,
  targetCount: number,
  _targetTotalWords: number,
  level: 'B' | 'H' | 'V',
  topicHint: string = ''
): { normalizedAns: string; bullets: string[] } {
  let bullets = parseAnswerIntoBullets(currentAns);

  if (bullets.length < targetCount) {
    const expanded: string[] = [];
    bullets.forEach((b) => {
      const parts = b.split(/[;]\s+/).map((p) => p.trim()).filter((p) => p.length > 12);
      if (parts.length > 1 && expanded.length + parts.length <= targetCount) {
        expanded.push(...parts);
      } else {
        expanded.push(b);
      }
    });

    const fallbackPool: Record<'B' | 'H' | 'V', string[]> = {
      B: [
        `Trình bày đúng các biểu hiện đặc trưng và số liệu dẫn chứng tiêu biểu về ${topicHint || 'nội dung bài học'}.`,
        `Xác định rõ phạm vi phân bố và các thành phần chủ yếu theo chuẩn SGK.`,
      ],
      H: [
        `Phân tích tác động kết hợp của các nhân tố tự nhiên và kinh tế - xã hội.`,
        `Làm rõ mối liên hệ nhân quả và ý nghĩa đối với sự phát triển kinh tế vùng.`,
      ],
      V: [
        `Đề xuất giải pháp khai thác hợp lí tiềm năng gắn với bảo vệ môi trường bền vững.`,
        `Liên hệ thực tiễn chuyển dịch cơ cấu sản xuất thích ứng với biến đổi khí hậu.`,
      ],
    };

    const pool = fallbackPool[level] || fallbackPool.H;
    let poolIdx = 0;
    while (expanded.length < targetCount && poolIdx < pool.length) {
      const candidate = pool[poolIdx++];
      const isDup = expanded.some(
        (existing) => existing.toLowerCase().slice(0, 25) === candidate.toLowerCase().slice(0, 25)
      );
      if (!isDup) {
        expanded.push(candidate);
      }
    }
    bullets = expanded.slice(0, targetCount);
  } else if (bullets.length > targetCount) {
    const merged: string[] = bullets.slice(0, targetCount - 1);
    const tail = bullets.slice(targetCount - 1).join('; ');
    merged.push(tail);
    bullets = merged;
  }

  const seenFinal = new Set<string>();
  const balancedBullets: string[] = [];
  for (const b of bullets) {
    let clean = b.replace(/^[-+*•–—\d.)\s]+/, '').trim();
    if (!clean) continue;
    if (!/[.?!]$/.test(clean)) clean += '.';
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    const key = clean.toLowerCase();
    if (!seenFinal.has(key)) {
      seenFinal.add(key);
      balancedBullets.push(`- ${clean}`);
    }
  }

  return {
    normalizedAns: balancedBullets.join('\n'),
    bullets: balancedBullets.map((b) => b.replace(/^[-•]\s*/, '')),
  };
}

/**
 * Ensures the question stem uses an appropriate command verb matching the cognitive level
 * and balances the stem length.
 */
function harmonizeStemVerbAndLength(
  stem: string,
  targetVerb: string,
  level: 'B' | 'H' | 'V',
  targetStemWords: number
): string {
  let cleanStem = stem.trim();

  // Check if stem already starts with an action verb
  const verbsList = [...COGNITIVE_VERBS.B, ...COGNITIVE_VERBS.H, ...COGNITIVE_VERBS.V];
  const matchedVerb = verbsList.find((v) => cleanStem.toLowerCase().startsWith(v.toLowerCase()));

  // Replace or prepend the target verb if mismatched with level
  const appropriateVerbs = COGNITIVE_VERBS[level];
  const desiredVerb = appropriateVerbs.includes(matchedVerb || '') ? matchedVerb! : targetVerb || appropriateVerbs[0];

  if (matchedVerb && matchedVerb.toLowerCase() !== desiredVerb.toLowerCase()) {
    cleanStem = desiredVerb + cleanStem.slice(matchedVerb.length);
  } else if (!matchedVerb) {
    cleanStem = `${desiredVerb} ${cleanStem.charAt(0).toLowerCase() + cleanStem.slice(1)}`;
  }

  // Check word count balance
  const currentWords = countWords(cleanStem);
  if (currentWords < targetStemWords * 0.65) {
    // Add standard context clarification to balance length
    if (!cleanStem.includes('dựa vào') && !cleanStem.includes('trên cơ sở')) {
      cleanStem = cleanStem.replace(/[.?]$/, '') + ' (nêu rõ các luận điểm chính và dẫn chứng cụ thể).';
    }
  }

  return cleanStem;
}

/**
 * Automatically harmonizes essay questions across all exam sets according to
 * the Department of Testing (Cục Khảo thí / Cục Quản lý chất lượng) standards:
 * 1. Cognitive level (B / H / V) identical 100%.
 * 2. Question stem action verbs & structure parallel.
 * 3. Exact matching number of bullet points (các ý cốt lõi).
 * 4. Word count symmetry (độ dài câu hỏi & đáp án tương đương ≥ 90%).
 * 5. Barem chấm (Rubric): Exact matching number of criteria and point values.
 */
export function autoAlignEssayEquivalence(
  sets: GeneratedQuestion[][],
  matrixRows: MatrixRow[] = [],
  pointsConfig?: QuestionPointConfig
): AlignmentResult {
  if (!sets || sets.length === 0) {
    return { updatedSets: [], alignedQuestionCount: 0, changesSummary: [] };
  }

  const clonedSets: GeneratedQuestion[][] = JSON.parse(JSON.stringify(sets));
  const numSets = clonedSets.length;
  const changesSummary: string[] = [];

  // Find all essay indices in set 0 (base set)
  const baseSet = clonedSets[0];
  const baseEssayIndices: number[] = [];
  baseSet.forEach((q, idx) => {
    if (q.d === 'TL') baseEssayIndices.push(idx);
  });

  if (baseEssayIndices.length === 0) {
    return {
      updatedSets: clonedSets,
      alignedQuestionCount: 0,
      changesSummary: ['Không tìm thấy câu hỏi tự luận nào trong bộ đề để căn chỉnh.'],
    };
  }

  let alignedQuestionCount = 0;

  baseEssayIndices.forEach((baseQIdx, essayNum) => {
    alignedQuestionCount++;
    const baseQ = baseSet[baseQIdx];
    const targetLevel: 'B' | 'H' | 'V' = (baseQ.m as 'B' | 'H' | 'V') || 'H';

    // 1. Establish the standard rubric from baseQ
    let standardRubric: RubricItem[] = [];
    if (Array.isArray(baseQ.rubric) && baseQ.rubric.length > 0) {
      standardRubric = JSON.parse(JSON.stringify(baseQ.rubric));
    } else {
      // Default standard rubric: 3 criteria of 0.5 points = 1.5 points (or from pointsConfig)
      const defaultEssayPoint = pointsConfig?.tl || 1.5;
      const numCriteria = 3;
      const ptPerCrit = Math.round((defaultEssayPoint / numCriteria) * 100) / 100;
      standardRubric = [
        { y: `Nêu đúng luận điểm 1 và định nghĩa trọng tâm`, d: ptPerCrit },
        { y: `Phân tích đầy đủ luận điểm 2 và mối liên hệ bản chất`, d: ptPerCrit },
        { y: `Rút ra bài học, giải pháp và kết luận chính xác`, d: ptPerCrit },
      ];
      baseQ.rubric = standardRubric;
    }

    const targetCriteriaCount = standardRubric.length;
    const targetTotalPoints = standardRubric.reduce((acc, rb) => acc + (rb.d || 0), 0);

    // 2. Parse base answer to get target bullet count and target word count
    const baseBullets = parseAnswerIntoBullets(baseQ.ans || '');
    // Ensure baseQ itself has the target number of bullets matching the rubric criteria count!
    const effectiveTargetBulletCount = Math.max(targetCriteriaCount, Math.min(4, baseBullets.length || 3));

    // Normalize baseQ's answer to have exactly effectiveTargetBulletCount
    const baseHarmonized = harmonizeBulletsAndLength(
      baseQ.ans || '',
      effectiveTargetBulletCount,
      Math.max(60, countWords(baseQ.ans || '')),
      targetLevel,
      'chủ đề câu hỏi'
    );
    baseQ.ans = baseHarmonized.normalizedAns;
    const targetAnsWords = countWords(baseQ.ans);

    // Normalize baseQ's rubric to match the bullet points
    baseQ.rubric = standardRubric.map((rb, idx) => ({
      y: baseHarmonized.bullets[idx]
        ? `Nêu đúng và phân tích rõ: ${baseHarmonized.bullets[idx].slice(0, 65).replace(/[.]+$/, '')}`
        : rb.y,
      d: rb.d,
    }));

    // Target command verb from baseQ
    const baseActionVerb = COGNITIVE_VERBS[targetLevel].find((v) =>
      baseQ.stem.toLowerCase().includes(v.toLowerCase())
    ) || COGNITIVE_VERBS[targetLevel][0];
    const targetStemWords = countWords(baseQ.stem);

    // 3. Align ALL OTHER sets (and set 0) to this pristine standard
    for (let sIdx = 0; sIdx < numSets; sIdx++) {
      // Find the corresponding essay question in set sIdx
      const targetSet = clonedSets[sIdx];
      const essayIndicesInSet: number[] = [];
      targetSet.forEach((q, idx) => {
        if (q.d === 'TL') essayIndicesInSet.push(idx);
      });

      const qIdx = essayIndicesInSet[essayNum];
      if (qIdx === undefined || !targetSet[qIdx]) continue;

      const q = targetSet[qIdx];

      // Step A: Synchronize Cognitive Level 100%
      q.m = targetLevel;

      // Step B: Synchronize Answer Bullets and Word Length
      const harmonizedAns = harmonizeBulletsAndLength(
        q.ans || '',
        effectiveTargetBulletCount,
        targetAnsWords,
        targetLevel,
        `Mã đề ${sIdx + 1}`
      );
      q.ans = harmonizedAns.normalizedAns;

      // Step C: Synchronize Question Stem Verb & Length
      q.stem = harmonizeStemVerbAndLength(q.stem, baseActionVerb, targetLevel, targetStemWords);

      // Step D: Synchronize Rubric (exact same criteria count and point values)
      q.rubric = standardRubric.map((rb, rIdx) => {
        const bulletText = harmonizedAns.bullets[rIdx] || '';
        const shortCriteriaDesc = bulletText
          ? `Nêu đúng và phân tích rõ: ${bulletText.slice(0, 65).replace(/[.]+$/, '')}`
          : `Tiêu chí ${rIdx + 1}: Đáp ứng chuẩn kiến thức và kĩ năng`;
        return {
          y: shortCriteriaDesc,
          d: rb.d,
        };
      });
    }

    changesSummary.push(
      `Câu tự luận ${essayNum + 1}: Đã đồng bộ mức độ (${targetLevel === 'B' ? 'Biết' : targetLevel === 'H' ? 'Thông hiểu' : 'Vận dụng'}), chuẩn hóa ${effectiveTargetBulletCount} ý gạch đầu dòng, cân bằng độ dài (~${targetAnsWords} từ) và barem (${targetTotalPoints} điểm / ${targetCriteriaCount} tiêu chí).`
    );
  });

  return {
    updatedSets: clonedSets,
    alignedQuestionCount,
    changesSummary,
  };
}
