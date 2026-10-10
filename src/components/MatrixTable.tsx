import React, { useState } from 'react';
import { MatrixRow, QuestionPointConfig } from '../types';
import {
  calculateRowLevelCounts,
  calculateRowScore,
  calculateSums,
  formatNumber,
  getY,
  getZeroVector,
} from '../utils/matrixCalculations';
import { readFileText } from '../utils/fileReader';
import { adjustMatrixWithAI } from '../services/geminiService';
import { FOOTNOTES_TEXT } from '../constants/curriculumData';
import { Plus, Trash2, Sparkles, Undo2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface MatrixTableProps {
  rows: MatrixRow[];
  onChange: (updatedRows: MatrixRow[]) => void;
  points: QuestionPointConfig;
  onPointsChange: (pts: QuestionPointConfig) => void;
  mon: string;
  grade: string;
  semester: string;
  onResetDefault: () => void;
}

export const MatrixTable: React.FC<MatrixTableProps> = ({
  rows,
  onChange,
  points,
  onPointsChange,
  mon,
  grade,
  semester,
  onResetDefault,
}) => {
  const [showAdjust, setShowAdjust] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiFileText, setAiFileText] = useState('');
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
    const newY = [...getY(r)];

    if (isSubItem) {
      newY[levelIdx] = Math.max(0, val);
      r.y = newY;
    } else {
      newV[3 + levelIdx] = Math.max(0, val);
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
    onChange([...rows, newRow]);
  };

  const handleDeleteRow = (index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    try {
      setAiStatus(`Đang đọc ${files.length} tệp...`);
      let combined = '';
      for (let i = 0; i < files.length; i++) {
        const text = await readFileText(files[i]);
        combined += `--- Tệp: ${files[i].name} ---\n${text.slice(0, 20000)}\n\n`;
      }
      setAiFileText(combined);
      setAiStatus(`Đã đọc ${files.length} tệp (${combined.length} ký tự). Bấm Áp dụng yêu cầu.`);
    } catch (err: any) {
      setAiStatus(`Lỗi đọc tệp: ${err.message}`);
    }
  };

  const handleApplyAI = async () => {
    if (!aiPrompt.trim() && !aiFileText.trim()) {
      setAiStatus('Vui lòng nhập yêu cầu hoặc tải tệp lên trước khi áp dụng.');
      return;
    }

    try {
      setIsAdjusting(true);
      setAiStatus('Đang gọi AI Gemini để phân tích và điều chỉnh ma trận...');
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
        aiPrompt,
        aiFileText
      );

      if (res && res.rows && res.rows.length > 0) {
        const updatedRows: MatrixRow[] = res.rows.map((r, i) => {
          const old = rows[i];
          const v = r.v.map((n) => Math.max(0, Math.round(n || 0)));
          const y = [0, 0, 0];
          if (Array.isArray(r.ds)) {
            v[3] = v[4] = v[5] = 0;
            r.ds.forEach((q) => {
              if (Array.isArray(q)) {
                [0, 1, 2].forEach((l) => {
                  const num = Math.max(0, Math.round(q[l] || 0));
                  if (num > 0) {
                    v[3 + l] += 1;
                    y[l] += num;
                  }
                });
              }
            });
          } else {
            [0, 1, 2].forEach((l) => {
              y[l] = v[3 + l] * 4;
            });
          }
          return {
            c: r.c,
            n: r.n || (old ? old.n : ''),
            v,
            y,
            s: r.s || (old ? old.s : undefined),
          };
        });

        onChange(updatedRows);
        if (res.pts) {
          onPointsChange({ ...points, ...res.pts });
        }
        setAiStatus('Đã điều chỉnh ma trận và cập nhật bản đặc tả thành công!');
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
              placeholder="Nhập yêu cầu thay đổi ma trận tại đây..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                multiple
                accept=".docx,.xlsx,.xls,.csv,.txt"
                onChange={handleFilesUpload}
                className="text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />

              <button
                type="button"
                onClick={handleApplyAI}
                disabled={isAdjusting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isAdjusting ? 'Đang điều chỉnh...' : 'Áp dụng yêu cầu (AI)'}
              </button>

              <button
                type="button"
                onClick={handleUndo}
                disabled={!previousHistory}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 disabled:opacity-40 transition"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Hoàn tác
              </button>

              <button
                type="button"
                onClick={onResetDefault}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Về mặc định
              </button>
            </div>

            {aiStatus && (
              <div className="text-xs text-indigo-700 bg-indigo-50 p-2.5 rounded-lg border border-indigo-100">
                {aiStatus}
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
              <th colSpan={15} className="border border-slate-300 p-2 text-center bg-indigo-100/70">
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
              <th colSpan={12} className="border border-slate-300 p-1.5 text-center">TNKQ</th>
              <th colSpan={3} rowSpan={2} className="border border-slate-300 p-1.5 text-center bg-amber-50/50">
                Tự luận
              </th>
            </tr>

            {/* Row 3 */}
            <tr className="bg-indigo-50/40 text-slate-700 font-semibold border-b border-slate-300">
              <th colSpan={3} className="border border-slate-300 p-1 text-center">Nhiều lựa chọn</th>
              <th colSpan={6} className="border border-slate-300 p-1 text-center">Đúng – Sai<sup>2</sup></th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center">Trả lời ngắn<sup>3</sup></th>
            </tr>

            {/* Row 4 */}
            <tr className="bg-slate-100/80 text-slate-700 text-[11px] font-semibold border-b border-slate-300">
              {/* TNLC */}
              <th className="border border-slate-300 p-1 w-10 text-center">Biết</th>
              <th className="border border-slate-300 p-1 w-10 text-center">Hiểu</th>
              <th className="border border-slate-300 p-1 w-10 text-center">Vận dụng</th>

              {/* ĐS (with sub-items) */}
              <th colSpan={2} className="border border-slate-300 p-1 text-center">Biết</th>
              <th colSpan={2} className="border border-slate-300 p-1 text-center">Hiểu</th>
              <th colSpan={2} className="border border-slate-300 p-1 text-center">Vận dụng</th>

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
                    <input
                      type="text"
                      value={r.c}
                      onChange={(e) => handleRowTextChange(i, 'c', e.target.value)}
                      className="w-full bg-transparent px-1.5 py-1 text-xs text-slate-800 font-medium rounded hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>

                  {/* Subtopics */}
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={r.n}
                      onChange={(e) => handleRowTextChange(i, 'n', e.target.value)}
                      className="w-full bg-transparent px-1.5 py-1 text-xs text-slate-700 rounded hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500"
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

                  {/* ĐS Biết (Câu + Ý) */}
                  <td className="border-y border-l border-slate-300 p-0.5 text-center">
                    <input
                      type="number"
                      min="0"
                      value={r.v[3] || ''}
                      onChange={(e) => handleDSCellChange(i, 0, Number(e.target.value) || 0, false)}
                      className="w-7 text-center text-xs py-1 rounded bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </td>
                  <td className="border-y border-r border-slate-300 p-0.5 text-center text-[11px] text-slate-500 whitespace-nowrap">
                    (
                    <input
                      type="number"
                      min="0"
                      value={getY(r)[0] || ''}
                      onChange={(e) => handleDSCellChange(i, 0, Number(e.target.value) || 0, true)}
                      className="w-5 text-center text-[11px] p-0 rounded bg-transparent hover:bg-slate-100 focus:bg-white"
                    />
                    )
                  </td>

                  {/* ĐS Hiểu (Câu + Ý) */}
                  <td className="border-y border-l border-slate-300 p-0.5 text-center">
                    <input
                      type="number"
                      min="0"
                      value={r.v[4] || ''}
                      onChange={(e) => handleDSCellChange(i, 1, Number(e.target.value) || 0, false)}
                      className="w-7 text-center text-xs py-1 rounded bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </td>
                  <td className="border-y border-r border-slate-300 p-0.5 text-center text-[11px] text-slate-500 whitespace-nowrap">
                    (
                    <input
                      type="number"
                      min="0"
                      value={getY(r)[1] || ''}
                      onChange={(e) => handleDSCellChange(i, 1, Number(e.target.value) || 0, true)}
                      className="w-5 text-center text-[11px] p-0 rounded bg-transparent hover:bg-slate-100 focus:bg-white"
                    />
                    )
                  </td>

                  {/* ĐS Vận dụng (Câu + Ý) */}
                  <td className="border-y border-l border-slate-300 p-0.5 text-center">
                    <input
                      type="number"
                      min="0"
                      value={r.v[5] || ''}
                      onChange={(e) => handleDSCellChange(i, 2, Number(e.target.value) || 0, false)}
                      className="w-7 text-center text-xs py-1 rounded bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </td>
                  <td className="border-y border-r border-slate-300 p-0.5 text-center text-[11px] text-slate-500 whitespace-nowrap">
                    (
                    <input
                      type="number"
                      min="0"
                      value={getY(r)[2] || ''}
                      onChange={(e) => handleDSCellChange(i, 2, Number(e.target.value) || 0, true)}
                      className="w-5 text-center text-[11px] p-0 rounded bg-transparent hover:bg-slate-100 focus:bg-white"
                    />
                    )
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

              {/* ĐS (items count) */}
              <th colSpan={2} className="border border-slate-300 p-1 text-center">{sums.t[3]}</th>
              <th colSpan={2} className="border border-slate-300 p-1 text-center">{sums.t[4]}</th>
              <th colSpan={2} className="border border-slate-300 p-1 text-center">{sums.t[5]}</th>

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
              <th colSpan={6} className="border border-slate-300 p-1 text-center text-indigo-700">
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
              <th colSpan={6} className="border border-slate-300 p-1 text-center">
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
