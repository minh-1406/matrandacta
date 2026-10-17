import React, { useEffect, useState } from 'react';
import { MatrixRow, QuestionPointConfig, SubjectName } from '../types';
import {
  dsNote,
  getY,
  calculateSums,
  formatNumber,
  ensureValidYccd,
  isPlaceholderOrInvalidYccd,
} from '../utils/matrixCalculations';
import { FOOTNOTES_TEXT } from '../constants/curriculumData';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface SpecTableProps {
  rows: MatrixRow[];
  onChange: (updatedRows: MatrixRow[]) => void;
  points: QuestionPointConfig;
  mon?: SubjectName;
  grade?: string;
  ppctData?: { text?: string; yccdText?: string };
}

export const SpecTable: React.FC<SpecTableProps> = ({
  rows,
  onChange,
  points,
  mon = 'Toán',
  grade = '10',
  ppctData,
}) => {
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const sums = calculateSums(rows, points);
  const Tt = sums.T || 10;

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

  const handleSpecChange = (rowIndex: number, levelIdx: number, val: string) => {
    const updated = [...rows];
    const r = { ...updated[rowIndex] };
    const currentS = r.s ? [...r.s] : ['', '', ''];
    currentS[levelIdx] = val;
    r.s = [currentS[0], currentS[1], currentS[2]];
    updated[rowIndex] = r;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Auto Match & Fill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm noprint">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-sm font-bold text-indigo-900">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Tự động đối chiếu Ma trận & YCCĐ
          </div>
          <p className="text-xs text-slate-600">
            Hệ thống tự động đối chiếu tên bài học trong ma trận với tệp PPCT/YCCĐ đã tải lên và danh mục chuẩn GDPT 2018 môn {mon} lớp {grade} để hoàn thiện đầy đủ nội dung YCCĐ.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAutoReconcileYccd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow transition active:scale-95 whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          Tự động đối chiếu & Hoàn thiện YCCĐ
        </button>
      </div>

      {feedbackMsg && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {feedbackMsg}
        </div>
      )}

      <div className="text-xs text-slate-500 italic noprint">
        ↔ Kéo hoặc vuốt ngang để xem toàn bộ bảng bản đặc tả. Bạn có thể chỉnh sửa trực tiếp nội dung Yêu cầu cần đạt bên dưới.
      </div>

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

                  {/* Chapter */}
                  <td className="border border-slate-300 p-2 font-semibold text-slate-800 whitespace-pre-line leading-relaxed">
                    {r.c}
                  </td>

                  {/* Subtopics */}
                  <td className="border border-slate-300 p-2 text-slate-700 whitespace-pre-line leading-relaxed">
                    {r.n}
                  </td>

                  {/* Expected Learning Outcomes (YCCĐ) */}
                  <td className="border border-slate-300 p-2 space-y-2">
                    {(() => {
                      const q0 = (r.v[0] || 0) + (r.v[3] || 0) + (r.v[6] || 0) + (r.v[9] || 0);
                      const q1 = (r.v[1] || 0) + (r.v[4] || 0) + (r.v[7] || 0) + (r.v[10] || 0);
                      const q2 = (r.v[2] || 0) + (r.v[5] || 0) + (r.v[8] || 0) + (r.v[11] || 0);

                      return (
                        <>
                          {/* Level 0: Biết */}
                          {q0 > 0 ? (
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[11px] font-bold text-slate-700">
                                  - Biết:
                                </label>
                                <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  {q0} câu
                                </span>
                              </div>
                              <textarea
                                rows={2}
                                value={sp[0]}
                                onChange={(e) => handleSpecChange(i, 0, e.target.value)}
                                className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic bg-slate-50/60 p-1.5 rounded border border-dashed border-slate-200">
                              - Biết: <span className="font-normal">(0 câu - Không cần YCCĐ)</span>
                            </div>
                          )}

                          {/* Level 1: Hiểu */}
                          {q1 > 0 ? (
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[11px] font-bold text-slate-700">
                                  - Hiểu:
                                </label>
                                <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  {q1} câu
                                </span>
                              </div>
                              <textarea
                                rows={2}
                                value={sp[1]}
                                onChange={(e) => handleSpecChange(i, 1, e.target.value)}
                                className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic bg-slate-50/60 p-1.5 rounded border border-dashed border-slate-200">
                              - Hiểu: <span className="font-normal">(0 câu - Không cần YCCĐ)</span>
                            </div>
                          )}

                          {/* Level 2: Vận dụng */}
                          {q2 > 0 ? (
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[11px] font-bold text-slate-700">
                                  - Vận dụng:
                                </label>
                                <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  {q2} câu
                                </span>
                              </div>
                              <textarea
                                rows={2}
                                value={sp[2]}
                                onChange={(e) => handleSpecChange(i, 2, e.target.value)}
                                className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic bg-slate-50/60 p-1.5 rounded border border-dashed border-slate-200">
                              - Vận dụng: <span className="font-normal">(0 câu - Không cần YCCĐ)</span>
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
                    {getY(r)[0] > 0 ? `${r.v[3] || 1} (${getY(r)[0]})` : ''}
                  </td>

                  {/* ĐS Hiểu (câu + (ý)) */}
                  <td className="border border-slate-300 p-2 text-center font-medium whitespace-nowrap">
                    {getY(r)[1] > 0 ? `${r.v[4] || 1} (${getY(r)[1]})` : ''}
                  </td>

                  {/* ĐS Vận dụng (câu + (ý)) */}
                  <td className="border border-slate-300 p-2 text-center font-medium whitespace-nowrap">
                    {getY(r)[2] > 0 ? `${r.v[5] || 1} (${getY(r)[2]})` : ''}
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
