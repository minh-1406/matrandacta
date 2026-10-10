import React from 'react';
import { MatrixRow } from '../types';
import { dsNote, getY } from '../utils/matrixCalculations';
import { FOOTNOTES_TEXT } from '../constants/curriculumData';

interface SpecTableProps {
  rows: MatrixRow[];
  onChange: (updatedRows: MatrixRow[]) => void;
}

export const SpecTable: React.FC<SpecTableProps> = ({ rows, onChange }) => {
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
      <div className="text-xs text-slate-500 italic noprint">
        ↔ Kéo hoặc vuốt ngang để xem toàn bộ bảng bản đặc tả. Bạn có thể chỉnh sửa trực tiếp nội dung Yêu cầu cần đạt.
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
              <th colSpan={15} className="border border-slate-300 p-2 text-center bg-indigo-100/70">
                Số câu hỏi ở các mức độ đánh giá
              </th>
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
              <th colSpan={6} className="border border-slate-300 p-1 text-center">Đúng – Sai</th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center">Trả lời ngắn</th>
            </tr>

            {/* Row 4 */}
            <tr className="bg-slate-100/80 text-slate-700 text-[11px] font-semibold border-b border-slate-300">
              {/* TNLC */}
              <th className="border border-slate-300 p-1 w-10 text-center">Biết</th>
              <th className="border border-slate-300 p-1 w-10 text-center">Hiểu</th>
              <th className="border border-slate-300 p-1 w-10 text-center">Vận dụng</th>

              {/* ĐS */}
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
                  <td className="border border-slate-300 p-2 font-semibold text-slate-800">
                    {r.c}
                  </td>

                  {/* Subtopics */}
                  <td className="border border-slate-300 p-2 text-slate-700">
                    {r.n}
                  </td>

                  {/* Expected Learning Outcomes (YCCĐ) */}
                  <td className="border border-slate-300 p-2 space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                        - Biết:
                      </label>
                      <textarea
                        rows={2}
                        value={sp[0]}
                        onChange={(e) => handleSpecChange(i, 0, e.target.value)}
                        className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                        - Hiểu:
                      </label>
                      <textarea
                        rows={2}
                        value={sp[1]}
                        onChange={(e) => handleSpecChange(i, 1, e.target.value)}
                        className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                        - Vận dụng:
                      </label>
                      <textarea
                        rows={2}
                        value={sp[2]}
                        onChange={(e) => handleSpecChange(i, 2, e.target.value)}
                        className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {note && (
                      <div className="text-[11.5px] text-indigo-700 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100 font-medium italic">
                        {note}
                      </div>
                    )}
                  </td>

                  {/* Question counts for all columns matching matrix */}
                  {/* TNLC */}
                  {[0, 1, 2].map((col) => (
                    <td key={col} className="border border-slate-300 p-2 text-center font-medium">
                      {r.v[col] || ''}
                    </td>
                  ))}

                  {/* ĐS Biết */}
                  <td className="border-y border-l border-slate-300 p-2 text-center font-medium">
                    {r.v[3] || ''}
                  </td>
                  <td className="border-y border-r border-slate-300 p-2 text-center text-xs text-slate-400">
                    {getY(r)[0] ? `(${getY(r)[0]})` : ''}
                  </td>

                  {/* ĐS Hiểu */}
                  <td className="border-y border-l border-slate-300 p-2 text-center font-medium">
                    {r.v[4] || ''}
                  </td>
                  <td className="border-y border-r border-slate-300 p-2 text-center text-xs text-slate-400">
                    {getY(r)[1] ? `(${getY(r)[1]})` : ''}
                  </td>

                  {/* ĐS Vận dụng */}
                  <td className="border-y border-l border-slate-300 p-2 text-center font-medium">
                    {r.v[5] || ''}
                  </td>
                  <td className="border-y border-r border-slate-300 p-2 text-center text-xs text-slate-400">
                    {getY(r)[2] ? `(${getY(r)[2]})` : ''}
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
