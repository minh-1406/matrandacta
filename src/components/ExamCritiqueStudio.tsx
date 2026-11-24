import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  FileText,
  RotateCcw,
  Sliders,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
  Flame,
  Layers,
  Wand2,
  Scale,
  Users,
  MessageSquare,
} from 'lucide-react';
import { GeneratedQuestion, MatrixRow } from '../types';
import {
  ExamCritiqueReport,
  QuestionCritiqueItem,
  CouncilDebateTurn,
} from '../types/critiqueTypes';
import {
  exportCritiqueReportWord,
  generateAICritiqueReport,
  generateLocalCritiqueReport,
} from '../services/critiqueService';
import { autoFixCompliance, normalizeQuestion } from '../utils/questionChecker';

interface ExamCritiqueStudioProps {
  questions: GeneratedQuestion[];
  mon: string;
  grade: string;
  semester: string;
  rows: MatrixRow[];
  examCode: string;
  refDocsText?: string;
  isOpen: boolean;
  onClose: () => void;
  onApplyQuestionFix: (qIdx: number, fixedQuestion: GeneratedQuestion) => void;
  onApplyAllFixes: (fixedQuestions: GeneratedQuestion[]) => void;
  allExamCodes?: string[];
  activeSetIndex?: number;
  onSelectSetIndex?: (idx: number) => void;
}

export const ExamCritiqueStudio: React.FC<ExamCritiqueStudioProps> = ({
  questions,
  mon,
  grade,
  semester,
  rows,
  examCode,
  refDocsText = '',
  isOpen,
  onClose,
  onApplyQuestionFix,
  onApplyAllFixes,
  allExamCodes = [],
  activeSetIndex = 0,
  onSelectSetIndex,
}) => {
  const [report, setReport] = useState<ExamCritiqueReport>(() =>
    generateLocalCritiqueReport(questions, mon, grade, semester, rows, examCode)
  );
  const [isRunningAI, setIsRunningAI] = useState<boolean>(false);
  const [critiqueModel, setCritiqueModel] = useState<string>('council-debate');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'flaws' | 'perfect'>('all');
  const [filterPart, setFilterPart] = useState<'all' | 'NLC' | 'DS' | 'TLN' | 'TL'>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [appliedItemIds, setAppliedItemIds] = useState<Set<string>>(new Set());
  const [activeItemTabs, setActiveItemTabs] = useState<Record<string, 'debate' | 'compare'>>({});
  const [isExportingWord, setIsExportingWord] = useState<boolean>(false);

  // Re-run local critique if questions change and modal is open
  React.useEffect(() => {
    if (isOpen && questions.length > 0) {
      setReport(generateLocalCritiqueReport(questions, mon, grade, semester, rows, examCode));
      setAppliedItemIds(new Set());
    }
  }, [isOpen, questions, examCode]);

  if (!isOpen) return null;

  // Run AI Deep Critique (Chuyên sâu theo chuẩn Bộ)
  const handleRunAICritique = async () => {
    setIsRunningAI(true);
    try {
      const aiReport = await generateAICritiqueReport(
        questions,
        mon,
        grade,
        semester,
        rows,
        examCode,
        refDocsText,
        critiqueModel
      );
      setReport(aiReport);
    } catch (err) {
      console.error('Failed to run AI critique:', err);
    } finally {
      setIsRunningAI(false);
    }
  };

  // Apply single question fix
  const handleApplySingle = (item: QuestionCritiqueItem) => {
    const fixedQ = normalizeQuestion(JSON.parse(JSON.stringify(item.suggestedQuestion)));
    autoFixCompliance([fixedQ], mon);
    onApplyQuestionFix(item.qIdx, fixedQ);
    setAppliedItemIds((prev) => new Set([...prev, item.id]));

    const updatedList = [...questions];
    updatedList[item.qIdx] = fixedQ;
    setReport(generateLocalCritiqueReport(updatedList, mon, grade, semester, rows, examCode));
  };

  // Apply all suggested fixes across the entire exam
  const handleApplyAll = () => {
    const updatedList = questions.map((q) => normalizeQuestion(JSON.parse(JSON.stringify(q))));
    const newApplied = new Set<string>();

    report.items.forEach((item) => {
      if (item.flaws.length > 0) {
        const fixedQ = normalizeQuestion(JSON.parse(JSON.stringify(item.suggestedQuestion)));
        updatedList[item.qIdx] = fixedQ;
        newApplied.add(item.id);
      }
    });

    autoFixCompliance(updatedList, mon);
    onApplyAllFixes(updatedList);
    setAppliedItemIds(newApplied);

    // Refresh report with new auto-fixed questions so report immediately shows 100% score with 0 flaws
    setReport(generateLocalCritiqueReport(updatedList, mon, grade, semester, rows, examCode));
  };

  // Export official Word assessment document
  const handleExportWord = async () => {
    setIsExportingWord(true);
    try {
      await exportCritiqueReportWord(report);
    } catch (err) {
      console.error('Export critique Word error:', err);
    } finally {
      setIsExportingWord(false);
    }
  };

  // Filter items
  const filteredItems = report.items.filter((item) => {
    if (filterPart !== 'all' && item.partKey !== filterPart) return false;
    if (filterSeverity === 'critical') return item.flaws.some((f) => f.severity === 'critical');
    if (filterSeverity === 'flaws') return item.flaws.length > 0;
    if (filterSeverity === 'perfect') return item.flaws.length === 0;
    return true;
  });

  const criticalCount = report.items.filter((it) => it.flaws.some((f) => f.severity === 'critical')).length;
  const flawCount = report.items.filter((it) => it.flaws.length > 0).length;
  const perfectCount = report.items.filter((it) => it.flaws.length === 0).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-50 w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* TOP HEADER: STUDIO IDENTITY */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white px-5 py-4 border-b border-indigo-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3 text-slate-950 fill-slate-950" />
                Hội đồng Phản biện Đề thi
              </span>
              <span className="bg-indigo-700/80 text-indigo-100 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-indigo-500/40">
                Thẩm định Nguồn & Sư phạm
              </span>
              {allExamCodes && allExamCodes.length > 1 && onSelectSetIndex ? (
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-md px-2 py-0.5">
                  <label className="text-xs text-slate-300 font-bold">Phản biện Mã đề:</label>
                  <select
                    value={activeSetIndex}
                    onChange={(e) => onSelectSetIndex(Number(e.target.value))}
                    className="bg-slate-900 text-amber-300 text-xs font-bold rounded px-2 py-0.5 border border-amber-400/40 focus:outline-none cursor-pointer"
                    title="Chuyển nhanh sang Mã đề khác để phản biện"
                  >
                    {allExamCodes.map((code, idx) => (
                      <option key={idx} value={idx} className="bg-slate-900 text-amber-300 font-bold">
                        Đề {idx + 1} — Mã {code}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs text-slate-300 font-mono font-bold bg-white/10 px-2 py-0.5 rounded-md">
                  Mã đề: {examCode}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              Thẩm định Kỹ thuật & Phản biện Sư phạm Đề thi Chuẩn Bộ GD&ĐT
            </h2>
            <p className="text-xs text-slate-300">
              Đối chiếu chuẩn YCCĐ CT GDPT 2018, Công văn 7991 và Quyết định 764. Rà soát bẫy câu chữ, cân bằng phương án nhiễu & tối ưu hóa độ phân hóa.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={critiqueModel}
              onChange={(e) => setCritiqueModel(e.target.value)}
              className="bg-slate-900 text-amber-300 text-xs font-bold rounded-xl px-2.5 py-2 border border-amber-400/40 focus:outline-none cursor-pointer shadow-xs"
              title="Chọn mô hình AI thẩm định & phản biện chuyên sâu"
            >
              <option value="council-debate">🏆 Hội đồng Đa AI Tranh biện (Gemini ↔ Claude ↔ NotebookLM)</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Chuyên gia Khảo thí)</option>
              <option value="claude-5.5-sonnet">Claude 5.5 Sonnet (Chuyên gia Logic & Ngôn ngữ)</option>
              <option value="claude-3.5-sonnet">Claude 3.5 Sonnet (Anthropic)</option>
              <option value="notebooklm">NotebookLM (Chuyên gia SGK & Ngữ liệu)</option>
            </select>

            <button
              type="button"
              onClick={handleRunAICritique}
              disabled={isRunningAI}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              title="Kích hoạt phân tích phản biện sâu theo chuẩn khảo thí Bộ GD&ĐT"
            >
              <Wand2 className={`w-3.5 h-3.5 ${isRunningAI ? 'animate-spin' : ''}`} />
              <span>{isRunningAI ? 'Đang thẩm định...' : 'Phản biện chuyên sâu'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              disabled={isExportingWord}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              title="Xuất biên bản thẩm định và phản biện đề thi ra file Word (.docx) nộp tổ chuyên môn"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-300" />
              <span>{isExportingWord ? 'Đang xuất...' : 'Xuất Biên bản Word'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BODY SCROLL CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* SECTION 1: EXECUTIVE SCORECARD (Tổng quan & 5 Trụ cột đánh giá) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Scorecard Hero */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Điểm chuẩn hóa đề thi
                  </span>
                  <span
                    className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                      report.overallScore >= 90
                        ? 'bg-emerald-100 text-emerald-800'
                        : report.overallScore >= 80
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {report.verdict}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span
                    className={`text-4xl sm:text-5xl font-black ${
                      report.overallScore >= 90
                        ? 'text-emerald-600'
                        : report.overallScore >= 80
                        ? 'text-indigo-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {report.overallScore}
                  </span>
                  <span className="text-slate-400 font-bold text-sm">/ 100 điểm</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Đánh giá tổng hợp trên <b>{questions.length} câu hỏi</b> theo 5 tiêu chuẩn khảo thí đo lường quốc gia.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Cần xử lý: <b className="text-rose-600">{criticalCount} câu lỗi then chốt</b>
                </span>
                {flawCount > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyAll}
                    className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 underline transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Áp dụng sửa {flawCount} câu
                  </button>
                )}
              </div>
            </div>

            {/* 5 Pillars Progress Breakdown */}
            <div className="lg:col-span-8 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  5 Trụ cột đánh giá kỹ thuật ra đề Bộ GD&ĐT
                </h3>
                <span className="text-[11px] text-slate-400">CV 7991/BGDĐT & QĐ 764</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {/* Pillar 1 */}
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>1. Khớp Ma trận & Nhận thức (B-H-V)</span>
                    <span className="font-bold text-indigo-600">{report.dimensionScores.structureAndMatrix}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all"
                      style={{ width: `${report.dimensionScores.structureAndMatrix}%` }}
                    />
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>2. Kỹ thuật Thân câu & Từ phủ định</span>
                    <span className="font-bold text-indigo-600">{report.dimensionScores.stemQuality}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all"
                      style={{ width: `${report.dimensionScores.stemQuality}%` }}
                    />
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>3. Cân bằng Phương án nhiễu (A-B-C-D)</span>
                    <span className="font-bold text-indigo-600">{report.dimensionScores.distractorPlausibility}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all"
                      style={{ width: `${report.dimensionScores.distractorPlausibility}%` }}
                    />
                  </div>
                </div>

                {/* Pillar 4 */}
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>4. Ngữ liệu thực tiễn & Nguồn trích dẫn</span>
                    <span className="font-bold text-indigo-600">{report.dimensionScores.sourceAndDataGrounding}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all"
                      style={{ width: `${report.dimensionScores.sourceAndDataGrounding}%` }}
                    />
                  </div>
                </div>

                {/* Pillar 5 */}
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>5. Kỷ luật Đáp án (Phần III tối đa 4 ký tự tô phiếu, không trùng 3 câu liên tiếp)</span>
                    <span className="font-bold text-indigo-600">{report.dimensionScores.answerKeyDiscipline}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all"
                      style={{ width: `${report.dimensionScores.answerKeyDiscipline}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Summary Strip */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11.5px] text-slate-600 flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <b>Căn cứ pháp lý khảo thí:</b> Đề thi được đối chiếu chặt chẽ với bản đặc tả môn {mon} lớp {grade}, tài liệu SGK Kết nối tri thức và quy định cấu trúc đề thi 2025.
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: BÁO CÁO THẨM ĐỊNH NGUỒN & PHẢN BIỆN SƯ PHẠM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Grounding & Audit */}
            <div className="bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/60 p-4 rounded-2xl border border-indigo-200/80 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                  Y
                </div>
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                  Báo cáo Thẩm định Căn cứ Nguồn & Chuẩn YCCĐ
                </h4>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                {report.executiveSummary}
              </p>
              <div className="pt-2 border-t border-indigo-100/80 flex flex-wrap gap-1.5 text-[11px]">
                <span className="bg-indigo-100/80 text-indigo-800 px-2 py-0.5 rounded-md font-semibold">
                  CT GDPT 2018
                </span>
                <span className="bg-sky-100/80 text-sky-800 px-2 py-0.5 rounded-md font-semibold">
                  SGK Kết nối tri thức
                </span>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                  Công văn 7991
                </span>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                  Quyết định 764
                </span>
              </div>
            </div>

            {/* Pedagogical Red-team Scrutiny */}
            <div className="bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-2xs">
                  P
                </div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Phản biện Sư phạm & Bẫy Kỹ thuật Ra đề
                </h4>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-sans italic">
                "{report.pedagogicalSummary}"
              </p>
              <div className="pt-2 border-t border-amber-100/80 flex flex-wrap gap-1.5 text-[11px]">
                <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-semibold">
                  Chống đoán mò bề mặt
                </span>
                <span className="bg-orange-100 text-orange-900 px-2 py-0.5 rounded-md font-semibold">
                  Cân bằng độ dài A-B-C-D
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-semibold">
                  Phân hóa đúng nhận thức
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2B: BIÊN BẢN TRANH BIỆN & PHẢN BIỆN QUA LẠI CỦA HỘI ĐỒNG AI */}
          {report.councilDebateOverview && report.councilDebateOverview.length > 0 && (
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl border border-indigo-500/40 shadow-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-900/60 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-md">
                    <Scale className="w-4 h-4 text-slate-950" />
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                      <span>Biên bản Tranh biện & Phản biện qua lại của Hội đồng Đa chuyên gia AI</span>
                      <span className="bg-indigo-600/80 text-white text-[10px] px-2 py-0.5 rounded-md font-mono">
                        3 Chuyên gia AI Đối thoại
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Gemini 3.8 Flash (Khảo thí & Đo lường) ↔ Claude 5.5 Sonnet (Ngôn ngữ & Logic) ↔ NotebookLM (SGK & Ngữ liệu)
                    </p>
                  </div>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Đồng thuận 100% Phương án Tối ưu
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                {report.councilDebateOverview.map((turn, tIdx) => {
                  const isConsensus = turn.expert === 'consensus';
                  const isGemini = turn.expert === 'gemini';
                  const isClaude = turn.expert === 'claude';
                  return (
                    <div
                      key={tIdx}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition hover:scale-[1.01] ${
                        isConsensus
                          ? 'bg-gradient-to-br from-amber-500/25 via-slate-900 to-amber-900/40 border-amber-400/60 text-amber-100 shadow-md'
                          : isGemini
                          ? 'bg-indigo-950/70 border-indigo-700/60 text-indigo-100'
                          : isClaude
                          ? 'bg-amber-950/60 border-amber-700/60 text-amber-100'
                          : 'bg-emerald-950/60 border-emerald-700/60 text-emerald-100'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-black text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-md ${
                              isConsensus
                                ? 'bg-amber-400 text-slate-950'
                                : isGemini
                                ? 'bg-indigo-600 text-white'
                                : isClaude
                                ? 'bg-amber-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {turn.expertName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Vòng {tIdx + 1}</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-300">
                          {turn.roleTitle}
                        </div>
                        <p className="text-[11.5px] leading-relaxed text-slate-200">
                          {turn.argument}
                        </p>
                      </div>
                      {turn.counterPoint && (
                        <div className="mt-2.5 pt-2 border-t border-white/10 text-[10.5px] text-amber-200/90 italic">
                          💬 <b>Chất vấn chéo:</b> {turn.counterPoint}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: FILTER CONTROLS & BATCH ACTIONS */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            {/* Filter by severity */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1">
                Lọc câu:
              </span>
              <button
                type="button"
                onClick={() => setFilterSeverity('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterSeverity === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({report.items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterSeverity('critical')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  filterSeverity === 'critical'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                <Flame className="w-3 h-3" />
                Cần sửa gấp ({criticalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterSeverity('flaws')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterSeverity === 'flaws'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                Có khuyến nghị ({flawCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterSeverity('perfect')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterSeverity === 'perfect'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Đạt chuẩn ({perfectCount})
              </button>
            </div>

            {/* Filter by Part */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1">
                Phần:
              </span>
              {[
                { key: 'all', label: 'Toàn bộ' },
                { key: 'NLC', label: 'Phần I' },
                { key: 'DS', label: 'Phần II' },
                { key: 'TLN', label: 'Phần III' },
                { key: 'TL', label: 'Phần IV' },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setFilterPart(p.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    filterPart === p.key
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 4: QUESTION AUDIT & REWRITE CARDS */}
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isApplied = appliedItemIds.has(item.id);
              const isExpanded = expandedItemId === item.id || item.flaws.some((f) => f.severity === 'critical');
              const hasFlaws = item.flaws.length > 0;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                    item.flaws.some((f) => f.severity === 'critical')
                      ? 'border-rose-300 ring-1 ring-rose-100'
                      : hasFlaws
                      ? 'border-amber-200'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Question Card Header */}
                  <div className="p-3.5 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-slate-900 text-white font-mono font-black text-xs px-2.5 py-1 rounded-lg shadow-2xs">
                        Câu {item.questionNum}
                      </span>
                      <span className="text-xs font-bold text-indigo-950">
                        {item.partLabel}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.level === 'B'
                            ? 'bg-sky-100 text-sky-800'
                            : item.level === 'H'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        Mức {item.level === 'B' ? 'Biết' : item.level === 'H' ? 'Hiểu' : 'Vận dụng'}
                      </span>

                      {/* Score Badge */}
                      <span
                        className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                          item.score >= 9
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.score >= 7.5
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.score}/10đ
                      </span>

                      {/* Applied Status */}
                      {isApplied && (
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Đã áp dụng vào đề
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {hasFlaws && (
                        <button
                          type="button"
                          onClick={() => handleApplySingle(item)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer ${
                            isApplied
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isApplied ? 'Đã áp dụng bản sửa' : 'Áp dụng bản sửa'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 p-1 rounded-md"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Question Card Content */}
                  <div className="p-4 space-y-3">
                    {/* Source Grounding Pill */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                        Dẫn chiếu YCCĐ:
                      </span>
                      <span className="text-slate-700 italic flex-1">{item.yccdGrounding}</span>
                      <span className="text-slate-400 text-[11px] block sm:inline">
                        Nguồn: {item.documentRef}
                      </span>
                    </div>

                    {/* Pedagogical Scrutiny */}
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs text-amber-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-900">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Phân tích phản biện sư phạm:</span>
                      </div>
                      <p className="leading-relaxed text-slate-700">
                        {item.pedagogicalAnalysis}
                      </p>
                    </div>

                    {/* Flaws found list */}
                    {item.flaws.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Điểm cần chuẩn hóa theo quy chuẩn Bộ:
                        </span>
                        <div className="space-y-1">
                          {item.flaws.map((flaw, fIdx) => (
                            <div
                              key={fIdx}
                              className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                                flaw.severity === 'critical'
                                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                                  : flaw.severity === 'warning'
                                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                                  : 'bg-sky-50/70 border-sky-200 text-sky-950'
                              }`}
                            >
                              <AlertTriangle
                                className={`w-4 h-4 shrink-0 mt-0.5 ${
                                  flaw.severity === 'critical'
                                    ? 'text-rose-600'
                                    : flaw.severity === 'warning'
                                    ? 'text-amber-600'
                                    : 'text-sky-600'
                                }`}
                              />
                              <div className="space-y-0.5 flex-1">
                                <div className="font-bold">{flaw.title}</div>
                                <div className="text-[11.5px] opacity-90">{flaw.detail}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Căn cứ: {flaw.moetRuleRef}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* INTERACTIVE COUNCIL DEBATE & REFINED COMPARISON TABS */}
                    {hasFlaws && (
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        {/* Tab Switcher */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 p-1 rounded-xl">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveItemTabs((prev) => ({ ...prev, [item.id]: 'debate' }))
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                                (activeItemTabs[item.id] || 'debate') === 'debate'
                                  ? 'bg-slate-900 text-amber-300 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Scale className="w-3.5 h-3.5 text-amber-400" />
                              <span>Tranh biện Hội đồng AI (Gemini ↔ Claude ↔ NotebookLM)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setActiveItemTabs((prev) => ({ ...prev, [item.id]: 'compare' }))
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                activeItemTabs[item.id] === 'compare'
                                  ? 'bg-white text-indigo-900 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Đối chiếu Câu gốc & Bản sửa chuẩn Bộ</span>
                            </button>
                          </div>

                          <div className="text-[11px] text-slate-500 font-semibold pr-2">
                            {item.councilDebate?.finalConsensus ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Đã thống nhất phương án tối ưu
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* TAB CONTENT 1: COUNCIL DEBATE */}
                        {(activeItemTabs[item.id] || 'debate') === 'debate' && item.councilDebate && (
                          <div className="space-y-2.5 bg-slate-900 p-3.5 rounded-xl border border-indigo-500/30 text-white">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-amber-400" />
                                Diễn biến Phản biện qua lại & Tranh biện chuyên sâu (Câu {item.questionNum})
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                3 Vòng Chất vấn Chéo → Đồng thuận 100%
                              </span>
                            </div>

                            <div className="space-y-2">
                              {item.councilDebate.turns.map((turn, tIdx) => {
                                const isConsensus = turn.expert === 'consensus';
                                const isGemini = turn.expert === 'gemini';
                                const isClaude = turn.expert === 'claude';
                                return (
                                  <div
                                    key={tIdx}
                                    className={`p-3 rounded-xl border transition ${
                                      isConsensus
                                        ? 'bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-900/30 border-amber-400/60 text-amber-100 shadow-xs'
                                        : isGemini
                                        ? 'bg-indigo-950/70 border-indigo-700/60 text-indigo-100'
                                        : isClaude
                                        ? 'bg-amber-950/60 border-amber-700/60 text-amber-100'
                                        : 'bg-emerald-950/60 border-emerald-700/60 text-emerald-100'
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                            isConsensus
                                              ? 'bg-amber-400 text-slate-950 font-bold'
                                              : isGemini
                                              ? 'bg-indigo-600 text-white'
                                              : isClaude
                                              ? 'bg-amber-600 text-white'
                                              : 'bg-emerald-600 text-white'
                                          }`}
                                        >
                                          {turn.expertName}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-300">
                                          {turn.roleTitle}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        Vòng {tIdx + 1}
                                      </span>
                                    </div>

                                    <p className="text-xs leading-relaxed text-slate-200">
                                      {turn.argument}
                                    </p>

                                    {turn.counterPoint && (
                                      <div className="mt-2 pt-2 border-t border-white/10 text-[11px] text-amber-200/90 italic flex items-start gap-1.5">
                                        <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                        <span>
                                          <b>Phản hồi / Chất vấn chéo:</b> {turn.counterPoint}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Consensus Card with Action */}
                            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span><b>Phương án Tối ưu được Hội đồng thông qua:</b> {item.suggestedQuestion.stem.slice(0, 75)}...</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleApplySingle(item)}
                                className={`px-3 py-1.5 rounded-xl font-black text-xs transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                                  isApplied
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{isApplied ? 'Đã áp dụng phương án tối ưu' : 'Áp dụng phương án tối ưu của Hội đồng'}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* TAB CONTENT 2: SIDE-BY-SIDE COMPARISON */}
                        {(activeItemTabs[item.id] === 'compare' || !item.councilDebate) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {/* Current Version */}
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                Bản câu hỏi hiện tại trong đề
                              </span>
                              <div className="font-semibold text-slate-800 leading-relaxed">
                                {item.originalQuestion.stem}
                              </div>
                              {item.originalQuestion.opts && (
                                <div className="space-y-1 pt-1 text-slate-600 font-mono text-[11.5px]">
                                  {item.originalQuestion.opts.map((opt, oIdx) => (
                                    <div
                                      key={oIdx}
                                      className={`${
                                        'ABCD'[oIdx] === String(item.originalQuestion.ans || '').trim().charAt(0)
                                          ? 'text-indigo-800 font-bold bg-indigo-50/60 p-1 rounded'
                                          : 'p-1'
                                      }`}
                                    >
                                      {'ABCD'[oIdx]}. {opt}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {item.originalQuestion.items && (
                                <div className="space-y-1 pt-1 text-slate-600 font-mono text-[11.5px]">
                                  {item.originalQuestion.items.map((it, itIdx) => (
                                    <div key={itIdx} className="p-1">
                                      {String.fromCharCode(97 + itIdx)}) {it.t} —{' '}
                                      <b className={it.a ? 'text-emerald-700' : 'text-rose-700'}>
                                        {it.a ? 'Đúng' : 'Sai'}
                                      </b>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {item.originalQuestion.d === 'TLN' && (
                                <div className="pt-1 text-slate-700 font-bold">
                                  Đáp án: <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded">{item.originalQuestion.ans}</span>
                                </div>
                              )}
                            </div>

                            {/* Suggested Refined Version */}
                            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  Đề xuất sửa đổi chuẩn Bộ GD&ĐT (Đã tối ưu)
                                </span>
                                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.2 rounded-full">
                                  Đã đồng thuận
                                </span>
                              </div>

                              <div className="font-semibold text-emerald-950 leading-relaxed">
                                {item.suggestedQuestion.stem}
                              </div>

                              {item.suggestedQuestion.opts && (
                                <div className="space-y-1 pt-1 text-emerald-900 font-mono text-[11.5px]">
                                  {item.suggestedQuestion.opts.map((opt, oIdx) => (
                                    <div
                                      key={oIdx}
                                      className={`${
                                        'ABCD'[oIdx] === String(item.suggestedQuestion.ans || '').trim().charAt(0)
                                          ? 'text-emerald-950 font-bold bg-emerald-100 p-1 rounded'
                                          : 'p-1'
                                      }`}
                                    >
                                      {'ABCD'[oIdx]}. {opt}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {item.suggestedQuestion.items && (
                                <div className="space-y-1 pt-1 text-emerald-900 font-mono text-[11.5px]">
                                  {item.suggestedQuestion.items.map((it, itIdx) => (
                                    <div key={itIdx} className="p-1">
                                      {String.fromCharCode(97 + itIdx)}) {it.t} —{' '}
                                      <b className={it.a ? 'text-emerald-800' : 'text-rose-800'}>
                                        {it.a ? 'Đúng' : 'Sai'}
                                      </b>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {item.suggestedQuestion.d === 'TLN' && (
                                <div className="pt-1 text-emerald-950 font-bold">
                                  Đáp án chuẩn tô phiếu: <span className="font-mono bg-emerald-200 px-1.5 py-0.5 rounded">{item.suggestedQuestion.ans}</span>
                                </div>
                              )}

                              <div className="pt-1 text-[11px] text-emerald-800 italic">
                                💡 <b>Lý do sửa:</b> {item.revisionRationale}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Hội đồng Thẩm định & Phản biện Sư phạm Đề thi • Tuân thủ chuẩn trắc nghiệm Bộ GD&ĐT
          </div>
          <div className="flex items-center gap-2">
            {flawCount > 0 && (
              <button
                type="button"
                onClick={handleApplyAll}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>Áp dụng tất cả các bản sửa ({flawCount} câu) vào đề</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Đóng Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
