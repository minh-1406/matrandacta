import React, { useEffect, useState } from 'react';
import { ExamSemester, MatrixRow, QuestionPointConfig, StructureMode, SubjectName } from '../types';
import {
  dsNote,
  getY,
  calculateSums,
  formatNumber,
  ensureValidYccd,
  isPlaceholderOrInvalidYccd,
  standardizeMatrixAndSpecToCv7991,
  getChapterSpans,
  stripCognitiveLevelPrefixes,
} from '../utils/matrixCalculations';
import { FOOTNOTES_TEXT, NOCALC } from '../constants/curriculumData';
import { Sparkles, CheckCircle2, Wand2, Trash2, Save } from 'lucide-react';

interface SpecTableProps {
  rows: MatrixRow[];
  onChange: (updatedRows: MatrixRow[]) => void;
  points: QuestionPointConfig;
  mon?: SubjectName;
  grade?: string;
  semester?: ExamSemester;
  structureMode?: StructureMode;
  noTLN?: boolean;
  ppctData?: { text?: string; yccdText?: string };
  onSaveMatrixAndSpec?: () => void;
}

export const SpecTable: React.FC<SpecTableProps> = ({
  rows,
  onChange,
  points,
  mon = 'Toán',
  grade = '10',
  semester = 'Giữa kì I',
  structureMode = 'k',
  noTLN = false,
  ppctData,
  onSaveMatrixAndSpec,
}) => {
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const sums = calculateSums(rows, points);
  const Tt = sums.T || 10;
  const { spans, showCell } = getChapterSpans(rows);

  // Auto-check on mount or rows change: if any row has missing/placeholder YCCD for levels with questions, auto fill
  useEffect(() => {
    const hasIncomplete = rows.some((r) => {
      const sp = r.s || ['', '', ''];
      const q0 = (r.v[0] || 0) + (r.v[3] || 0) + (r.v[6] || 0) + (r.v[9] || 0);
      const q1 = (r.v[1] || 0) + (r.v[4] || 0) + (r.v[7] || 0) + (r.v[10] || 0);
      const q2 = (r.v[2] || 0) + (r.v[5] || 0) + (r.v[8] || 0) + (r.v[11] || 0);

      return (
        (q0 > 0 && isPlaceholderOrInvalidYccd(sp[0])) ||
        (q1 > 0 && isPlaceholderOrInvalidYccd(sp[1])) ||
        (q2 > 0 && isPlaceholderOrInvalidYccd(sp[2]))
      );
    });

    if (hasIncomplete) {
      const cleanRows = ensureValidYccd(rows, mon, grade, ppctData);
      onChange(cleanRows);
    }
  }, [rows, mon, grade, ppctData]);

  const handleAutoReconcileYccd = () => {
    const cleanRows = ensureValidYccd(rows, mon, grade, ppctData, true);
    onChange(cleanRows);
    setFeedbackMsg('Đã tự động đối chiếu ma trận và hoàn thiện 100% nội dung YCCĐ cho bản đặc tả!');
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleStandardizeSpecTable = () => {
    const isNoCalcDefault = NOCALC.includes(mon as any);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
    const standardized = standardizeMatrixAndSpecToCv7991(
      rows,
      mon,
      grade,
      semester,
      structureMode,
      shouldNoTLN,
      points,
      undefined,
      undefined,
      ppctData
    );
    onChange(standardized);
    setFeedbackMsg('Đã chuẩn hóa 100% Ma trận & Bản đặc tả về đúng chuẩn CV 7991!');
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleSpecChange = (rowIndex: number, levelIdx: number, val: string) => {
    const updated = [...rows];
    const r = { ...updated[rowIndex] };
    const currentS = r.s ? [...r.s] : ['', '', ''];
    currentS[levelIdx] = stripCognitiveLevelPrefixes(val);
    r.s = [currentS[0], currentS[1], currentS[2]];
    updated[rowIndex] = r;
    onChange(updated);
  };
  return (
    <div className="space-y-3">
      {/* Compact Auto Match & Fill Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs noprint">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-800 block sm:inline mr-2">
              Bản đặc tả yêu cầu cần đạt (YCCĐ)
            </span>
            <span className="text-[11px] text-slate-500 hidden md:inline">
              Tự động ánh xạ YCCĐ theo từng bài học trong ma trận ({mon} {grade})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {onSaveMatrixAndSpec && (
            <button
              type="button"
              onClick={onSaveMatrixAndSpec}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-indigo-300" />
              <span>Lưu Ma trận & Đặc tả</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleStandardizeSpecTable}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-emerald-200" />
            <span>Chuẩn hóa CV 7991</span>
          </button>

          <button
            type="button"
            onClick={handleAutoReconcileYccd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Hoàn thiện 100% YCCĐ</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {feedbackMsg}
        </div>
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
        <table className="w-full border-collapse text-[12.5px] min-w-[1240px]">
          <thead>
            {/* Row 1 */}
            <tr className="bg-indigo-50/80 text-slate-800 font-bold border-b border-slate-300">
              <th rowSpan={4} className="border border-slate-300 p-2 w-10 text-center">TT</th>
              <th rowSpan={4} className="border border-slate-300 p-2 w-44 text-left">Chủ đề/Chương</th>
              <th rowSpan={4} className="border border-slate-300 p-2 w-56 text-left">Nội dung/đơn vị kiến thức</th>
              <th rowSpan={4} className="border border-slate-300 p-2 min-w-[380px] text-left">
                Yêu cầu cần đạt
              </th>
              <th colSpan={12} className="border border-slate-300 p-2 text-center bg-indigo-100/70">
                Số câu hỏi ở các mức độ đánh giá
              </th>
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
              <th colSpan={3} className="border border-slate-300 p-1 text-center">Đúng – Sai</th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center">Trả lời ngắn</th>
            </tr>

            {/* Row 4 */}
            <tr className="bg-slate-100/80 text-slate-700 text-[11px] font-semibold border-b border-slate-300">
              {/* TNLC */}
              <th className="border border-slate-300 p-1 w-10 text-center">Biết</th>
              <th className="border border-slate-300 p-1 w-10 text-center">Hiểu</th>
              <th className="border border-slate-300 p-1 w-10 text-center">Vận dụng</th>

              {/* ĐS (Single column per level) */}
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
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {rows.map((r, i) => {
              const sp = r.s || ['', '', ''];
              const note = dsNote(r);

              return (
                <tr key={i} className="hover:bg-indigo-50/20 transition align-top">
                  {/* TT */}
                  <td className="border border-slate-300 p-2 text-center font-medium text-slate-500">
                    {i + 1}
                  </td>

                  {/* Chapter (Word-style merged cell across lessons) */}
                  {showCell[i] && (
                    <td rowSpan={spans[i]} className="border border-slate-300 p-2 font-semibold text-slate-800 whitespace-pre-line leading-relaxed align-middle bg-slate-50/30">
                      {r.c}
                    </td>
                  )}

                  {/* Subtopics */}
                  <td className="border border-slate-300 p-2 text-slate-700 whitespace-pre-line leading-relaxed">
                    {r.n}
                  </td>

                  {/* Expected Learning Outcomes (YCCĐ) */}
                  <td className="border border-slate-300 p-2 space-y-2">
                    {(() => {
                      const yArr = getY(r);
                      const q0 = (r.v[0] || 0) + (r.v[3] || 0) + (r.v[6] || 0) + (r.v[9] || 0) + (yArr[0] || 0);
                      const q1 = (r.v[1] || 0) + (r.v[4] || 0) + (r.v[7] || 0) + (r.v[10] || 0) + (yArr[1] || 0);
                      const q2 = (r.v[2] || 0) + (r.v[5] || 0) + (r.v[8] || 0) + (r.v[11] || 0) + (yArr[2] || 0);

                      return (
                        <>
                          {/* Level 0: Biết */}
                          {q0 > 0 || (sp[0] && sp[0].trim().length > 0) ? (
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[11px] font-bold text-slate-700">
                                  - Nhận biết:
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${q0 > 0 ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-500 bg-slate-100'}`}>
                                    {q0 > 0 ? `${q0} câu/ý` : '0 câu'}
                                  </span>
                                  {sp[0] && (
                                    <button
                                      type="button"
                                      onClick={() => handleSpecChange(i, 0, '')}
                                      title="Xóa nội dung YCCĐ Nhận biết"
                                      className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-1.5 py-0.5 rounded transition flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Xóa
                                    </button>
                                  )}
                                </div>
                              </div>
                              <textarea
                                rows={2}
                                value={sp[0]}
                                onChange={(e) => handleSpecChange(i, 0, e.target.value)}
                                className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500"
                                placeholder="Nhập YCCĐ Nhận biết..."
                              />
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic bg-slate-50/60 p-1.5 rounded border border-dashed border-slate-200 flex justify-between items-center">
                              <span>- Nhận biết: <span className="font-normal">(0 câu)</span></span>
                              <button
                                type="button"
                                onClick={() => handleSpecChange(i, 0, `Nhận biết các kiến thức cơ bản trong ${r.n || r.c}`)}
                                className="text-[10px] font-semibold text-indigo-600 hover:underline not-italic ml-2"
                              >
                                + Thêm YCCĐ
                              </button>
                            </div>
                          )}

                          {/* Level 1: Hiểu */}
                          {q1 > 0 || (sp[1] && sp[1].trim().length > 0) ? (
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[11px] font-bold text-slate-700">
                                  - Thông hiểu:
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${q1 > 0 ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-500 bg-slate-100'}`}>
                                    {q1 > 0 ? `${q1} câu/ý` : '0 câu'}
                                  </span>
                                  {sp[1] && (
                                    <button
                                      type="button"
                                      onClick={() => handleSpecChange(i, 1, '')}
                                      title="Xóa nội dung YCCĐ Thông hiểu"
                                      className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-1.5 py-0.5 rounded transition flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Xóa
                                    </button>
                                  )}
                                </div>
                              </div>
                              <textarea
                                rows={2}
                                value={sp[1]}
                                onChange={(e) => handleSpecChange(i, 1, e.target.value)}
                                className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500"
                                placeholder="Nhập YCCĐ Thông hiểu..."
                              />
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic bg-slate-50/60 p-1.5 rounded border border-dashed border-slate-200 flex justify-between items-center">
                              <span>- Thông hiểu: <span className="font-normal">(0 câu)</span></span>
                              <button
                                type="button"
                                onClick={() => handleSpecChange(i, 1, `Hiểu và giải thích nội dung ${r.n || r.c}`)}
                                className="text-[10px] font-semibold text-indigo-600 hover:underline not-italic ml-2"
                              >
                                + Thêm YCCĐ
                              </button>
                            </div>
                          )}

                          {/* Level 2: Vận dụng */}
                          {q2 > 0 || (sp[2] && sp[2].trim().length > 0) ? (
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[11px] font-bold text-slate-700">
                                  - Vận dụng:
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${q2 > 0 ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-500 bg-slate-100'}`}>
                                    {q2 > 0 ? `${q2} câu/ý` : '0 câu'}
                                  </span>
                                  {sp[2] && (
                                    <button
                                      type="button"
                                      onClick={() => handleSpecChange(i, 2, '')}
                                      title="Xóa nội dung YCCĐ Vận dụng"
                                      className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-1.5 py-0.5 rounded transition flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Xóa
                                    </button>
                                  )}
                                </div>
                              </div>
                              <textarea
                                rows={2}
                                value={sp[2]}
                                onChange={(e) => handleSpecChange(i, 2, e.target.value)}
                                className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500"
                                placeholder="Nhập YCCĐ Vận dụng..."
                              />
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic bg-slate-50/60 p-1.5 rounded border border-dashed border-slate-200 flex justify-between items-center">
                              <span>- Vận dụng: <span className="font-normal">(0 câu)</span></span>
                              <button
                                type="button"
                                onClick={() => handleSpecChange(i, 2, `Vận dụng kiến thức ${r.n || r.c} giải quyết vấn đề thực tiễn`)}
                                className="text-[10px] font-semibold text-indigo-600 hover:underline not-italic ml-2"
                              >
                                + Thêm YCCĐ
                              </button>
                            </div>
                          )}

                          {note && (
                            <div className="text-[11.5px] text-indigo-700 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100 font-medium italic">
                              {note}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </td>

                  {/* Question counts for all columns matching matrix */}
                  {/* TNLC */}
                  {[0, 1, 2].map((col) => (
                    <td key={col} className="border border-slate-300 p-2 text-center font-medium">
                      {r.v[col] || ''}
                    </td>
                  ))}

                  {/* ĐS Biết (câu + (ý)) */}
                  <td className="border border-slate-300 p-2 text-center font-medium whitespace-nowrap">
                    {getY(r)[0] > 0 ? `${r.v[3] > 0 ? r.v[3] + ' ' : (r.v[4] === 0 && r.v[5] === 0 ? '1 ' : '')}(${getY(r)[0]})` : ''}
                  </td>

                  {/* ĐS Hiểu (câu + (ý)) */}
                  <td className="border border-slate-300 p-2 text-center font-medium whitespace-nowrap">
                    {getY(r)[1] > 0 ? `${r.v[4] > 0 ? r.v[4] + ' ' : ''}(${getY(r)[1]})` : ''}
                  </td>

                  {/* ĐS Vận dụng (câu + (ý)) */}
                  <td className="border border-slate-300 p-2 text-center font-medium whitespace-nowrap">
                    {getY(r)[2] > 0 ? `${r.v[5] > 0 ? r.v[5] + ' ' : ''}(${getY(r)[2]})` : ''}
                  </td>

                  {/* TLN */}
                  {[6, 7, 8].map((col) => (
                    <td key={col} className="border border-slate-300 p-2 text-center font-medium">
                      {r.v[col] || ''}
                    </td>
                  ))}

                  {/* TL */}
                  {[9, 10, 11].map((col) => (
                    <td key={col} className="border border-slate-300 p-2 text-center font-medium bg-amber-50/20">
                      {r.v[col] || ''}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>

          {/* Table Footer */}
          <tfoot className="font-bold text-slate-800 bg-indigo-50/80 border-t-2 border-slate-400">
            {/* Total Questions */}
            <tr>
              <th colSpan={4} className="border border-slate-300 p-2 text-left">
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
            </tr>

            {/* Total Points */}
            <tr>
              <th colSpan={4} className="border border-slate-300 p-2 text-left">
                Tổng số điểm
              </th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center text-indigo-700">
                {formatNumber(sums.f[0])}
              </th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center text-indigo-700">
                {formatNumber(sums.f[1])}
              </th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center text-indigo-700">
                {formatNumber(sums.f[2])}
              </th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center text-indigo-700">
                {formatNumber(sums.f[3])} ({formatNumber(sums.T)}đ)
              </th>
            </tr>

            {/* Percentage */}
            <tr>
              <th colSpan={4} className="border border-slate-300 p-2 text-left">
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
                {formatNumber((sums.f[3] / Tt) * 100)}% (100%)
              </th>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="text-xs text-slate-500 space-y-1 pt-2">
        <p><sup>6</sup> {FOOTNOTES_TEXT[6]}</p>
        <p className="italic text-slate-600">
          Ghi chú: ở dạng “Đúng – Sai”, mỗi ô ghi Số câu lớn (Số ý nhỏ); dòng Tổng số câu của dạng này tính theo số ý nhỏ; cột Tổng và số điểm tính theo số câu lớn (mỗi câu lớn gồm 4 ý).
        </p>
      </div>
    </div>
  );
};
