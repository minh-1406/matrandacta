import React, { useState } from 'react';
import { GeneratedQuestion, QuestionPointConfig } from '../types';
import { formatNumber, formatVietnameseNumber } from '../utils/matrixCalculations';
import { getSafeTrueFalseItems } from '../utils/questionChecker';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Copy,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Eye,
} from 'lucide-react';

interface ExamComparisonMatrixProps {
  sets: GeneratedQuestion[][];
  examCodes: string[];
  subject: string;
  grade: number;
  semester: string;
  points: QuestionPointConfig;
  onExportExcel: () => void;
  onExportWord: () => void;
}

export const ExamComparisonMatrix: React.FC<ExamComparisonMatrixProps> = ({
  sets,
  examCodes,
  subject,
  grade,
  semester,
  points,
  onExportExcel,
  onExportWord,
}) => {
  const [filterPart, setFilterPart] = useState<'ALL' | 'NLC' | 'DS' | 'TLN' | 'TL'>('ALL');
  const [copiedNotification, setCopiedNotification] = useState<string>('');

  if (!sets || sets.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
        Chưa có bộ đề nào để đối chiếu. Hãy tạo ít nhất 1 hoặc nhiều đề thi.
      </div>
    );
  }

  const maxNlcCount = Math.max(...sets.map((s) => s.filter((q) => q.d === 'NLC').length), 0);
  const maxDsCount = Math.max(...sets.map((s) => s.filter((q) => q.d === 'DS').length), 0);
  const maxTlnCount = Math.max(...sets.map((s) => s.filter((q) => q.d === 'TLN').length), 0);
  const maxTlCount = Math.max(...sets.map((s) => s.filter((q) => q.d === 'TL').length), 0);

  const handleCopyMatrixText = async () => {
    let text = `BẢNG ĐỐI CHIẾU ĐÁP ÁN CÁC MÃ ĐỀ - MÔN: ${subject.toUpperCase()} LỚP ${grade} - ${semester}\n`;
    text += `Các mã đề: ${examCodes.join(', ')}\n\n`;

    if (maxNlcCount > 0) {
      text += `PHẦN I. CÂU TRẮC NGHIỆM NHIỀU LỰA CHỌN\n`;
      text += `Câu\t` + examCodes.map((c) => `Mã ${c}`).join('\t') + '\n';
      for (let i = 0; i < maxNlcCount; i++) {
        const row = [String(i + 1)];
        sets.forEach((s) => {
          const nlcQs = s.filter((q) => q.d === 'NLC');
          row.push(nlcQs[i]?.ans || '—');
        });
        text += row.join('\t') + '\n';
      }
      text += '\n';
    }

    if (maxDsCount > 0) {
      text += `PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG SAI\n`;
      for (let i = 0; i < maxDsCount; i++) {
        ['a', 'b', 'c', 'd'].forEach((sub, subIdx) => {
          const row = [`Câu ${i + 1}${sub}`];
          sets.forEach((s) => {
            const dsQs = s.filter((q) => q.d === 'DS');
            const item = dsQs[i]?.items?.[subIdx];
            row.push(item ? (item.a ? 'Đ' : 'S') : '—');
          });
          text += row.join('\t') + '\n';
        });
      }
      text += '\n';
    }

    if (maxTlnCount > 0) {
      text += `PHẦN III. CÂU TRẢ LỜI NGẮN\n`;
      text += `Câu\t` + examCodes.map((c) => `Mã ${c}`).join('\t') + '\n';
      for (let i = 0; i < maxTlnCount; i++) {
        const row = [String(i + 1)];
        sets.forEach((s) => {
          const tlnQs = s.filter((q) => q.d === 'TLN');
          row.push(tlnQs[i]?.ans ? String(tlnQs[i].ans) : '—');
        });
        text += row.join('\t') + '\n';
      }
    }

    await navigator.clipboard.writeText(text);
    setCopiedNotification('Đã sao chép bảng đối chiếu đáp án vào bộ nhớ tạm!');
    setTimeout(() => setCopiedNotification(''), 3000);
  };

  const badgeColor = (ans: string) => {
    switch (ans.trim().toUpperCase()) {
      case 'A':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'B':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'C':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'D':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-0">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Bảng ma trận đối chiếu đáp án các mã đề
            </h3>
            <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
              {sets.length} mã đề ({examCodes.slice(0, sets.length).join(', ')})
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Tra cứu và so sánh nhanh đáp án trắc nghiệm giữa các đề để chấm thi, kiểm tra tính đảo đề và xáo trộn phương án.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 noprint">
          <button
            type="button"
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
            title="Tải bảng đáp án ma trận ra file Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={onExportWord}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
            title="Tải hướng dẫn chấm chi tiết ra file Word (.docx)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Xuất HD Chấm Word</span>
          </button>
          <button
            type="button"
            onClick={handleCopyMatrixText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95 cursor-pointer"
            title="Sao chép bảng đối chiếu đáp án dạng văn bản tab"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-300" />
            <span>Sao chép bảng</span>
          </button>
        </div>
      </div>

      {copiedNotification && (
        <div className="bg-emerald-50 text-emerald-800 border-b border-emerald-200 px-4 py-2 text-xs font-semibold flex items-center gap-2 noprint">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Part Filter Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 noprint">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-bold text-slate-600 mr-1">Lọc phần thi:</span>
          <button
            type="button"
            onClick={() => setFilterPart('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterPart === 'ALL'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả các phần
          </button>
          {maxNlcCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterPart('NLC')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterPart === 'NLC'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Phần I: TN nhiều lựa chọn ({maxNlcCount} câu)
            </button>
          )}
          {maxDsCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterPart('DS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterPart === 'DS'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Phần II: Đúng / Sai ({maxDsCount} câu)
            </button>
          )}
          {maxTlnCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterPart('TLN')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterPart === 'TLN'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Phần III: Trả lời ngắn ({maxTlnCount} câu)
            </button>
          )}
          {maxTlCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterPart('TL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterPart === 'TL'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Phần IV: Tự luận ({maxTlCount} câu)
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-500 italic">
          💡 Nhấp vào từng ô để xem nhanh nội dung câu hỏi
        </div>
      </div>

      {/* Main Comparison Tables */}
      <div className="p-4 sm:p-6 space-y-6 overflow-x-auto">
        {/* PART I: MULTIPLE CHOICE */}
        {(filterPart === 'ALL' || filterPart === 'NLC') && maxNlcCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
              <h4 className="font-bold text-xs sm:text-sm text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                Phần I: Câu trắc nghiệm nhiều lựa chọn ({maxNlcCount} câu - {formatNumber(points.tn)} đ/câu)
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                Đáp án chuẩn A, B, C, D
              </span>
            </div>

            <table className="w-full border-collapse border border-slate-200 text-xs rounded-xl overflow-hidden shadow-2xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3 text-center border-r border-slate-200 w-16">
                    Câu #
                  </th>
                  {sets.map((_, sIdx) => {
                    const code = examCodes[sIdx] || String(sIdx + 1);
                    return (
                      <th
                        key={sIdx}
                        className={`py-2.5 px-3 text-center border-r border-slate-200 ${
                          sIdx === 0 ? 'bg-indigo-50/80 text-indigo-950 font-black' : ''
                        }`}
                      >
                        <div className="text-xs font-bold">Đề #{sIdx + 1}</div>
                        <div className="text-[11px] font-mono text-indigo-700 bg-white/90 border border-indigo-200 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          Mã: {code}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: maxNlcCount }).map((_, qIdx) => (
                  <tr key={qIdx} className={qIdx % 2 === 1 ? 'bg-slate-50/70 hover:bg-indigo-50/40' : 'bg-white hover:bg-indigo-50/40'}>
                    <td className="py-2 px-3 text-center font-bold text-slate-700 border-r border-slate-200 bg-slate-50/50">
                      Câu {qIdx + 1}
                    </td>
                    {sets.map((s, sIdx) => {
                      const nlcQs = s.filter((q) => q.d === 'NLC');
                      const q = nlcQs[qIdx];
                      const ans = q ? String(q.ans || '').trim().toUpperCase() : '—';
                      return (
                        <td
                          key={sIdx}
                          className="py-2 px-3 text-center border-r border-slate-200 font-bold"
                          title={q ? `[Mã ${examCodes[sIdx]} - Câu ${qIdx + 1}]: ${q.stem}` : ''}
                        >
                          {q ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <span
                                className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-extrabold border shadow-2xs ${badgeColor(
                                  ans
                                )}`}
                              >
                                {ans}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal hidden lg:inline">
                                ({q.m === 'B' ? 'Biết' : q.m === 'H' ? 'Hiểu' : 'Vận dụng'})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PART II: TRUE / FALSE */}
        {(filterPart === 'ALL' || filterPart === 'DS') && maxDsCount > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
              <h4 className="font-bold text-xs sm:text-sm text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                Phần II: Câu trắc nghiệm đúng sai ({maxDsCount} câu - 4 ý a, b, c, d mỗi câu)
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                Tối đa {formatNumber(points.ds)} đ/câu
              </span>
            </div>

            <table className="w-full border-collapse border border-slate-200 text-xs rounded-xl overflow-hidden shadow-2xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3 text-center border-r border-slate-200 w-24">
                    Câu & Ý
                  </th>
                  {sets.map((_, sIdx) => {
                    const code = examCodes[sIdx] || String(sIdx + 1);
                    return (
                      <th
                        key={sIdx}
                        className={`py-2.5 px-3 text-center border-r border-slate-200 ${
                          sIdx === 0 ? 'bg-emerald-50/80 text-emerald-950 font-black' : ''
                        }`}
                      >
                        <div className="text-xs font-bold">Đề #{sIdx + 1}</div>
                        <div className="text-[11px] font-mono text-emerald-800 bg-white/90 border border-emerald-200 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          Mã: {code}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: maxDsCount }).map((_, dsIdx) => (
                  <React.Fragment key={dsIdx}>
                    <tr className="bg-slate-100/70 font-bold text-slate-800 border-t-2 border-slate-200">
                      <td colSpan={sets.length + 1} className="py-1.5 px-3 text-indigo-950 text-xs">
                        Câu {dsIdx + 1} (Phần II)
                      </td>
                    </tr>
                    {['a', 'b', 'c', 'd'].map((letter, itemIdx) => (
                      <tr key={itemIdx} className={itemIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                        <td className="py-1.5 px-3 text-center font-bold text-slate-600 border-r border-slate-200 pl-6 text-left">
                          Ý {letter})
                        </td>
                        {sets.map((s, sIdx) => {
                          const dsQs = s.filter((q) => q.d === 'DS');
                          const q = dsQs[dsIdx];
                          const safeItems = q ? getSafeTrueFalseItems(q.items, sIdx * 5 + dsIdx) : [];
                          const item = safeItems[itemIdx];
                          if (!item) {
                            return (
                              <td key={sIdx} className="py-1.5 px-3 text-center border-r border-slate-200 text-slate-300">
                                —
                              </td>
                            );
                          }
                          const isTrue = Boolean(item.a);
                          return (
                            <td
                              key={sIdx}
                              className="py-1.5 px-3 text-center border-r border-slate-200 font-bold"
                              title={`[Mã ${examCodes[sIdx]} - Câu ${dsIdx + 1}${letter}]: ${item.t}`}
                            >
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                                  isTrue
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {isTrue ? 'Đúng (Đ)' : 'Sai (S)'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PART III: SHORT ANSWER */}
        {(filterPart === 'ALL' || filterPart === 'TLN') && maxTlnCount > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <h4 className="font-bold text-xs sm:text-sm text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block"></span>
                Phần III: Câu trắc nghiệm trả lời ngắn ({maxTlnCount} câu - {formatNumber(points.tln)} đ/câu)
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                Kết quả số / giá trị tính toán
              </span>
            </div>

            <table className="w-full border-collapse border border-slate-200 text-xs rounded-xl overflow-hidden shadow-2xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3 text-center border-r border-slate-200 w-16">
                    Câu #
                  </th>
                  {sets.map((_, sIdx) => {
                    const code = examCodes[sIdx] || String(sIdx + 1);
                    return (
                      <th
                        key={sIdx}
                        className={`py-2.5 px-3 text-center border-r border-slate-200 ${
                          sIdx === 0 ? 'bg-amber-50/80 text-amber-950 font-black' : ''
                        }`}
                      >
                        <div className="text-xs font-bold">Đề #{sIdx + 1}</div>
                        <div className="text-[11px] font-mono text-amber-800 bg-white/90 border border-amber-200 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          Mã: {code}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: maxTlnCount }).map((_, qIdx) => (
                  <tr key={qIdx} className={qIdx % 2 === 1 ? 'bg-slate-50/70 hover:bg-amber-50/30' : 'bg-white hover:bg-amber-50/30'}>
                    <td className="py-2 px-3 text-center font-bold text-slate-700 border-r border-slate-200 bg-slate-50/50">
                      Câu {qIdx + 1}
                    </td>
                    {sets.map((s, sIdx) => {
                      const tlnQs = s.filter((q) => q.d === 'TLN');
                      const q = tlnQs[qIdx];
                      return (
                        <td
                          key={sIdx}
                          className="py-2 px-3 text-center border-r border-slate-200 font-mono font-bold text-amber-950"
                          title={q ? `[Mã ${examCodes[sIdx]} - Câu ${qIdx + 1}]: ${q.stem}` : ''}
                        >
                          {q ? (
                            <span className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold text-xs text-amber-900">
                              {formatVietnameseNumber(String(q.ans || ''))}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PART IV: ESSAY */}
        {(filterPart === 'ALL' || filterPart === 'TL') && maxTlCount > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-purple-200 pb-2">
              <h4 className="font-bold text-xs sm:text-sm text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"></span>
                Phần IV: Tự luận & Hướng dẫn chấm ({maxTlCount} câu - Tổng {formatNumber(points.tl)} điểm)
              </h4>
            </div>

            <div className="space-y-4">
              {Array.from({ length: maxTlCount }).map((_, qIdx) => (
                <div key={qIdx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h5 className="font-bold text-xs text-indigo-900 uppercase">
                    Câu {qIdx + 1} (Tự luận):
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sets.map((s, sIdx) => {
                      const tlQs = s.filter((q) => q.d === 'TL');
                      const q = tlQs[qIdx];
                      if (!q) return null;
                      return (
                        <div key={sIdx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                          <div className="font-bold text-indigo-800 flex items-center justify-between">
                            <span>Đề #{sIdx + 1} (Mã: {examCodes[sIdx]})</span>
                          </div>
                          <p className="text-slate-700 font-medium">{q.stem}</p>
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                            <b className="text-slate-800">Hướng dẫn chấm:</b>
                            <div className="text-slate-600 whitespace-pre-line">{q.ans}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
