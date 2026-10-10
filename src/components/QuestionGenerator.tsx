import React, { useState } from 'react';
import { GeneratedQuestion, MatrixRow, QuestionPointConfig, SubjectName } from '../types';
import { readFileText } from '../utils/fileReader';
import {
  generateQuestionsForTopic,
  suggestExternalSources,
} from '../services/geminiService';
import {
  balanceMultipleChoice,
  checkQuestionsCompliance,
  normalizeQuestion,
  ValidationResult,
} from '../utils/questionChecker';
import {
  exportAnswerExcel,
  exportAnswerWord,
  exportExamWord,
} from '../utils/exportUtils';
import { dsOf, formatNumber, formatVietnameseNumber } from '../utils/matrixCalculations';
import {
  Sparkles,
  FileText,
  FileSpreadsheet,
  Copy,
  Upload,
  RotateCcw,
  BookOpen,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface QuestionGeneratorProps {
  rows: MatrixRow[];
  mon: SubjectName;
  grade: string;
  semester: string;
  points: QuestionPointConfig;
}

export const QuestionGenerator: React.FC<QuestionGeneratorProps> = ({
  rows,
  mon,
  grade,
  semester,
  points,
}) => {
  const [refFiles, setRefFiles] = useState<{ name: string; text: string }[]>([]);
  const [numSets, setNumSets] = useState<number>(1);
  const [includeLevelsInDoc, setIncludeLevelsInDoc] = useState<boolean>(false);
  const [speed, setSpeed] = useState<string>('quick');
  const [withExplanation, setWithExplanation] = useState<boolean>(false);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
  const [autoSearch, setAutoSearch] = useState<boolean>(true);
  const [geoDivide, setGeoDivide] = useState<boolean>(true);
  const [geoPct, setGeoPct] = useState<number>(50);

  const [sets, setSets] = useState<GeneratedQuestion[][]>([]);
  const [activeSetIndex, setActiveSetIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [failedTopics, setFailedTopics] = useState<{ setIdx: number; rowIdx: number; error: string }[]>([]);
  const [suggestedSources, setSuggestedSources] = useState<
    { topic: string; items: { nguon: string; loai: string; tim: string; tukhoa?: string }[] }[]
  >([]);
  const [complianceResult, setComplianceResult] = useState<ValidationResult | null>(null);
  const [showRules, setShowRules] = useState<boolean>(false);

  // File Upload for References
  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    try {
      setProgressStatus(`Đang đọc ${files.length} tệp tài liệu tham khảo...`);
      const list: { name: string; text: string }[] = [];
      let totalLength = 0;
      for (let i = 0; i < files.length; i++) {
        if (totalLength >= 35000) break;
        const text = await readFileText(files[i]);
        const truncated = text.slice(0, 15000);
        totalLength += truncated.length;
        list.push({ name: files[i].name, text: truncated });
      }
      setRefFiles(list);
      setProgressStatus(`Đã đọc ${list.length} tài liệu tham khảo. Hệ thống sẽ ưu tiên trích dẫn.`);
    } catch (err: any) {
      setProgressStatus(`Lỗi đọc tài liệu: ${err.message}`);
    }
  };

  const handleClearRef = () => {
    setRefFiles([]);
    setProgressStatus('Đã xóa tài liệu tham khảo.');
  };

  // Build requirements for all topics
  const buildTopicNeeds = () => {
    const formatLetters = ['NLC', 'DS', 'TLN', 'TL'];
    const levelLetters = ['B', 'H', 'V'];
    let geoDsCounter = 0;

    return rows.map((r) => {
      const need: any[] = [];
      r.v.forEach((n, j) => {
        const f = (j / 3) | 0;
        const l = j % 3;
        if (n <= 0 || f === 1) return; // True/False handled separately
        need.push({
          d: formatLetters[f],
          m: levelLetters[l],
          n,
        });
      });

      // True/False questions for this row
      dsOf(r).forEach((q) => {
        const itemObj: any = {
          d: 'DS',
          m: levelLetters[q[3]],
          n: 1,
          yl: q.map((lIdx) => levelLetters[lIdx]),
        };
        if (mon === 'Địa lí' && geoDivide) {
          const t = geoDsCounter++;
          itemObj.kind =
            Math.round(((t + 1) * geoPct) / 100) > Math.round((t * geoPct) / 100)
              ? 'data'
              : 'text';
        }
        need.push(itemObj);
      });

      return need;
    });
  };

  // Generate Questions
  const handleGenerate = async () => {
    if (!rows.length) {
      setProgressStatus('Chưa có chủ đề nào trong ma trận.');
      return;
    }

    try {
      setIsGenerating(true);
      const generatedSets: GeneratedQuestion[][] = [];
      const failures: { setIdx: number; rowIdx: number; error: string }[] = [];
      const topicNeeds = buildTopicNeeds();
      const startTime = Date.now();

      for (let sIdx = 0; sIdx < numSets; sIdx++) {
        const currentSetQuestions: GeneratedQuestion[] = [];
        const prevStems = sIdx > 0
          ? generatedSets
              .slice(0, sIdx)
              .flat()
              .map((q) => q.stem)
              .slice(-30)
          : [];

        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
          const need = topicNeeds[rIdx];
          if (!need || !need.length) continue;

          setProgressStatus(
            `Nguồn ${sIdx + 1}/${numSets} - Đang soạn chủ đề "${rows[rIdx].c}" (${rIdx + 1}/${rows.length})...`
          );

          try {
            const qs = await generateQuestionsForTopic(
              mon,
              grade,
              semester,
              rows[rIdx],
              need,
              sIdx,
              numSets,
              prevStems,
              refFiles,
              [],
              withExplanation,
              points.tl,
              autoSearch
            );

            qs.forEach((q) => {
              const normed = normalizeQuestion({ ...q, r: rIdx });
              currentSetQuestions.push(normed);
            });
          } catch (err: any) {
            failures.push({
              setIdx: sIdx,
              rowIdx: rIdx,
              error: err.message || 'Lỗi soạn câu hỏi',
            });
          }
        }

        if (shuffleOptions) {
          balanceMultipleChoice(currentSetQuestions);
        }

        generatedSets.push(currentSetQuestions);
      }

      setSets(generatedSets);
      setFailedTopics(failures);
      setActiveSetIndex(0);

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setProgressStatus(
        `Đã tạo xong ${generatedSets.length} nguồn đề trong ${elapsed} giây! ${
          failures.length ? `(Có ${failures.length} phần lỗi, bạn có thể bấm "Soạn lại phần bị lỗi")` : ''
        }`
      );

      // Validate the first set
      if (generatedSets[0]?.length) {
        const val = checkQuestionsCompliance(generatedSets[0], mon, geoPct, geoDivide);
        setComplianceResult(val);
      }
    } catch (err: any) {
      setProgressStatus(`Lỗi khi tạo câu hỏi: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Re-generate failed parts
  const handleRegenerateFailed = async () => {
    if (!failedTopics.length || !sets.length) return;
    try {
      setIsGenerating(true);
      setProgressStatus('Đang soạn lại các phần bị lỗi...');
      const topicNeeds = buildTopicNeeds();
      const remainingFails: typeof failedTopics = [];
      const updatedSets = [...sets];

      for (const item of failedTopics) {
        const { setIdx, rowIdx } = item;
        const need = topicNeeds[rowIdx];
        if (!need || !need.length) continue;

        try {
          const qs = await generateQuestionsForTopic(
            mon,
            grade,
            semester,
            rows[rowIdx],
            need,
            setIdx,
            numSets,
            [],
            refFiles,
            [],
            withExplanation,
            points.tl,
            autoSearch
          );

          qs.forEach((q) => {
            const normed = normalizeQuestion({ ...q, r: rowIdx });
            updatedSets[setIdx].push(normed);
          });
        } catch (err: any) {
          remainingFails.push({
            setIdx,
            rowIdx,
            error: err.message || 'Lỗi thử lại',
          });
        }
      }

      setSets(updatedSets);
      setFailedTopics(remainingFails);
      setProgressStatus(
        remainingFails.length
          ? `Còn lại ${remainingFails.length} phần chưa hoàn thành.`
          : 'Đã hoàn tất soạn lại toàn bộ phần bị lỗi!'
      );
    } catch (err: any) {
      setProgressStatus(`Lỗi soạn lại: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Suggest reputable external sources
  const handleSuggestSources = async () => {
    try {
      setProgressStatus('Đang gọi AI để gợi ý nguồn tài liệu uy tín ngoài sách...');
      const res = await suggestExternalSources(mon, grade, rows);
      setSuggestedSources(res);
      setProgressStatus('Đã nhận được danh sách nguồn gợi ý.');
    } catch (err: any) {
      setProgressStatus(`Lỗi gợi ý nguồn: ${err.message}`);
    }
  };

  const currentQuestions = sets[activeSetIndex] || [];

  // Question editing handler
  const handleEditQuestionStem = (qIdx: number, val: string) => {
    const updated = [...sets];
    const qList = [...updated[activeSetIndex]];
    qList[qIdx] = { ...qList[qIdx], stem: val };
    updated[activeSetIndex] = qList;
    setSets(updated);
  };

  const handleEditQuestionOpt = (qIdx: number, optIdx: number, val: string) => {
    const updated = [...sets];
    const qList = [...updated[activeSetIndex]];
    const newOpts = [...(qList[qIdx].opts || [])];
    newOpts[optIdx] = val;
    qList[qIdx] = { ...qList[qIdx], opts: newOpts };
    updated[activeSetIndex] = qList;
    setSets(updated);
  };

  const handleEditSubItemText = (qIdx: number, itemIdx: number, val: string) => {
    const updated = [...sets];
    const qList = [...updated[activeSetIndex]];
    const newItems = [...(qList[qIdx].items || [])];
    newItems[itemIdx] = { ...newItems[itemIdx], t: val };
    qList[qIdx] = { ...qList[qIdx], items: newItems };
    updated[activeSetIndex] = qList;
    setSets(updated);
  };

  // Export actions
  const handleDownloadExamWord = () => {
    if (!currentQuestions.length) return;
    const baseName = `De_${mon}_Lop${grade}_${semester}`.replace(/\s+/g, '_');
    exportExamWord(
      currentQuestions,
      `Đề kiểm tra ${mon} - Lớp ${grade} - ${semester}`,
      mon,
      grade,
      semester,
      points,
      numSets > 1 ? `${baseName}_Nguon${activeSetIndex + 1}` : baseName
    );
  };

  const handleDownloadAnswerExcel = () => {
    if (!currentQuestions.length) return;
    const baseName = `DapAn_${mon}_Lop${grade}_${semester}`.replace(/\s+/g, '_');
    exportAnswerExcel(currentQuestions, baseName);
  };

  const handleDownloadAnswerWord = () => {
    if (!currentQuestions.length) return;
    const baseName = `HuongDanCham_${mon}_Lop${grade}_${semester}`.replace(/\s+/g, '_');
    exportAnswerWord(
      sets,
      `Hướng dẫn chấm đề ${mon} - Lớp ${grade} - ${semester}`,
      mon,
      grade,
      semester,
      baseName
    );
  };

  const handleCopyExam = async () => {
    if (!currentQuestions.length) return;
    const examText = document.getElementById('exam-preview-container')?.innerText || '';
    if (examText) {
      await navigator.clipboard.writeText(examText);
      setProgressStatus('Đã sao chép toàn bộ đề kiểm tra vào bộ nhớ tạm.');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Reference materials box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm noprint space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Tài liệu tham khảo để ra đề (không bắt buộc)
            </h3>
          </div>
          {refFiles.length > 0 && (
            <button
              onClick={handleClearRef}
              className="text-xs text-rose-600 hover:underline font-medium"
            >
              Xóa tài liệu
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Tải tệp SGK Kết nối tri thức, sách giáo viên hoặc tài liệu chuyên môn (.docx, .xlsx, .txt). Hệ thống sẽ ưu tiên trích dẫn kiến thức và ngữ liệu chính xác từ đó.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            multiple
            accept=".docx,.xlsx,.xls,.csv,.txt"
            onChange={handleRefUpload}
            className="text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
          />
          {refFiles.length > 0 && (
            <span className="text-xs text-indigo-700 font-medium">
              Đã tải {refFiles.length} tệp: {refFiles.map((f) => f.name).join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* 2. Generation Options Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm noprint space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Số nguồn muốn tạo từ ma trận (1 đến 99)
            </label>
            <input
              type="number"
              min="1"
              max="99"
              value={numSets}
              onChange={(e) => setNumSets(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tốc độ & Chất lượng
            </label>
            <select
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800"
            >
              <option value="quick">Nhanh (khuyên dùng)</option>
              <option value="default">Cân bằng, chất lượng cao hơn</option>
            </select>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-2 pt-1 text-sm text-slate-700">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeLevelsInDoc}
              onChange={(e) => setIncludeLevelsInDoc(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span>Ghi mức độ (Biết, Hiểu, Vận dụng) cạnh từng ý Đúng – Sai trong file tải về</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={withExplanation}
              onChange={(e) => setWithExplanation(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span>Kèm lời giải / giải thích đáp án</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span>Tự xáo vị trí đáp án đúng cho đều A, B, C, D (câu nhiều lựa chọn)</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSearch}
              onChange={(e) => setAutoSearch(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span>Tự động thu thập thông tin, số liệu & ngữ liệu uy tín trên mạng khi tạo đề (Google Search)</span>
          </label>
        </div>

        {/* Geography Specific Options */}
        {mon === 'Địa lí' && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={geoDivide}
                onChange={(e) => setGeoDivide(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300"
              />
              Môn Địa lí: phân chia tỉ lệ nguồn cho câu Đúng/Sai
            </label>

            {geoDivide && (
              <div className="flex items-center gap-3 pl-6">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={geoPct}
                  onChange={(e) => setGeoPct(Number(e.target.value))}
                  className="flex-1 accent-indigo-600"
                />
                <span className="text-xs font-bold text-indigo-700 whitespace-nowrap">
                  {geoPct}% bảng/biểu đồ - {100 - geoPct}% ngữ liệu
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Rules Explanation Accordion */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm noprint">
        <button
          type="button"
          onClick={() => setShowRules(!showRules)}
          className="w-full flex items-center justify-between px-5 py-3 text-left font-semibold text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 transition"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-500" />
            Quy tắc chuẩn hóa đề thi đang áp dụng (theo chuẩn BGDĐT)
          </span>
          <span className="text-xs text-indigo-600 font-medium">
            {showRules ? 'Thu gọn' : 'Xem chi tiết'}
          </span>
        </button>

        {showRules && (
          <div className="p-4 border-t border-slate-200 text-xs text-slate-600 space-y-2 leading-relaxed bg-white">
            <p>
              <b>- Nhiều lựa chọn (Phần I):</b> 4 phương án, 1 đáp án đúng; câu dẫn kết thúc bằng dấu ? hoặc nối thành câu hoàn chỉnh; phương án nhiễu hợp lý; không dùng "tất cả đều đúng/sai"; từ phủ định VIẾT HOA và in đậm; đáp án đúng phân bố đều.
            </p>
            <p>
              <b>- Đúng/Sai (Phần II):</b> Mỗi câu gồm 4 ý độc lập a, b, c, d; có cả đúng và sai; ý a, b mức Biết–Hiểu; ý c, d mức Vận dụng; bắt buộc có ngữ liệu/bảng/biểu đồ kèm trích dẫn nguồn uy tín.
            </p>
            <p>
              <b>- Trả lời ngắn (Phần III):</b> 100% là bài toán tính toán ra một giá trị số duy nhất; có quy ước làm tròn nếu là số thập phân; nêu rõ đơn vị hoặc "chỉ điền phần số".
            </p>
          </div>
        )}
      </div>

      {/* 4. Action buttons bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 noprint bg-slate-100/70 p-3 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow hover:bg-indigo-700 disabled:opacity-50 transition active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'Đang tạo câu hỏi qua AI...' : 'Tạo câu hỏi từ ma trận và bản đặc tả'}
          </button>

          {failedTopics.length > 0 && (
            <button
              onClick={handleRegenerateFailed}
              disabled={isGenerating}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Soạn lại {failedTopics.length} phần bị lỗi
            </button>
          )}

          <button
            onClick={handleSuggestSources}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
            Gợi ý nguồn uy tín ngoài sách
          </button>
        </div>

        {currentQuestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadExamWord}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-50 shadow-sm transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Tải đề Word
            </button>
            <button
              onClick={handleDownloadAnswerWord}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-purple-700 text-xs font-semibold hover:bg-purple-50 shadow-sm transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Tải đáp án Word
            </button>
            <button
              onClick={handleDownloadAnswerExcel}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-teal-700 text-xs font-semibold hover:bg-teal-50 shadow-sm transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Xuất đáp án Excel
            </button>
            <button
              onClick={handleCopyExam}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-sm transition"
            >
              <Copy className="w-3.5 h-3.5" />
              Sao chép đề
            </button>
          </div>
        )}
      </div>

      {/* Progress & Status Message */}
      {progressStatus && (
        <div className="text-xs text-indigo-700 bg-indigo-50/80 p-3 rounded-xl border border-indigo-100 font-medium noprint">
          {progressStatus}
        </div>
      )}

      {/* Source sets tabs */}
      {sets.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 noprint">
          {sets.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveSetIndex(idx);
                if (sets[idx]?.length) {
                  setComplianceResult(checkQuestionsCompliance(sets[idx], mon, geoPct, geoDivide));
                }
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                activeSetIndex === idx
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Nguồn {idx + 1} ({sets[idx]?.length || 0} câu)
            </button>
          ))}
        </div>
      )}

      {/* Suggested sources view */}
      {suggestedSources.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm noprint space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Gợi ý nguồn tài liệu uy tín ngoài sách giáo khoa
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {suggestedSources.map((s, idx) => (
              <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <b className="text-indigo-800 block mb-1">{s.topic}</b>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  {s.items.map((it, iIdx) => (
                    <li key={iIdx}>
                      <span className="font-semibold text-slate-700">{it.nguon}</span> ({it.loai}): {it.tim}
                      {it.tukhoa && <span className="text-slate-400 block">Từ khóa: {it.tukhoa}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Check Results */}
      {complianceResult && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm noprint space-y-2">
          <div className="flex items-center gap-2">
            {complianceResult.warnings.length === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
            <b className="text-xs text-slate-800">Kiểm tra chuẩn hóa đề tự động</b>
          </div>

          {complianceResult.warnings.length === 0 ? (
            <p className="text-xs text-emerald-700 font-medium">
              Đề thi đáp ứng tốt các quy tắc chuẩn hóa hình thức và cấu trúc câu hỏi.
            </p>
          ) : (
            <ul className="list-disc pl-5 text-xs text-amber-800 space-y-1">
              {complianceResult.warnings.slice(0, 5).map((w, wIdx) => (
                <li key={wIdx}>{w}</li>
              ))}
              {complianceResult.warnings.length > 5 && (
                <li className="italic text-slate-500">
                  Và {complianceResult.warnings.length - 5} cảnh báo khác...
                </li>
              )}
            </ul>
          )}

          {complianceResult.infos.map((info, iIdx) => (
            <div key={iIdx} className="text-[11.5px] text-slate-500">
              • {info}
            </div>
          ))}
        </div>
      )}

      {/* 5. Exam Paper Preview */}
      {currentQuestions.length > 0 ? (
        <div
          id="exam-preview-container"
          className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-slate-800 font-sans"
        >
          {/* Header */}
          <div className="border-b border-slate-200 pb-4">
            <div className="flex justify-between items-start text-xs sm:text-sm font-semibold text-center mb-4">
              <div className="w-1/2 pr-2">
                <div>SỞ GIÁO DỤC VÀ ĐÀO TẠO ..........</div>
                <div>TRƯỜNG THPT ..........................</div>
                <div className="text-slate-400">----------</div>
              </div>
              <div className="w-1/2 pl-2">
                <div className="text-indigo-900 font-bold uppercase">
                  ĐỀ KIỂM TRA {semester.toUpperCase()} - LỚP {grade}
                </div>
                <div className="text-indigo-700 font-bold uppercase">MÔN: {mon.toUpperCase()}</div>
                <div className="italic text-slate-500 text-xs font-normal">
                  Thời gian làm bài: ...... phút (Không kể thời gian phát đề)
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-between text-xs font-medium text-slate-600 pt-2 border-t border-slate-100">
              <div>Họ và tên thí sinh: ...................................................................</div>
              <div>Số báo danh: .............................</div>
              <div>Mã đề thi: 101</div>
            </div>
          </div>

          {/* Part I: Multiple Choice */}
          {currentQuestions.some((q) => q.d === 'NLC') && (
            <div className="space-y-4">
              <div className="font-bold text-sm text-indigo-900 uppercase border-b border-indigo-100 pb-1">
                PHẦN I. Câu trắc nghiệm nhiều lựa chọn (Chọn một đáp án đúng duy nhất)
              </div>
              <p className="text-xs italic text-slate-500">
                Thí sinh trả lời từ câu 1 đến câu {currentQuestions.filter((q) => q.d === 'NLC').length}. Mỗi câu trả lời đúng được {formatNumber(points.tn)} điểm.
              </p>

              <div className="space-y-4">
                {currentQuestions
                  .filter((q) => q.d === 'NLC')
                  .map((q, idx) => (
                    <div key={idx} className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-xs text-indigo-800 whitespace-nowrap">
                          Câu {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={q.stem}
                          onChange={(e) => {
                            const globalIdx = currentQuestions.indexOf(q);
                            handleEditQuestionStem(globalIdx, e.target.value);
                          }}
                          className="flex-1 bg-transparent text-xs font-medium text-slate-800 hover:bg-white focus:bg-white p-1 rounded border border-transparent focus:border-indigo-400"
                        />
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">
                          {q.m === 'B' ? 'Biết' : q.m === 'H' ? 'Hiểu' : 'Vận dụng'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 text-xs">
                        {(q.opts || []).map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-1.5">
                            <b className="text-slate-700">{'ABCD'[oIdx]}.</b>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const globalIdx = currentQuestions.indexOf(q);
                                handleEditQuestionOpt(globalIdx, oIdx, e.target.value);
                              }}
                              className="flex-1 bg-transparent hover:bg-white focus:bg-white p-1 rounded border border-transparent focus:border-indigo-400 text-slate-700"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Part II: True/False */}
          {currentQuestions.some((q) => q.d === 'DS') && (
            <div className="space-y-4">
              <div className="font-bold text-sm text-indigo-900 uppercase border-b border-indigo-100 pb-1">
                PHẦN II. Câu trắc nghiệm đúng sai
              </div>
              <p className="text-xs italic text-slate-500">
                Thí sinh trả lời từ câu 1 đến câu {currentQuestions.filter((q) => q.d === 'DS').length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai. Điểm tối đa của một câu là {formatNumber(points.ds)} điểm.
              </p>

              <div className="space-y-4">
                {currentQuestions
                  .filter((q) => q.d === 'DS')
                  .map((q, idx) => (
                    <div key={idx} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-2.5">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-xs text-indigo-800 whitespace-nowrap">
                          Câu {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={q.stem}
                          onChange={(e) => {
                            const globalIdx = currentQuestions.indexOf(q);
                            handleEditQuestionStem(globalIdx, e.target.value);
                          }}
                          className="flex-1 bg-transparent text-xs font-medium text-slate-800 hover:bg-white focus:bg-white p-1 rounded border border-transparent focus:border-indigo-400"
                        />
                      </div>

                      {/* Sources & Stimulus */}
                      {(q.srcs || []).map((s, sIdx) => {
                        const cleanSrc = (s.src || '').replace(/^Nguồn:\s*/i, '').trim();
                        return (
                          <div key={sIdx} className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2">
                            {s.text && <p className="italic leading-relaxed">{s.text}</p>}
                            
                            {s.table && (
                              <div className="space-y-1.5 overflow-x-auto">
                                {s.table.title && <p className="font-bold text-indigo-900">{s.table.title}</p>}
                                <table className="w-full border-collapse border border-slate-300 text-[11.5px]">
                                  {s.table.head && (
                                    <thead>
                                      <tr className="bg-indigo-50">
                                        {s.table.head.map((h, hIdx) => (
                                          <th key={hIdx} className="border border-slate-300 px-2 py-1 text-center font-semibold text-slate-800">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                  )}
                                  <tbody>
                                    {(s.table.rows || []).map((row, rIdx) => (
                                      <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                                        {row.map((cell, cIdx) => (
                                          <td key={cIdx} className={`border border-slate-300 px-2 py-1 ${cIdx === 0 ? 'text-left font-medium' : 'text-center'}`}>
                                            {formatVietnameseNumber(cell)}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {s.chart && (
                              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1.5">
                                {s.chart.title && <p className="font-bold text-indigo-900">{s.chart.title} {s.chart.unit ? `(Đơn vị: ${s.chart.unit})` : ''}</p>}
                                <div className="space-y-1">
                                  {(s.chart.series || []).map((ser, srIdx) => (
                                    <div key={srIdx} className="text-[11px] text-slate-700">
                                      <span className="font-semibold">{ser.name || 'Số liệu'}:</span> {(ser.values || []).map((v) => formatVietnameseNumber(v)).join(' · ')}
                                    </div>
                                  ))}
                                  {s.chart.labels && (
                                    <div className="text-[10.5px] text-slate-500 italic">
                                      Nhãn: {s.chart.labels.join(', ')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {s.fig && (
                              <div className="bg-slate-50 p-3 rounded border border-dashed border-slate-300 text-center text-slate-600 space-y-1">
                                <span className="text-[11px] font-bold uppercase text-indigo-700 block">📊 [Hình minh họa / Sơ đồ / Bản đồ]</span>
                                <p className="italic">{s.fig}</p>
                              </div>
                            )}

                            {cleanSrc && (
                              <p className="text-[11px] text-slate-500 font-medium pt-1">
                                <i>(Nguồn: {cleanSrc})</i>
                              </p>
                            )}
                          </div>
                        );
                      })}

                      {/* Items a, b, c, d */}
                      <div className="space-y-1.5 pl-4 text-xs">
                        {(q.items || []).map((it, iIdx) => (
                          <div key={iIdx} className="flex items-center gap-2">
                            <b className="text-slate-700">{'abcd'[iIdx]})</b>
                            <input
                              type="text"
                              value={it.t}
                              onChange={(e) => {
                                const globalIdx = currentQuestions.indexOf(q);
                                handleEditSubItemText(globalIdx, iIdx, e.target.value);
                              }}
                              className="flex-1 bg-transparent hover:bg-white focus:bg-white p-1 rounded border border-transparent focus:border-indigo-400 text-slate-700"
                            />
                            <span className="text-[10px] text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded">
                              {it.m === 'B' ? 'Biết' : it.m === 'H' ? 'Hiểu' : 'Vận dụng'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Part III: Short Answer */}
          {currentQuestions.some((q) => q.d === 'TLN') && (
            <div className="space-y-4">
              <div className="font-bold text-sm text-indigo-900 uppercase border-b border-indigo-100 pb-1">
                PHẦN III. Câu trắc nghiệm trả lời ngắn
              </div>
              <p className="text-xs italic text-slate-500">
                Thí sinh trả lời từ câu 1 đến câu {currentQuestions.filter((q) => q.d === 'TLN').length}. Điền kết quả vào ô trống tương ứng.
              </p>

              <div className="space-y-3">
                {currentQuestions
                  .filter((q) => q.d === 'TLN')
                  .map((q, idx) => (
                    <div key={idx} className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-xs text-indigo-800 whitespace-nowrap">
                          Câu {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={q.stem}
                          onChange={(e) => {
                            const globalIdx = currentQuestions.indexOf(q);
                            handleEditQuestionStem(globalIdx, e.target.value);
                          }}
                          className="flex-1 bg-transparent text-xs font-medium text-slate-800 hover:bg-white focus:bg-white p-1 rounded border border-transparent focus:border-indigo-400"
                        />
                      </div>
                      <div className="text-xs text-slate-400 pl-4 font-mono">
                        Trả lời: [ .......................................................... ]
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Part IV: Essay */}
          {currentQuestions.some((q) => q.d === 'TL') && (
            <div className="space-y-4">
              <div className="font-bold text-sm text-indigo-900 uppercase border-b border-indigo-100 pb-1">
                PHẦN IV. Tự luận
              </div>
              <div className="space-y-3">
                {currentQuestions
                  .filter((q) => q.d === 'TL')
                  .map((q, idx) => (
                    <div key={idx} className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-xs text-indigo-800 whitespace-nowrap">
                          Câu {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={q.stem}
                          onChange={(e) => {
                            const globalIdx = currentQuestions.indexOf(q);
                            handleEditQuestionStem(globalIdx, e.target.value);
                          }}
                          className="flex-1 bg-transparent text-xs font-medium text-slate-800 hover:bg-white focus:bg-white p-1 rounded border border-transparent focus:border-indigo-400"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="text-center font-bold text-xs text-slate-500 pt-4 border-t border-slate-200">
            ------------------------ HẾT ------------------------
            <div className="text-[11px] font-normal italic text-slate-400">
              (Giám thị coi thi không giải thích gì thêm)
            </div>
          </div>

          {/* Answer Key & Guide Section */}
          <div className="pt-6 border-t-2 border-indigo-200 space-y-3">
            <h4 className="font-bold text-sm text-indigo-900 uppercase">
              ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM
            </h4>

            {currentQuestions.some((q) => q.d === 'NLC') && (
              <div className="text-xs space-y-1">
                <b className="text-slate-800">Phần I:</b>{' '}
                {currentQuestions
                  .filter((q) => q.d === 'NLC')
                  .map((q, i) => `Câu ${i + 1}: ${q.ans}`)
                  .join(' · ')}
              </div>
            )}

            {currentQuestions.some((q) => q.d === 'DS') && (
              <div className="text-xs space-y-1">
                <b className="text-slate-800">Phần II:</b>
                {currentQuestions
                  .filter((q) => q.d === 'DS')
                  .map(
                    (q, i) =>
                      `Câu ${i + 1}: ` +
                      (q.items || [])
                        .map((it, j) => `${'abcd'[j]}) ${it.a ? 'Đ' : 'S'}`)
                        .join('; ')
                  )
                  .map((str, sIdx) => (
                    <div key={sIdx} className="pl-2">
                      {str}
                    </div>
                  ))}
              </div>
            )}

            {currentQuestions.some((q) => q.d === 'TLN') && (
              <div className="text-xs space-y-1">
                <b className="text-slate-800">Phần III:</b>{' '}
                {currentQuestions
                  .filter((q) => q.d === 'TLN')
                  .map((q, i) => `Câu ${i + 1}: ${formatVietnameseNumber(q.ans)}`)
                  .join(' · ')}
              </div>
            )}

            {currentQuestions.some((q) => q.d === 'TL') && (
              <div className="text-xs space-y-1.5">
                <b className="text-slate-800">Phần IV:</b>
                {currentQuestions
                  .filter((q) => q.d === 'TL')
                  .map((q, i) => (
                    <div key={i} className="pl-2 space-y-1">
                      <div className="font-semibold text-slate-800">Câu {i + 1}:</div>
                      <div className="pl-2 whitespace-pre-line text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        {q.ans}
                      </div>
                      {(q.rubric && q.rubric.length > 0) && (
                        <div className="pt-1">
                          <div className="font-medium text-slate-700 pl-2">Biểu điểm thành phần:</div>
                          {q.rubric.map((rb, rIdx) => (
                            <div key={rIdx} className="pl-4 text-slate-600">
                              - Ý {rIdx + 1}: {rb.y} ({formatVietnameseNumber(formatNumber(rb.d))} điểm)
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm space-y-3">
          <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
          <h4 className="font-semibold text-slate-700">Chưa có câu hỏi nào được tạo</h4>
          <p className="text-xs max-w-md mx-auto">
            Bấm vào nút <b>"Tạo câu hỏi từ ma trận và bản đặc tả"</b> ở trên để hệ thống tự động soạn thảo bộ câu hỏi trắc nghiệm & tự luận chuẩn hóa bám sát chương trình.
          </p>
        </div>
      )}
    </div>
  );
};
