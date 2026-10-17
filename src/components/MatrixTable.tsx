import React, { useState } from 'react';
import { MatrixRow, QuestionPointConfig, StructureMode, SubjectName } from '../types';
import {
  calculateRowLevelCounts,
  calculateRowScore,
  calculateSums,
  formatNumber,
  getY,
  getZeroVector,
  consolidateRowsByChapter,
  distributeQuestions,
} from '../utils/matrixCalculations';
import { readFileText, fileToBase64 } from '../utils/fileReader';
import { adjustMatrixWithAI } from '../services/geminiService';
import { FOOTNOTES_TEXT } from '../constants/curriculumData';
import { Plus, Trash2, Sparkles, Undo2, RotateCcw, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface MatrixTableProps {
  rows: MatrixRow[];
  onChange: (updatedRows: MatrixRow[]) => void;
  points: QuestionPointConfig;
  onPointsChange: (pts: QuestionPointConfig) => void;
  mon: string;
  grade: string;
  semester: string;
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
}) => {
  const [showAdjust, setShowAdjust] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiFileText, setAiFileText] = useState('');
  const [aiFileBase64, setAiFileBase64] = useState('');
  const [aiFileMimeType, setAiFileMimeType] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [previousHistory, setPreviousHistory] = useState<{
    rows: MatrixRow[];
    points: QuestionPointConfig;
  } | null>(null);

  const sums = calculateSums(rows, points);
  const Tt = sums.T || 10;

  const handleRowTextChange = (index: number, key: 'c' | 'n', val: string) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [key]: val };
    onChange(updated);
  };

  const handleCellChange = (rowIndex: number, colIndex: number, val: number) => {
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
    const promptToUse = promptStr || `Đối chiếu, chuẩn hóa và cân đối lại ma trận và bản đặc tả môn ${mon} lớp ${grade} (${semester}) chuẩn GDPT 2018`;
    
    // Use attached file or fallback to uploaded PPCT/YCCD data from SettingsPanel
    const combinedPpctYccdText = ppctData ? `${ppctData.text || ''}\n${ppctData.yccdText || ''}`.trim() : '';
    const fTxt = fileTxt !== undefined ? fileTxt : (aiFileText || combinedPpctYccdText);
    const fB64 = fileB64 !== undefined ? fileB64 : (aiFileBase64 || (ppctData ? (ppctData.base64 || ppctData.yccdBase64) : ''));
    const fMime = fileMime !== undefined ? fileMime : (aiFileMimeType || (ppctData ? (ppctData.mimeType || ppctData.yccdMimeType) : ''));

    try {
      setIsAdjusting(true);
      setAiStatus('Đang tự động gọi AI Gemini phân tích tệp và điều chỉnh ma trận...');
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
        fMime
      );

      if (res && res.rows && res.rows.length > 0) {
        const updatedRows: MatrixRow[] = res.rows.map((r, i) => {
          const old = rows.find((row) => row.c.trim().toLowerCase() === r.c.trim().toLowerCase()) || rows[i];
          const v = r.v ? r.v.map((n) => Math.max(0, Math.round(n || 0))) : (old ? old.v : getZeroVector());
          let numDS = v[3] + v[4] + v[5];
          if (Array.isArray(r.ds)) {
            numDS = Math.max(numDS, r.ds.length);
          }
          const y = [0, 0, 0];
          if (numDS > 0) {
            v[3] = numDS;
            v[4] = 0;
            v[5] = 0;
            y[0] = numDS * 2;
            y[1] = numDS * 1;
            y[2] = numDS * 1;
          }

          // Preserve uploaded or existing YCCD criteria (s) if AI returned empty or partial YCCD
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

        const finalRows = consolidateRowsByChapter(updatedRows);
        const redistributed = distributeQuestions(
          finalRows,
          mon as SubjectName,
          structureMode,
          noTLN,
          points,
          targetFormatPoints,
          targetLevelPoints
        );
        onChange(redistributed);
        if (res.pts) {
          onPointsChange({ ...points, ...res.pts });
        }
        setAiStatus('Đã tự động điều chỉnh ma trận và cập nhật bản đặc tả thành công từ tệp!');
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
    setAiStatus('Đã xóa tệp đính kèm.');
  };

  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    try {
      setAiStatus(`Đang đọc ${files.length} tệp...`);
      let combined = '';
      let b64 = '';
      let mime = 'application/pdf';
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await readFileText(file);
        const fileB64 = await fileToBase64(file);
        combined += `=== TỆP ${i + 1} (${file.name}) ===\n${text.slice(0, 25000)}\n\n`;
        if (i === 0) {
          b64 = fileB64;
          mime = file.type || 'application/pdf';
        }
      }
      setAiFileText(combined);
      setAiFileBase64(b64);
      setAiFileMimeType(mime);
      setAiStatus(`Đã đính kèm ${files.length} tệp thành công. Bấm "Áp dụng yêu cầu (AI)" bên dưới để điều chỉnh ma trận.`);
    } catch (err: any) {
      setAiStatus(`Lỗi đọc tệp: ${err.message}`);
    }
  };

  const handleApplyAI = async (customPrompt?: string | React.MouseEvent) => {
    const promptStr = typeof customPrompt === 'string' ? customPrompt : undefined;
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
    <div className="space-y-4">
      {/* AI Matrix Adjustment Box */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm noprint">
        <button
          type="button"
          onClick={() => setShowAdjust(!showAdjust)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left font-semibold text-sm text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 transition"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Điều chỉnh ma trận theo yêu cầu qua AI (gõ câu lệnh hoặc tải tệp)
          </span>
          {showAdjust ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdjust && (
          <div className="p-5 border-t border-slate-200 space-y-3.5">
            <p className="text-xs text-slate-500 leading-relaxed">
              Nhập yêu cầu bằng tiếng Việt (ví dụ: “Bỏ chủ đề 3, tăng câu Vận dụng nhiều lựa chọn lên 4 câu, trả lời ngắn 3 câu”) hoặc tải tệp đề cương, tệp ma trận cũ. AI sẽ tự động tính toán lại phân bố câu hỏi, cập nhật số điểm và đồng bộ sang bản đặc tả.
            </p>

            <textarea
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Nhập yêu cầu thay đổi ma trận tại đây (hoặc click các nút gợi ý 1-click bên dưới)..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />

            {/* Quick 1-click prompts */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">⚡ Gợi ý 1 click:</span>
              {[
                'Cân đối ma trận & bản đặc tả chuẩn GDPT 2018',
                'Phân bổ lại 4 dạng câu hỏi chuẩn 10.0đ',
                'Bảo toàn 1 chương = 1 dòng duy nhất',
                'Tối ưu tỉ lệ 40% Biết - 30% Hiểu - 30% Vận dụng',
              ].map((pText) => (
                <button
                  key={pText}
                  type="button"
                  onClick={() => {
                    setAiPrompt(pText);
                    handleApplyAI(pText);
                  }}
                  disabled={isAdjusting}
                  className="text-[11px] font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition active:scale-95"
                >
                  {pText}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                multiple
                accept=".docx,.pdf,.xlsx,.xls,.csv,.txt"
                onChange={handleFilesUpload}
                className="text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />

              {(aiFileText || aiFileBase64) && (
                <div className="inline-flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50/80 px-2.5 py-1 rounded-md border border-indigo-100">
                  <span className="font-medium">✓ Đã đính kèm tệp</span>
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="text-red-600 hover:text-red-800 hover:underline font-semibold inline-flex items-center gap-0.5"
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 shadow-sm transition active:scale-95 cursor-pointer"
              >
                {isAdjusting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Đang AI điều chỉnh...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Áp dụng yêu cầu (AI)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleUndo}
                disabled={!previousHistory || isAdjusting}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 disabled:opacity-40 transition"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Hoàn tác
              </button>

              <button
                type="button"
                onClick={onResetDefault}
                disabled={isAdjusting}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Về mặc định
              </button>
            </div>

            {aiStatus && (
              <div className={`text-xs p-3 rounded-xl border flex items-center gap-2 ${
                isAdjusting 
                  ? 'bg-amber-50 text-amber-900 border-amber-200 animate-pulse font-medium' 
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              }`}>
                {isAdjusting && <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-600" />}
                <span>{aiStatus}</span>
              </div>
            )}
            {aiNotes && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                <b>Ghi chú thay đổi từ AI:</b> {aiNotes}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row additions bar */}
      <div className="flex items-center justify-between noprint">
        <div className="text-xs text-slate-500 italic">
          ↔ Kéo hoặc vuốt ngang để xem toàn bộ bảng ma trận
        </div>
        <button
          onClick={handleAddRow}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Thêm dòng
        </button>
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
            {rows.map((r, i) => {
              const l3 = calculateRowLevelCounts(r);
              const rowScore = calculateRowScore(r, points);
              const percentage = (rowScore / Tt) * 100;

              return (
                <tr key={i} className="hover:bg-indigo-50/20 transition">
                  {/* Index */}
                  <td className="border border-slate-300 p-1 text-center font-medium text-slate-500">
                    {i + 1}
                  </td>

                  {/* Chapter/Topic */}
                  <td className="border border-slate-300 p-1">
                    <textarea
                      rows={Math.min(4, Math.max(1, (r.c || '').split('\n').length))}
                      value={r.c}
                      onChange={(e) => handleRowTextChange(i, 'c', e.target.value)}
                      className="w-full bg-transparent px-1.5 py-1 text-xs text-slate-800 font-semibold rounded hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 resize-y whitespace-pre-line leading-relaxed"
                    />
                  </td>

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
                      value={getY(r)[0] > 0 ? (r.v[3] || 1) : ''}
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
                      value={getY(r)[1] > 0 ? (r.v[4] || 1) : ''}
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
                      value={getY(r)[2] > 0 ? (r.v[5] || 1) : ''}
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
            })}
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
