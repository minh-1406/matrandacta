import React, { useState } from 'react';
import { ExamSemester, MatrixRow, QuestionPointConfig, StructureMode, SubjectName } from '../types';
import {
  calculateRowLevelCounts,
  calculateRowScore,
  calculateSums,
  formatNumber,
  getY,
  getZeroVector,
  consolidateRowsByChapter,
  distributeQuestions,
  ensureValidYccd,
  standardizeMatrixAndSpecToCv7991,
  getChapterSpans,
} from '../utils/matrixCalculations';
import { readFileText, fileToBase64 } from '../utils/fileReader';
import { adjustMatrixWithAI } from '../services/geminiService';
import { runStandardizeMatrixRowsAsync } from '../utils/matrixWorkerClient';
import { FOOTNOTES_TEXT, NOCALC } from '../constants/curriculumData';
import { Plus, Trash2, Sparkles, Undo2, RotateCcw, ChevronDown, ChevronUp, Loader2, Wand2 } from 'lucide-react';

interface MatrixTableProps {
  rows: MatrixRow[];
  onChange: (updatedRows: MatrixRow[]) => void;
  points: QuestionPointConfig;
  onPointsChange: (pts: QuestionPointConfig) => void;
  mon: SubjectName;
  grade: string;
  semester: ExamSemester;
  structureMode: StructureMode;
  noTLN: boolean;
  targetFormatPoints?: number[];
  targetLevelPoints?: number[];
  onResetDefault: () => void;
  ppctData?: {
    text: string;
    base64: string;
    mimeType: string;
    yccdText: string;
    yccdBase64: string;
    yccdMimeType: string;
  };
  onPpctDataChange?: (data: {
    text: string;
    base64: string;
    mimeType: string;
    yccdText: string;
    yccdBase64: string;
    yccdMimeType: string;
  }) => void;
}

export const MatrixTable: React.FC<MatrixTableProps> = ({
  rows,
  onChange,
  points,
  onPointsChange,
  mon,
  grade,
  semester,
  structureMode,
  noTLN,
  targetFormatPoints,
  targetLevelPoints,
  onResetDefault,
  ppctData,
  onPpctDataChange,
}) => {
  const [showAdjust, setShowAdjust] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiFileName, setAiFileName] = useState('');
  const [aiFileText, setAiFileText] = useState('');
  const [aiFileBase64, setAiFileBase64] = useState('');
  const [aiFileMimeType, setAiFileMimeType] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [previousHistory, setPreviousHistory] = useState<{
    rows: MatrixRow[];
    points: QuestionPointConfig;
  } | null>(null);

  const sums = calculateSums(rows, points);
  const Tt = sums.T || 10;
  const { spans, showCell } = getChapterSpans(rows);

  const handleRowTextChange = (index: number, key: 'c' | 'n', val: string) => {
    const updated = [...rows];
    if (key === 'c') {
      const oldC = (updated[index].c || '').trim().toLowerCase();
      updated[index] = { ...updated[index], c: val };
      // Sync contiguous group
      let k = index - 1;
      while (k >= 0 && (updated[k].c || '').trim().toLowerCase() === oldC && oldC !== '') {
        updated[k] = { ...updated[k], c: val };
        k--;
      }
      let j = index + 1;
      while (j < updated.length && (updated[j].c || '').trim().toLowerCase() === oldC && oldC !== '') {
        updated[j] = { ...updated[j], c: val };
        j++;
      }
      if (!val.trim()) {
        setAiStatus(`⚠️ Cảnh báo: Tên Chủ đề/Chương tại dòng ${index + 1} đang bị xóa trắng! Vui lòng nhập tên chương.`);
        setTimeout(() => setAiStatus(''), 4000);
      }
    } else {
      updated[index] = { ...updated[index], n: val };
      if (!val.trim()) {
        setAiStatus(`⚠️ Cảnh báo: Tên Bài học/Nội dung tại dòng ${index + 1} đang bị xóa trắng!`);
        setTimeout(() => setAiStatus(''), 4000);
      }
    }
    onChange(updated);
  };

  const handleCellChange = (rowIndex: number, colIndex: number, val: number) => {
    if (val < 0) {
      setAiStatus('⚠️ Cảnh báo: Số lượng câu hỏi không được là số âm (hệ thống đã tự chuyển về 0)!');
      setTimeout(() => setAiStatus(''), 3500);
    } else if (val > 50) {
      setAiStatus(`⚠️ Cảnh báo: Số câu hỏi tại một ô (${val} câu) quá lớn so với dung lượng đề thi!`);
      setTimeout(() => setAiStatus(''), 3500);
    }
    const updated = [...rows];
    const newV = [...updated[rowIndex].v];
    newV[colIndex] = Math.max(0, val);
    updated[rowIndex] = { ...updated[rowIndex], v: newV };
    onChange(updated);
  };

  const handleDSCellChange = (
    rowIndex: number,
    levelIdx: number,
    val: number,
    isSubItem: boolean
  ) => {
    if (val < 0) {
      setAiStatus('⚠️ Cảnh báo: Số câu hoặc số ý Đúng/Sai không được là số âm!');
      setTimeout(() => setAiStatus(''), 3500);
    }
    const updated = [...rows];
    const r = { ...updated[rowIndex] };
    const newV = [...r.v];

    if (isSubItem) {
      const newY = [...getY(r)];
      newY[levelIdx] = Math.max(0, val);
      r.y = newY;
      // Khi tăng hay giảm ý ở 1 ô hay cả 3 ô, số câu ở các ô có ý vẫn giữ nguyên là 1
      newV[3] = newY[0] > 0 ? 1 : 0;
      newV[4] = newY[1] > 0 ? 1 : 0;
      newV[5] = newY[2] > 0 ? 1 : 0;
      r.v = newV;
    } else {
      const qCount = Math.max(0, val);
      newV[3 + levelIdx] = qCount;
      r.y = [...getY(r)];
      if (qCount === 0) {
        r.y[levelIdx] = 0;
      }
      r.v = newV;
    }
    updated[rowIndex] = r;
    onChange(updated);
  };

  const handleAddRow = () => {
    const newRow: MatrixRow = {
      c: 'Chủ đề mới',
      n: 'Nội dung kiến thức',
      v: getZeroVector(),
      s: [
        'Nhận biết nội dung cơ bản',
        'Hiểu và giải thích các nội dung',
        'Vận dụng vào bài toán, tình huống thực tế',
      ],
    };
    const updated = [...rows, newRow];
    const redistributed = distributeQuestions(updated, mon as SubjectName, structureMode, noTLN);
    onChange(redistributed);
  };

  const handleDeleteRow = (index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    if (updated.length > 0) {
      const redistributed = distributeQuestions(updated, mon as SubjectName, structureMode, noTLN);
      onChange(redistributed);
    } else {
      onChange(updated);
    }
  };

  const applyAIWithParams = async (
    customPrompt?: string,
    fileTxt?: string,
    fileB64?: string,
    fileMime?: string
  ) => {
    const promptStr = typeof customPrompt === 'string' ? customPrompt : aiPrompt.trim();
    
    // Use attached file or fallback to uploaded PPCT/YCCD data from SettingsPanel
    const combinedPpctYccdText = ppctData ? `${ppctData.text || ''}\n${ppctData.yccdText || ''}`.trim() : '';
    const fTxt = fileTxt !== undefined ? fileTxt : (aiFileText || combinedPpctYccdText);
    const fB64 = fileB64 !== undefined ? fileB64 : (aiFileBase64 || (ppctData ? (ppctData.base64 || ppctData.yccdBase64) : ''));
    const fMime = fileMime !== undefined ? fileMime : (aiFileMimeType || (ppctData ? (ppctData.mimeType || ppctData.yccdMimeType) : ''));

    const promptToUse = promptStr || (fTxt
      ? `Trích xuất chính xác 100% nội dung ma trận và bản đặc tả YCCĐ từ tệp tải lên (giữ nguyên từng chương, từng bài, số lượng câu hỏi và yêu cầu cần đạt) môn ${mon} lớp ${grade} (${semester})`
      : `Đối chiếu, chuẩn hóa và cân đối lại ma trận và bản đặc tả môn ${mon} lớp ${grade} (${semester}) chuẩn GDPT 2018`);

    try {
      setIsAdjusting(true);
      setAiStatus('Đang tự động phân tích tệp ma trận / YCCĐ và trích xuất nội dung...');
      setPreviousHistory({
        rows: JSON.parse(JSON.stringify(rows)),
        points: { ...points },
      });

      const res = await adjustMatrixWithAI(
        mon,
        grade,
        semester,
        rows,
        points,
        promptToUse,
        fTxt,
        fB64,
        fMime,
        fTxt.length > 0
      );

      if (res && res.rows && res.rows.length > 0) {
        const updatedRows: MatrixRow[] = res.rows.map((r, i) => {
          const old = rows.find((row) => row.c.trim().toLowerCase() === r.c.trim().toLowerCase()) || rows[i];
          const v = r.v ? r.v.map((n) => Math.max(0, Math.round(n || 0))) : (old ? old.v : getZeroVector());
          let numDS = v[3] + v[4] + v[5];
          if (Array.isArray(r.ds)) {
            numDS = Math.max(numDS, r.ds.length);
          }
          let y = [0, 0, 0];
          const rawY = (r as any).y;
          if (rawY && Array.isArray(rawY) && rawY.length === 3) {
            y = [Math.max(0, Math.round(rawY[0] || 0)), Math.max(0, Math.round(rawY[1] || 0)), Math.max(0, Math.round(rawY[2] || 0))];
            const qCount = Math.max(1, Math.round((y[0] + y[1] + y[2]) / 4));
            if (y[0] === qCount && y[1] === qCount && y[2] === qCount) {
              y[0] = 2 * qCount; // 1 câu lớn ĐS luôn có 2 ý Biết
            }
            const sy = y[0] + y[1] + y[2];
            v[3] = sy > 0 ? Math.max(1, Math.round(sy / 4)) : 0;
            v[4] = 0;
            v[5] = 0;
          } else if (numDS > 0) {
            y = [2 * numDS, 1 * numDS, 1 * numDS]; // Mỗi câu lớn ĐS có 2 ý Biết, 1 ý Hiểu, 1 ý VD
            v[3] = numDS;
            v[4] = 0;
            v[5] = 0;
          }

          // Preserve uploaded or existing YCCD criteria (s) exactly
          let finalS: [string, string, string] = [
            `Nhận biết các khái niệm cơ bản trong ${r.c}`,
            `Hiểu và giải thích nội dung ${r.c}`,
            `Vận dụng kiến thức ${r.c} giải quyết bài tập, tình huống thực tế`
          ];

          if (r.s && Array.isArray(r.s) && r.s.some((str) => str && str.trim())) {
            finalS = [r.s[0] || '', r.s[1] || '', r.s[2] || ''];
          } else if (old && old.s && Array.isArray(old.s) && old.s.some((str) => str && str.trim())) {
            finalS = [old.s[0] || '', old.s[1] || '', old.s[2] || ''];
          }

          return {
            c: r.c,
            n: r.n || (fTxt ? `Nội dung ${r.c}` : (old ? old.n : '')),
            v,
            y,
            s: finalS,
          };
        });

        // Check if the extracted rows already contain explicit question counts from the uploaded file
        const hasQuestionsInExtracted = updatedRows.some(
          (r) => (r.v && r.v.some((val) => val > 0)) || (r.y && r.y.some((val) => val > 0))
        );

        // Offload standardization & YCCD matching to Web Worker so UI stays responsive
        let initialRows = updatedRows;
        if (fTxt && fTxt.trim().length > 0 && !hasQuestionsInExtracted) {
          initialRows = distributeQuestions(
            initialRows,
            mon as SubjectName,
            structureMode,
            noTLN,
            points,
            targetFormatPoints,
            targetLevelPoints,
            true
          );
        }

        const standardizedFinal = await runStandardizeMatrixRowsAsync({
          rows: initialRows,
          mon: mon as SubjectName,
          grade,
          semester,
          structureMode,
          noTLN: noTLN || (structureMode === 'k' && NOCALC.includes(mon as any)),
          points,
          targetFormatPoints,
          targetLevelPoints,
          fileText: fTxt || ppctData?.text || ppctData?.yccdText || '',
          preserveExistingQuestions: hasQuestionsInExtracted || Boolean(fTxt),
        });

        onChange(standardizedFinal);
        if (res.pts) {
          onPointsChange({ ...points, ...res.pts });
        }
        setAiStatus(
          hasQuestionsInExtracted
            ? '✓ Đã ưu tiên lọc dữ liệu trong bảng của tệp tải lên và ánh xạ chính xác 100% lên ma trận CV 7991!'
            : '✓ Đã đọc tệp và đưa chính xác danh mục nội dung vào ma trận theo chuẩn CV 7991!'
        );
        setAiNotes(res.notes || '');
      } else {
        setAiStatus('Không nhận được dữ liệu ma trận hợp lệ từ AI.');
      }
    } catch (err: any) {
      setAiStatus(`Lỗi điều chỉnh: ${err.message || 'Không thể gọi AI'}`);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleClearFile = () => {
    setAiFileText('');
    setAiFileBase64('');
    setAiFileMimeType('');
    setAiFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setAiStatus('Đã xóa tệp đính kèm.');
  };

  const handleStandardizeMatrixFromFile = async (
    customTxt?: string,
    customB64?: string,
    customMime?: string
  ) => {
    const combinedPpctYccdText = ppctData ? `${ppctData.text || ''}\n${ppctData.yccdText || ''}`.trim() : '';
    const fTxt = customTxt !== undefined ? customTxt : (aiFileText || combinedPpctYccdText);
    const fB64 = customB64 !== undefined ? customB64 : (aiFileBase64 || (ppctData ? (ppctData.base64 || ppctData.yccdBase64) : ''));
    const fMime = customMime !== undefined ? customMime : (aiFileMimeType || (ppctData ? (ppctData.mimeType || ppctData.yccdMimeType) : ''));

    // Check if uploaded file exists; if not, warn user and open file selector
    if (!fTxt && !fB64) {
      setAiStatus('⚠️ Cảnh báo: Chức năng này hoạt động chuẩn hóa dành cho file tải lên! Vui lòng chọn tệp ma trận, bản đặc tả hoặc PPCT (.docx, .xlsx, .pdf, .txt) để chuẩn hóa.');
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    try {
      setAiStatus('Đang đọc file tải lên và chuẩn hóa dữ liệu vào khung ma trận & bản đặc tả theo CV 7991...');
      await applyAIWithParams(
        'Chuẩn hóa chính xác 100% dữ liệu từ tệp tải lên vào khung ma trận và bản đặc tả theo đúng quy định Công văn 7991 (giữ nguyên từng bài, số lượng câu hỏi của tệp, đảm bảo 1 chương xuất hiện 1 lần, mỗi bài 1 hàng, câu Đúng-Sai đủ 4 ý: 2 Biết, 1 Hiểu, 1 Vận dụng)',
        fTxt,
        fB64,
        fMime
      );
    } catch (err: any) {
      setAiStatus(`Lỗi chuẩn hóa file: ${err.message || 'Không thể chuẩn hóa file'}`);
    }
  };

  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    // Validate file extensions and non-empty size
    const validExtensions = ['.docx', '.doc', '.xlsx', '.xls', '.pdf', '.txt', '.csv'];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size === 0) {
        setAiStatus(`⚠️ Cảnh báo lỗi: Tệp "${file.name}" có dung lượng 0 KB (tệp rỗng)! Vui lòng chọn tệp hợp lệ.`);
        return;
      }
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(ext)) {
        setAiStatus(`⚠️ Cảnh báo định dạng: Tệp "${file.name}" (${ext}) không thuộc định dạng hỗ trợ (.docx, .xlsx, .pdf, .txt, .csv)!`);
        return;
      }
    }

    try {
      setAiStatus(`Đang đọc ${files.length} tệp...`);
      let combined = '';
      let b64 = '';
      let mime = 'application/pdf';
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await readFileText(file);
        const fileB64 = await fileToBase64(file);
        if (!text.trim() && !fileB64) {
          setAiStatus(`⚠️ Cảnh báo: Tệp "${file.name}" không trích xuất được nội dung. Vui lòng kiểm tra lại tệp.`);
          return;
        }
        combined += `=== TỆP ${i + 1} (${file.name}) ===\n${text.slice(0, 300000)}\n\n`;
        if (i === 0) {
          b64 = fileB64;
          mime = file.type || 'application/pdf';
        }
      }
      const primaryName = files.length === 1 ? files[0].name : `${files[0].name} (+${files.length - 1} tệp)`;
      setAiFileName(primaryName);
      setAiFileText(combined);
      setAiFileBase64(b64);
      setAiFileMimeType(mime);
      onPpctDataChange?.({
        text: combined,
        base64: b64,
        mimeType: mime,
        yccdText: combined,
        yccdBase64: b64,
        yccdMimeType: mime,
      });
      setAiStatus(`Đã đọc tệp "${primaryName}". Đang tự động thực hiện chuẩn hóa ma trận từ file tải lên theo quy định CV 7991...`);

      // Automatically execute the standardization for uploaded file
      await handleStandardizeMatrixFromFile(combined, b64, mime);
    } catch (err: any) {
      setAiStatus(`Lỗi đọc tệp: ${err.message}`);
    }
  };

  const handleApplyAI = async (customPrompt?: string | React.MouseEvent) => {
    const promptStr = typeof customPrompt === 'string' ? customPrompt : aiPrompt.trim();
    const hasFile = Boolean(aiFileText || (ppctData && (ppctData.text || ppctData.yccdText)));
    if (!promptStr && !hasFile) {
      setAiStatus('⚠️ Cảnh báo: Vui lòng nhập câu lệnh điều chỉnh hoặc đính kèm tệp ma trận/YCCĐ trước khi bấm áp dụng!');
      setTimeout(() => setAiStatus(''), 4500);
      return;
    }
    await applyAIWithParams(promptStr);
  };

  const handleUndo = () => {
    if (!previousHistory) return;
    onChange(previousHistory.rows);
    onPointsChange(previousHistory.points);
    setPreviousHistory(null);
    setAiStatus('Đã hoàn tác thay đổi gần nhất.');
  };

  return (
    <div className="space-y-3">
      {/* Unified Compact Matrix Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs noprint space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowAdjust(!showAdjust)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                showAdjust
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Điều chỉnh ma trận qua AI / Tải tệp</span>
              {showAdjust ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => handleStandardizeMatrixFromFile()}
              disabled={isAdjusting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-60 whitespace-nowrap"
              title="Chuẩn hóa dữ liệu bảng từ file tải lên vào khung ma trận và bản đặc tả theo CV 7991"
            >
              {isAdjusting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Chuẩn hóa từ tệp tải lên (CV 7991)</span>
                </>
              )}
            </button>

            {previousHistory && (
              <button
                type="button"
                onClick={handleUndo}
                disabled={isAdjusting}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition cursor-pointer whitespace-nowrap"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Hoàn tác</span>
              </button>
            )}

            <button
              type="button"
              onClick={onResetDefault}
              disabled={isAdjusting}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Về mặc định</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden xl:inline text-[11px] text-slate-400 italic">
              ↔ Nhấp trực tiếp vào ô trong bảng để sửa tên chương/bài và số câu
            </span>
            <button
              onClick={handleAddRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm dòng</span>
            </button>
          </div>
        </div>

        {/* Expandable AI Adjustment Drawer */}
        {showAdjust && (
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Nhập yêu cầu bằng tiếng Việt hoặc <strong className="text-indigo-700">tải lên file Ma trận, Bản đặc tả / YCCĐ hoặc PPCT</strong> (.docx, .xlsx, .pdf, .txt). Hệ thống sẽ trích xuất đúng 100% nội dung chương bài, số lượng câu hỏi và yêu cầu cần đạt như trong tệp.
            </p>

            <textarea
              rows={2}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Nhập yêu cầu thay đổi ma trận tại đây (hoặc click các nút gợi ý 1-click bên dưới)..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />

            {/* Quick 1-click prompts */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">⚡ Gợi ý nhanh:</span>
              {[
                '✨ Chuẩn hóa 100% từ file tải lên theo CV 7991',
                'Trích xuất đúng 100% nội dung từ tệp ma trận / YCCĐ',
                'Cân đối ma trận & bản đặc tả chuẩn GDPT 2018',
                'Phân bổ lại 4 dạng câu hỏi chuẩn 10.0đ',
                'Bảo toàn 1 chương = 1 dòng duy nhất',
                'Tối ưu tỉ lệ 40% Biết - 30% Hiểu - 30% Vận dụng',
              ].map((pText) => (
                <button
                  key={pText}
                  type="button"
                  onClick={() => {
                    if (pText.includes('file tải lên')) {
                      handleStandardizeMatrixFromFile();
                    } else {
                      setAiPrompt(pText);
                      handleApplyAI(pText);
                    }
                  }}
                  disabled={isAdjusting}
                  className="text-[11px] font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition active:scale-95 cursor-pointer"
                >
                  {pText}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".docx,.pdf,.xlsx,.xls,.csv,.txt"
                onChange={handleFilesUpload}
                className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />

              {(aiFileText || aiFileBase64) && (
                <div className="inline-flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50/80 px-2.5 py-1 rounded-md border border-indigo-100">
                  <span className="font-semibold text-indigo-900">
                    📎 {aiFileName || 'Tệp đã tải lên'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStandardizeMatrixFromFile()}
                    disabled={isAdjusting}
                    className="text-emerald-700 hover:text-emerald-900 font-bold underline text-xs cursor-pointer ml-1"
                  >
                    ✨ Chuẩn hóa ngay
                  </button>
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="text-red-600 hover:text-red-800 hover:underline font-semibold inline-flex items-center gap-0.5 ml-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Xóa tệp
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleApplyAI}
                disabled={isAdjusting}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 shadow-2xs transition active:scale-95 cursor-pointer"
              >
                {isAdjusting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Áp dụng yêu cầu (AI)</span>
                  </>
                )}
              </button>
            </div>

            {aiNotes && (
              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap">
                <b>Ghi chú thay đổi từ AI:</b> {aiNotes}
              </div>
            )}
          </div>
        )}

        {aiStatus && (
          <div className={`text-xs p-2.5 rounded-lg border flex items-center gap-2 ${
            isAdjusting 
              ? 'bg-amber-50 text-amber-900 border-amber-200 animate-pulse font-medium' 
              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
          }`}>
            {isAdjusting && <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-600" />}
            <span>{aiStatus}</span>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
        <table className="w-full border-collapse text-[12.5px] min-w-[1240px]">
          <thead>
            {/* Row 1 */}
            <tr className="bg-indigo-50/80 text-slate-800 font-bold border-b border-slate-300">
              <th rowSpan={4} className="border border-slate-300 p-2 w-10 text-center">TT</th>
              <th rowSpan={4} className="border border-slate-300 p-2 w-48 text-left">Chủ đề/Chương</th>
              <th rowSpan={4} className="border border-slate-300 p-2 w-64 text-left">Nội dung/đơn vị kiến thức</th>
              <th colSpan={12} className="border border-slate-300 p-2 text-center bg-indigo-100/70">
                Mức độ đánh giá
              </th>
              <th colSpan={3} rowSpan={3} className="border border-slate-300 p-2 text-center bg-blue-50">
                Tổng
              </th>
              <th rowSpan={4} className="border border-slate-300 p-2 w-16 text-center">
                Tỉ lệ % điểm
              </th>
              <th rowSpan={4} className="border border-slate-300 p-2 w-10 text-center noprint"></th>
            </tr>

            {/* Row 2 */}
            <tr className="bg-indigo-50/60 text-slate-700 font-semibold border-b border-slate-300">
              <th colSpan={9} className="border border-slate-300 p-1.5 text-center">TNKQ</th>
              <th colSpan={3} rowSpan={2} className="border border-slate-300 p-1.5 text-center bg-amber-50/50">
                Tự luận
              </th>
            </tr>

            {/* Row 3 */}
            <tr className="bg-indigo-50/40 text-slate-700 font-semibold border-b border-slate-300">
              <th colSpan={3} className="border border-slate-300 p-1 text-center">Nhiều lựa chọn</th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center">Đúng – Sai<sup>2</sup></th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center">Trả lời ngắn<sup>3</sup></th>
            </tr>

            {/* Row 4 */}
            <tr className="bg-slate-100/80 text-slate-700 text-[11px] font-semibold border-b border-slate-300">
              {/* TNLC */}
              <th className="border border-slate-300 p-1 w-10 text-center">Biết</th>
              <th className="border border-slate-300 p-1 w-10 text-center">Hiểu</th>
              <th className="border border-slate-300 p-1 w-10 text-center">Vận dụng</th>

              {/* ĐS (Single column per level: câu + ý) */}
              <th className="border border-slate-300 p-1 w-14 text-center">Biết</th>
              <th className="border border-slate-300 p-1 w-14 text-center">Hiểu</th>
              <th className="border border-slate-300 p-1 w-14 text-center">Vận dụng</th>

              {/* TLN */}
              <th className="border border-slate-300 p-1 w-10 text-center">Biết</th>
              <th className="border border-slate-300 p-1 w-10 text-center">Hiểu</th>
              <th className="border border-slate-300 p-1 w-10 text-center">Vận dụng</th>

              {/* TL */}
              <th className="border border-slate-300 p-1 w-10 text-center bg-amber-50/50">Biết</th>
              <th className="border border-slate-300 p-1 w-10 text-center bg-amber-50/50">Hiểu</th>
              <th className="border border-slate-300 p-1 w-10 text-center bg-amber-50/50">Vận dụng</th>

              {/* Tổng */}
              <th className="border border-slate-300 p-1 w-10 text-center bg-blue-50">Biết</th>
              <th className="border border-slate-300 p-1 w-10 text-center bg-blue-50">Hiểu</th>
              <th className="border border-slate-300 p-1 w-10 text-center bg-blue-50">Vận dụng</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={18} className="p-8 text-center text-slate-500 bg-slate-50/50">
                  Chưa có dữ liệu ma trận. Hãy nhấn &quot;Thêm dòng&quot; hoặc &quot;Về mặc định&quot;.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const l3 = calculateRowLevelCounts(r);
                const rowScore = calculateRowScore(r, points);
                const percentage = (rowScore / Tt) * 100;

                return (
                  <tr key={i} className="hover:bg-indigo-50/20 transition">
                    {/* Index */}
                    <td className="border border-slate-300 p-1 text-center font-medium text-slate-500">
                      {i + 1}
                    </td>

                  {/* Chapter/Topic (Word-style merged cells for lessons in same chapter) */}
                  {showCell[i] && (
                    <td rowSpan={spans[i]} className="border border-slate-300 p-1 align-middle bg-slate-50/30">
                      <textarea
                        rows={Math.min(6, Math.max(1, (r.c || '').split('\n').length))}
                        value={r.c}
                        onChange={(e) => handleRowTextChange(i, 'c', e.target.value)}
                        className="w-full bg-transparent px-1.5 py-1 text-xs text-slate-800 font-semibold rounded hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 resize-y whitespace-pre-line leading-relaxed"
                      />
                    </td>
                  )}

                  {/* Subtopics */}
                  <td className="border border-slate-300 p-1">
                    <textarea
                      rows={Math.min(6, Math.max(1, (r.n || '').split('\n').length))}
                      value={r.n}
                      onChange={(e) => handleRowTextChange(i, 'n', e.target.value)}
                      className="w-full bg-transparent px-1.5 py-1 text-xs text-slate-700 rounded hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 resize-y whitespace-pre-line leading-relaxed"
                    />
                  </td>

                  {/* TNLC B, H, V */}
                  {[0, 1, 2].map((col) => (
                    <td key={col} className="border border-slate-300 p-0.5 text-center">
                      <input
                        type="number"
                        min="0"
                        value={r.v[col] || ''}
                        onChange={(e) => handleCellChange(i, col, Number(e.target.value) || 0)}
                        className="w-8 text-center text-xs py-1 rounded bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </td>
                  ))}

                  {/* ĐS Biết (Single cell: câu + (ý)) */}
                  <td className="border border-slate-300 p-0.5 text-center whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      value={getY(r)[0] > 0 ? (r.v[3] || (r.v[4] === 0 && r.v[5] === 0 ? 1 : '')) : ''}
                      onChange={(e) => handleDSCellChange(i, 0, Number(e.target.value) || 0, false)}
                      className="w-5 text-center text-xs py-1 rounded bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium inline-block"
                      title="Số câu lớn"
                    />
                    <span className="text-slate-500 font-normal text-[11px] ml-0.5">(</span>
                    <input
                      type="number"
                      min="0"
                      value={getY(r)[0] || ''}
                      onChange={(e) => handleDSCellChange(i, 0, Number(e.target.value) || 0, true)}
                      className="w-5 text-center text-[11px] p-0 rounded bg-transparent hover:bg-slate-100 focus:bg-white font-medium inline-block"
                      title="Số ý nhỏ"
                    />
                    <span className="text-slate-500 font-normal text-[11px]">)</span>
                  </td>

                  {/* ĐS Hiểu (Single cell: câu + (ý)) */}
                  <td className="border border-slate-300 p-0.5 text-center whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      value={r.v[4] > 0 ? r.v[4] : ''}
                      onChange={(e) => handleDSCellChange(i, 1, Number(e.target.value) || 0, false)}
                      className="w-5 text-center text-xs py-1 rounded bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium inline-block"
                      title="Số câu lớn"
                    />
                    <span className="text-slate-500 font-normal text-[11px] ml-0.5">(</span>
                    <input
                      type="number"
                      min="0"
                      value={getY(r)[1] || ''}
                      onChange={(e) => handleDSCellChange(i, 1, Number(e.target.value) || 0, true)}
                      className="w-5 text-center text-[11px] p-0 rounded bg-transparent hover:bg-slate-100 focus:bg-white font-medium inline-block"
                      title="Số ý nhỏ"
                    />
                    <span className="text-slate-500 font-normal text-[11px]">)</span>
                  </td>

                  {/* ĐS Vận dụng (Single cell: câu + (ý)) */}
                  <td className="border border-slate-300 p-0.5 text-center whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      value={r.v[5] > 0 ? r.v[5] : ''}
                      onChange={(e) => handleDSCellChange(i, 2, Number(e.target.value) || 0, false)}
                      className="w-5 text-center text-xs py-1 rounded bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium inline-block"
                      title="Số câu lớn"
                    />
                    <span className="text-slate-500 font-normal text-[11px] ml-0.5">(</span>
                    <input
                      type="number"
                      min="0"
                      value={getY(r)[2] || ''}
                      onChange={(e) => handleDSCellChange(i, 2, Number(e.target.value) || 0, true)}
                      className="w-5 text-center text-[11px] p-0 rounded bg-transparent hover:bg-slate-100 focus:bg-white font-medium inline-block"
                      title="Số ý nhỏ"
                    />
                    <span className="text-slate-500 font-normal text-[11px]">)</span>
                  </td>

                  {/* TLN B, H, V */}
                  {[6, 7, 8].map((col) => (
                    <td key={col} className="border border-slate-300 p-0.5 text-center">
                      <input
                        type="number"
                        min="0"
                        value={r.v[col] || ''}
                        onChange={(e) => handleCellChange(i, col, Number(e.target.value) || 0)}
                        className="w-8 text-center text-xs py-1 rounded bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </td>
                  ))}

                  {/* TL B, H, V */}
                  {[9, 10, 11].map((col) => (
                    <td key={col} className="border border-slate-300 p-0.5 text-center bg-amber-50/20">
                      <input
                        type="number"
                        min="0"
                        value={r.v[col] || ''}
                        onChange={(e) => handleCellChange(i, col, Number(e.target.value) || 0)}
                        className="w-8 text-center text-xs py-1 rounded bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </td>
                  ))}

                  {/* Tổng B, H, V */}
                  {l3.map((v, lIdx) => (
                    <td key={lIdx} className="border border-slate-300 p-1 text-center font-bold text-slate-700 bg-blue-50/30">
                      {v || ''}
                    </td>
                  ))}

                  {/* % Point */}
                  <td className="border border-slate-300 p-1 text-center font-bold text-indigo-700">
                    {formatNumber(percentage)}
                  </td>

                  {/* Delete button */}
                  <td className="border border-slate-300 p-1 text-center noprint">
                    <button
                      onClick={() => handleDeleteRow(i)}
                      title="Xóa dòng này"
                      className="text-slate-400 hover:text-rose-600 transition p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            }))}
          </tbody>

          {/* Table Footer */}
          <tfoot className="font-bold text-slate-800 bg-indigo-50/80 border-t-2 border-slate-400">
            {/* Total Questions */}
            <tr>
              <th colSpan={3} className="border border-slate-300 p-2 text-left">
                Tổng số câu
              </th>
              {/* TNLC */}
              <th className="border border-slate-300 p-1 text-center">{sums.t[0]}</th>
              <th className="border border-slate-300 p-1 text-center">{sums.t[1]}</th>
              <th className="border border-slate-300 p-1 text-center">{sums.t[2]}</th>

              {/* ĐS (chỉ giữ lại tổng số ý của các mức độ) */}
              <th className="border border-slate-300 p-1 text-center">{sums.t[3]}</th>
              <th className="border border-slate-300 p-1 text-center">{sums.t[4]}</th>
              <th className="border border-slate-300 p-1 text-center">{sums.t[5]}</th>

              {/* TLN */}
              <th className="border border-slate-300 p-1 text-center">{sums.t[6]}</th>
              <th className="border border-slate-300 p-1 text-center">{sums.t[7]}</th>
              <th className="border border-slate-300 p-1 text-center">{sums.t[8]}</th>

              {/* TL */}
              <th className="border border-slate-300 p-1 text-center">{sums.t[9]}</th>
              <th className="border border-slate-300 p-1 text-center">{sums.t[10]}</th>
              <th className="border border-slate-300 p-1 text-center">{sums.t[11]}</th>

              {/* Level totals */}
              <th className="border border-slate-300 p-1 text-center bg-blue-100/60">{sums.tt[0]}</th>
              <th className="border border-slate-300 p-1 text-center bg-blue-100/60">{sums.tt[1]}</th>
              <th className="border border-slate-300 p-1 text-center bg-blue-100/60">{sums.tt[2]}</th>
              <th className="border border-slate-300 p-1"></th>
              <th className="border border-slate-300 p-1 noprint"></th>
            </tr>

            {/* Total Points */}
            <tr>
              <th colSpan={3} className="border border-slate-300 p-2 text-left">
                Tổng số điểm
              </th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center text-indigo-700">
                {formatNumber(sums.f[0])}<sup>5</sup>
              </th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center text-indigo-700">
                {formatNumber(sums.f[1])}
              </th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center text-indigo-700">
                {formatNumber(sums.f[2])}
              </th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center text-indigo-700">
                {formatNumber(sums.f[3])}
              </th>
              {/* By level */}
              <th className="border border-slate-300 p-1 text-center bg-blue-100/60 text-indigo-800">
                {formatNumber(sums.lv[0])}
              </th>
              <th className="border border-slate-300 p-1 text-center bg-blue-100/60 text-indigo-800">
                {formatNumber(sums.lv[1])}
              </th>
              <th className="border border-slate-300 p-1 text-center bg-blue-100/60 text-indigo-800">
                {formatNumber(sums.lv[2])}
              </th>
              <th className="border border-slate-300 p-1 text-center text-indigo-800">
                {formatNumber(sums.T)}đ
              </th>
              <th className="border border-slate-300 p-1 noprint"></th>
            </tr>

            {/* Percentage */}
            <tr>
              <th colSpan={3} className="border border-slate-300 p-2 text-left">
                Tỉ lệ %
              </th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center">
                {formatNumber((sums.f[0] / Tt) * 100)}%
              </th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center">
                {formatNumber((sums.f[1] / Tt) * 100)}%
              </th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center">
                {formatNumber((sums.f[2] / Tt) * 100)}%
              </th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center">
                {formatNumber((sums.f[3] / Tt) * 100)}%
              </th>
              {/* Level % */}
              <th className="border border-slate-300 p-1 text-center bg-blue-100/60">
                {formatNumber((sums.lv[0] / Tt) * 100)}%
              </th>
              <th className="border border-slate-300 p-1 text-center bg-blue-100/60">
                {formatNumber((sums.lv[1] / Tt) * 100)}%
              </th>
              <th className="border border-slate-300 p-1 text-center bg-blue-100/60">
                {formatNumber((sums.lv[2] / Tt) * 100)}%
              </th>
              <th className="border border-slate-300 p-1 text-center">100%</th>
              <th className="border border-slate-300 p-1 noprint"></th>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footnotes */}
      <div className="text-xs text-slate-500 space-y-1 pt-2">
        <p><sup>2</sup> {FOOTNOTES_TEXT[2]}</p>
        <p><sup>3</sup> {FOOTNOTES_TEXT[3]}</p>
        <p><sup>4</sup> {FOOTNOTES_TEXT[4]}</p>
        <p><sup>5</sup> {FOOTNOTES_TEXT[5]}</p>
        <p className="italic text-slate-600">
          Ghi chú: ở dạng “Đúng – Sai”, mỗi ô ghi Số câu lớn (Số ý nhỏ); dòng Tổng số câu của dạng này tính theo số ý nhỏ; cột Tổng và số điểm tính theo số câu lớn (mỗi câu lớn gồm 4 ý).
        </p>
      </div>
    </div>
  );
};
