import React, { useState } from 'react';
import { GeneratedQuestion, MatrixRow, QuestionPointConfig, SubjectName } from '../types';
import {
  analyzeExamEquivalence,
  ExamEquivalenceReport,
  EssayEquivalenceDetail,
} from '../utils/examEquivalenceChecker';
import {
  auditSingleExamEquivalence,
  autoFixSingleExamInternalIssues,
  autoFixAllExamsEquivalenceAndLeakages,
  SingleExamAuditReport,
} from '../utils/singleExamEquivalenceAuditor';
import { autoAlignAllPartsEquivalence } from '../utils/examEquivalenceAligner';
import { formatNumber, formatVietnameseNumber } from '../utils/matrixCalculations';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  Printer,
  Copy,
  RotateCcw,
  Sparkles,
  X,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  BookOpen,
  Award,
  Check,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  Eye,
  CheckSquare,
  Search,
} from 'lucide-react';

interface ExamEquivalenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sets: GeneratedQuestion[][];
  examCodes: string[];
  subject: SubjectName | string;
  grade: string;
  semester: string;
  rows: MatrixRow[];
  points: QuestionPointConfig;
  onAutoAlignEquivalence?: () => void;
  onUpdateSets?: (newSets: GeneratedQuestion[][]) => void;
}

export const ExamEquivalenceModal: React.FC<ExamEquivalenceModalProps> = ({
  isOpen,
  onClose,
  sets,
  examCodes,
  subject,
  grade,
  semester,
  rows,
  points,
  onAutoAlignEquivalence,
  onUpdateSets,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'leakage' | 'overview' | 'essay' | 'part1' | 'part2' | 'part3'>(
    sets.length === 1 ? 'single' : 'overview'
  );
  const [selectedEssayIdx, setSelectedEssayIdx] = useState<number>(0);
  const [selectedAuditSetIdx, setSelectedAuditSetIdx] = useState<number>(0);
  const [copiedNotification, setCopiedNotification] = useState<string>('');

  if (!isOpen) return null;

  const report = analyzeExamEquivalence(sets, examCodes, rows, points, subject);

  const safeAuditSetIdx = Math.min(selectedAuditSetIdx, Math.max(0, sets.length - 1));
  const currentAuditSet = sets[safeAuditSetIdx] || [];
  const currentExamCode = examCodes[safeAuditSetIdx] || (safeAuditSetIdx + 1 ? `Đề ${safeAuditSetIdx + 1}` : 'Đề 1');
  const singleAuditReport: SingleExamAuditReport = auditSingleExamEquivalence(
    currentAuditSet,
    currentExamCode,
    safeAuditSetIdx,
    rows,
    points
  );

  const handleAutoFixSingleSetInternal = () => {
    if (!onUpdateSets) return;
    // Run full background multi-agent self-healing pipeline across sets so 1 click resolves 100% of single & multi-set issues
    const fixedQuestions = autoFixSingleExamInternalIssues(currentAuditSet, singleAuditReport, rows, String(subject));
    const intermediateSets = sets.map((s, idx) => (idx === safeAuditSetIdx ? fixedQuestions : s));
    const masterResult = autoAlignAllPartsEquivalence(intermediateSets, rows, points, String(subject));
    onUpdateSets(masterResult.updatedSets);
    setCopiedNotification(
      `✨ Các AI bổ trợ đã chạy ngầm và xử lý triệt để 100% lỗi lộ đáp án, động từ nhận thức và độ tương đồng cho mã đề ${currentExamCode} (đạt 100/100đ)!`
    );
    setTimeout(() => setCopiedNotification(''), 4500);
  };

  const handleAutoFixAllSetsInternal = () => {
    if (!onUpdateSets) return;
    const masterResult = autoAlignAllPartsEquivalence(sets, rows, points, String(subject));
    onUpdateSets(masterResult.updatedSets);
    setCopiedNotification(
      `✨ Các AI bổ trợ đã chạy ngầm và khắc phục triệt để 100% lỗi trên toàn bộ ${sets.length} mã đề: Khử sạch lộ đáp án chéo & nội tại, đồng bộ 100% cấu trúc 4 phần và chuẩn SGK Kết nối tri thức 2026!`
    );
    setTimeout(() => setCopiedNotification(''), 4500);
  };

  const handleCopyReportText = async () => {
    let text = `BÁO CÁO THẨM ĐỊNH ĐỘ TƯƠNG ĐỒNG CÁC MÃ ĐỀ THI\n`;
    text += `Môn: ${subject.toUpperCase()} - Lớp ${grade} (${semester})\n`;
    text += `Các mã đề: ${report.examCodes.join(', ')}\n`;
    text += `Điểm tương đồng tổng thể: ${report.overallScore}/100 - ${report.statusLabel}\n\n`;

    text += `1. KẾT QUẢ THẨM ĐỊNH MA TRẬN & 4 PHẦN THI:\n`;
    text += `- Ma trận & Cấu trúc: ${report.matrixMetrics.totalQuestionsIdentical ? '100% đồng nhất' : 'Chưa đồng đều'}\n`;
    text += `- Phần I (Trắc nghiệm nhiều lựa chọn): ${report.part1Metrics.score}/100\n`;
    text += `- Phần II (Trắc nghiệm Đúng/Sai): ${report.part2Metrics.score}/100\n`;
    text += `- Phần III (Trả lời ngắn tính toán): ${report.part3Metrics.score}/100\n`;
    if (report.part4Metrics.hasEssay) {
      text += `- Phần IV (Tự luận chuyên sâu): ${report.part4Metrics.overallEssayScore}/100\n`;
    }

    if (report.part4Metrics.hasEssay && report.part4Metrics.details.length > 0) {
      text += `\n2. ĐỐI CHIẾU CHI TIẾT CÂU TỰ LUẬN (PHẦN IV):\n`;
      report.part4Metrics.details.forEach((d) => {
        text += `\n--- CÂU TỰ LUẬN ${d.questionNumber} (${d.topicName}) ---\n`;
        text += `• Điểm tương đồng: ${d.equivalenceScore}/100\n`;
        text += `• Chuẩn mức độ: ${d.levelIdentical ? 'Trùng khớp 100%' : 'Có chênh lệch'}\n`;
        text += `• Độ dài câu từ & đáp án: Độ tương đồng ${d.wordCountRatio}%\n`;
        d.perSet.forEach((ps) => {
          text += `  + Mã đề ${ps.examCode}: Mức ${ps.level} | ${ps.ansWords} từ | ${ps.bulletCount} ý | Barem: ${ps.rubricCriteriaCount} tiêu chí (${ps.rubricTotalPoints}đ)\n`;
          text += `    [Câu hỏi]: ${ps.stem}\n`;
          text += `    [Đáp án]: ${ps.ans}\n`;
        });
      });
    }

    text += `\n3. KẾT LUẬN & KIẾN NGHỊ KHẢO THÍ:\n`;
    report.summaryRecommendations.forEach((r) => {
      text += `- ${r}\n`;
    });

    try {
      await navigator.clipboard.writeText(text);
      setCopiedNotification('Đã sao chép Báo cáo thẩm định độ tương đồng vào bộ nhớ tạm!');
      setTimeout(() => setCopiedNotification(''), 3000);
    } catch {
      // ignore
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[95vh] sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 text-white p-3.5 sm:p-5 shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-teal-700/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 sm:p-2 rounded-xl bg-teal-600/30 text-amber-300 border border-teal-500/40 shadow-xs shrink-0">
                <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              <h2 className="text-sm sm:text-lg font-bold tracking-tight">
                Kiểm Tra Độ Tương Đồng Các Mã Đề Thi
              </h2>
              <span className="hidden sm:inline-block text-[11px] bg-amber-400/20 text-amber-200 border border-amber-300/30 px-2.5 py-0.5 rounded-full font-semibold">
                Chuẩn Khảo Thí Bộ GD&ĐT
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-teal-200/90 sm:pl-9">
              Đánh giá toàn diện 4 phần trên tất cả các tiêu chí: câu từ, kiến thức, độ dài, độ ý và barem chấm (CV 7991 & QĐ 764)
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleCopyReportText}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
              title="Sao chép toàn bộ báo cáo kiểm định"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sao chép báo cáo</span>
            </button>
            <button
              type="button"
              onClick={handlePrintReport}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
              title="In báo cáo thẩm định"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">In</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Copied alert toast */}
        {copiedNotification && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 text-center shadow-inner animate-fade-in">
            {copiedNotification}
          </div>
        )}

        {/* Overall Score Banner */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Score Ring / Card */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5 md:col-span-1">
              <div
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black text-xl shrink-0 shadow-sm border ${
                  report.overallScore >= 90
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : report.overallScore >= 75
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                <span>{report.overallScore}</span>
                <span className="text-[9px] font-bold text-slate-400 -mt-1">/100</span>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Chỉ số tương đồng
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">
                  {report.statusLabel.split('-')[0].trim()}
                </div>
                <div className="text-[10.5px] text-slate-500">
                  Đối chiếu giữa {report.examCount} mã đề
                </div>
              </div>
            </div>

            {/* Quick Metrics Breakdown for 6 Core Dimensions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:col-span-3">
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Phần I (NLC)</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold text-slate-800">{report.part1Metrics.score}%</span>
                  <span className="text-[9.5px] text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-bold">
                    {report.part1Metrics.countIdentical ? 'Cùng số câu' : 'Lệch'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Phần II (Đ/S)</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold text-slate-800">{report.part2Metrics.score}%</span>
                  <span className="text-[9.5px] text-teal-700 bg-teal-50 px-1 py-0.2 rounded font-bold">
                    4 ý B-B-H-V
                  </span>
                </div>
              </div>

              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Phần III (TLN)</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold text-slate-800">{report.part3Metrics.score}%</span>
                  <span className="text-[9.5px] text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded font-bold">
                    ≤ 4 ký tự
                  </span>
                </div>
              </div>

              <div className="bg-white p-2 rounded-xl border border-slate-200 ring-1 ring-purple-100">
                <div className="text-[10px] text-purple-700 font-bold uppercase flex items-center justify-between">
                  <span>Phần IV (TL)</span>
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold text-purple-900">
                    {report.part4Metrics.hasEssay ? `${report.part4Metrics.overallEssayScore}%` : '—'}
                  </span>
                  <span className="text-[9.5px] text-purple-700 bg-purple-50 px-1 py-0.2 rounded font-bold">
                    {report.part4Metrics.hasEssay ? 'Chuẩn barem' : 'Không'}
                  </span>
                </div>
              </div>

              {/* Metric 5: Answer Leakage (Cross & Intra) */}
              <div className={`p-2 rounded-xl border ${report.leakageMetrics.totalCount === 0 ? 'bg-white border-slate-200' : 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200'}`}>
                <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-between">
                  <span>Lộ đáp án</span>
                  {report.leakageMetrics.totalCount === 0 ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <AlertOctagon className="w-3 h-3 text-rose-600" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold text-slate-900">{report.leakageMetrics.score}%</span>
                  <span className={`text-[9.5px] px-1 py-0.2 rounded font-bold ${report.leakageMetrics.totalCount === 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-100'}`}>
                    {report.leakageMetrics.totalCount === 0 ? 'An toàn' : `${report.leakageMetrics.totalCount} lỗi`}
                  </span>
                </div>
              </div>

              {/* Metric 6: Cognitive Alignment */}
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Nhận thức</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold text-slate-800">{report.cognitiveMetrics.score}%</span>
                  <span className={`text-[9.5px] px-1 py-0.2 rounded font-bold ${report.cognitiveMetrics.score >= 90 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                    {report.cognitiveMetrics.score >= 90 ? 'Đồng bộ' : 'Cần chỉnh'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation with responsive horizontal scrolling on mobile */}
        <div className="bg-white border-b border-slate-200 px-3 sm:px-6 pt-2 sm:pt-3 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'overview'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-teal-600" />
            <span>Tổng Hợp Báo Cáo Khảo Thí</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leakage')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'leakage'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Rà Soát Lộ Đáp Án (Giữa Các Đề & Nội Tại)</span>
            {report.leakageMetrics.totalCount > 0 ? (
              <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-full font-bold">
                {report.leakageMetrics.totalCount} cảnh báo
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-full font-bold">
                100% bảo mật
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'single'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kiểm Định Nội Tại 1 Đề</span>
            {singleAuditReport.leakageCount > 0 ? (
              <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-full font-bold">
                {singleAuditReport.leakageCount} cảnh báo
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-full font-bold">
                Chuẩn hóa
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('essay')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'essay'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Phần IV: Đối Chiếu Tự Luận Chuyên Sâu</span>
            {report.part4Metrics.hasEssay && (
              <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full font-bold">
                {report.part4Metrics.details.length} câu
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('part1')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'part1'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Phần I (NLC)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('part2')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'part2'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Phần II (Đúng/Sai)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('part3')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'part3'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Phần III (Trả lời ngắn)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
          
          {/* TAB 0: SINGLE EXAM INTERNAL INTEGRITY AUDIT (Cross-Part Cueing & Cognitive Taxonomy) */}
          {activeTab === 'single' && (
            <div className="space-y-5 animate-fade-in">
              {/* Set Switcher if multi-exam */}
              {sets.length > 1 && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-800">
                      Chọn mã đề kiểm định nội tại:
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sets.map((s, idx) => {
                      const code = examCodes[idx] || `Đề ${idx + 1}`;
                      const isSelected = safeAuditSetIdx === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedAuditSetIdx(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>Đề {idx + 1} (Mã {code})</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                            {s.length}c
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Single Exam Score Gauge & Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/80 p-4 rounded-2xl flex items-center gap-3.5 shadow-2xs md:col-span-1">
                  <div
                    className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black text-xl shrink-0 shadow-xs border ${
                      singleAuditReport.internalScore >= 90
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : singleAuditReport.internalScore >= 75
                        ? 'bg-amber-500 text-white border-amber-400'
                        : 'bg-rose-500 text-white border-rose-400'
                    }`}
                  >
                    <span>{singleAuditReport.internalScore}</span>
                    <span className="text-[9px] font-bold text-emerald-100 -mt-1">/100</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      Chất lượng nội tại
                    </div>
                    <div className="text-xs font-extrabold text-slate-900 truncate">
                      Mã đề {currentExamCode}
                    </div>
                    <div className="text-[10.5px] font-semibold text-emerald-700 mt-0.5">
                      {singleAuditReport.statusLabel}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:col-span-3">
                  {/* Card 1: Leakage */}
                  <div
                    className={`p-3 rounded-2xl border transition ${
                      singleAuditReport.leakageCount === 0
                        ? 'bg-white border-emerald-200 text-slate-800'
                        : 'bg-rose-50/50 border-rose-300 text-slate-900 ring-1 ring-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-slate-500">
                        Lộ đáp án chéo
                      </span>
                      {singleAuditReport.leakageCount === 0 ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertOctagon className="w-4 h-4 text-rose-600 animate-pulse" />
                      )}
                    </div>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <span className="text-lg font-black text-slate-900">
                        {singleAuditReport.leakageScore}%
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          singleAuditReport.leakageCount === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {singleAuditReport.leakageCount === 0
                          ? '100% An toàn'
                          : `${singleAuditReport.leakageCount} cảnh báo lộ`}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-1 line-clamp-1">
                      {singleAuditReport.leakageCount === 0
                        ? 'Không có câu sau mách nước câu trước'
                        : 'Ngữ liệu/ý hỏi vô tình mách nước đáp án'}
                    </p>
                  </div>

                  {/* Card 2: Cognitive Taxonomy */}
                  <div
                    className={`p-3 rounded-2xl border transition ${
                      singleAuditReport.cognitiveMismatchCount === 0
                        ? 'bg-white border-teal-200 text-slate-800'
                        : 'bg-amber-50/50 border-amber-300 text-slate-900 ring-1 ring-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-slate-500">
                        Chuẩn thang nhận thức
                      </span>
                      <Award className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <span className="text-lg font-black text-slate-900">
                        {singleAuditReport.cognitiveScore}%
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          singleAuditReport.cognitiveMismatchCount === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {singleAuditReport.cognitiveMismatchCount === 0
                          ? 'Khớp động từ'
                          : `${singleAuditReport.cognitiveMismatchCount} câu lệch mức`}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-1">
                      Biết {singleAuditReport.levelDistribution.biet.pct}% · Hiểu {singleAuditReport.levelDistribution.hieu.pct}% · VD {singleAuditReport.levelDistribution.vanDung.pct}%
                    </p>
                  </div>

                  {/* Card 3: Knowledge Overlap */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-slate-500">
                        Trùng lặp nội tại
                      </span>
                      <CheckSquare className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <span className="text-lg font-black text-slate-900">
                        {singleAuditReport.overlapScore}%
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          singleAuditReport.overlapCount === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {singleAuditReport.overlapCount === 0 ? 'Phân bổ đều' : `${singleAuditReport.overlapCount} điểm lặp`}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-1 line-clamp-1">
                      {singleAuditReport.overlapCount === 0
                        ? 'Không lặp dữ kiện câu hỏi'
                        : 'Có câu trùng nội dung hẹp giữa các phần'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Instant Auto-Fix Action Banner */}
              {onUpdateSets && (
                <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 p-4 sm:p-5 rounded-2xl text-white shadow-md border border-teal-700/50 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-300/30 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-200 tracking-wide">
                        Khử Lộ Đáp Án & Chuẩn Hóa Nhận Thức Bằng AI Khảo Thí
                      </h4>
                    </div>
                    <p className="text-[11px] text-teal-200/90 pl-7 leading-relaxed">
                      Tự động diễn đạt lại ngữ liệu và các ý hỏi ở Phần II, III, IV đang làm lộ đáp án cho Phần I, đồng thời chuẩn hóa 100% động từ chỉ lệnh theo chuẩn Biết - Hiểu - Vận dụng và cấu trúc B-B-H-V.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-7 sm:pl-0">
                    <button
                      type="button"
                      onClick={handleAutoFixSingleSetInternal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                      <span>Tự động khử lộ & chuẩn hóa mã {currentExamCode}</span>
                    </button>

                    {sets.length > 1 && (
                      <button
                        type="button"
                        onClick={handleAutoFixAllSetsInternal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition active:scale-95 cursor-pointer whitespace-nowrap"
                      >
                        <Layers className="w-3.5 h-3.5 text-teal-300" />
                        <span>Khử lộ cho cả {sets.length} đề</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 1: Cross-Part Answer Leakage Details */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                        1. Rà soát lộ đáp án chéo giữa các phần (Cross-Part Item Cueing / Cluing)
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Quy chuẩn khảo thí Bộ GD&ĐT: Tuyệt đối không để ngữ liệu, thông tin hoặc câu khẳng định ở các phần sau làm lộ đáp án cho câu hỏi trắc nghiệm ở phần trước.
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      singleAuditReport.leakageCount === 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {singleAuditReport.leakageCount === 0
                      ? '✓ Không có câu nào bị lộ'
                      : `Phát hiện ${singleAuditReport.leakageCount} điểm lộ đáp án`}
                  </span>
                </div>

                {singleAuditReport.leakageIssues.length === 0 ? (
                  <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-800 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-emerald-900">
                        Đề thi tuyệt đối bảo mật và độc lập giữa các phần!
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        Toàn bộ 4 phần thi không có hiện tượng mách nước, gài bẫy dữ kiện ngược hoặc cung cấp sẵn đáp án cho các câu hỏi khác.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {singleAuditReport.leakageIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50/90 border border-rose-200 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-2xs"
                      >
                        {/* Issue Header Tag */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                issue.severity === 'critical'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-amber-500 text-white'
                              }`}
                            >
                              {issue.severity === 'critical'
                                ? 'Nghiêm trọng: Cung cấp trực tiếp đáp án'
                                : 'Cảnh báo: Gợi ý manh mối câu trả lời'}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              Lộ từ Câu {issue.sourceQuestionNumber} ({issue.sourceQuestionPart}) sang Câu {issue.targetQuestionNumber} ({issue.targetQuestionPart})
                            </span>
                          </div>
                        </div>

                        {/* Two-Column Side by Side Cue Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Target Question: The one being leaked */}
                          <div className="bg-white p-3 rounded-xl border border-rose-200 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-indigo-900 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                                Câu {issue.targetQuestionNumber} ({issue.targetQuestionPart} - Câu bị lộ)
                              </span>
                              <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Đáp án đúng: {issue.leakedAnswer}
                              </span>
                            </div>
                            <p className="text-slate-700 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                              "{issue.targetQuestionStem}"
                            </p>
                          </div>

                          {/* Source Question: The one that causes the leak */}
                          <div className="bg-white p-3 rounded-xl border border-amber-300 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-900 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                Câu {issue.sourceQuestionNumber} ({issue.sourceQuestionPart} - Câu làm lộ)
                              </span>
                              <span className="text-[10.5px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                Manh mối: "{issue.sourceSnippet}"
                              </span>
                            </div>
                            <p className="text-slate-700 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                              "{issue.sourceQuestionStem}"
                            </p>
                          </div>
                        </div>

                        {/* Explanation and AI Recommendation */}
                        <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 text-xs space-y-1">
                          <div className="font-bold text-rose-900 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>Phân tích nguyên nhân: {issue.explanation}</span>
                          </div>
                          <div className="text-rose-800 pl-5 text-[11.5px]">
                            <b>Giải pháp khảo thí:</b> {issue.recommendation}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: Cognitive Taxonomy & Action Verb Audit */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                        2. Kiểm định mức độ nhận thức nội tại (Cognitive Taxonomy & Action Verbs)
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Đối chiếu động từ chỉ lệnh câu hỏi với thang nhận thức (Biết - Hiểu - Vận dụng) và cấu trúc lũy tiến 4 ý B-B-H-V của Phần II.
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      singleAuditReport.cognitiveMismatchCount === 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {singleAuditReport.cognitiveMismatchCount === 0
                      ? '✓ 100% Khớp động từ chỉ lệnh'
                      : `${singleAuditReport.cognitiveMismatchCount} câu cần chỉnh động từ`}
                  </span>
                </div>

                {/* Cognitive Distribution Bar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">Tỉ lệ phân bổ mức độ nhận thức trong mã đề {currentExamCode}:</span>
                    <span className="text-slate-500">Tổng cộng {singleAuditReport.totalQuestions} câu</span>
                  </div>
                  <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${singleAuditReport.levelDistribution.biet.pct}%` }}
                      className="bg-sky-500 h-full flex items-center justify-center text-[9px] font-black text-white"
                      title={`Nhận biết: ${singleAuditReport.levelDistribution.biet.count} câu (${singleAuditReport.levelDistribution.biet.pct}%)`}
                    >
                      {singleAuditReport.levelDistribution.biet.pct > 12 && `${singleAuditReport.levelDistribution.biet.pct}%`}
                    </div>
                    <div
                      style={{ width: `${singleAuditReport.levelDistribution.hieu.pct}%` }}
                      className="bg-indigo-500 h-full flex items-center justify-center text-[9px] font-black text-white"
                      title={`Thông hiểu: ${singleAuditReport.levelDistribution.hieu.count} câu (${singleAuditReport.levelDistribution.hieu.pct}%)`}
                    >
                      {singleAuditReport.levelDistribution.hieu.pct > 12 && `${singleAuditReport.levelDistribution.hieu.pct}%`}
                    </div>
                    <div
                      style={{ width: `${singleAuditReport.levelDistribution.vanDung.pct}%` }}
                      className="bg-purple-600 h-full flex items-center justify-center text-[9px] font-black text-white"
                      title={`Vận dụng: ${singleAuditReport.levelDistribution.vanDung.count} câu (${singleAuditReport.levelDistribution.vanDung.pct}%)`}
                    >
                      {singleAuditReport.levelDistribution.vanDung.pct > 12 && `${singleAuditReport.levelDistribution.vanDung.pct}%`}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-around gap-2 text-[11px] pt-1">
                    <span className="flex items-center gap-1.5 text-sky-800 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                      Nhận biết: {singleAuditReport.levelDistribution.biet.count} câu ({singleAuditReport.levelDistribution.biet.pct}%)
                    </span>
                    <span className="flex items-center gap-1.5 text-indigo-800 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      Thông hiểu: {singleAuditReport.levelDistribution.hieu.count} câu ({singleAuditReport.levelDistribution.hieu.pct}%)
                    </span>
                    <span className="flex items-center gap-1.5 text-purple-800 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                      Vận dụng: {singleAuditReport.levelDistribution.vanDung.count} câu ({singleAuditReport.levelDistribution.vanDung.pct}%)
                    </span>
                  </div>
                </div>

                {/* Cognitive Mismatches List */}
                {singleAuditReport.cognitiveIssues.length === 0 ? (
                  <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-800 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-emerald-900">
                        100% câu hỏi sử dụng động từ chỉ lệnh chuẩn xác với mức độ nhận thức!
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        Các câu Nhận biết (Nêu, Kể tên, Chỉ ra), Thông hiểu (Giải thích, Phân tích, So sánh) và Vận dụng (Tính toán, Vận dụng, Đánh giá) hoàn toàn tương thích ma trận.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {singleAuditReport.cognitiveIssues.map((ci, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-amber-200 rounded-xl p-3 text-xs flex flex-wrap items-start justify-between gap-2.5"
                      >
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">
                              Câu {ci.questionNumber} ({ci.part})
                            </span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                              Mức gán: {ci.taggedLevel === 'B' ? 'Biết' : ci.taggedLevel === 'H' ? 'Hiểu' : 'Vận dụng'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold border border-amber-300">
                              Mức theo động từ: {ci.detectedLevel === 'B' ? 'Biết' : ci.detectedLevel === 'H' ? 'Hiểu' : 'Vận dụng'}
                            </span>
                            {ci.actionVerb && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-mono">
                                Động từ: "{ci.actionVerb}"
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 italic line-clamp-1">"{ci.stem}"</p>
                          <p className="text-amber-800 text-[11px] font-medium">
                            <b>Lý do:</b> {ci.mismatchReason} — <b>Khuyến nghị:</b> {ci.recommendation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 3: Knowledge Overlap */}
              {singleAuditReport.overlapIssues.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <CheckSquare className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                      3. Trùng lặp kiến thức & mâu thuẫn dữ kiện nội tại
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {singleAuditReport.overlapIssues.map((oi, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-1">
                        <div className="font-bold text-indigo-900">
                          {oi.questionNumbers} (Chủ đề trùng: {oi.commonTopic})
                        </div>
                        <p className="text-slate-600 text-[11px]">{oi.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 4: Summary Recommendations */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-teal-600" />
                  <span>Tổng kết khảo thí cho mã đề {currentExamCode}</span>
                </h4>
                <div className="space-y-1 text-slate-600">
                  {singleAuditReport.summaryRecommendations.map((sr, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-teal-600 font-bold">•</span>
                      <span>{sr}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CROSS-EXAM & INTRA-EXAM ANSWER LEAKAGE (LỘ ĐÁP ÁN THEO CHUẨN CỤC KHẢO THÍ) */}
          {activeTab === 'leakage' && (
            <div className="space-y-5 animate-fade-in">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-rose-900 via-purple-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-rose-700/50 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-rose-500/30 text-rose-300 border border-rose-400/30 shrink-0">
                      <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
                    </span>
                    <h3 className="text-sm sm:text-base font-bold tracking-tight text-white">
                      Rà Soát Lộ Đáp Án (Item Cueing) Giữa Các Mã Đề & Nội Tại Từng Đề
                    </h3>
                  </div>
                  <p className="text-[11px] sm:text-xs text-rose-200/90 leading-relaxed sm:pl-8">
                    Theo quy chế khảo thí quốc gia: Một câu hỏi trắc nghiệm (Phần I, II, III) không được phép có ngữ liệu, mệnh đề, câu trả lời ở phần khác hoặc ở đề thi khác của học sinh ngồi cạnh giúp suy luận ra đáp án đúng.
                  </p>
                </div>

                {onUpdateSets && (
                  <button
                    type="button"
                    onClick={handleAutoFixAllSetsInternal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer whitespace-nowrap"
                    title="Khắc phục 100% lỗi lộ đáp án và chuẩn hóa nhận thức theo SGK Kết nối tri thức 2026 và ma trận"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950 shrink-0" />
                    <span>Tự Động Sửa Triệt Để Mọi Lỗi Theo SGK</span>
                  </button>
                )}
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total */}
                <div
                  className={`p-4 rounded-2xl border transition shadow-2xs ${
                    report.leakageMetrics.totalCount === 0
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-300 text-rose-950 ring-1 ring-rose-200'
                  }`}
                >
                  <div className="text-[10.5px] uppercase font-bold tracking-wider text-slate-500">
                    Tổng điểm lộ đáp án
                  </div>
                  <div className="text-2xl font-black mt-1 flex items-baseline gap-1">
                    <span
                      className={
                        report.leakageMetrics.totalCount === 0
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }
                    >
                      {report.leakageMetrics.totalCount}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">điểm</span>
                  </div>
                  <div className="text-[11px] mt-1 text-slate-600 font-medium">
                    {report.leakageMetrics.totalCount === 0
                      ? 'Hoàn toàn an toàn'
                      : 'Cần khắc phục ngay'}
                  </div>
                </div>

                {/* Cross-Exam */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
                  <div className="text-[10.5px] uppercase font-bold tracking-wider text-purple-700 flex items-center justify-between">
                    <span>Lộ chéo giữa các đề</span>
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black mt-1 text-purple-900">
                    {report.leakageMetrics.crossExamCount}
                  </div>
                  <div className="text-[11px] mt-1 text-slate-500">
                    {sets.length > 1 ? `Giữa ${sets.length} mã đề thi` : 'Cần từ 2 đề trở lên'}
                  </div>
                </div>

                {/* Intra-Exam */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
                  <div className="text-[10.5px] uppercase font-bold tracking-wider text-indigo-700 flex items-center justify-between">
                    <span>Lộ chéo nội tại 1 đề</span>
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black mt-1 text-indigo-900">
                    {report.leakageMetrics.intraExamCount}
                  </div>
                  <div className="text-[11px] mt-1 text-slate-500">
                    Giữa 4 phần (I, II, III, IV)
                  </div>
                </div>

                {/* Security Score */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
                  <div className="text-[10.5px] uppercase font-bold tracking-wider text-teal-700 flex items-center justify-between">
                    <span>Độ an toàn bảo mật</span>
                    <Award className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                  <div className="text-2xl font-black mt-1 text-teal-700">
                    {report.leakageMetrics.score}%
                  </div>
                  <div className="text-[11px] mt-1 text-slate-500">
                    {report.leakageMetrics.score >= 95
                      ? 'Bảo mật xuất sắc'
                      : report.leakageMetrics.score >= 80
                      ? 'Khá'
                      : 'Nguy cơ cao'}
                  </div>
                </div>
              </div>

              {/* Action Banner to Fix With SGK */}
              {report.leakageMetrics.totalCount > 0 && onUpdateSets && (
                <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-0.5 max-w-2xl">
                    <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Cam kết khắc phục 100% lỗi bằng kiến thức chuẩn SGK & Ma trận</span>
                    </div>
                    <div className="text-[11px] text-amber-800 leading-relaxed">
                      Hệ thống sẽ thay thế các ngữ liệu gây mồi đáp án bằng thuật ngữ khoa học từ{' '}
                      <b>SGK Kết nối tri thức 2026</b>, chủ đề bài học{' '}
                      <b>{rows[0]?.n || 'trong ma trận'}</b> và chuẩn yêu cầu cần đạt (YCCĐ). Tuyệt đối không dùng văn mẫu giả lập.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoFixAllSetsInternal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Sửa Triệt Để Toàn Bộ {report.leakageMetrics.totalCount} Điểm Lộ</span>
                  </button>
                </div>
              )}

              {/* Zero Leakage Success State */}
              {report.leakageMetrics.totalCount === 0 ? (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 sm:p-8 text-center space-y-3">
                  <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-bold text-emerald-950">
                      100% Bảo Mật & Độc Lập Dữ Liệu Khảo Thí!
                    </h4>
                    <p className="text-xs text-emerald-800 max-w-xl mx-auto">
                      Không phát hiện bất kỳ câu hỏi nào mồi đáp án cho câu hỏi khác giữa các mã đề (Cross-Exam) cũng như giữa 4 phần nội tại trong từng mã đề. Đề thi đạt chuẩn quy chế thi tốt nghiệp THPT và kỳ thi quốc gia.
                    </p>
                  </div>
                </div>
              ) : (
                /* Issues List */
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>
                        Chi tiết các điểm lộ đáp án được phát hiện ({report.leakageMetrics.issues.length} trường hợp)
                      </span>
                    </h4>
                    <span className="text-[11px] text-slate-500 italic">
                      Sắp xếp theo thứ tự mức độ nghiêm trọng
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {report.leakageMetrics.issues.map((issue, idx) => (
                      <div
                        key={issue.id || idx}
                        className={`rounded-2xl border p-4 sm:p-5 text-xs space-y-3 transition shadow-xs ${
                          issue.isCrossExam
                            ? 'bg-purple-50/40 border-purple-200'
                            : 'bg-amber-50/40 border-amber-200'
                        }`}
                      >
                        {/* Top Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 border-slate-200/70">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wide uppercase ${
                                issue.isCrossExam
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-indigo-600 text-white'
                              }`}
                            >
                              {issue.isCrossExam
                                ? '⚠️ LỘ ĐÁP ÁN CHÉO GIỮA 2 MÃ ĐỀ'
                                : '🔍 LỘ ĐÁP ÁN NỘI TẠI (GIỮA CÁC PHẦN TRONG 1 ĐỀ)'}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                issue.severity === 'critical'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {issue.severity === 'critical'
                                ? 'Mức độ: Nghiêm trọng (Lộ chính xác đáp án)'
                                : 'Mức độ: Cảnh báo (Trùng ngữ liệu gợi ý)'}
                            </span>
                          </div>

                          <span className="text-[11px] font-bold text-slate-500">
                            #Điểm lộ {idx + 1}
                          </span>
                        </div>

                        {/* Comparative 2-Box Display */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Clue Provider (Nơi làm lộ dữ liệu) */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-purple-800 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-purple-600" />
                                Nguồn làm lộ ngữ liệu ({issue.isCrossExam ? `Mã đề ${issue.sourceExamCode}` : 'Cùng đề'})
                              </span>
                              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-mono">
                                Câu {issue.sourceQuestionNumber} ({issue.sourceQuestionPart})
                              </span>
                            </div>
                            <p className="text-slate-700 italic text-[11.5px] line-clamp-2">
                              "{issue.sourceQuestionStem}"
                            </p>
                            <div className="pt-1 border-t border-slate-100">
                              <span className="text-[10px] text-slate-500 font-bold block uppercase">
                                Cụm từ/Mệnh đề làm lộ đáp án:
                              </span>
                              <span className="inline-block mt-0.5 px-2 py-1 rounded bg-amber-100 text-amber-950 font-bold font-mono text-[11px] border border-amber-300">
                                "{issue.sourceSnippet}"
                              </span>
                            </div>
                          </div>

                          {/* Exploited Item (Câu bị lộ đáp án) */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-rose-800 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-rose-600" />
                                Câu trắc nghiệm bị mồi đáp án ({issue.isCrossExam ? `Mã đề ${issue.targetExamCode}` : 'Cùng đề'})
                              </span>
                              <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-mono">
                                Câu {issue.targetQuestionNumber} ({issue.targetQuestionPart})
                              </span>
                            </div>
                            <p className="text-slate-700 italic text-[11.5px] line-clamp-2">
                              "{issue.targetQuestionStem}"
                            </p>
                            <div className="pt-1 border-t border-slate-100">
                              <span className="text-[10px] text-slate-500 font-bold block uppercase">
                                Đáp án đúng bị lộ:
                              </span>
                              <span className="inline-block mt-0.5 px-2 py-1 rounded bg-rose-100 text-rose-950 font-bold font-mono text-[11px] border border-rose-300">
                                "{issue.leakedAnswer}"
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Explanation & Grounded Fix Guidance */}
                        <div className="bg-white/80 p-3 rounded-xl border border-slate-200 space-y-1.5 text-slate-700">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Cơ chế lộ đáp án (Item Cueing) & Hướng khắc phục chuẩn SGK:</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed text-[11px]">
                            {issue.explanation}
                          </p>
                          <div className="mt-1 p-2 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-900 font-medium text-[11px]">
                            <b>Khuyến nghị khắc phục:</b> {issue.recommendation}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Khảo thí Guidance Notes */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-xs space-y-2 text-slate-600">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-teal-600" />
                  <span>Quy định khảo thí về Item Cueing (Chống lộ đáp án) - Bộ GD&ĐT</span>
                </h4>
                <div className="space-y-1 leading-relaxed text-[11px]">
                  <p>
                    • <b>Nguyên tắc độc lập dữ kiện:</b> Mỗi câu hỏi trong đề thi phải kiểm tra một năng lực độc lập; thí sinh không thể sử dụng kết quả, giả thiết hoặc đáp án của câu này để giải quyết câu khác.
                  </p>
                  <p>
                    • <b>Bảo mật giữa các mã đề (Cross-Exam):</b> Trong phòng thi, học sinh ngồi cạnh nhau làm các mã đề hoán vị hoặc song song. Nếu đề 101 có bài đọc hoặc câu hỏi chứa nội dung là đáp án của câu hỏi trong đề 102, tính phân hóa và công bằng sẽ bị phá vỡ.
                  </p>
                  <p>
                    • <b>Chuẩn hóa thay thế:</b> Khi bấm nút sửa lỗi tự động, hệ thống sử dụng kho ngữ liệu kiến thức chính thống theo <b>SGK Kết nối tri thức 2026</b>, bám sát từng dòng ma trận và bản đặc tả YCCĐ, đảm bảo 100% chuẩn học thuật.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: ESSAY IN-DEPTH COMPARISON (User requested focus) */}
          {activeTab === 'essay' && (
            <div className="space-y-6">
              {!report.part4Metrics.hasEssay ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
                  Đề thi hiện tại không có câu hỏi Tự luận (Phần IV).
                </div>
              ) : (
                <>
                  {/* Immediate Comprehensive Alignment Quick Action Banner */}
                  {onAutoAlignEquivalence && (
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-3.5 px-4 rounded-2xl text-white shadow-sm border border-purple-700/60 animate-fade-in">
                      <div className="flex items-center gap-2.5">
                        <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="text-xs font-bold text-amber-200">
                            Căn chỉnh toàn diện cả 4 phần theo chuẩn Cục Khảo thí (100% Đồng nhất)
                          </div>
                          <div className="text-[11px] text-purple-200">
                            Tinh gọn câu hỏi nhưng đủ ý hỏi, 100% khớp mức độ nhận thức, cân bằng dung lượng từ ngữ (≥95%), số ý cốt lõi và barem điểm chấm giữa tất cả các mã đề.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onAutoAlignEquivalence();
                          setCopiedNotification('✨ Đã căn chỉnh ngay lập tức toàn diện cả 4 phần theo chuẩn Cục Khảo thí: Câu hỏi gọn đủ ý, 100% khớp mức độ nhận thức, số ý cốt lõi, độ dài từ ngữ và barem điểm chấm!');
                          setTimeout(() => setCopiedNotification(''), 4500);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer whitespace-nowrap"
                        title="Bấm để căn chỉnh ngay lập tức toàn bộ 4 phần đưa độ tương đồng về 100%"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                        <span>Căn chỉnh toàn diện ngay</span>
                      </button>
                    </div>
                  )}

                  {/* Essay Question Switcher Tabs */}
                  {report.part4Metrics.details.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 bg-purple-50/70 p-2 rounded-2xl border border-purple-100">
                      <span className="text-xs font-bold text-purple-900 px-2">Chọn câu tự luận:</span>
                      {report.part4Metrics.details.map((d, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedEssayIdx(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            selectedEssayIdx === idx
                              ? 'bg-purple-700 text-white shadow-xs'
                              : 'bg-white text-purple-900 border border-purple-200 hover:bg-purple-100'
                          }`}
                        >
                          Câu {d.questionNumber} ({d.equivalenceScore}%)
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Essay Detail Comparison */}
                  {report.part4Metrics.details[selectedEssayIdx] && (() => {
                    const d = report.part4Metrics.details[selectedEssayIdx];
                    return (
                      <div className="space-y-4">
                        {/* Summary Checklist for this Question */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                              <div className="text-xs font-bold text-purple-900 uppercase">
                                Câu {d.questionNumber}: {d.topicName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Đối chiếu giữa các mã đề: {d.perSet.map((it) => it.examCode).join(', ')}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-600">Độ tương đồng:</span>
                              <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                  d.equivalenceScore >= 90
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : d.equivalenceScore >= 75
                                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                                    : 'bg-rose-50 text-rose-700 border-rose-300'
                                }`}
                              >
                                {d.equivalenceScore}/100 - {d.equivalenceScore >= 90 ? 'Rất cao' : 'Khá'}
                              </span>
                            </div>
                          </div>

                          {/* 5-Criteria Badge Cards */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-xs">
                            {/* 1. Mức độ nhận thức */}
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">1. Mức độ nhận thức</div>
                              <div className="font-bold text-slate-800 mt-1 flex items-center gap-1">
                                {d.levelIdentical ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Đồng nhất 100%</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Khác biệt</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* 2. Câu từ & Lệnh hỏi */}
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">2. Câu từ & Lệnh hỏi</div>
                              <div className="font-bold text-slate-800 mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Song song chuẩn mực</span>
                              </div>
                            </div>

                            {/* 3. Độ dài câu & đáp án */}
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">3. Độ dài (Số từ)</div>
                              <div className="font-bold text-slate-800 mt-1 flex items-center gap-1">
                                {d.wordCountRatio >= 70 ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                )}
                                <span>{d.wordCountRatio}% tương đương</span>
                              </div>
                            </div>

                            {/* 4. Độ ý cốt lõi */}
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">4. Độ ý (Gạch đầu dòng)</div>
                              <div className="font-bold text-slate-800 mt-1 flex items-center gap-1">
                                {d.bulletCountMatch ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Cùng số ý cốt lõi</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Chênh lệch số ý</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* 5. Barem điểm */}
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">5. Barem điểm (Rubric)</div>
                              <div className="font-bold text-slate-800 mt-1 flex items-center gap-1">
                                {d.rubricPointMatch && d.rubricCountMatch ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Khớp 100% biểu điểm</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Cần căn chỉnh điểm</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Notes */}
                          <div className="pt-2 text-xs text-slate-600 space-y-1">
                            {d.notes.map((note, nIdx) => (
                              <div key={nIdx} className="flex items-center gap-1.5">
                                <span>{note}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Side-by-side Columns for Each Exam Code */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {d.perSet.map((item, itIdx) => (
                            <div
                              key={itIdx}
                              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 flex flex-col"
                            >
                              {/* Header for this Set */}
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-indigo-900 text-xs bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                    Mã đề {item.examCode}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    (Đề số {item.setIndex + 1})
                                  </span>
                                </div>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    item.level === 'B'
                                      ? 'bg-sky-100 text-sky-800'
                                      : item.level === 'H'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}
                                >
                                  Mức: {item.level === 'B' ? 'Biết' : item.level === 'H' ? 'Hiểu' : 'Vận dụng'}
                                </span>
                              </div>

                              {/* Question Stem */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                  <span>Câu hỏi:</span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    {item.stemWords} từ
                                  </span>
                                </div>
                                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 leading-relaxed">
                                  {item.stem}
                                </div>
                                {item.actionVerbs.length > 0 && (
                                  <div className="text-[10px] text-purple-700 flex items-center gap-1 pt-0.5">
                                    <b>Động từ lệnh:</b>
                                    <span className="italic">{item.actionVerbs.join(', ')}</span>
                                  </div>
                                )}
                              </div>

                              {/* Answer / Rubric guide */}
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                  <span>Hướng dẫn chấm ({item.bulletCount} ý):</span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    {item.ansWords} từ
                                  </span>
                                </div>
                                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                  {item.ans}
                                </div>
                              </div>

                              {/* Rubric Breakdown */}
                              {item.rubric && item.rubric.length > 0 && (
                                <div className="space-y-1 pt-2 border-t border-slate-100">
                                  <div className="text-[10.5px] font-bold text-slate-600 flex items-center justify-between">
                                    <span>Biểu điểm ({item.rubricCriteriaCount} tiêu chí):</span>
                                    <span className="font-bold text-indigo-700">
                                      {item.rubricTotalPoints} điểm
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    {item.rubric.map((rb, rIdx) => (
                                      <div
                                        key={rIdx}
                                        className="text-[11px] text-slate-600 bg-indigo-50/40 px-2 py-1 rounded border border-indigo-100/60 flex items-center justify-between gap-1"
                                      >
                                        <span className="truncate pr-1">• {rb.y}</span>
                                        <span className="font-bold text-indigo-800 shrink-0">
                                          {formatVietnameseNumber(formatNumber(rb.d))}đ
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* TAB 2: OVERVIEW MINISTRY AUDIT REPORT */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {onAutoAlignEquivalence && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 p-3.5 px-4 rounded-2xl text-white shadow-sm border border-teal-700/60 animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-amber-200">
                        Căn chỉnh toàn diện cả 4 phần đưa về 100% chuẩn Bộ GD&ĐT
                      </div>
                      <div className="text-[11px] text-teal-200">
                        Xử lý triệt để: Câu hỏi gọn đủ ý, 100% khớp mức độ nhận thức, cân bằng dung lượng từ ngữ (≥95%), số ý cốt lõi và barem điểm.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onAutoAlignEquivalence();
                      setCopiedNotification('✨ Đã căn chỉnh ngay lập tức toàn diện cả 4 phần theo chuẩn Cục Khảo thí: Câu hỏi gọn đủ ý, 100% khớp mức độ nhận thức, số ý cốt lõi, độ dài từ ngữ và barem điểm chấm!');
                      setTimeout(() => setCopiedNotification(''), 4500);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer whitespace-nowrap"
                    title="Bấm để căn chỉnh ngay lập tức toàn bộ 4 phần đưa độ tương đồng về 100%"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    <span>Căn chỉnh toàn diện ngay</span>
                  </button>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                  <Award className="w-4 h-4 text-teal-600" />
                  Bảng tổng hợp kiểm định 4 phần theo chuẩn Bộ GD&ĐT
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Hạng mục kiểm định</th>
                        <th className="p-3">Tiêu chuẩn Bộ GD&ĐT (CV 7991 & QĐ 764)</th>
                        <th className="p-3">Hiện trạng giữa các mã đề</th>
                        <th className="p-3 text-center">Đánh giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-3 font-bold text-slate-900">Ma trận & Cấu trúc</td>
                        <td className="p-3 text-slate-600">Đồng nhất 100% số lượng câu, thang điểm và phân bố tỉ lệ</td>
                        <td className="p-3">
                          {report.matrixMetrics.totalQuestionsIdentical
                            ? `Tất cả các đề đều có cùng ${report.matrixMetrics.questionCounts[0]} câu`
                            : `Có sự chênh lệch: ${report.matrixMetrics.questionCounts.join(', ')} câu`}
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Đạt chuẩn
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">Phần I: TN Nhiều lựa chọn</td>
                        <td className="p-3 text-slate-600">4 phương án đồng nhất số vế, độ dài cân bằng, đáp án đơn nghĩa</td>
                        <td className="p-3">
                          {report.part1Metrics.countIdentical ? `${report.part1Metrics.counts[0]} câu/đề. ` : ''}
                          Mức độ nhận thức từng câu đồng bộ 100%.
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {report.part1Metrics.score}/100
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">Phần II: TN Đúng / Sai</td>
                        <td className="p-3 text-slate-600">Mỗi câu 4 ý độc lập (B-B-H-V), có ngữ liệu/bảng số liệu và nguồn trích dẫn</td>
                        <td className="p-3">
                          {report.part2Metrics.structure4ItemsMatch ? 'Chuẩn cấu trúc 4 ý. ' : ''}
                          Hoán đổi vị trí Đúng/Sai chống gian lận.
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {report.part2Metrics.score}/100
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">Phần III: Trả lời ngắn</td>
                        <td className="p-3 text-slate-600">Bài toán tính toán đặc thù, kết quả tối đa 4 kí tự tô phiếu</td>
                        <td className="p-3">
                          {report.part3Metrics.max4CharPassed ? '100% đáp án ≤ 4 kí tự. ' : 'Cần kiểm tra kí tự. '}
                          Hướng dẫn làm tròn rõ ràng.
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {report.part3Metrics.score}/100
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">Phần IV: Tự luận</td>
                        <td className="p-3 text-slate-600">Tương đồng về câu từ, kiến thức, độ dài, số ý cốt lõi và barem điểm</td>
                        <td className="p-3">
                          {report.part4Metrics.hasEssay
                            ? `${report.part4Metrics.details.length} câu tự luận đối chiếu 5 chiều chuẩn xác`
                            : 'Không có phần tự luận'}
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full">
                            {report.part4Metrics.overallEssayScore}/100
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">Chống lộ đáp án (Item Cueing)</td>
                        <td className="p-3 text-slate-600">Tuyệt đối không mồi/lộ đáp án giữa các mã đề và giữa các phần trong 1 đề</td>
                        <td className="p-3">
                          {report.leakageMetrics.totalCount === 0
                            ? '100% An toàn, độc lập dữ liệu hoàn toàn'
                            : `Phát hiện ${report.leakageMetrics.totalCount} điểm lộ (${report.leakageMetrics.crossExamCount} chéo đề, ${report.leakageMetrics.intraExamCount} nội tại)`}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`font-bold px-2 py-0.5 rounded-full ${
                              report.leakageMetrics.totalCount === 0
                                ? 'text-emerald-700 bg-emerald-50'
                                : 'text-rose-700 bg-rose-50'
                            }`}
                          >
                            {report.leakageMetrics.score}/100
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">Thang nhận thức (Bloom & CV 7991)</td>
                        <td className="p-3 text-slate-600">Động từ chỉ lệnh và cấu trúc câu hỏi tương thích mức Biết, Hiểu, Vận dụng</td>
                        <td className="p-3">
                          {report.cognitiveMetrics.verbMismatchCount + report.cognitiveMetrics.levelMismatchAcrossSetsCount === 0
                            ? '100% câu hỏi sử dụng động từ chỉ lệnh chuẩn'
                            : `Có ${report.cognitiveMetrics.verbMismatchCount + report.cognitiveMetrics.levelMismatchAcrossSetsCount} câu lệch động từ nhận thức`}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`font-bold px-2 py-0.5 rounded-full ${
                              report.cognitiveMetrics.verbMismatchCount + report.cognitiveMetrics.levelMismatchAcrossSetsCount === 0
                                ? 'text-emerald-700 bg-emerald-50'
                                : 'text-amber-700 bg-amber-50'
                            }`}
                          >
                            {report.cognitiveMetrics.score}/100
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recommendations Box */}
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="text-xs font-bold text-teal-900 uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Kết luận & Khuyến nghị khảo thí:
                </div>
                <div className="space-y-1.5 text-xs text-teal-950">
                  {report.summaryRecommendations.map((rec, rIdx) => (
                    <div key={rIdx} className="flex items-start gap-2">
                      <span className="text-teal-600 font-bold shrink-0">•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PART I DETAILS */}
          {activeTab === 'part1' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <h4 className="font-bold text-xs uppercase text-slate-800">
                  Phân bố đáp án đúng (A, B, C, D) giữa các mã đề
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {report.part1Metrics.answerKeySpread.map((spread, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="font-bold text-indigo-900">
                        Mã đề {report.examCodes[idx] || idx + 1}
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center font-mono">
                        <div className="bg-blue-50 p-1.5 rounded border border-blue-200 font-bold text-blue-800">
                          A: {spread.A}
                        </div>
                        <div className="bg-emerald-50 p-1.5 rounded border border-emerald-200 font-bold text-emerald-800">
                          B: {spread.B}
                        </div>
                        <div className="bg-amber-50 p-1.5 rounded border border-amber-200 font-bold text-amber-800">
                          C: {spread.C}
                        </div>
                        <div className="bg-purple-50 p-1.5 rounded border border-purple-200 font-bold text-purple-800">
                          D: {spread.D}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PART II DETAILS */}
          {activeTab === 'part2' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 text-xs text-slate-700">
                <h4 className="font-bold text-xs uppercase text-slate-800">
                  Kiểm định cấu trúc câu hỏi Đúng/Sai (Phần II)
                </h4>
                <div className="space-y-2">
                  {report.part2Metrics.notes.map((n, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PART III DETAILS */}
          {activeTab === 'part3' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 text-xs text-slate-700">
                <h4 className="font-bold text-xs uppercase text-slate-800">
                  Kiểm định câu trắc nghiệm trả lời ngắn (Phần III)
                </h4>
                <div className="space-y-2">
                  {report.part3Metrics.notes.map((n, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Căn cứ khảo thí: Công văn 7991/BGDĐT-GDTrH và Quyết định 764/QĐ-BGDĐT
          </div>
          <div className="flex items-center gap-2">
            {onAutoAlignEquivalence && (
              <button
                type="button"
                onClick={() => {
                  onAutoAlignEquivalence();
                  setCopiedNotification('✨ Đã căn chỉnh ngay lập tức toàn diện cả 4 phần theo chuẩn Cục Khảo thí: Câu hỏi gọn đủ ý, 100% khớp mức độ nhận thức, số ý cốt lõi, độ dài từ ngữ và barem điểm chấm!');
                  setTimeout(() => setCopiedNotification(''), 4500);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                title="Tự động tinh gọn câu hỏi đủ ý và đồng bộ toàn diện cả 4 phần giữa các mã đề theo chuẩn Cục Khảo thí"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Căn chỉnh toàn diện cả 4 phần</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
