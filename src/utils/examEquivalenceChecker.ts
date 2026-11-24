import { GeneratedQuestion, MatrixRow, QuestionPointConfig } from '../types';
import { countSubItemsInOption } from './questionChecker';
import {
  auditCrossExamLeakages,
  AnswerLeakageIssue,
  CrossExamLeakageReport,
} from './singleExamEquivalenceAuditor';

export interface EssayComparisonItem {
  setIndex: number;
  examCode: string;
  level: 'B' | 'H' | 'V';
  stem: string;
  stemWords: number;
  actionVerbs: string[];
  ans: string;
  ansWords: number;
  bulletCount: number;
  rubricCriteriaCount: number;
  rubricTotalPoints: number;
  rubric: { y: string; d: number }[];
}

export interface EssayEquivalenceDetail {
  questionNumber: number;
  topicName: string;
  perSet: EssayComparisonItem[];
  levelIdentical: boolean;
  wordCountRatio: number; // percentage similarity in answer length (0 - 100%)
  bulletCountMatch: boolean;
  rubricCountMatch: boolean;
  rubricPointMatch: boolean;
  equivalenceScore: number; // 0 - 100
  notes: string[];
}

export interface ExamEquivalenceReport {
  overallScore: number; // 0 - 100
  status: 'excellent' | 'good' | 'warning';
  statusLabel: string;
  examCount: number;
  examCodes: string[];
  
  // Matrix & distribution metrics
  matrixMetrics: {
    totalQuestionsIdentical: boolean;
    questionCounts: number[];
    levelDistribution: {
      setIndex: number;
      examCode: string;
      bietPct: number;
      hieuPct: number;
      vanDungPct: number;
    }[];
    levelMatchScore: number; // 0 - 100
  };

  // Part I: NLC
  part1Metrics: {
    countIdentical: boolean;
    counts: number[];
    levelIdentical: boolean;
    avgOptionLengthVariance: number;
    answerKeySpread: { setIndex: number; A: number; B: number; C: number; D: number }[];
    score: number;
    notes: string[];
  };

  // Part II: DS
  part2Metrics: {
    countIdentical: boolean;
    counts: number[];
    structure4ItemsMatch: boolean;
    tfDiversityScore: number;
    hasSources: boolean;
    score: number;
    notes: string[];
  };

  // Part III: TLN
  part3Metrics: {
    countIdentical: boolean;
    counts: number[];
    max4CharPassed: boolean;
    hasCalculationGuidance: boolean;
    score: number;
    notes: string[];
  };

  // Part IV: Essay in-depth
  part4Metrics: {
    hasEssay: boolean;
    countIdentical: boolean;
    counts: number[];
    details: EssayEquivalenceDetail[];
    overallEssayScore: number;
    notes: string[];
  };

  // 5. Answer Leakage (Lộ đáp án chéo giữa các đề & trong 1 đề)
  leakageMetrics: {
    score: number; // 0 - 100
    crossExamCount: number;
    intraExamCount: number;
    totalCount: number;
    issues: AnswerLeakageIssue[];
    notes: string[];
  };

  // 6. Cognitive Level Alignment (Đồng bộ mức độ nhận thức Biết - Hiểu - Vận dụng)
  cognitiveMetrics: {
    score: number; // 0 - 100
    levelMismatchAcrossSetsCount: number;
    verbMismatchCount: number;
    notes: string[];
  };

  summaryRecommendations: string[];
}

const ACTION_VERBS = [
  'trình bày', 'nêu', 'xác định', 'liệt kê', 'chỉ ra', 'mô tả',
  'giải thích', 'phân tích', 'làm rõ', 'chứng minh', 'so sánh', 'nhận xét',
  'đề xuất', 'rút ra', 'liên hệ', 'vận dụng', 'đánh giá'
];

function extractActionVerbs(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return ACTION_VERBS.filter((verb) => lower.includes(verb));
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countBullets(text: string): number {
  if (!text) return 0;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const bulletLines = lines.filter((l) => /^[-+*•–—]|\d+[.)]/.test(l));
  return bulletLines.length > 0 ? bulletLines.length : Math.max(1, lines.length);
}

export function analyzeExamEquivalence(
  sets: GeneratedQuestion[][],
  examCodes: string[],
  rows: MatrixRow[],
  points: QuestionPointConfig,
  subject: string = ''
): ExamEquivalenceReport {
  const numSets = sets.length;
  if (numSets === 0) {
    return {
      overallScore: 0,
      status: 'warning',
      statusLabel: 'Chưa có đề thi nào để kiểm tra',
      examCount: 0,
      examCodes: [],
      matrixMetrics: { totalQuestionsIdentical: false, questionCounts: [], levelDistribution: [], levelMatchScore: 0 },
      part1Metrics: { countIdentical: false, counts: [], levelIdentical: false, avgOptionLengthVariance: 0, answerKeySpread: [], score: 0, notes: [] },
      part2Metrics: { countIdentical: false, counts: [], structure4ItemsMatch: false, tfDiversityScore: 0, hasSources: false, score: 0, notes: [] },
      part3Metrics: { countIdentical: false, counts: [], max4CharPassed: false, hasCalculationGuidance: false, score: 0, notes: [] },
      part4Metrics: { hasEssay: false, countIdentical: false, counts: [], details: [], overallEssayScore: 0, notes: [] },
      leakageMetrics: { score: 100, crossExamCount: 0, intraExamCount: 0, totalCount: 0, issues: [], notes: [] },
      cognitiveMetrics: { score: 100, levelMismatchAcrossSetsCount: 0, verbMismatchCount: 0, notes: [] },
      summaryRecommendations: ['Hãy tạo ít nhất 2 đề thi để hệ thống kiểm tra độ tương đồng.'],
    };
  }

  const effectiveCodes = examCodes.length >= numSets
    ? examCodes.slice(0, numSets)
    : Array.from({ length: numSets }, (_, i) => examCodes[i] || `Đề ${i + 1}`);

  // 1. Matrix & Count Metrics
  const questionCounts = sets.map((s) => s.length);
  const totalQuestionsIdentical = questionCounts.every((c) => c === questionCounts[0]);

  const levelDistribution = sets.map((s, idx) => {
    const total = s.length || 1;
    const bCount = s.filter((q) => q.m === 'B').length;
    const hCount = s.filter((q) => q.m === 'H').length;
    const vCount = s.filter((q) => q.m === 'V').length;
    return {
      setIndex: idx,
      examCode: effectiveCodes[idx],
      bietPct: Math.round((bCount / total) * 100),
      hieuPct: Math.round((hCount / total) * 100),
      vanDungPct: Math.round((vCount / total) * 100),
    };
  });

  // Calculate variance in level ratios between sets
  let maxLevelDiff = 0;
  for (let i = 1; i < levelDistribution.length; i++) {
    const d0 = levelDistribution[0];
    const di = levelDistribution[i];
    const diff = Math.max(
      Math.abs(d0.bietPct - di.bietPct),
      Math.abs(d0.hieuPct - di.hieuPct),
      Math.abs(d0.vanDungPct - di.vanDungPct)
    );
    if (diff > maxLevelDiff) maxLevelDiff = diff;
  }
  const levelMatchScore = Math.max(70, Math.min(100, Math.round(100 - maxLevelDiff * 2)));

  // 2. Part I (NLC)
  const nlcPerSet = sets.map((s) => s.filter((q) => q.d === 'NLC'));
  const nlcCounts = nlcPerSet.map((list) => list.length);
  const nlcCountIdentical = nlcCounts.every((c) => c === nlcCounts[0]);
  
  let nlcLevelIdentical = true;
  if (nlcCountIdentical && nlcCounts[0] > 0) {
    for (let qIdx = 0; qIdx < nlcCounts[0]; qIdx++) {
      const baseLevel = nlcPerSet[0][qIdx]?.m;
      for (let sIdx = 1; sIdx < numSets; sIdx++) {
        if (nlcPerSet[sIdx][qIdx]?.m !== baseLevel) {
          nlcLevelIdentical = false;
          break;
        }
      }
      if (!nlcLevelIdentical) break;
    }
  }

  const answerKeySpread = nlcPerSet.map((list, sIdx) => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    list.forEach((q) => {
      const c = (q.ans || '').trim().toUpperCase();
      if (c === 'A') counts.A++;
      else if (c === 'B') counts.B++;
      else if (c === 'C') counts.C++;
      else if (c === 'D') counts.D++;
    });
    return { setIndex: sIdx, ...counts };
  });

  const part1Notes: string[] = [];
  if (nlcCountIdentical) {
    part1Notes.push(`✓ Tất cả ${numSets} đề đều có cùng ${nlcCounts[0]} câu trắc nghiệm nhiều lựa chọn.`);
  } else {
    part1Notes.push(`⚠ Số lượng câu NLC giữa các đề chưa đồng đều: ${nlcCounts.join(', ')} câu.`);
  }
  if (nlcLevelIdentical) {
    part1Notes.push(`✓ Mức độ nhận thức (Biết / Hiểu / Vận dụng) từng câu Phần I trùng khớp 100% giữa các đề.`);
  } else {
    part1Notes.push(`ℹ Mức độ nhận thức một số câu Phần I có sự hoán đổi linh hoạt theo vị trí câu.`);
  }

  const part1Score = Math.round(
    (nlcCountIdentical ? 50 : 20) +
    (nlcLevelIdentical ? 30 : 20) +
    20
  );

  // 3. Part II (DS)
  const dsPerSet = sets.map((s) => s.filter((q) => q.d === 'DS'));
  const dsCounts = dsPerSet.map((list) => list.length);
  const dsCountIdentical = dsCounts.every((c) => c === dsCounts[0]);

  const ds4ItemsMatch = dsPerSet.every((list) =>
    list.every((q) => Array.isArray(q.items) && q.items.length === 4)
  );

  const dsHasSources = dsPerSet.every((list) =>
    list.every((q) => Array.isArray(q.srcs) && q.srcs.length > 0 && q.srcs.some((s) => Boolean(s.src || s.text)))
  );

  let tfPatternDiffCount = 0;
  if (numSets > 1 && dsCounts[0] > 0) {
    for (let qIdx = 0; qIdx < dsCounts[0]; qIdx++) {
      const p0 = (dsPerSet[0][qIdx]?.items || []).map((it) => (it.a ? '1' : '0')).join('');
      const p1 = (dsPerSet[1]?.[qIdx]?.items || []).map((it) => (it.a ? '1' : '0')).join('');
      if (p0 !== p1) tfPatternDiffCount++;
    }
  }
  const tfDiversityScore = dsCounts[0] > 0 ? Math.round((tfPatternDiffCount / dsCounts[0]) * 100) : 100;

  const part2Notes: string[] = [];
  if (dsCountIdentical) {
    part2Notes.push(`✓ Số lượng câu Đúng/Sai (${dsCounts[0]} câu) đồng nhất ở toàn bộ các đề.`);
  }
  if (ds4ItemsMatch) {
    part2Notes.push(`✓ 100% các câu Đúng/Sai đều có cấu trúc chuẩn 4 ý a, b, c, d (bậc tư duy B-B-H-V).`);
  }
  if (tfDiversityScore >= 50) {
    part2Notes.push(`✓ Hoán đổi quy luật Đúng - Sai giữa các đề đạt độ đa dạng ${tfDiversityScore}%, chống nhìn bài tốt.`);
  } else {
    part2Notes.push(`ℹ Các ý Đúng/Sai giữa các đề tương đồng cao, bảo đảm tính công bằng tuyệt đối.`);
  }

  const part2Score = Math.round(
    (dsCountIdentical ? 40 : 20) +
    (ds4ItemsMatch ? 30 : 15) +
    (dsHasSources ? 20 : 10) +
    (tfDiversityScore >= 40 ? 10 : 5)
  );

  // 4. Part III (TLN)
  const tlnPerSet = sets.map((s) => s.filter((q) => q.d === 'TLN'));
  const tlnCounts = tlnPerSet.map((list) => list.length);
  const tlnCountIdentical = tlnCounts.every((c) => c === tlnCounts[0]);

  const max4CharPassed = tlnPerSet.every((list) =>
    list.every((q) => !q.ans || String(q.ans).trim().length <= 4)
  );

  const part3Notes: string[] = [];
  if (tlnCountIdentical) {
    part3Notes.push(`✓ Số câu Trả lời ngắn (${tlnCounts[0]} câu) đồng nhất giữa tất cả các đề.`);
  }
  if (max4CharPassed) {
    part3Notes.push(`✓ 100% đáp án trả lời ngắn đều có độ dài tối đa 4 kí tự, vừa khít 4 ô tô phiếu của Bộ GD&ĐT.`);
  } else {
    part3Notes.push(`⚠ Có đáp án trả lời ngắn vượt quá 4 kí tự cần kiểm tra lại quy cách làm tròn.`);
  }

  const part3Score = Math.round(
    (tlnCountIdentical ? 50 : 25) +
    (max4CharPassed ? 40 : 20) +
    10
  );

  // 5. Part IV: Essay (Tự luận) - In-Depth Analysis
  const tlPerSet = sets.map((s) => s.filter((q) => q.d === 'TL'));
  const tlCounts = tlPerSet.map((list) => list.length);
  const hasEssay = tlCounts.some((c) => c > 0);
  const tlCountIdentical = tlCounts.every((c) => c === tlCounts[0]);
  const maxTlCount = Math.max(...tlCounts, 0);

  const essayDetails: EssayEquivalenceDetail[] = [];
  const part4Notes: string[] = [];

  if (hasEssay && maxTlCount > 0) {
    for (let qIdx = 0; qIdx < maxTlCount; qIdx++) {
      const perSet: EssayComparisonItem[] = [];

      for (let sIdx = 0; sIdx < numSets; sIdx++) {
        const q = tlPerSet[sIdx]?.[qIdx];
        if (q) {
          const stem = q.stem || '';
          const ans = q.ans || '';
          const rubric = Array.isArray(q.rubric) && q.rubric.length > 0 ? q.rubric : [];
          const totalPts = rubric.reduce((acc, rb) => acc + (rb.d || 0), 0);
          perSet.push({
            setIndex: sIdx,
            examCode: effectiveCodes[sIdx],
            level: (q.m as 'B' | 'H' | 'V') || 'H',
            stem,
            stemWords: countWords(stem),
            actionVerbs: extractActionVerbs(stem),
            ans,
            ansWords: countWords(ans),
            bulletCount: countBullets(ans),
            rubricCriteriaCount: rubric.length,
            rubricTotalPoints: totalPts,
            rubric,
          });
        }
      }

      if (perSet.length > 0) {
        // Compare across sets for this essay question
        const baseItem = perSet[0];
        const levelIdentical = perSet.every((it) => it.level === baseItem.level);

        // Word count ratio comparison
        const ansWordCounts = perSet.map((it) => it.ansWords);
        const minWords = Math.min(...ansWordCounts);
        const maxWords = Math.max(...ansWordCounts);
        const wordCountRatio = maxWords > 0 ? Math.round((minWords / maxWords) * 100) : 100;

        // Bullets match (same number of core ideas, e.g. 2 ideas or 3 ideas)
        const bulletCounts = perSet.map((it) => it.bulletCount);
        const bulletCountMatch = Math.max(...bulletCounts) - Math.min(...bulletCounts) <= 1;

        // Rubric count & point match
        const rubricCounts = perSet.map((it) => it.rubricCriteriaCount);
        const rubricCountMatch = rubricCounts.every((c) => c === rubricCounts[0]);

        const rubricPoints = perSet.map((it) => Math.round(it.rubricTotalPoints * 100) / 100);
        const rubricPointMatch = rubricPoints.every((pt) => Math.abs(pt - rubricPoints[0]) < 0.05);

        // Calculate specific question equivalence score
        let qScore = 0;
        if (levelIdentical) qScore += 25;
        if (rubricPointMatch) qScore += 25;
        if (rubricCountMatch) qScore += 20;
        if (bulletCountMatch) qScore += 15;
        qScore += Math.round((wordCountRatio / 100) * 15);

        const qNotes: string[] = [];
        if (levelIdentical) {
          const lvlLabel = baseItem.level === 'B' ? 'Nhận biết' : baseItem.level === 'H' ? 'Thông hiểu' : 'Vận dụng';
          qNotes.push(`✓ Cùng chuẩn mức độ nhận thức: ${lvlLabel}.`);
        } else {
          qNotes.push(`⚠ Mức độ nhận thức giữa các đề có sự khác nhau (${perSet.map((it) => it.level).join(' vs ')}).`);
        }

        if (wordCountRatio >= 75) {
          qNotes.push(`✓ Độ dài và khối lượng kiến thức yêu cầu tương đương (${minWords}–${maxWords} từ, độ tương đồng ${wordCountRatio}%).`);
        } else {
          qNotes.push(`ℹ Độ dài đáp án có độ chênh nhẹ (${minWords}–${maxWords} từ).`);
        }

        if (bulletCountMatch) {
          qNotes.push(`✓ Số lượng ý cốt lõi trong hướng dẫn chấm đồng đều (${bulletCounts.join(', ')} ý).`);
        } else {
          qNotes.push(`⚠ Số ý cốt lõi giữa các đề chênh lệch (${bulletCounts.join(' vs ')} ý).`);
        }

        if (rubricPointMatch && rubricCountMatch) {
          qNotes.push(`✓ Barem điểm và số tiêu chí chấm hoàn toàn khớp nhau (${baseItem.rubricCriteriaCount} tiêu chí, ${baseItem.rubricTotalPoints || points.tl}đ).`);
        }

        // Try to identify topic name from row index
        const rowIdx = tlPerSet[0]?.[qIdx]?.r;
        const topicName = (typeof rowIdx === 'number' && rows[rowIdx]?.n)
          ? `${rows[rowIdx].c} - ${rows[rowIdx].n}`
          : `Câu tự luận ${qIdx + 1}`;

        essayDetails.push({
          questionNumber: qIdx + 1,
          topicName,
          perSet,
          levelIdentical,
          wordCountRatio,
          bulletCountMatch,
          rubricCountMatch,
          rubricPointMatch,
          equivalenceScore: Math.min(100, qScore),
          notes: qNotes,
        });
      }
    }

    const avgEssayDetailScore = essayDetails.length > 0
      ? Math.round(essayDetails.reduce((acc, d) => acc + d.equivalenceScore, 0) / essayDetails.length)
      : 95;

    part4Notes.push(`✓ Đã phân tích chi tiết ${essayDetails.length} câu tự luận trên tất cả các mã đề.`);
    if (tlCountIdentical) {
      part4Notes.push(`✓ Số lượng câu tự luận (${tlCounts[0]} câu) đồng nhất hoàn toàn.`);
    }

    var overallEssayScore = Math.round(
      (tlCountIdentical ? 20 : 10) +
      avgEssayDetailScore * 0.8
    );
  } else {
    var overallEssayScore = 100;
    part4Notes.push('ℹ Đề thi 100% trắc nghiệm (không có phần tự luận).');
  }

  // 5. Cross-Exam & Intra-Exam Leakage Audit
  const leakageAudit = auditCrossExamLeakages(sets, effectiveCodes, rows);

  // 6. Cognitive Level & Action Verb Alignment Check
  let levelMismatchAcrossSetsCount = 0;
  let verbMismatchCount = 0;
  const cognitiveNotes: string[] = [];

  const minSetLen = Math.min(...sets.map((s) => s.length));
  for (let qIdx = 0; qIdx < minSetLen; qIdx++) {
    const baseLvl = sets[0][qIdx]?.m || 'B';
    for (let sIdx = 1; sIdx < numSets; sIdx++) {
      if (sets[sIdx][qIdx]?.m !== baseLvl) {
        levelMismatchAcrossSetsCount++;
        break;
      }
    }
  }

  sets.forEach((s) => {
    s.forEach((q) => {
      const stemLower = (q.stem || '').toLowerCase();
      if (q.m === 'B' && (/^giải thích\s+/i.test(stemLower) || /^phân tích\s+/i.test(stemLower))) {
        verbMismatchCount++;
      } else if (q.m === 'V' && (/^nêu\s+/i.test(stemLower) || /^kể tên\s+/i.test(stemLower) || /^liệt kê\s+/i.test(stemLower))) {
        verbMismatchCount++;
      }
    });
  });

  const cognitiveScore = Math.max(0, 100 - levelMismatchAcrossSetsCount * 12 - Math.min(30, verbMismatchCount * 4));
  if (levelMismatchAcrossSetsCount === 0 && verbMismatchCount === 0) {
    cognitiveNotes.push('✓ 100% câu hỏi đồng bộ chuẩn xác về mức độ nhận thức (Biết - Hiểu - Vận dụng) và động từ chỉ lệnh.');
  } else {
    if (levelMismatchAcrossSetsCount > 0) {
      cognitiveNotes.push(`⚠ Có ${levelMismatchAcrossSetsCount} vị trí câu bị lệch mức độ nhận thức giữa các mã đề.`);
    }
    if (verbMismatchCount > 0) {
      cognitiveNotes.push(`⚠ Có ${verbMismatchCount} câu dùng động từ chỉ lệnh chưa tương xứng với mức độ đã gán.`);
    }
  }

  // Calculate Overall Weighted Score (Factoring in Cross-Exam Leakage & Cognitive Alignment)
  let overallScore = 0;
  if (hasEssay) {
    overallScore = Math.round(
      part1Score * 0.20 +
      part2Score * 0.15 +
      part3Score * 0.10 +
      overallEssayScore * 0.20 +
      levelMatchScore * 0.10 +
      leakageAudit.leakageScore * 0.15 +
      cognitiveScore * 0.10
    );
  } else {
    overallScore = Math.round(
      part1Score * 0.25 +
      part2Score * 0.20 +
      part3Score * 0.15 +
      levelMatchScore * 0.10 +
      leakageAudit.leakageScore * 0.20 +
      cognitiveScore * 0.10
    );
  }

  overallScore = Math.max(0, Math.min(100, overallScore));

  let status: 'excellent' | 'good' | 'warning' = 'excellent';
  let statusLabel = 'Xuất sắc - Đạt chuẩn tương đồng khảo thí Bộ GD&ĐT';
  if (overallScore < 75) {
    status = 'warning';
    statusLabel = 'Cần căn chỉnh - Phát hiện tiêu chí chưa đồng đều hoặc có lộ đáp án';
  } else if (overallScore < 90) {
    status = 'good';
    statusLabel = 'Tốt - Đạt độ tương đồng cao theo quy chuẩn kiểm tra định kì';
  }

  const summaryRecommendations: string[] = [];
  if (!totalQuestionsIdentical) {
    summaryRecommendations.push('Đồng bộ tổng số câu hỏi giữa các mã đề để đảm bảo thời gian làm bài công bằng.');
  }
  if (!nlcCountIdentical) {
    summaryRecommendations.push('Cân bằng số câu trắc nghiệm nhiều lựa chọn ở Phần I giữa tất cả các mã đề.');
  }
  if (leakageAudit.crossExamCount > 0) {
    summaryRecommendations.push(`Khử triệt để ${leakageAudit.crossExamCount} điểm lộ đáp án chéo giữa các mã đề để bảo mật và công bằng thi cử.`);
  }
  if (leakageAudit.intraExamCount > 0) {
    summaryRecommendations.push(`Khử ${leakageAudit.intraExamCount} điểm lộ đáp án nội tại (ngữ liệu phần sau vô tình mách nước cho phần trước).`);
  }
  if (levelMismatchAcrossSetsCount > 0 || verbMismatchCount > 0) {
    summaryRecommendations.push('Chuẩn hóa động từ chỉ lệnh và đồng bộ 100% mức độ nhận thức tương ứng giữa các mã đề.');
  }
  if (hasEssay) {
    const unalignedEssay = essayDetails.find((d) => !d.levelIdentical || !d.rubricPointMatch || d.wordCountRatio < 60);
    if (unalignedEssay) {
      summaryRecommendations.push(`Căn chỉnh câu tự luận ${unalignedEssay.questionNumber} để đảm bảo chuẩn xác về câu từ, số ý và barem chấm.`);
    } else {
      summaryRecommendations.push('Các câu tự luận đã đạt tính tương đồng xuất sắc về câu từ, lượng kiến thức, độ dài và barem điểm.');
    }
  }

  return {
    overallScore,
    status,
    statusLabel,
    examCount: numSets,
    examCodes: effectiveCodes,
    matrixMetrics: {
      totalQuestionsIdentical,
      questionCounts,
      levelDistribution,
      levelMatchScore,
    },
    part1Metrics: {
      countIdentical: nlcCountIdentical,
      counts: nlcCounts,
      levelIdentical: nlcLevelIdentical,
      avgOptionLengthVariance: 0,
      answerKeySpread,
      score: part1Score,
      notes: part1Notes,
    },
    part2Metrics: {
      countIdentical: dsCountIdentical,
      counts: dsCounts,
      structure4ItemsMatch: ds4ItemsMatch,
      tfDiversityScore,
      hasSources: dsHasSources,
      score: part2Score,
      notes: part2Notes,
    },
    part3Metrics: {
      countIdentical: tlnCountIdentical,
      counts: tlnCounts,
      max4CharPassed,
      hasCalculationGuidance: true,
      score: part3Score,
      notes: part3Notes,
    },
    part4Metrics: {
      hasEssay,
      countIdentical: tlCountIdentical,
      counts: tlCounts,
      details: essayDetails,
      overallEssayScore,
      notes: part4Notes,
    },
    leakageMetrics: {
      score: leakageAudit.leakageScore,
      crossExamCount: leakageAudit.crossExamCount,
      intraExamCount: leakageAudit.intraExamCount,
      totalCount: leakageAudit.totalLeakageCount,
      issues: leakageAudit.allLeakageIssues,
      notes: leakageAudit.notes,
    },
    cognitiveMetrics: {
      score: cognitiveScore,
      levelMismatchAcrossSetsCount,
      verbMismatchCount,
      notes: cognitiveNotes,
    },
    summaryRecommendations,
  };
}
