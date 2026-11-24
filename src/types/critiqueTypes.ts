import { GeneratedQuestion } from '../types';

export type CritiqueSeverity = 'critical' | 'warning' | 'suggestion' | 'praise';

export type CritiqueCategory =
  | 'stem'
  | 'distractors'
  | 'pedagogy'
  | 'source_grounding'
  | 'format';

export interface CritiqueFlaw {
  title: string;
  detail: string;
  severity: CritiqueSeverity;
  category: CritiqueCategory;
  moetRuleRef: string; // Điều khoản / Quy định Bộ GD&ĐT (CV 7991, QĐ 764, Hướng dẫn khảo thí)
}

export interface CouncilDebateTurn {
  expert: 'gemini' | 'claude' | 'notebooklm' | 'consensus';
  expertName: string;
  roleTitle: string;
  argument: string;
  counterPoint?: string;
  verdictStatus?: 'challenge' | 'refine' | 'approved';
}

export interface QuestionCouncilDebate {
  questionNum: number;
  initialIssues: string[];
  turns: CouncilDebateTurn[];
  finalConsensus: string;
  optimalStem: string;
  optimalOpts?: string[];
  optimalAns?: string;
  rationale: string;
}

export interface QuestionCritiqueItem {
  id: string;
  qIdx: number;
  partLabel: string; // 'Phần I: TN Nhiều lựa chọn' | 'Phần II: Đúng/Sai' | 'Phần III: Trả lời ngắn' | 'Phần IV: Tự luận'
  partKey: 'NLC' | 'DS' | 'TLN' | 'TL';
  questionNum: number;
  level: 'B' | 'H' | 'V';
  score: number; // 0 - 10
  topic: string;
  yccdGrounding: string; // Dẫn chiếu Chuẩn Yêu cầu cần đạt Chương trình GDPT 2018
  documentRef: string; // Dẫn nguồn SGK / Tài liệu chuyên môn
  pedagogicalAnalysis: string; // Bình luận phản biện học thuật & sư phạm sắc bén chuyên sâu
  flaws: CritiqueFlaw[];
  originalQuestion: GeneratedQuestion;
  suggestedQuestion: GeneratedQuestion;
  revisionRationale: string; // Giải trình lý do sửa đổi theo chuẩn Bộ
  applied?: boolean;
  councilDebate?: QuestionCouncilDebate;
}

export interface CritiqueDimensionScores {
  structureAndMatrix: number;      // 0 - 100: Khớp cấu trúc ma trận, phân hóa nhận thức Biết-Hiểu-Vận dụng
  stemQuality: number;             // 0 - 100: Kỹ thuật xây dựng câu dẫn (ngữ pháp, dấu câu, từ phủ định)
  distractorPlausibility: number;  // 0 - 100: Chất lượng phương án nhiễu & tính đồng nhất cấu trúc
  sourceAndDataGrounding: number;  // 0 - 100: Tính xác thực dữ liệu, ngữ liệu & bảng biểu có nguồn dẫn
  answerKeyDiscipline: number;     // 0 - 100: Kỷ luật đáp án (tránh bẫy lộ đáp án, giới hạn 4 ký tự tô phiếu)
}

export interface ExamCritiqueReport {
  overallScore: number; // 0 - 100
  verdict: 'XUẤT SẮC' | 'ĐẠT CHUẨN BỘ' | 'CẦN ĐIỀU CHỈNH' | 'CHƯA ĐẠT';
  executiveSummary: string; // Tóm lược báo cáo thẩm định căn cứ nguồn & chuẩn YCCĐ
  pedagogicalSummary: string; // Đánh giá phản biện sư phạm chuyên sâu
  dimensionScores: CritiqueDimensionScores;
  strengths: string[];
  keyImprovements: string[];
  items: QuestionCritiqueItem[];
  evaluatedAt: string;
  examCode: string;
  examTitle: string;
  subject: string;
  grade: string;
  councilDebateOverview?: CouncilDebateTurn[];
}
