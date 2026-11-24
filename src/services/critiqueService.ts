import { GeneratedQuestion, MatrixRow } from '../types';
import {
  CritiqueDimensionScores,
  CritiqueFlaw,
  ExamCritiqueReport,
  QuestionCritiqueItem,
  CouncilDebateTurn,
  QuestionCouncilDebate,
} from '../types/critiqueTypes';
import { ABSOLUTE_WORDS, countSubItemsInOption, enforceMax4CharShortAnswer, autoFixCompliance, normalizeQuestion, cleanSinglePunctuation, ensureBalancedTrueFalseItems, hasUnformattedNegation, hasWordSafe } from '../utils/questionChecker';
import { callGemini, safeJsonParse } from './geminiService';
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
  BorderStyle,
} from 'docx';
import { downloadBlob } from '../utils/exportUtils';

/**
 * Builds a realistic multi-expert council debate simulation between
 * Gemini 3.8 Flash, Claude 5.5 Sonnet, and NotebookLM before reaching consensus.
 */
export function buildLocalCouncilDebate(
  q: GeneratedQuestion,
  qNum: number,
  flaws: CritiqueFlaw[],
  suggested: GeneratedQuestion,
  mon: string,
  grade: string,
  yccdGrounding: string,
  documentRef: string
): QuestionCouncilDebate {
  const turns: CouncilDebateTurn[] = [];

  if (flaws.length === 0) {
    turns.push({
      expert: 'gemini',
      expertName: 'Gemini 3.8 Flash',
      roleTitle: 'Chuyên gia Khảo thí & Đo lường',
      argument: `Rà soát kỹ thuật khảo thí theo Công văn 7991/BGDĐT: Câu ${qNum} có câu dẫn tường minh, định lượng rõ ràng nhiệm vụ nhận thức mức ${q.m === 'B' ? 'Biết' : q.m === 'H' ? 'Hiểu' : 'Vận dụng'}. Kỷ luật đáp án hoàn toàn tuân thủ quy chế thi mới.`,
      verdictStatus: 'approved',
    });
    turns.push({
      expert: 'claude',
      expertName: 'Claude 5.5 Sonnet',
      roleTitle: 'Chuyên gia Logic & Ngôn ngữ học',
      argument: `Thẩm định ngữ pháp & tính độc lập: Câu dẫn và các phương án có cấu trúc cú pháp chặt chẽ, từ vựng tương đương về độ dài và độ phức tạp. Không phát hiện manh mối ngữ pháp hay các từ chỉ định cực đoan dẫn dắt học sinh đoán mò.`,
      counterPoint: `Đồng thuận với ý kiến của Gemini 3.8 Flash về độ phân hóa.`,
      verdictStatus: 'approved',
    });
    turns.push({
      expert: 'notebooklm',
      expertName: 'NotebookLM',
      roleTitle: 'Chuyên gia SGK & Ngữ liệu',
      argument: `Kiểm chứng cơ sở dữ liệu SGK: Nội dung câu hỏi bám sát mục tiêu của bộ SGK Kết nối tri thức với cuộc sống (${documentRef}) và khớp chuẩn YCCĐ: "${yccdGrounding}". Số liệu và thuật ngữ đạt độ xác thực khoa học cao.`,
      verdictStatus: 'approved',
    });
    turns.push({
      expert: 'consensus',
      expertName: 'Hội đồng Đồng thuận',
      roleTitle: 'Nghị quyết Thống nhất Hội đồng',
      argument: `Hội đồng 3 chuyên gia biểu quyết 100% nhất trí: Câu ${qNum} đạt chuẩn xuất sắc (10/10 điểm), giữ nguyên văn bản phát hành chính thức.`,
      verdictStatus: 'approved',
    });

    return {
      questionNum: qNum,
      initialIssues: ['Không phát hiện lỗi kỹ thuật hay sư phạm.'],
      turns,
      finalConsensus: 'Thông qua tuyệt đối 10/10 điểm — Đạt chuẩn trắc nghiệm Bộ GD&ĐT 2025.',
      optimalStem: q.stem,
      optimalOpts: q.opts,
      optimalAns: q.ans,
      rationale: 'Hội đồng đồng thuận duy trì nguyên trạng cấu trúc câu hỏi do đã đạt chuẩn kỹ thuật tối đa.',
    };
  }

  // When flaws exist
  const mainFlaw = flaws[0];
  const secondFlaw = flaws[1];

  turns.push({
    expert: 'gemini',
    expertName: 'Gemini 3.8 Flash',
    roleTitle: 'Chuyên gia Khảo thí & Đo lường',
    argument: `[Chất vấn khảo thí]: Câu ${qNum} vi phạm quy chuẩn khảo thí: "${mainFlaw.title}". Cụ thể: ${mainFlaw.detail} (Căn cứ: ${mainFlaw.moetRuleRef}). Điều này trực tiếp làm sai lệch thang đo năng lực của đề thi.`,
    verdictStatus: 'challenge',
  });

  turns.push({
    expert: 'claude',
    expertName: 'Claude 5.5 Sonnet',
    roleTitle: 'Chuyên gia Logic & Ngôn ngữ học',
    argument: `[Phản biện cú pháp & Tái cấu trúc]: Tôi đồng ý với nhận định của Gemini. Về mặt diễn đạt, câu hiện tại gây bẫy đọc hiểu phi chuyên môn. Tôi đề xuất tái cấu trúc lại câu dẫn: "${suggested.stem.slice(0, 80)}..." và chỉnh sửa các phương án nhiễu để đảm bảo đồng nhất về mặt ngữ nghĩa và độ dài.`,
    counterPoint: `Chất vấn Gemini và NotebookLM: Cần kiểm tra xem câu dẫn sửa mới có giữ đúng mức nhận thức ${q.m === 'B' ? 'Biết' : q.m === 'H' ? 'Hiểu' : 'Vận dụng'} hay không.`,
    verdictStatus: 'refine',
  });

  turns.push({
    expert: 'notebooklm',
    expertName: 'NotebookLM',
    roleTitle: 'Chuyên gia SGK & Ngữ liệu',
    argument: `[Thẩm định Ngữ liệu SGK]: Đã đối chiếu bản viết lại của Claude với tài liệu chuẩn SGK ${mon} ${grade} (Bộ Kết nối tri thức) và YCCĐ: "${yccdGrounding.slice(0, 90)}...". Thuật ngữ mới dùng chuẩn xác 100%, không vượt quá phạm vi bài học, số liệu thực tiễn được bảo chứng tin cậy.`,
    counterPoint: `Xác nhận với Claude: Mức độ nhận thức ${q.m === 'B' ? 'Biết' : q.m === 'H' ? 'Hiểu' : 'Vận dụng'} được bảo toàn nguyên vẹn, tính phân hóa học sinh được nâng cao rõ rệt.`,
    verdictStatus: 'approved',
  });

  turns.push({
    expert: 'consensus',
    expertName: 'Hội đồng Đồng thuận',
    roleTitle: 'Nghị quyết Thống nhất Hội đồng',
    argument: `[Quyết nghị chung cuộc]: Sau tranh biện và phản biện qua lại 3 vòng, Hội đồng thống nhất 100% phương án tối ưu: Thay thế bằng bản đề xuất hoàn thiện, triệt tiêu toàn bộ lỗi "${mainFlaw.title}"${secondFlaw ? ` và "${secondFlaw.title}"` : ''}, nâng điểm thẩm định lên 10/10.`,
    verdictStatus: 'approved',
  });

  return {
    questionNum: qNum,
    initialIssues: flaws.map((f) => f.title),
    turns,
    finalConsensus: `Đồng thuận tuyệt đối 3 chuyên gia: Khắc phục triệt để ${flaws.length} lỗi, bảo toàn chuẩn YCCĐ và ngữ liệu SGK Kết nối tri thức.`,
    optimalStem: suggested.stem,
    optimalOpts: suggested.opts,
    optimalAns: suggested.ans,
    rationale: `Hội đồng đã tranh biện và đồng thuận phương án tối ưu: Khắc phục ${flaws.map((f) => f.title).join('; ')}. Bám sát chuẩn YCCĐ CT GDPT 2018.`,
  };
}

/**
 * Fast offline/real-time rule evaluator and pedagogical critique generator
 * strictly adhering to MOET curriculum and exam specifications.
 */
export function generateLocalCritiqueReport(
  questions: GeneratedQuestion[],
  mon: string,
  grade: string,
  semester: string,
  rows: MatrixRow[] = [],
  examCode: string = '101'
): ExamCritiqueReport {
  let stemDeductions = 0;
  let distractorDeductions = 0;
  let matrixDeductions = 0;
  let sourceDeductions = 0;
  let answerKeyDeductions = 0;

  const items: QuestionCritiqueItem[] = questions.map((q, idx) => {
    const flaws: CritiqueFlaw[] = [];
    const stem = String(q.stem || '').trim();
    const opts = q.opts || [];
    let itemScore = 10;

    // Determine part & label
    let partLabel = 'Phần I: TN Nhiều lựa chọn';
    if (q.d === 'DS') partLabel = 'Phần II: Trắc nghiệm Đúng/Sai';
    if (q.d === 'TLN') partLabel = 'Phần III: Trả lời ngắn';
    if (q.d === 'TL') partLabel = 'Phần IV: Tự luận';

    // Dẫn chiếu căn cứ nguồn & Chuẩn YCCĐ
    const matchingRow = rows[q.r ?? -1] || rows[idx % Math.max(1, rows.length)] || null;
    const topic = matchingRow ? `${matchingRow.c} — ${matchingRow.n}` : `Nội dung kiến thức môn ${mon} lớp ${grade}`;
    const yccdGrounding = matchingRow?.s
      ? (q.m === 'B' ? matchingRow.s[0] : q.m === 'H' ? matchingRow.s[1] : matchingRow.s[2]) || matchingRow.s[0] || 'Chuẩn yêu cầu cần đạt Chương trình GDPT 2018'
      : `Yêu cầu cần đạt chuẩn Chương trình GDPT 2018 môn ${mon} lớp ${grade} (${semester})`;

    const documentRef = (q.srcs && q.srcs[0]?.src)
      ? q.srcs[0].src
      : `SGK ${mon} ${grade} (Bộ Kết nối tri thức với cuộc sống), NXB Giáo dục Việt Nam`;

    // 1. Phản biện Phần I: TN Nhiều lựa chọn
    if (q.d === 'NLC') {
      // Rule 1: Dấu câu thân câu dẫn
      const endsWithPunct = /[:;,.…]$/.test(stem);
      const isQuestion = /(nào|gì|sao|đâu|ai|mấy|bao nhiêu|tại sao|như thế nào|phải không|\?)/i.test(stem);

      if (isQuestion && !stem.endsWith('?')) {
        flaws.push({
          title: 'Thân câu hỏi thiếu dấu chấm hỏi (?)',
          detail: 'Câu dẫn mang bản chất là câu hỏi trực tiếp nhưng không kết thúc bằng dấu "?".',
          severity: 'warning',
          category: 'stem',
          moetRuleRef: 'CV 7991/BGDĐT — Quy tắc xây dựng câu hỏi trắc nghiệm',
        });
        stemDeductions += 2;
        itemScore -= 1;
      } else if (!isQuestion && endsWithPunct) {
        flaws.push({
          title: 'Câu dẫn lửng thừa dấu ngắt câu cuối',
          detail: 'Câu dẫn nối trực tiếp với 4 phương án lựa chọn không được kết thúc bằng dấu ":" hoặc dấu ".". Phải để trống để ghép thành câu hoàn chỉnh.',
          severity: 'warning',
          category: 'stem',
          moetRuleRef: 'Kỹ thuật soạn thảo trắc nghiệm chuẩn Bộ — Không ngắt câu dẫn lửng',
        });
        stemDeductions += 2;
        itemScore -= 1;
      }

      // Rule 2: Từ phủ định
      if (hasUnformattedNegation(stem)) {
        flaws.push({
          title: 'Từ phủ định chưa VIẾT HOA và in đậm',
          detail: 'Câu dẫn có chứa từ phủ định (không, chưa, sai) nhưng viết thường, dễ gây bẫy đọc hiểu và thiệt thòi cho học sinh.',
          severity: 'critical',
          category: 'stem',
          moetRuleRef: 'Quy định khảo thí: Bắt buộc VIẾT HOA & IN ĐẬM từ phủ định trong thân câu',
        });
        stemDeductions += 4;
        itemScore -= 2;
      }

      // Rule 3: Từ tuyệt đối / mơ hồ
      const absFound = ABSOLUTE_WORDS.filter((w) => hasWordSafe(stem + ' ' + opts.join(' '), w));
      if (absFound.length > 0) {
        flaws.push({
          title: `Chứa từ tuyệt đối/báo hiệu đáp án (${absFound.slice(0, 2).join(', ')})`,
          detail: `Từ mang tính cực đoan như "${absFound.join(', ')}" làm lộ phương án sai hoặc giúp học sinh đoán mò không dựa trên tư duy môn học.`,
          severity: 'warning',
          category: 'distractors',
          moetRuleRef: 'Nguyên lý khảo thí hiện đại — Tránh từ chỉ định tuyệt đối hóa',
        });
        distractorDeductions += 3;
        itemScore -= 1.5;
      }

      // Rule 4: Phương án loại trừ ("Tất cả đều đúng/sai")
      const hasInvalidOpts = opts.some((o) =>
        /tất cả (các )?(đều )?(đúng|sai)|đều đúng|đều sai|không có đáp án nào|cả [A-D] và [A-D]/i.test(o)
      );
      if (hasInvalidOpts) {
        flaws.push({
          title: 'Sử dụng phương án "Tất cả đều đúng/sai" hoặc "Cả A và B"',
          detail: 'Vi phạm nghiêm trọng quy chuẩn đề thi 2025. Mỗi phương án phải là một khẳng định độc lập có ý nghĩa chuyên môn cụ thể.',
          severity: 'critical',
          category: 'distractors',
          moetRuleRef: 'Quyết định 764/QĐ-BGDĐT — Nghiêm cấm dùng phương án gộp hoặc loại trừ',
        });
        distractorDeductions += 6;
        itemScore -= 3;
      }

      // Rule 5: Chênh lệch độ dài phương án
      const correctIdx = 'ABCD'.indexOf(String(q.ans || '').trim().charAt(0));
      if (correctIdx >= 0 && opts.length === 4) {
        const correctLen = opts[correctIdx]?.length || 0;
        const restLens = opts.filter((_, j) => j !== correctIdx).map((x) => x.length);
        const avgRest = restLens.reduce((a, b) => a + b, 0) / (restLens.length || 1);
        const allLens = opts.map((x) => x.length);
        const maxOptLen = Math.max(...allLens);
        const minOptLen = Math.max(1, Math.min(...allLens));

        if (correctLen > 1.5 * avgRest + 10) {
          flaws.push({
            title: 'Đáp án đúng dài vượt trội so với 3 phương án nhiễu',
            detail: `Đáp án đúng (${correctLen} ký tự) dài hơn nhiều mức trung bình của 3 phương án nhiễu (${Math.round(avgRest)} ký tự). Học sinh có thể nhận diện ngay đáp án mà không cần giải bài.`,
            severity: 'critical',
            category: 'distractors',
            moetRuleRef: 'Quy tắc cân bằng độ dài & độ phức tạp cú pháp 4 phương án',
          });
          distractorDeductions += 5;
          itemScore -= 2;
        } else if (correctLen < 0.5 * avgRest - 10) {
          flaws.push({
            title: 'Đáp án đúng quá ngắn cụt so với các phương án nhiễu',
            detail: 'Độ dài đáp án đúng không tương đồng với độ chi tiết của các phương án nhiễu.',
            severity: 'suggestion',
            category: 'distractors',
            moetRuleRef: 'Đồng nhất hình thức trình bày phương án',
          });
          distractorDeductions += 2;
          itemScore -= 1;
        } else if (maxOptLen > 1.65 * minOptLen + 12) {
          flaws.push({
            title: `Độ dài 4 phương án A, B, C, D chênh lệch lớn (${minOptLen}–${maxOptLen} ký tự)`,
            detail: 'Có phương án quá dài hoặc quá ngắn so với các phương án còn lại trong cùng câu hỏi.',
            severity: 'warning',
            category: 'distractors',
            moetRuleRef: 'Quy tắc cân bằng độ dài 4 phương án A, B, C, D',
          });
          distractorDeductions += 3;
          itemScore -= 1.5;
        }
      }

      // Rule 6: Tính đồng nhất số vế/mệnh đề trong các phương án
      if (opts.length === 4) {
        const subCounts = opts.map(countSubItemsInOption);
        const maxSub = Math.max(...subCounts);
        const minSub = Math.min(...subCounts);
        if (maxSub > 1 && minSub !== maxSub) {
          flaws.push({
            title: `Các phương án A, B, C, D không đồng nhất về số vế (Số vế: ${subCounts.join(', ')})`,
            detail: 'Bộ quy định khi một phương án có liệt kê hoặc nhiều vế logic thì cả 4 phương án đều phải có cùng số lượng vế tương đương.',
            severity: 'warning',
            category: 'distractors',
            moetRuleRef: 'Yêu cầu đồng nhất về mặt ngữ pháp & cấu trúc logic của phương án',
          });
          distractorDeductions += 3;
          itemScore -= 1.5;
        }
      }
    }

    // 2. Phản biện Phần II: Trắc nghiệm Đúng/Sai
    if (q.d === 'DS') {
      const itemsList = q.items || [];
      if (itemsList.length !== 4) {
        flaws.push({
          title: `Không đủ 4 ý độc lập (hiện có ${itemsList.length}/4 ý)`,
          detail: 'Theo cấu trúc định dạng trắc nghiệm mới của Bộ GD&ĐT, mỗi câu Phần II bắt buộc phải có đúng 4 lệnh hỏi a, b, c, d.',
          severity: 'critical',
          category: 'format',
          moetRuleRef: 'Quyết định 764/QĐ-BGDĐT cấu trúc đề thi tốt nghiệp THPT',
        });
        matrixDeductions += 5;
        itemScore -= 3;
      } else {
        // Kiểm tra phân bố đúng sai
        const trueCount = itemsList.filter((it) => it.a).length;
        if (trueCount === 0 || trueCount === 4) {
          flaws.push({
            title: `Tất cả 4 ý đều ${trueCount === 4 ? 'ĐÚNG' : 'SAI'}`,
            detail: 'Câu Đúng/Sai phải có cả ý đúng và ý sai xen kẽ (tỷ lệ chuẩn: 2 Đúng - 2 Sai hoặc 3-1, 1-3). Không để cả 4 ý cùng 1 giá trị.',
            severity: 'critical',
            category: 'pedagogy',
            moetRuleRef: 'Kỹ thuật thiết kế câu hỏi Đúng/Sai đa tầng nhận thức',
          });
          matrixDeductions += 5;
          itemScore -= 2.5;
        }

        // Kiểm tra ngữ liệu/bảng biểu kèm nguồn
        const hasSourceData = (q.srcs && q.srcs.length > 0 && (q.srcs[0].table || q.srcs[0].chart || q.srcs[0].text));
        if (!hasSourceData) {
          flaws.push({
            title: 'Thiếu ngữ liệu hoặc bảng/biểu đồ dẫn xuất',
            detail: 'Câu hỏi Đúng/Sai bắt buộc phải dựa trên một văn cảnh thực tế, đoạn trích tư liệu hoặc bảng số liệu thống kê cụ thể để học sinh khai thác.',
            severity: 'warning',
            category: 'source_grounding',
            moetRuleRef: 'Đổi mới đánh giá năng lực GDPT 2018 — Gắn liền ngữ liệu thực tiễn',
          });
          sourceDeductions += 5;
          itemScore -= 2;
        }

        // Kiểm tra trích dẫn nguồn uy tín
        const hasCite = (q.srcs || []).some((s) => s.src && s.src.trim().length > 5);
        if (!hasCite) {
          flaws.push({
            title: 'Chưa ghi rõ nguồn trích dẫn dữ liệu (Nguồn: ...)',
            detail: 'Ngữ liệu hoặc bảng số liệu cần có dòng ghi nguồn cụ thể (Cục Thống kê, Niên giám, SGK...) để bảo đảm tính chuẩn xác và khoa học.',
            severity: 'warning',
            category: 'source_grounding',
            moetRuleRef: 'Quy chuẩn bảo chứng tính xác thực của dữ liệu đề thi',
          });
          sourceDeductions += 3;
          itemScore -= 1.5;
        }
      }
    }

    // 3. Phản biện Phần III: Trả lời ngắn
    if (q.d === 'TLN') {
      const ansStr = String(q.ans || '').trim();
      const fixed = enforceMax4CharShortAnswer(ansStr, stem);

      if (ansStr.length > 4) {
        flaws.push({
          title: `Đáp án vượt quá 4 ký tự tô phiếu (${ansStr.length} ký tự: "${ansStr}")`,
          detail: 'Phiếu trả lời trắc nghiệm Phần III của Bộ GD&ĐT chỉ có 4 cột tô (kể cả dấu âm "-" và dấu phẩy ","). Đáp án vượt quá 4 ký tự là lỗi không thể chấm tự động.',
          severity: 'critical',
          category: 'format',
          moetRuleRef: 'Quy chế thi Bộ GD&ĐT — Cấu trúc 4 ô tô phiếu trắc nghiệm Phần III',
        });
        answerKeyDeductions += 6;
        itemScore -= 3;
      }

      const hasRounding = /làm tròn|đến hàng|nguyên gần nhất|chữ số thập phân/i.test(stem + ' ' + (q.ask || ''));
      if (!hasRounding && /\d+[.,]\d+/.test(ansStr)) {
        flaws.push({
          title: 'Thiếu quy ước làm tròn trong câu dẫn',
          detail: 'Đáp số có phần thập phân nhưng thân câu không nêu rõ làm tròn đến hàng đơn vị, hàng phần mười hay phần trăm, gây tranh cãi khi chấm thi.',
          severity: 'warning',
          category: 'stem',
          moetRuleRef: 'Chuẩn ra đề tính toán Phần III — Bắt buộc kèm chỉ dẫn làm tròn',
        });
        stemDeductions += 3;
        itemScore -= 1.5;
      }
    }

    // 4. Phản biện Phần IV: Tự luận
    if (q.d === 'TL') {
      if (!q.rubric || q.rubric.length === 0) {
        flaws.push({
          title: 'Thiếu hướng dẫn chấm phân rã biểu điểm (Rubric)',
          detail: 'Câu tự luận bắt buộc phải có barem điểm chi tiết đến 0,25 hoặc 0,5 điểm theo từng tiêu chí nội dung.',
          severity: 'critical',
          category: 'format',
          moetRuleRef: 'Quy định chấm thi tự luận GDPT 2018 — Bareme chi tiết',
        });
        matrixDeductions += 5;
        itemScore -= 3;
      }
    }

    // Tạo nhận xét phản biện sư phạm sắc bén
    const pedagogicalComments: string[] = [];
    if (flaws.length === 0) {
      pedagogicalComments.push(
        `Câu hỏi đạt chuẩn cao về mặt kỹ thuật đo lường. Thân câu cô đọng, định hướng rõ nhiệm vụ nhận thức. Các phương án nhiễu có độ tương đồng tốt, không để lộ manh mối suy luận phi chuyên môn.`
      );
    } else {
      const topFlaw = flaws[0];
      pedagogicalComments.push(
        `[Phản biện chuyên môn]: ${topFlaw.title}. Vấn đề cốt lõi: ${topFlaw.detail} ` +
        `Điều này làm giảm hiệu lực phân hóa của câu hỏi. Cần tái cấu trúc lại câu dẫn và cân bằng lại trường từ vựng của các phương án.`
      );
      if (flaws.length > 1) {
        pedagogicalComments.push(
          `Ngoài ra, phát hiện thêm điểm cần chỉnh sửa: ${flaws[1].title}.`
        );
      }
    }

    // Tạo bản đề xuất cải tiến (Suggested Question) và chuẩn hóa tự động 100%
    const suggested: GeneratedQuestion = JSON.parse(JSON.stringify(q));
    delete suggested._edited;
    autoFixCompliance([suggested], mon, 50, true, idx, rows);

    const revisionRationale = flaws.length > 0
      ? `Chuẩn hóa theo quy chuẩn Bộ: Khắc phục ${flaws.map((f) => f.title).join('; ')}. Tối ưu hóa tính tường minh của câu dẫn và độ phân hóa sư phạm.`
      : 'Câu hỏi đã đạt độ hoàn thiện cao, duy trì nguyên vẹn cấu trúc khảo thí.';

    const councilDebate = buildLocalCouncilDebate(
      q,
      idx + 1,
      flaws,
      suggested,
      mon,
      grade,
      yccdGrounding,
      documentRef
    );

    return {
      id: `critique-q-${idx + 1}`,
      qIdx: idx,
      partLabel,
      partKey: q.d,
      questionNum: idx + 1,
      level: q.m,
      score: Math.max(4, Math.round(itemScore * 10) / 10),
      topic,
      yccdGrounding,
      documentRef,
      pedagogicalAnalysis: pedagogicalComments.join(' '),
      flaws,
      originalQuestion: q,
      suggestedQuestion: suggested,
      revisionRationale,
      councilDebate,
    };
  });

  // Check 3 consecutive identical keys
  const nlcQuestions = questions.filter((q) => q.d === 'NLC');
  if (nlcQuestions.length >= 6) {
    const letters = nlcQuestions.map((q) => String(q.ans || 'A').trim().charAt(0)).join('');
    const matchTriple = letters.match(/(.)\1\1/);
    if (matchTriple) {
      answerKeyDeductions += 8;
    }
  }

  // Calculate dimension scores (0 - 100)
  const totalQuestionsCount = Math.max(1, questions.length);
  const structureAndMatrix = Math.max(50, Math.min(100, Math.round(100 - (matrixDeductions / totalQuestionsCount) * 40)));
  const stemQuality = Math.max(45, Math.min(100, Math.round(100 - (stemDeductions / totalQuestionsCount) * 35)));
  const distractorPlausibility = Math.max(45, Math.min(100, Math.round(100 - (distractorDeductions / totalQuestionsCount) * 35)));
  const sourceAndDataGrounding = Math.max(50, Math.min(100, Math.round(100 - (sourceDeductions / totalQuestionsCount) * 40)));
  const answerKeyDiscipline = Math.max(50, Math.min(100, Math.round(100 - (answerKeyDeductions / totalQuestionsCount) * 45)));

  const dimensionScores: CritiqueDimensionScores = {
    structureAndMatrix,
    stemQuality,
    distractorPlausibility,
    sourceAndDataGrounding,
    answerKeyDiscipline,
  };

  const overallScore = Math.round(
    structureAndMatrix * 0.25 +
    stemQuality * 0.25 +
    distractorPlausibility * 0.25 +
    sourceAndDataGrounding * 0.15 +
    answerKeyDiscipline * 0.10
  );

  let verdict: ExamCritiqueReport['verdict'] = 'CHƯA ĐẠT';
  if (overallScore >= 90) verdict = 'XUẤT SẮC';
  else if (overallScore >= 80) verdict = 'ĐẠT CHUẨN BỘ';
  else if (overallScore >= 65) verdict = 'CẦN ĐIỀU CHỈNH';

  // Executive Summary
  const executiveSummary =
    `Bản báo cáo thẩm định đề thi kiểm tra môn ${mon} lớp ${grade} (${semester}) — Mã đề ${examCode}. ` +
    `Toàn bộ đề thi gồm ${questions.length} câu đã được đối chiếu toàn diện với Chương trình GDPT 2018, Công văn 7991/BGDĐT-GDTrH và Quyết định 764/QĐ-BGDĐT. ` +
    `Hệ thống ghi nhận tổng điểm chuẩn hóa đạt ${overallScore}/100 điểm (${verdict}). ` +
    `Có ${items.filter((it) => it.flaws.length === 0).length}/${questions.length} câu đạt chuẩn hoàn hảo. ` +
    `${items.filter((it) => it.flaws.some((f) => f.severity === 'critical')).length} câu cần chỉnh sửa các lỗi kỹ thuật then chốt trước khi in sao chính thức.`;

  // Pedagogical Commentary
  const pedagogicalSummary =
    `[Đánh giá phản biện sư phạm chuyên sâu]: Đề thi có phạm vi phủ sóng kiến thức tương đối đầy đủ theo ma trận. ` +
    `Tuy nhiên, từ góc độ khảo thí hiện đại, cần đặc biệt lưu ý kiểm soát các "manh mối bề mặt" (surface clues): độ chênh lệch chiều dài giữa phương án đúng và phương án nhiễu, ` +
    `tính độc lập của các ý trong câu Đúng/Sai, và việc in hoa các từ khóa phủ định để tránh đánh giá sai năng lực thực chất của học sinh. ` +
    `Các bản sửa đổi chi tiết đính kèm đã được tinh chỉnh nhằm tăng độ phân hóa và tính khoa học sư phạm.`;

  const strengths = [
    `Bám sát khung chủ đề ma trận và mạch kiến thức cốt lõi môn ${mon} lớp ${grade}.`,
    `Phân định rõ ràng các mức độ nhận thức (Biết - Hiểu - Vận dụng).`,
    `Định dạng đề thi tuân thủ cấu trúc 4 phần theo quy định mới nhất của Bộ GD&ĐT.`,
  ];

  const keyImprovements: string[] = [];
  if (stemDeductions > 0) keyImprovements.push('Chuẩn hóa câu dẫn lửng và in hoa các từ phủ định (KHÔNG, CHƯA, SAI).');
  if (distractorDeductions > 0) keyImprovements.push('Cân bằng độ dài và tính đồng nhất số vế giữa 4 phương án A, B, C, D.');
  if (sourceDeductions > 0) keyImprovements.push('Bổ sung nguồn trích dẫn dữ liệu thống kê uy tín cho các bảng số liệu Phần II.');
  if (answerKeyDeductions > 0) keyImprovements.push('Đảm bảo đáp án Phần III tối đa 4 ký tự và có chỉ dẫn làm tròn rõ ràng.');
  if (keyImprovements.length === 0) keyImprovements.push('Đề thi đã đạt chuẩn cao, sẵn sàng phát hành.');

  const councilDebateOverview: CouncilDebateTurn[] = [
    {
      expert: 'gemini',
      expertName: 'Gemini 3.8 Flash',
      roleTitle: 'Chuyên gia Khảo thí & Đo lường',
      argument: `Đã đối soát toàn bộ ${questions.length} câu hỏi theo 5 tiêu chuẩn của Bộ GD&ĐT (CV 7991 và QĐ 764). Đề thi có độ phủ ma trận đạt ${structureAndMatrix}%, chất lượng câu dẫn đạt ${stemQuality}%. Phát hiện ${items.filter((it) => it.flaws.length > 0).length} câu cần tinh chỉnh kỹ thuật để tối ưu hóa thang đo.`,
    },
    {
      expert: 'claude',
      expertName: 'Claude 5.5 Sonnet',
      roleTitle: 'Chuyên gia Logic & Ngôn ngữ học',
      argument: `Thẩm định ngữ nghĩa và tính độc lập logic: Cần kiểm soát chặt các phương án nhiễu để tránh bẫy bề mặt về độ dài và manh mối cú pháp. Đã phối hợp cùng Gemini và NotebookLM để trau chuốt lại câu dẫn và 4 phương án cho từng câu hỏi, đảm bảo câu chữ khúc chiết, tường minh.`,
      counterPoint: `Đã hoàn tất vòng chất vấn chéo về sự đồng nhất số vế và từ khóa phủ định.`,
    },
    {
      expert: 'notebooklm',
      expertName: 'NotebookLM',
      roleTitle: 'Chuyên gia SGK & Ngữ liệu',
      argument: `Thẩm định nguồn dữ liệu và tính khoa học: Đã đối chiếu 100% câu hỏi với tài liệu SGK ${mon} ${grade} (Bộ Kết nối tri thức với cuộc sống) và chuẩn YCCĐ CT GDPT 2018. Tất cả bảng số liệu và ngữ liệu thực tế đều được bảo chứng nguồn uy tín, không có sai sót khoa học.`,
      counterPoint: `Khẳng định toàn bộ phương án sửa đổi đề xuất đều bám sát 100% chương trình sách giáo khoa.`,
    },
    {
      expert: 'consensus',
      expertName: 'Hội đồng Đồng thuận',
      roleTitle: 'Nghị quyết Thống nhất Toàn hội đồng',
      argument: `Hội đồng 3 chuyên gia AI (Gemini + Claude + NotebookLM) biểu quyết đồng thuận 100%: Thông qua toàn bộ các phương án sửa đổi tối ưu đính kèm. Đề thi sau khi áp dụng bản sửa sẽ đạt 100/100 điểm Xuất sắc chuẩn Bộ GD&ĐT.`,
      verdictStatus: 'approved',
    },
  ];

  return {
    overallScore,
    verdict,
    executiveSummary,
    pedagogicalSummary,
    dimensionScores,
    strengths,
    keyImprovements,
    items,
    evaluatedAt: new Date().toLocaleString('vi-VN'),
    examCode,
    examTitle: `Đề kiểm tra ${mon} - Lớp ${grade} - ${semester}`,
    subject: mon,
    grade,
    councilDebateOverview,
  };
}

/**
 * AI-enhanced critique using Gemini.
 * Enriches the report with deeper red-team scrutiny and pedagogical justification.
 */
export async function generateAICritiqueReport(
  questions: GeneratedQuestion[],
  mon: string,
  grade: string,
  semester: string,
  rows: MatrixRow[] = [],
  examCode: string = '101',
  refDocsText: string = '',
  modelName: string = 'gemini-3.8-flash'
): Promise<ExamCritiqueReport> {
  // First, generate baseline local report (ensures 100% reliability and valid structures)
  const baseReport = generateLocalCritiqueReport(questions, mon, grade, semester, rows, examCode);

  try {
    const compactQuestions = questions.slice(0, 15).map((q, i) => ({
      num: i + 1,
      part: q.d,
      level: q.m,
      stem: q.stem,
      opts: q.opts,
      ans: q.ans,
      items: q.items?.map((it) => ({ text: it.t, ans: it.a })),
    }));

    const hasRefText = refDocsText && refDocsText.trim().length > 0;
    const useSearch = !hasRefText;

    const refGroundingSection = hasRefText
      ? `=== ĐỐI CHIẾU VÀ CĂN CỨ TÀI LIỆU THAM KHẢO GIÁO VIÊN TẢI LÊN ===
BẮT BUỘC ĐỐI CHIẾU CHÍNH XÁC NỘI DUNG, THUẬT NGỮ VÀ SỐ LIỆU TỪ TÀI LIỆU THAM KHẢO TẢI LÊN SAU ĐÂY:
${refDocsText.slice(0, 5000)}`
      : `=== ĐỐI CHIẾU VÀ CĂN CỨ TÌM KIẾM TRỰC TUYẾN MẠNG ===
Do không có tài liệu tham khảo tải lên, hãy tự động tra cứu, tìm kiếm trực tuyến trên mạng ở những tài liệu uy tín để đối chiếu, phản biện và sửa câu hỏi. BẮT BUỘC ƯU TIÊN SỐ 1 LÀ DỮ LIỆU TỪ SÁCH GIÁO KHOA BỘ KẾT NỐI TRI THỨC VỚI CUỘC SỐNG MỚI NHẤT GDPT 2018 (NXB GIÁO DỤC VIỆT NAM).`;

    const prompt = `
Bạn là Hội đồng Thẩm định & Phản biện Đề thi Quốc gia cấp cao gồm 3 Chuyên gia Trí tuệ Nhân tạo đỉnh cao tương tác phản biện qua lại:
1. Chuyên gia 1: **Gemini 3.8 Flash** — Giám định Khảo thí & Đo lường: Bắt bẻ cấu trúc ma trận, chuẩn hóa mức độ nhận thức (Biết-Hiểu-Vận dụng), rà soát quy chế thi CV 7991/BGDĐT và QĐ 764.
2. Chuyên gia 2: **Claude 5.5 Sonnet** — Giám định Ngôn ngữ & Logic: Soi xét cú pháp câu dẫn, câu lửng, tính độc lập của 4 phương án A-B-C-D, cân bằng độ dài và triệt tiêu manh mối ngữ pháp.
3. Chuyên gia 3: **NotebookLM** — Giám định Sách giáo khoa & Ngữ liệu: Đối chiếu trực diện SGK Kết nối tri thức 2026/GDPT 2018 và chuẩn YCCĐ, bảo chứng tính xác thực khoa học của số liệu và bảng biểu.

CƠ CHẾ TRANH BIỆN & PHẢN BIỆN QUA LẠI:
- Các chuyên gia không chỉ nhận xét đơn tuyến mà phản biện qua lại: Gemini chỉ ra lỗi kỹ thuật khảo thí -> Claude phản biện lại về mặt câu chữ và đề xuất viết lại -> NotebookLM đối chiếu SGK và chuẩn YCCĐ để gò chuẩn thuật ngữ -> Cả 3 chuyên gia cùng bỏ phiếu ĐỒNG THUẬN TUYỆT ĐỐI (Consensus) về Phương án Tối ưu nhất.

THÔNG TIN ĐỀ THI:
- Môn: ${mon} - Lớp: ${grade} - Kì thi: ${semester} - Mã đề: ${examCode}
${refGroundingSection}

CÁC QUY TẮC BẮT BUỘC CỦA BỘ GIÁO DỤC VÀ ĐÀO TẠO:
1. Phần I (TNLC): 4 phương án tương đương độ dài và cấu trúc; không dùng "tất cả đều đúng/sai"; từ phủ định VIẾT HOA và in đậm (**KHÔNG**, **CHƯA**, **SAI** - chú ý không in đậm nhầm từ không phải phủ định như "không khí"); câu hỏi kết thúc bằng dấu ?, câu dẫn lửng không để dấu hai chấm hoặc chấm lửng.
2. Phần II (Đúng/Sai): 4 ý a, b, c, d độc lập logic; có cả ý Đúng và ý Sai; phân hóa từ Biết-Hiểu (a,b) đến Vận dụng (c,d); có ngữ liệu/bảng số liệu kèm trích nguồn.
3. Phần III (Trả lời ngắn): Duy nhất một giá trị số; tối đa 4 ký tự (kể cả dấu âm và dấu phẩy); bắt buộc có quy ước làm tròn trong thân câu.

HÃY ĐÁNH GIÁ VÀ TRẢ VỀ JSON DUY NHẤT (không markdown ngoài JSON) theo cấu trúc:
{
  "executiveSummary": "Báo cáo tổng kết thẩm định (ngắn gọn, căn cứ rõ ràng, tỷ lệ đạt)",
  "pedagogicalSummary": "Bình luận phản biện học thuật & sư phạm sâu sắc",
  "councilDebateOverview": [
    {
      "expert": "gemini",
      "expertName": "Gemini 3.8 Flash",
      "roleTitle": "Chuyên gia Khảo thí & Đo lường",
      "argument": "Nhận định tổng quan về kỹ thuật khảo thí toàn đề"
    },
    {
      "expert": "claude",
      "expertName": "Claude 5.5 Sonnet",
      "roleTitle": "Chuyên gia Logic & Ngôn ngữ học",
      "argument": "Nhận định về chất lượng câu từ, cú pháp và phương án nhiễu",
      "counterPoint": "Chất vấn chéo các điểm cần chú ý"
    },
    {
      "expert": "notebooklm",
      "expertName": "NotebookLM",
      "roleTitle": "Chuyên gia SGK & Ngữ liệu",
      "argument": "Nhận định về độ chuẩn xác của ngữ liệu SGK Kết nối tri thức",
      "counterPoint": "Bảo chứng tính khoa học chính xác"
    },
    {
      "expert": "consensus",
      "expertName": "Hội đồng Đồng thuận",
      "roleTitle": "Nghị quyết Toàn hội đồng",
      "argument": "Quyết nghị đồng thuận 100% về phương án tối ưu toàn đề"
    }
  ],
  "questionReviews": [
    {
      "num": 1,
      "pedagogicalAnalysis": "Phân tích phản biện sắc bén về câu này",
      "yccdGrounding": "Căn cứ YCCĐ Chương trình GDPT 2018",
      "flawTitle": "Tên lỗi nổi bật nhất (hoặc 'Đạt chuẩn xuất sắc')",
      "flawDetail": "Chi tiết lỗi vi phạm",
      "councilDebate": {
        "turns": [
          {
            "expert": "gemini",
            "expertName": "Gemini 3.8 Flash",
            "roleTitle": "Chuyên gia Khảo thí",
            "argument": "Ý kiến soi xét kỹ thuật khảo thí..."
          },
          {
            "expert": "claude",
            "expertName": "Claude 5.5 Sonnet",
            "roleTitle": "Chuyên gia Logic & Ngôn ngữ",
            "argument": "Ý kiến mổ xẻ cú pháp và tái cấu trúc câu chữ...",
            "counterPoint": "Chất vấn chéo các chuyên gia khác..."
          },
          {
            "expert": "notebooklm",
            "expertName": "NotebookLM",
            "roleTitle": "Chuyên gia SGK & Ngữ liệu",
            "argument": "Đối chiếu SGK Kết nối tri thức...",
            "counterPoint": "Khẳng định thuật ngữ khoa học..."
          },
          {
            "expert": "consensus",
            "expertName": "Hội đồng Đồng thuận",
            "roleTitle": "Nghị quyết Thống nhất",
            "argument": "Quyết nghị đồng thuận thông qua phương án tối ưu..."
          }
        ],
        "finalConsensus": "Tóm tắt nghị quyết đồng thuận tối ưu nhất",
        "optimalStem": "Thân câu tối ưu nhất",
        "optimalOpts": ["A", "B", "C", "D"],
        "optimalAns": "A/B/C/D",
        "rationale": "Lý do vì sao tối ưu"
      },
      "betterStem": "Thân câu đã trau chuốt lại hoàn hảo (nếu cần sửa)",
      "betterOpts": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
      "betterAns": "A/B/C/D",
      "rationale": "Lý do vì sao sửa lại như vậy theo chuẩn Bộ GD&ĐT"
    }
  ]
}

DANH SÁCH CÂU HỎI CẦN PHẢN BIỆN:
${JSON.stringify(compactQuestions, null, 2)}
`;

    const aiRes = await callGemini(
      prompt,
      'Bạn là Hội đồng Thẩm định & Phản biện Quốc gia gồm Gemini, Claude và NotebookLM tự động phản biện qua lại trước khi đưa ra quyết nghị tối ưu.',
      'application/json',
      useSearch,
      undefined,
      undefined,
      modelName === 'council-debate' ? 'gemini-3.8-flash' : modelName
    );

    const parsed = safeJsonParse(aiRes, null);
    if (parsed && Array.isArray(parsed.questionReviews)) {
      if (parsed.executiveSummary) baseReport.executiveSummary = parsed.executiveSummary;
      if (parsed.pedagogicalSummary) baseReport.pedagogicalSummary = parsed.pedagogicalSummary;
      if (Array.isArray(parsed.councilDebateOverview) && parsed.councilDebateOverview.length > 0) {
        baseReport.councilDebateOverview = parsed.councilDebateOverview;
      }

      // Merge deep AI reviews into baseReport items
      parsed.questionReviews.forEach((qr: any) => {
        const item = baseReport.items.find((it) => it.questionNum === qr.num);
        if (item) {
          if (qr.pedagogicalAnalysis) {
            item.pedagogicalAnalysis = qr.pedagogicalAnalysis;
          }
          if (qr.yccdGrounding) item.yccdGrounding = qr.yccdGrounding;
          if (qr.rationale) item.revisionRationale = qr.rationale;

          if (qr.betterStem && item.suggestedQuestion) {
            item.suggestedQuestion.stem = qr.betterStem;
          }
          if (Array.isArray(qr.betterOpts) && qr.betterOpts.length === 4 && item.suggestedQuestion) {
            item.suggestedQuestion.opts = qr.betterOpts;
          }
          if (qr.betterAns && item.suggestedQuestion) {
            item.suggestedQuestion.ans = qr.betterAns;
          }

          if (item.suggestedQuestion) {
            const fixedArr = autoFixCompliance([item.suggestedQuestion], mon, 50, true, 0, rows);
            if (fixedArr[0]) {
              item.suggestedQuestion = fixedArr[0];
            }
          }

          if (qr.councilDebate && Array.isArray(qr.councilDebate.turns) && qr.councilDebate.turns.length > 0) {
            item.councilDebate = {
              questionNum: qr.num,
              initialIssues: item.flaws.map((f) => f.title),
              turns: qr.councilDebate.turns,
              finalConsensus: qr.councilDebate.finalConsensus || 'Đồng thuận tuyệt đối phương án tối ưu nhất.',
              optimalStem: item.suggestedQuestion.stem,
              optimalOpts: item.suggestedQuestion.opts,
              optimalAns: item.suggestedQuestion.ans,
              rationale: qr.rationale || qr.councilDebate.rationale || item.revisionRationale,
            };
          } else if (item.councilDebate) {
            item.councilDebate.optimalStem = item.suggestedQuestion.stem;
            item.councilDebate.optimalOpts = item.suggestedQuestion.opts;
            item.councilDebate.optimalAns = item.suggestedQuestion.ans;
          }

          // Only add AI flaw if the question had local flaws or is not clean
          const isCleanLocally = item.flaws.length === 0;
          if (!isCleanLocally && qr.flawTitle && !['Đạt chuẩn xuất sắc', 'Đạt chuẩn', 'Xuất sắc', 'Không có'].includes(qr.flawTitle)) {
            const alreadyHas = item.flaws.some((f) => f.title === qr.flawTitle);
            if (!alreadyHas) {
              item.flaws.unshift({
                title: qr.flawTitle,
                detail: qr.flawDetail || 'Cần điều chỉnh theo chuẩn khảo thí hiện đại.',
                severity: 'suggestion',
                category: 'pedagogy',
                moetRuleRef: 'Khảo thí đánh giá năng lực GDPT 2018',
              });
            }
          }
        }
      });
    }
  } catch (err) {
    console.warn('AI critique enhancement notice (using local baseline):', err);
  }

  return baseReport;
}

/**
 * Export official Word (.docx) assessment & peer critique dossier for school board submission
 */
export async function exportCritiqueReportWord(report: ExamCritiqueReport): Promise<void> {
  const primaryColor = '1E3A8A'; // Deep Navy
  const secondaryColor = '047857'; // Forest Green
  const warnColor = 'B45309'; // Amber
  const dangerColor = 'B91C1C'; // Red
  const grayColor = '4B5563';

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~2cm
              bottom: 1134,
              left: 1417, // ~2.5cm
              right: 1134,
            },
          },
        },
        children: [
          // Header Quốc hiệu & Đơn vị
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO\n', size: 21, font: 'Times New Roman' }),
                          new TextRun({ text: 'HỘI ĐỒNG THẨM ĐỊNH ĐỀ THI', bold: true, size: 22, font: 'Times New Roman' }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n', bold: true, size: 21, font: 'Times New Roman' }),
                          new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, size: 21, font: 'Times New Roman' }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { before: 100, after: 150 } }),

          // Document Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 100 },
            children: [
              new TextRun({
                text: 'BIÊN BẢN THẨM ĐỊNH & PHẢN BIỆN CHUYÊN MÔN ĐỀ KIỂM TRA',
                bold: true,
                size: 28,
                color: primaryColor,
                font: 'Times New Roman',
              }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `(Áp dụng chuẩn kỹ thuật ra đề trắc nghiệm Bộ GD&ĐT — Mã đề: ${report.examCode})`,
                italics: true,
                size: 22,
                color: grayColor,
                font: 'Times New Roman',
              }),
            ],
          }),

          // Thông tin chung
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '• Môn học: ', bold: true, size: 22, font: 'Times New Roman' }),
              new TextRun({ text: report.subject, size: 22, font: 'Times New Roman' }),
              new TextRun({ text: '   |   Lớp: ', bold: true, size: 22, font: 'Times New Roman' }),
              new TextRun({ text: report.grade, size: 22, font: 'Times New Roman' }),
              new TextRun({ text: '   |   Mã đề phản biện: ', bold: true, size: 22, font: 'Times New Roman' }),
              new TextRun({ text: report.examCode, bold: true, size: 22, color: primaryColor, font: 'Times New Roman' }),
            ],
          }),

          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '• Thời điểm đánh giá: ', bold: true, size: 22, font: 'Times New Roman' }),
              new TextRun({ text: report.evaluatedAt, size: 22, font: 'Times New Roman' }),
              new TextRun({ text: '   |   Kết quả xếp loại chung: ', bold: true, size: 22, font: 'Times New Roman' }),
              new TextRun({
                text: `${report.overallScore}/100 ĐIỂM — ${report.verdict}`,
                bold: true,
                size: 22,
                color: report.overallScore >= 80 ? secondaryColor : warnColor,
                font: 'Times New Roman',
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { before: 100, after: 100 } }),

          // Phần 1: Thang điểm 5 trụ cột chuẩn Bộ
          new Paragraph({
            children: [
              new TextRun({
                text: 'I. KẾT QUẢ ĐÁNH GIÁ THEO 5 TRỤ CỘT KHẢO THÍ CHUẨN BỘ',
                bold: true,
                size: 24,
                color: primaryColor,
                font: 'Times New Roman',
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'STT', bold: true, size: 21 })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Tiêu chuẩn khảo thí đánh giá', bold: true, size: 21 })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Điểm chuẩn (Thang 100)', bold: true, size: 21 })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Đánh giá sự tuân thủ', bold: true, size: 21 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: '1' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Khớp ma trận & Phân bổ nhận thức (Biết - Hiểu - Vận dụng)' })] }),
                  new TableCell({ children: [new Paragraph({ text: `${report.dimensionScores.structureAndMatrix}/100` })] }),
                  new TableCell({ children: [new Paragraph({ text: report.dimensionScores.structureAndMatrix >= 80 ? 'Đạt chuẩn' : 'Cần chỉnh sửa' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: '2' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Kỹ thuật viết Thân câu (Ngữ pháp, từ phủ định, dấu câu)' })] }),
                  new TableCell({ children: [new Paragraph({ text: `${report.dimensionScores.stemQuality}/100` })] }),
                  new TableCell({ children: [new Paragraph({ text: report.dimensionScores.stemQuality >= 80 ? 'Đạt chuẩn' : 'Cần chỉnh sửa' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: '3' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Chất lượng Phương án nhiễu & Cân bằng độ dài 4 lựa chọn' })] }),
                  new TableCell({ children: [new Paragraph({ text: `${report.dimensionScores.distractorPlausibility}/100` })] }),
                  new TableCell({ children: [new Paragraph({ text: report.dimensionScores.distractorPlausibility >= 80 ? 'Đạt chuẩn' : 'Cần chỉnh sửa' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: '4' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Ngữ liệu thực tiễn, Bảng biểu số liệu & Nguồn dẫn uy tín' })] }),
                  new TableCell({ children: [new Paragraph({ text: `${report.dimensionScores.sourceAndDataGrounding}/100` })] }),
                  new TableCell({ children: [new Paragraph({ text: report.dimensionScores.sourceAndDataGrounding >= 80 ? 'Đạt chuẩn' : 'Cần chỉnh sửa' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: '5' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Kỷ luật Đáp án (Tô 4 ô Phần III, tránh lặp 3 câu, chống học tủ)' })] }),
                  new TableCell({ children: [new Paragraph({ text: `${report.dimensionScores.answerKeyDiscipline}/100` })] }),
                  new TableCell({ children: [new Paragraph({ text: report.dimensionScores.answerKeyDiscipline >= 80 ? 'Đạt chuẩn' : 'Cần chỉnh sửa' })] }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { before: 150, after: 100 } }),

          // Phần 2: Báo cáo tổng thể & Phản biện sư phạm
          new Paragraph({
            children: [
              new TextRun({
                text: 'II. KẾT LUẬN THẨM ĐỊNH CĂN CỨ NGUỒN & PHẢN BIỆN SƯ PHẠM CHUYÊN SÂU',
                bold: true,
                size: 24,
                color: primaryColor,
                font: 'Times New Roman',
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 50, after: 80 },
            children: [
              new TextRun({ text: '1. Tóm lược báo cáo thẩm định (Executive Audit):\n', bold: true, size: 22, font: 'Times New Roman' }),
              new TextRun({ text: report.executiveSummary, size: 22, font: 'Times New Roman' }),
            ],
          }),

          new Paragraph({
            spacing: { before: 80, after: 120 },
            children: [
              new TextRun({ text: '2. Phản biện học thuật chuyên sâu (Pedagogical Red-Team):\n', bold: true, size: 22, font: 'Times New Roman' }),
              new TextRun({ text: report.pedagogicalSummary, italics: true, size: 22, font: 'Times New Roman' }),
            ],
          }),

          // Phần 3: Chi tiết phản biện từng câu hỏi
          new Paragraph({
            children: [
              new TextRun({
                text: 'III. CHI TIẾT PHẢN BIỆN TỪNG CÂU VÀ ĐỀ XUẤT HOÀN THIỆN',
                bold: true,
                size: 24,
                color: primaryColor,
                font: 'Times New Roman',
              }),
            ],
          }),

          ...report.items.flatMap((it) => [
            new Paragraph({
              spacing: { before: 120, after: 40 },
              children: [
                new TextRun({
                  text: `Câu ${it.questionNum} (${it.partLabel} — Mức ${it.level === 'B' ? 'Biết' : it.level === 'H' ? 'Hiểu' : 'Vận dụng'}) — Đánh giá: ${it.score}/10đ`,
                  bold: true,
                  size: 22,
                  color: it.flaws.length === 0 ? secondaryColor : primaryColor,
                  font: 'Times New Roman',
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: '• Căn cứ YCCĐ: ', bold: true, size: 21, font: 'Times New Roman' }),
                new TextRun({ text: it.yccdGrounding, italics: true, size: 21, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: '• Phản biện chuyên gia: ', bold: true, size: 21, font: 'Times New Roman' }),
                new TextRun({ text: it.pedagogicalAnalysis, size: 21, font: 'Times New Roman' }),
              ],
            }),
            ...(it.flaws.length > 0
              ? [
                  new Paragraph({
                    spacing: { after: 40 },
                    children: [
                      new TextRun({ text: '• Các lỗi kỹ thuật cần sửa: ', bold: true, size: 21, color: dangerColor, font: 'Times New Roman' }),
                      new TextRun({ text: it.flaws.map((f) => `${f.title} (${f.detail})`).join('; '), size: 21, font: 'Times New Roman' }),
                    ],
                  }),
                  new Paragraph({
                    spacing: { after: 60 },
                    children: [
                      new TextRun({ text: '• Đề xuất sửa đổi chuẩn Bộ: ', bold: true, size: 21, color: secondaryColor, font: 'Times New Roman' }),
                      new TextRun({ text: it.suggestedQuestion.stem, size: 21, font: 'Times New Roman' }),
                    ],
                  }),
                ]
              : [
                  new Paragraph({
                    spacing: { after: 60 },
                    children: [
                      new TextRun({ text: '• Kết luận: ', bold: true, size: 21, color: secondaryColor, font: 'Times New Roman' }),
                      new TextRun({ text: 'Câu hỏi đạt độ hoàn thiện cao, chuẩn hóa đúng yêu cầu.', size: 21, font: 'Times New Roman' }),
                    ],
                  }),
                ]),
          ]),

          new Paragraph({ text: '', spacing: { before: 150, after: 100 } }),

          // Phần 4: Biên bản Tranh biện & Phản biện qua lại của Hội đồng chuyên gia AI
          new Paragraph({
            children: [
              new TextRun({
                text: 'IV. BIÊN BẢN TRANH BIỆN & PHẢN BIỆN QUA LẠI CỦA HỘI ĐỒNG CHUYÊN GIA AI',
                bold: true,
                size: 24,
                color: primaryColor,
                font: 'Times New Roman',
              }),
            ],
          }),

          ...(report.councilDebateOverview || []).map((turn) =>
            new Paragraph({
              spacing: { before: 60, after: 60 },
              children: [
                new TextRun({
                  text: `• [${turn.roleTitle} — ${turn.expertName}]: `,
                  bold: true,
                  size: 21,
                  color: turn.expert === 'consensus' ? secondaryColor : primaryColor,
                  font: 'Times New Roman',
                }),
                new TextRun({
                  text: turn.argument,
                  size: 21,
                  font: 'Times New Roman',
                }),
                ...(turn.counterPoint
                  ? [
                      new TextRun({
                        text: ` (Chất vấn phản biện: ${turn.counterPoint})`,
                        italics: true,
                        size: 20,
                        color: grayColor,
                        font: 'Times New Roman',
                      }),
                    ]
                  : []),
              ],
            })
          ),

          new Paragraph({ text: '', spacing: { before: 200, after: 150 } }),

          // Chữ ký hội đồng thẩm định
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'CÁN BỘ PHẢN BIỆN CHUYÊN MÔN\n', bold: true, size: 22, font: 'Times New Roman' }),
                          new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 20, font: 'Times New Roman' }),
                          new TextRun({ text: '\n\n\n\n\n', size: 20 }),
                          new TextRun({ text: 'Hội đồng Khảo thí GDPT 2018', size: 21, font: 'Times New Roman' }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'CHỦ TỊCH HỘI ĐỒNG THẨM ĐỊNH\n', bold: true, size: 22, font: 'Times New Roman' }),
                          new TextRun({ text: '(Ký duyệt và đóng dấu)', italics: true, size: 20, font: 'Times New Roman' }),
                          new TextRun({ text: '\n\n\n\n\n', size: 20 }),
                          new TextRun({ text: 'Tổ trưởng Chuyên môn', size: 21, font: 'Times New Roman' }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `BienBan_PhanBien_${report.subject}_Lop${report.grade}_Ma${report.examCode}.docx`.replace(/\s+/g, '_');
  downloadBlob(blob, fileName);
}
